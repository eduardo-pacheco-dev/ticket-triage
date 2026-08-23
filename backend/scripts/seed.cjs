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
    multipleStatements: true,
  });

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id char(36) NOT NULL PRIMARY KEY,
        username varchar(100) NOT NULL UNIQUE,
        password_hash varchar(100) NOT NULL,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB;
      CREATE TABLE IF NOT EXISTS request_types (
        id char(36) NOT NULL PRIMARY KEY,
        name varchar(200) NOT NULL UNIQUE,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB;
      CREATE TABLE IF NOT EXISTS queue_entries (
        id char(36) NOT NULL PRIMARY KEY,
        protocol varchar(20) NOT NULL UNIQUE,
        full_name varchar(200) NOT NULL,
        identifier varchar(200) NOT NULL,
        site_id varchar(100) NOT NULL,
        technician_name varchar(200) NOT NULL,
        request_type varchar(200) NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'waiting',
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        started_at datetime(6) NULL,
        completed_at datetime(6) NULL
      ) ENGINE=InnoDB;
      CREATE TABLE IF NOT EXISTS sla_config (
        id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
        expected_wait_min int NOT NULL DEFAULT 60,
        expected_service_min int NOT NULL DEFAULT 120,
        created_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB;
      CREATE INDEX queue_entries_site_id_idx ON queue_entries (site_id);
    `).catch(() => {});

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
