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
# Pré-requisitos na VPS: git, node >= 22, npm, pm2, mariadb rodando,
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

step "Instalando dependências (npm ci)"
npm ci --no-audit --no-fund
step_done

step "Build do backend"
npm run build --workspace backend
step_done

step "Migrations do banco"
npm run migration:run
step_done

step "Build do frontend"
npm run build --workspace frontend
step_done

step "Reiniciando API no PM2"
pm2 startOrReload ecosystem.config.js --update-env
pm2 save
pm2 status
step_done

PORT=$(grep -E '^PORT=' backend/.env | cut -d= -f2 || true)
PORT=${PORT:-3000}

step "Health check (http://127.0.0.1:$PORT/api/health)"
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$PORT/api/health" > /dev/null 2>&1; then
    echo "    resposta saudável na tentativa $i"
    printf '::notice::Deploy concluído com sucesso em %ss.\n' "$((SECONDS - START))"
    pm2 status
    exit 0
  fi
  sleep 1
done

echo "::error::Health check falhou após 30 tentativas."
echo "Últimos 50 linhas de log do PM2:"
pm2 logs ticket-triage-api --lines 50 --nostream || true
exit 1
