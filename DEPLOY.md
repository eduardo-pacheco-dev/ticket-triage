# Deploy — VPS com PM2 + Nginx + MariaDB + GitHub Actions

Fluxo: push/merge em `main` → workflow roda lint, testes e builds → SSH na VPS → `scripts/deploy.sh` atualiza código, roda migrations e reinicia a API via PM2.

```
GitHub Actions ──ssh──▶ VPS
                         ├─ git reset --hard <sha>
                         ├─ npm ci + build backend/frontend
                         ├─ npm run migration:run   (MariaDB)
                         ├─ pm2 startOrReload       (API :3000)
                         └─ curl /api/health
Nginx :80 ──▶ frontend/dist (estático) + proxy /api → 127.0.0.1:3000
```

## 1. Preparar a VPS (uma vez)

```bash
# Node 20.19.2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx mariadb-server
sudo npm install -g pm2

# MariaDB
sudo mysql_secure_installation
# O banco e o usuário são criados automaticamente pelo scripts/deploy.sh
# (usa sudo mysql + as credenciais de backend/.env). Comando manual, se preferir:
#   sudo mysql -e "CREATE DATABASE ticket_triage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
#   sudo mysql -e "CREATE USER 'app'@'localhost' IDENTIFIED BY 'SENHA_FORTE';"
#   sudo mysql -e "GRANT ALL PRIVILEGES ON ticket_triage.* TO 'app'@'localhost'; FLUSH PRIVILEGES;"
```

## 2. Configurar o `.env` na VPS

O `deploy.sh` clona o repositório sozinho no primeiro deploy. Antes disso, prepare o `.env`:

```bash
mkdir -p /var/www/app/ticket-triage/backend/logs
curl -o /var/www/app/ticket-triage/backend/.env https://raw.githubusercontent.com/eduardo-pacheco-dev/ticket-triage/main/backend/.env.production.example
nano /var/www/app/ticket-triage/backend/.env   # preencha DB_PASSWORD, JWT_SECRET, SEED_ADMIN_PASSWORD
```

> Repositório privado? Cadastre uma **deploy key** (chave SSH de leitura) na VPS ou use `REPO_URL=https://<token>@github.com/...` ao chamar o script.

## 3. Primeiro deploy

```bash
npm ci
npm run db:init          # cria usuário/tipos iniciais via seed
bash scripts/deploy.sh $(git rev-parse HEAD)
```

## 4. Nginx

O `deploy.sh` publica o site automaticamente a cada deploy: instala o nginx se faltar, renderiza
`deploy/nginx.conf.example` (domínio `afl.brazil.vps-kinghost.net`, porta da API lida do `.env`),
escreve em `/etc/nginx/sites-available/afl.brazil.vps-kinghost.net`, habilita, remove o site
default e recarrega após validar com `nginx -t`. Requisito: usuário SSH com sudo sem senha.

O site serve os estáticos de `frontend/dist` (SPA) e repassa `/api/` para o PM2 mantendo o
prefixo — sem rewrite — com buffering desligado para o SSE.

HTTPS opcional: `sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx`.

## 5. Secrets do GitHub (Settings → Environments → production)

| Secret            | Descrição                                                             |
| ----------------- | --------------------------------------------------------------------- |
| `SSH_HOST`        | IP ou host da VPS                                                     |
| `SSH_PORT`        | Porta SSH (opcional; padrão 22)                                       |
| `SSH_USER`        | Usuário SSH com acesso ao repositório em `/var/www/app/ticket-triage` |
| `SSH_PRIVATE_KEY` | Chave privada (ed25519) cadastrada no `authorized_keys` da VPS        |

A partir daí, todo push em `main` publica automaticamente. Deploys manuais: aba **Actions → Deploy → Run workflow**.

## Rotina e troubleshooting

- **Logs**: `pm2 logs ticket-triage-api` · arquivos em `backend/logs/`
- **Status**: `pm2 status`
- **Rollback**: `cd /var/www/app/ticket-triage && git checkout -f main && git reset --hard <sha-anterior> && bash scripts/deploy.sh <sha-anterior>`
- **Deploy travou no health check**: ver `pm2 logs` — causas comuns: `.env` inválido, senha do MariaDB errada, porta ocupada
- **Migrations novas falharam**: rode `npm run migration:run` manualmente na VPS para ver o erro completo
- **Downloads do npm morrem com ETIMEDOUT**: payloads grandes estagnam na rede da VPS (MTU). Diagnóstico:
  `curl -fL -o /tmp/plex.tgz https://registry.npmjs.org/@ibm/plex/-/plex-6.4.1.tgz`. Correção:
  `sudo ip link set dev <iface> mtu 1400` e persistir em `/etc/network/interfaces`
  (`mtu 1400` no bloco da interface). O deploy também semeia o cache do npm via curl antes do `npm ci`.
