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
# Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx mariadb-server
sudo npm install -g pm2

# MariaDB
sudo mysql_secure_installation
sudo mysql -e "CREATE DATABASE ticket_triage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'app'@'localhost' IDENTIFIED BY 'SENHA_FORTE';"
sudo mysql -e "GRANT ALL PRIVILEGES ON ticket_triage.* TO 'app'@'localhost'; FLUSH PRIVILEGES;"
```

## 2. Clonar e configurar

```bash
sudo mkdir -p /var/www/app && sudo chown $USER /var/www/app
git clone https://github.com/eduardo-pacheco-dev/ticket-triage.git /var/www/app/ticket-triage
cd /var/www/app/ticket-triage

cp backend/.env.production.example backend/.env
nano backend/.env   # preencha DB_PASSWORD, JWT_SECRET, SEED_ADMIN_PASSWORD
mkdir -p backend/logs
```

## 3. Primeiro deploy

```bash
npm ci
npm run db:init          # cria usuário/tipos iniciais via seed
bash scripts/deploy.sh $(git rev-parse HEAD)
```

## 4. Nginx

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/ticket-triage
sudo nano /etc/nginx/sites-available/ticket-triage   # server_name já vem como afl.vps-kinghost.net
sudo ln -s /etc/nginx/sites-available/ticket-triage /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

HTTPS opcional: `sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx`.

## 5. Secrets do GitHub (Settings → Environments → production)

| Secret | Descrição |
| --- | --- |
| `SSH_HOST` | IP ou host da VPS |
| `SSH_PORT` | Porta SSH (opcional; padrão 22) |
| `SSH_USER` | Usuário SSH com acesso ao repositório em `/var/www/app/ticket-triage` |
| `SSH_PRIVATE_KEY` | Chave privada (ed25519) cadastrada no `authorized_keys` da VPS |

A partir daí, todo push em `main` publica automaticamente. Deploys manuais: aba **Actions → Deploy → Run workflow**.

## Rotina e troubleshooting

- **Logs**: `pm2 logs ticket-triage-api` · arquivos em `backend/logs/`
- **Status**: `pm2 status`
- **Rollback**: `cd /var/www/app/ticket-triage && git checkout -f main && git reset --hard <sha-anterior> && bash scripts/deploy.sh <sha-anterior>`
- **Deploy travou no health check**: ver `pm2 logs` — causas comuns: `.env` inválido, senha do MariaDB errada, porta ocupada
- **Migrations novas falharam**: rode `npm run migration:run` manualmente na VPS para ver o erro completo
