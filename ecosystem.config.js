'use strict';

// Configuração PM2 da API. As variáveis de ambiente vêm de backend/.env,
// carregadas aqui para o processo herdar DB_*, PORT, JWT_SECRET etc.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

module.exports = {
  apps: [
    {
      name: 'ticket-triage-api',
      cwd: path.join(__dirname, 'backend'),
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
      },
      out_file: path.join(__dirname, 'backend', 'logs', 'pm2-out.log'),
      error_file: path.join(__dirname, 'backend', 'logs', 'pm2-error.log'),
      merge_logs: true,
      time: true,
    },
  ],
};
