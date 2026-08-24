'use strict';

// Cria (ou reseta) um usuário administrador diretamente no banco.
//
// Uso:
//   npm run create-admin -- <usuario> <senha>
//   npm run create-admin -- --username <usuario> --password <senha> [--force]
//
// --force: se o usuário já existir, redefine a senha e garante role/status de admin.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--username') args.username = argv[++i];
    else if (arg === '--password') args.password = argv[++i];
    else if (arg === '--force') args.force = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else args._.push(arg);
  }
  return args;
}

function fail(message) {
  console.error(`Erro: ${message}`);
  process.exit(1);
}

function printUsage() {
  console.log(`Uso:
  npm run create-admin -- <usuario> <senha>
  npm run create-admin -- --username <usuario> --password <senha> [--force]

Opções:
  --force   Se o usuário já existir, redefine a senha (troca obrigatória no próximo login).
  -h        Mostra esta ajuda.`);
}

function validate(username, password) {
  const trimmed = String(username ?? '').trim();
  if (!trimmed) fail('Usuário é obrigatório.');
  if (trimmed.length > 100) fail('Usuário: máximo de 100 caracteres.');

  const pass = String(password ?? '');
  if (pass.length < 6) fail('A senha deve ter no mínimo 6 caracteres.');
  if (pass.length > 200) fail('Senha: máximo de 200 caracteres.');

  return { username: trimmed, password: pass };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  const usernameArg = args.username ?? args._[0];
  const passwordArg = args.password ?? args._[1];

  if (usernameArg === undefined || passwordArg === undefined) {
    printUsage();
    process.exit(1);
  }

  const { username, password } = validate(usernameArg, passwordArg);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'app',
    password: process.env.DB_PASSWORD || 'appsecret',
    database: process.env.DB_NAME || 'ticket_triage',
  });

  try {
    const [rows] = await connection.query('SELECT id FROM users WHERE username = ? LIMIT 1', [
      username,
    ]);
    const existing = rows[0];

    if (existing && !args.force) {
      fail(`Usuário "${username}" já existe. Use --force para redefinir a senha.`);
    }

    const hash = await bcrypt.hash(password, 10);

    if (existing) {
      await connection.query(
        `UPDATE users
         SET password_hash = ?, role = 'admin', status = 'active', must_change_password = TRUE, token_version = token_version + 1
         WHERE id = ?`,
        [hash, existing.id],
      );
      console.log(
        `Usuário "${username}" atualizado: senha redefinida, role=admin (troca de senha obrigatória no próximo login).`,
      );
    } else {
      await connection.query(
        `INSERT INTO users (id, username, password_hash, role, status, must_change_password)
         VALUES (UUID(), ?, ?, 'admin', 'active', FALSE)`,
        [username, hash],
      );
      console.log(`Usuário administrador "${username}" criado.`);
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
