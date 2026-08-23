import { DataSource } from 'typeorm';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { User } from '../src/auth/user.entity';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'e2e-jwt-secret';
process.env.DB_SYNC = 'false';
process.env.DB_HOST = process.env.DB_HOST ?? '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT ?? '3306';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? 'rootsecret';

const E2E_DB_NAME = process.env.E2E_DB_NAME ?? 'ticket_triage_e2e';
process.env.DB_NAME = E2E_DB_NAME;

const ADMIN_USERNAME = 'e2e-admin';
const ADMIN_PASSWORD = 'e2e-secret-123';

async function createConnection(database: string) {
  const { appDataSourceOptions } = await import('../src/data-source');
  const ds = new DataSource({
    ...appDataSourceOptions,
    database,
    synchronize: false,
    logging: ['error'],
  });
  await ds.initialize();
  return ds;
}

// Usa o banco de sistema "mysql" para operações administrativas (root).
async function recreateTestDatabase() {
  const adminDs = await createConnection('mysql');
  try {
    await adminDs.query(`DROP DATABASE IF EXISTS \`${E2E_DB_NAME}\``);
    await adminDs.query(
      `CREATE DATABASE \`${E2E_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await adminDs.destroy();
  }
}

async function runMigrations() {
  const { appDataSourceOptions, migrations } = await import('../src/data-source');
  const ds = new DataSource({
    ...appDataSourceOptions,
    database: E2E_DB_NAME,
    synchronize: false,
    logging: ['error'],
    migrations,
  });
  await ds.initialize();
  try {
    await ds.runMigrations();
  } finally {
    await ds.destroy();
  }
}

async function dropTestDatabase() {
  const adminDs = await createConnection('mysql');
  try {
    await adminDs.query(`DROP DATABASE IF EXISTS \`${E2E_DB_NAME}\``);
  } finally {
    await adminDs.destroy();
  }
}

describe('API e2e (check-in → status → dashboard)', () => {
  const SITE_ID = 'SITE-E2E-001';

  let app: INestApplication;
  let token: string;
  let firstEntryId: string;
  let secondEntryId: string;
  let firstProtocol: string;

  beforeAll(async () => {
    await recreateTestDatabase();
    await runMigrations();

    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    await app.init();

    const usersRepository = moduleRef.get(getRepositoryToken(User), { strict: false }) as {
      save: (entity: unknown) => Promise<unknown>;
      create: (data: unknown) => unknown;
    };
    await usersRepository.save(
      usersRepository.create({
        username: ADMIN_USERNAME,
        passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 4),
      }),
    );
  });

  afterAll(async () => {
    if (app) await app.close();
    await dropTestDatabase();
  });

  it('executa o fluxo completo: check-in → status público → login → atualização de status → dashboard', async () => {
    // 1. Check-in público
    const checkInResponse = await request(app.getHttpServer())
      .post('/api/checkin')
      .send({ site_id: SITE_ID, technician_name: 'Ana Souza', request_type: 'Instalação' })
      .expect(201);

    expect(checkInResponse.body).toMatchObject({
      site_id: SITE_ID,
      technician_name: 'Ana Souza',
      request_type: 'Instalação',
      status: 'waiting',
    });
    expect(checkInResponse.body.protocol).toMatch(/^DOC-[2-9A-HJ-NP-Z]{10}$/);
    expect(checkInResponse.body.id).toEqual(expect.any(String));
    firstEntryId = checkInResponse.body.id;
    firstProtocol = checkInResponse.body.protocol;

    // 2. Status público mostra posição 1 na fila
    const statusResponse = await request(app.getHttpServer())
      .get(`/api/public/status/${SITE_ID}`)
      .expect(200);
    expect(statusResponse.body.entries).toHaveLength(1);
    expect(statusResponse.body.entries[0]).toMatchObject({
      protocol: firstProtocol,
      site_id: SITE_ID,
      status: 'waiting',
    });
    expect(statusResponse.body.position).toBe(1);

    // 3. Segundo check-in do mesmo site entra atrás na fila
    const secondCheckIn = await request(app.getHttpServer())
      .post('/api/checkin')
      .send({ site_id: SITE_ID, technician_name: 'Bruno Lima', request_type: 'Manutenção' })
      .expect(201);
    secondEntryId = secondCheckIn.body.id;

    const queuedStatus = await request(app.getHttpServer())
      .get(`/api/public/status/${SITE_ID}`)
      .expect(200);
    expect(queuedStatus.body.entries).toHaveLength(2);
    expect(queuedStatus.body.position).toBe(2);

    // 4. Rotas administrativas exigem autenticação
    await request(app.getHttpServer()).get('/api/admin/dashboard').expect(401);
    await request(app.getHttpServer())
      .patch(`/api/queue/${firstEntryId}/status`)
      .send({ status: 'in_review' })
      .expect(401);

    // 5. Login com credenciais inválidas é rejeitado
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: ADMIN_USERNAME, password: 'senha-errada' })
      .expect(401);

    // 6. Login correto emite o token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
      .expect(201);
    expect(loginResponse.body.access_token).toEqual(expect.any(String));
    token = loginResponse.body.access_token;

    // 7. Atualização de status registra started_at (início da espera SLA)
    const inReviewResponse = await request(app.getHttpServer())
      .patch(`/api/queue/${firstEntryId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in_review' })
      .expect(200);
    expect(inReviewResponse.body.status).toBe('in_review');
    expect(inReviewResponse.body.started_at).not.toBeNull();

    // 8. Finalização registra completed_at
    const approvedResponse = await request(app.getHttpServer())
      .patch(`/api/queue/${firstEntryId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'approved' })
      .expect(200);
    expect(approvedResponse.body.status).toBe('approved');
    expect(approvedResponse.body.completed_at).not.toBeNull();

    // 9. Fila ativa reflete apenas pendências
    const activeResponse = await request(app.getHttpServer())
      .get('/api/queue/active')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(activeResponse.body).toHaveLength(1);
    expect(activeResponse.body[0].id).toBe(secondEntryId);

    // 10. Dashboard consolida os totais após o ciclo
    const dashboardResponse = await request(app.getHttpServer())
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(dashboardResponse.body).toMatchObject({
      total: 2,
      waiting: 1,
      inReview: 0,
      approved: 1,
      rejected: 0,
    });
    expect(dashboardResponse.body.avgWaitMin).toEqual(expect.any(Number));
    expect(dashboardResponse.body.avgServiceMin).toEqual(expect.any(Number));
    expect(dashboardResponse.body.recent.map((r: { protocol: string }) => r.protocol)).toContain(
      firstProtocol,
    );

    // 11. Status público do último registro finalizado não tem posição
    const finalStatus = await request(app.getHttpServer())
      .get(`/api/public/status/${SITE_ID}`)
      .expect(200);
    expect(finalStatus.body.entries[0].status).toBe('waiting');
    expect(finalStatus.body.position).toBe(1);
  });

  it('rejeita check-in com payload inválido', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/checkin')
      .send({ site_id: '', technician_name: 'Ana Souza' })
      .expect(400);

    expect(response.body.message).toBe('Dados inválidos.');
    const fields = response.body.errors.map((e: { field: string }) => e.field);
    expect(fields).toContain('site_id');
    expect(fields).toContain('request_type');
  });

  it('rejeita transição para status inexistente', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/queue/${firstEntryId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'cancelado' })
      .expect(400);
    expect(response.body.message).toBe('Dados inválidos.');
  });

  it('retorna 404 ao atualizar solicitação inexistente', async () => {
    await request(app.getHttpServer())
      .patch('/api/queue/00000000-0000-4000-8000-000000000000/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'approved' })
      .expect(404);
  });

  it('rejeita token JWT malformado', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/dashboard')
      .set('Authorization', 'Bearer nao-e-um-token')
      .expect(401);
  });
});
