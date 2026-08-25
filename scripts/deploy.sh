#!/usr/bin/env bash
# Deploy do Ticket Triage na VPS (PM2 + Nginx + MariaDB).
#
# Uso:
#   bash scripts/deploy.sh <sha>          # a partir da raiz do repositório na VPS
#
# Variáveis de ambiente:
#   APP_DIR   Diretório da aplicação na VPS (padrão: /var/www/app/ticket-triage)
#   BRANCH    Branch de origem do SHA (padrão: main)
#   REPO_URL  URL do repositório para o primeiro clone (padrão: GitHub do projeto)
#
# Pré-requisitos na VPS: git, node >= 20.19.2, npm, pm2, mariadb rodando,
# backend/.env configurado (veja backend/.env.production.example).
# Se o repositório for privado, cadastre uma deploy key ou use REPO_URL com token.

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/app/ticket-triage}"
BRANCH="${BRANCH:-main}"
REPO_URL="${REPO_URL:-https://github.com/eduardo-pacheco-dev/ticket-triage.git}"
SHA="${1:-}"
START=$SECONDS
STEP_START=$SECONDS

# Anotação de erro no GitHub Actions em qualquer comando que falhe.
trap 'printf "::error::Deploy falhou na linha %s (total: %ss)\n" "${LINENO:-?}" "$((SECONDS - START))"' ERR

step() {
  STEP_START=$SECONDS
  printf '\n==> [+%03ds] %s\n' "$SECONDS" "$1"
}

step_done() {
  printf '    ok (%ss)\n' "$((SECONDS - STEP_START))"
}

if [ -z "$SHA" ]; then
  echo "::error::Informe o commit SHA a publicar. Ex.: bash scripts/deploy.sh abc1234"
  exit 1
fi

if [ ! -d "$APP_DIR/.git" ]; then
  echo "==> Primeiro deploy: clonando $REPO_URL em $APP_DIR"
  mkdir -p "$(dirname "$APP_DIR")"
  git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

if [ ! -f backend/.env ]; then
  echo "::error::backend/.env não encontrado em $APP_DIR. Copie backend/.env.production.example e preencha."
  exit 1
fi

echo "==============================================================="
echo " Deploy do Ticket Triage"
echo " Commit : $SHA"
echo " Branch : $BRANCH"
echo " Diretório: $APP_DIR"
echo " Node : $(node -v 2>/dev/null || echo 'AUSENTE')"
echo " npm  : $(npm -v 2>/dev/null || echo 'AUSENTE')"
echo " pm2  : $(pm2 -v 2>/dev/null || echo 'AUSENTE')"
echo " Início : $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "==============================================================="

step "Atualizando código para $SHA"
git fetch origin "$BRANCH"
git checkout -f "$BRANCH"
git reset --hard "$SHA"
echo "HEAD agora em: $(git rev-parse --short HEAD) — $(git log -1 --format=%s)"
step_done

# Se o deploy.sh foi atualizado pelo git reset, re-executa a si mesmo
# para garantir que o script em memória reflita o novo código.
if [ "${_REDEPLOY:-}" != "1" ]; then
  echo "==> deploy.sh atualizado; reiniciando script..."
  export _REDEPLOY=1
  exec bash "$0" "$SHA"
fi

step "Instalando dependências"
# Pula o npm ci quando o package-lock.json não mudou desde o deploy anterior:
# reinstallar tudo pela rede da VPS é o passo mais lento do deploy. Para forçar
# a reinstalação, use FORCE_NPM_CI=1 bash scripts/deploy.sh <sha>.
LOCK_HASH_FILE="$APP_DIR/.package-lock.sha256"
CURRENT_LOCK_HASH=$(sha256sum package-lock.json | cut -d' ' -f1)
if [ "${FORCE_NPM_CI:-0}" != "1" ] && [ -d node_modules ] && [ -f "$LOCK_HASH_FILE" ] \
  && [ "$(cat "$LOCK_HASH_FILE")" = "$CURRENT_LOCK_HASH" ]; then
  echo "    package-lock.json inalterado; node_modules reaproveitado"
  step_done
else
  # Redes instáveis: timeouts e retries generosos.
  export npm_config_fetch_timeout=900000
  export npm_config_fetch_retries=7
  export npm_config_fetch_retry_mintimeout=15000
  export npm_config_fetch_retry_maxtimeout=180000
  NPM_OK=0
  for attempt in 1 2 3; do
    echo "    tentativa $attempt/3"
    if npm ci --no-audit --no-fund --prefer-offline; then
      NPM_OK=1
      break
    fi
    echo "    falhou; aguardando 10s antes de repetir"
    sleep 10
  done
  if [ "$NPM_OK" -ne 1 ]; then
    echo "::error::npm ci falhou após 3 tentativas (verifique rede/registry na VPS)."
    exit 1
  fi
  printf '%s\n' "$CURRENT_LOCK_HASH" > "$LOCK_HASH_FILE"
  step_done
fi

step "Build do shared"
npm run build --workspace shared
step_done

step "Build do backend"
npm run build --workspace backend
step_done

step "Garantindo banco de dados"
# tr -d '\r': tolera .env salvo com quebras CRLF (editado fora da VPS).
DB_NAME_ENV=$(grep -E '^DB_NAME=' backend/.env | cut -d= -f2- | tr -d '\r' || true)
DB_USER_ENV=$(grep -E '^DB_USER=' backend/.env | cut -d= -f2- | tr -d '\r' || true)
DB_PASS_ENV=$(grep -E '^DB_PASSWORD=' backend/.env | cut -d= -f2- | tr -d '\r' || true)
DB_HOST_ENV=$(grep -E '^DB_HOST=' backend/.env | cut -d= -f2- | tr -d '\r' || true)
DB_HOST_ENV=${DB_HOST_ENV:-localhost}

if [ "$DB_HOST_ENV" = "localhost" ] || [ "$DB_HOST_ENV" = "127.0.0.1" ]; then
  PASS_ESCAPED=${DB_PASS_ENV//\\/\\\\}
  PASS_ESCAPED=${PASS_ESCAPED//\"/\\\"}
  printf 'CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n' "$DB_NAME_ENV" | sudo mysql
  # CREATE USER IF NOT EXISTS NÃO atualiza a senha de um usuário pré-existente;
  # o ALTER USER garante que a senha convirja sempre com o backend/.env.
  printf 'CREATE USER IF NOT EXISTS `%s`@`localhost` IDENTIFIED BY "%s";\nALTER USER `%s`@`localhost` IDENTIFIED BY "%s";\nGRANT ALL PRIVILEGES ON `%s`.* TO `%s`@`localhost`;\nFLUSH PRIVILEGES;\n' \
    "$DB_USER_ENV" "$PASS_ESCAPED" "$DB_USER_ENV" "$PASS_ESCAPED" "$DB_NAME_ENV" "$DB_USER_ENV" | sudo mysql
  echo "    banco '$DB_NAME_ENV' e usuário '$DB_USER_ENV' garantidos"
  step_done
else
  echo "    DB_HOST remoto ($DB_HOST_ENV): criação do banco ignorada neste host"
  step_done
fi

step "Migrations do banco"
npm run db:migrate
step_done

step "Build do frontend"
npm run build --workspace frontend
step_done

step "Nginx"
if ! command -v nginx > /dev/null 2>&1; then
  echo "    nginx ausente; instalando..."
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx
fi

PORT=$(grep -E '^PORT=' backend/.env | cut -d= -f2- | tr -d '\r' || true)
PORT=${PORT:-3000}
SITE_FILE=afl.brazil.vps-kinghost.net

sed -e "s|__APP_DIR__|$APP_DIR|g" -e "s|__API_PORT__|$PORT|g" \
  deploy/nginx.conf.example | sudo tee "/etc/nginx/sites-available/$SITE_FILE" > /dev/null
sudo ln -sfn "/etc/nginx/sites-available/$SITE_FILE" "/etc/nginx/sites-enabled/$SITE_FILE"
sudo rm -f /etc/nginx/sites-enabled/default
if sudo nginx -t; then
  sudo systemctl reload nginx 2> /dev/null || sudo service nginx reload 2> /dev/null || sudo nginx -s reload
  echo "    site '$SITE_FILE' publicado (estático + proxy /api → 127.0.0.1:$PORT)"
else
  echo "::error::nginx -t falhou; nova configuração não foi aplicada."
  exit 1
fi
step_done

step "Reiniciando API no PM2"
pm2 startOrReload ecosystem.config.js --update-env
pm2 save
pm2 status
step_done

step "Health check (http://127.0.0.1:$PORT/api/health)"
# Usa o fetch nativo do Node (≥18): não depende de curl/wget instalados na VPS.
HEALTH_OK=0
for i in $(seq 1 30); do
  if node -e "fetch('http://127.0.0.1:$PORT/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    echo "    resposta saudável na tentativa $i"
    HEALTH_OK=1
    break
  fi
  sleep 1
done

if [ "$HEALTH_OK" -ne 1 ]; then
  echo "::error::Health check falhou após 30 tentativas."
  echo "Portas em escuta (procura $PORT):"
  ss -ltn 2> /dev/null | grep -E "(State|:$PORT\b)" || echo "    NADA escutando em $PORT — a API não subiu ou caiu na porta errada"
  echo "Últimas 30 linhas do log de ERRO do PM2:"
  tail -n 30 backend/logs/pm2-error.log 2> /dev/null || true
  echo "Últimas 30 linhas do log de saída do PM2:"
  tail -n 30 backend/logs/pm2-out.log 2> /dev/null || true
  exit 1
fi

printf '::notice::Deploy concluído com sucesso em %ss.\n' "$((SECONDS - START))"
pm2 status
exit 0
