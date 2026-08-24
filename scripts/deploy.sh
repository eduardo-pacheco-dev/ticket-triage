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

if [ -z "$SHA" ]; then
  echo "Erro: informe o commit SHA a publicar. Ex.: bash scripts/deploy.sh abc1234"
  exit 1
fi

if [ ! -d "$APP_DIR/.git" ]; then
  echo "==> Primeiro deploy: clonando $REPO_URL em $APP_DIR"
  mkdir -p "$(dirname "$APP_DIR")"
  git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

if [ ! -f backend/.env ]; then
  echo "Erro: backend/.env não encontrado. Copie backend/.env.production.example e preencha."
  exit 1
fi

echo "==> Publicando $SHA (branch $BRANCH) em $APP_DIR"

git fetch origin "$BRANCH"
git checkout -f "$BRANCH"
git reset --hard "$SHA"

echo "==> Instalando dependências"
npm ci

echo "==> Build do backend"
npm run build --workspace backend

echo "==> Migrations"
npm run migration:run

echo "==> Build do frontend"
npm run build --workspace frontend

echo "==> PM2"
pm2 startOrReload ecosystem.config.js --update-env
pm2 save

PORT=$(grep -E '^PORT=' backend/.env | cut -d= -f2 || true)
PORT=${PORT:-3000}

echo "==> Health check (http://127.0.0.1:$PORT/api/health)"
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$PORT/api/health" > /dev/null 2>&1; then
    echo "Deploy concluído com sucesso."
    pm2 status
    exit 0
  fi
  sleep 1
done

echo "Falha no health check após 30s. Últimos logs:"
pm2 logs ticket-triage-api --lines 50 --nostream || true
exit 1
