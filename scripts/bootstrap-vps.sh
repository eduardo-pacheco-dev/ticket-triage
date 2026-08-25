#!/usr/bin/env bash
# Bootstrap da VPS para o Ticket Triage — prepara o servidor do zero.
#
# Instala e configura: git, Node 20 (NodeSource), pm2, nginx e MariaDB,
# além do diretório da aplicação e do backend/.env inicial.
# Idempotente: pode ser executado novamente sem quebrar nada.
#
# Uso:
#   bash scripts/bootstrap-vps.sh
#
# Variáveis de ambiente:
#   APP_DIR      Diretório da aplicação (padrão: /var/www/app/ticket-triage)
#   NODE_MAJOR   Versão principal do Node (padrão: 20)
#   ENABLE_UFW   "1" libera SSH/HTTP/HTTPS no ufw (padrão: 0 = não mexe no firewall)
#
# Pré-requisitos: Ubuntu/Debian com apt; rodar como root ou usuário com sudo.
# Depois deste script, siga o DEPLOY.md: configurar backend/.env e rodar o deploy.

set -euo pipefail

START=$SECONDS
STEP_START=$SECONDS
APP_DIR="${APP_DIR:-/var/www/app/ticket-triage}"
NODE_MAJOR="${NODE_MAJOR:-20}"
ENABLE_UFW="${ENABLE_UFW:-0}"

trap 'printf "::error::Bootstrap falhou na linha %s (total: %ss)\n" "${LINENO:-?}" "$((SECONDS - START))"' ERR

step() {
  STEP_START=$SECONDS
  printf '\n==> [+%03ds] %s\n' "$SECONDS" "$1"
}

step_done() {
  printf '    ok (%ss)\n' "$((SECONDS - STEP_START))"
}

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo > /dev/null 2>&1; then
    SUDO="sudo"
  else
    echo "::error::Rode como root ou instale o sudo antes de continuar."
    exit 1
  fi
fi

if ! command -v apt-get > /dev/null 2>&1; then
  echo "::error::Este script suporta apenas Ubuntu/Debian (apt)."
  exit 1
fi

RUN_USER=${SUDO_USER:-$(id -un)}
RUN_HOME=$(getent passwd "$RUN_USER" | cut -d: -f6)

echo "==============================================================="
echo " Bootstrap da VPS — Ticket Triage"
echo " Usuário : $RUN_USER"
echo " App dir : $APP_DIR"
echo " Node    : v$NODE_MAJOR.x"
echo " Início  : $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "==============================================================="

step "Pacotes base (git, curl, ca-certificates)"
export DEBIAN_FRONTEND=noninteractive
$SUDO apt-get update -qq
$SUDO apt-get install -y -qq git curl ca-certificates gnupg
step_done

step "Aviso de memória baixa (swap)"
TOTAL_MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
TOTAL_SWAP_KB=$(grep SwapTotal /proc/meminfo | awk '{print $2}')
if [ $((TOTAL_MEM_KB + TOTAL_SWAP_KB)) -lt 2000000 ]; then
  echo "    AVISO: menos de 2 GB de RAM+swap; npm ci/build podem sofrer OOM."
  echo "    Considere criar swap: sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile"
fi
step_done

step "Node.js v$NODE_MAJOR (NodeSource)"
if command -v node > /dev/null 2>&1; then
  CURRENT_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
  if [ "$CURRENT_MAJOR" = "$NODE_MAJOR" ]; then
    echo "    node $(node -v) já instalado; mantido"
    step_done
  else
    echo "::error::node $(node -v) encontrado, mas espera-se a série v$NODE_MAJOR. Resolva manualmente."
    exit 1
  fi
else
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | $SUDO -E bash -
  $SUDO apt-get install -y -qq nodejs
  echo "    node $(node -v), npm $(npm -v)"
  step_done
fi

step "pm2 (global)"
if command -v pm2 > /dev/null 2>&1; then
  echo "    pm2 $(pm2 -v) já instalado"
else
  $SUDO npm install -g pm2 --no-audit --no-fund
  echo "    pm2 $(pm2 -v) instalado"
fi
step_done

step "MariaDB Server"
if command -v mariadb > /dev/null 2>&1 || command -v mysql > /dev/null 2>&1; then
  echo "    já instalado"
else
  $SUDO apt-get install -y -qq mariadb-server
fi
$SUDO systemctl enable --now mariadb
# Endurecimento não interativo (equivalente ao mysql_secure_installation):
# remove anônimos, banco test e acesso remoto do root. Senha do root fica vazia
# de propósito — na VPS só o root do SO acessa via unix_socket.
$SUDO mariadb <<'SQL'
DELETE FROM mysql.global_priv WHERE User='';
DELETE FROM mysql.global_priv WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db LIKE 'test%';
FLUSH PRIVILEGES;
SQL
echo "    serviço ativo e endurecido (unix_socket para root)"
step_done

step "nginx"
if command -v nginx > /dev/null 2>&1; then
  echo "    já instalado ($(nginx -v 2>&1))"
else
  $SUDO apt-get install -y -qq nginx
fi
$SUDO systemctl enable --now nginx
step_done

step "Firewall (ufw)"
if [ "$ENABLE_UFW" = "1" ]; then
  $SUDO apt-get install -y -qq ufw
  $SUDO ufw allow OpenSSH > /dev/null
  $SUDO ufw allow 80/tcp > /dev/null
  $SUDO ufw allow 443/tcp > /dev/null
  $SUDO ufw --force enable > /dev/null
  echo "    ativo: SSH, 80 e 443 liberados"
else
  echo "    ignorado (use ENABLE_UFW=1 para configurar)"
fi
step_done

step "Diretório da aplicação e .env inicial"
mkdir -p "$APP_DIR/backend/logs"
if [ ! -f "$APP_DIR/backend/.env" ]; then
  ENV_URL="https://raw.githubusercontent.com/eduardo-pacheco-dev/ticket-triage/main/backend/.env.production.example"
  if curl -fsSL -o "$APP_DIR/backend/.env" "$ENV_URL"; then
    echo "    backend/.env criado a partir do exemplo — PREENCHA DB_PASSWORD, JWT_SECRET e SEED_ADMIN_PASSWORD:"
    echo "    nano $APP_DIR/backend/.env"
  else
    echo "    AVISO: não baixou o exemplo (.env ausente). Copie backend/.env.production.example manualmente antes do deploy."
  fi
else
  echo "    backend/.env já existe; preservado"
fi
step_done

step "PM2 startup (reiniciar API no boot)"
if [ -f "/etc/systemd/system/pm2-$RUN_USER.service" ]; then
  echo "    unidade systemd já existe"
else
  $SUDO env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$RUN_USER" --hp "$RUN_HOME" > /dev/null
  echo "    unidade criada para '$RUN_USER' (rode 'pm2 save' após o primeiro deploy)"
fi
step_done

printf '\nBootstrap concluído em %ss.\n' "$((SECONDS - START))"
printf 'Próximos passos:\n'
printf '  1. Edite %s/backend/.env (senhas e JWT_SECRET)\n' "$APP_DIR"
printf '  2. Rode o primeiro deploy: bash scripts/deploy.sh <sha>\n'
