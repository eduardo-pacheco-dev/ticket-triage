'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const REQUEST_TYPES = ['Instalação', 'Manutenção Preventiva', 'Auditoria'];
const ADMIN_USER = process.env.SEED_ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.SEED_ADMIN_PASSWORD || 'admin';

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'app',
    password: process.env.DB_PASSWORD || 'appsecret',
    database: process.env.DB_NAME || 'ticket_triage',
  });

  try {
    for (const name of REQUEST_TYPES) {
      await connection.query(
        `INSERT INTO request_types (id, name) VALUES (UUID(), ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        [name],
      );
    }
    console.log('Seed: tipos de solicitação garantidos.');

    const hash = await bcrypt.hash(ADMIN_PASS, 10);
    await connection.query(
      `INSERT INTO users (id, username, password_hash) VALUES (UUID(), ?, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
      [ADMIN_USER, hash],
    );
    console.log(`Seed: usuário "${ADMIN_USER}" criado/atualizado.`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
