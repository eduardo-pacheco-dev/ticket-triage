# Ticket Triage

Fila de triagem de solicitações técnicas por SITE ID: check-in público, painel administrativo com acompanhamento em tempo real (SSE), dashboard com métricas de SLA e configuração de tipos de solicitação.

Monorepo npm com três workspaces:

| Workspace  | Stack                                           | Papel                                             |
| ---------- | ----------------------------------------------- | ------------------------------------------------- |
| `backend`  | NestJS 11, TypeORM, MariaDB, JWT, Zod           | API (`/api`)                                      |
| `frontend` | React 19, Vite 7, Carbon Design System, Zustand | SPA                                               |
| `shared`   | TypeScript + Zod                                | Schemas de validação compartilhados (fonte única) |

## Arquitetura

```
browser ──> frontend (Vite/nginx) ──/api──> backend (NestJS) ──> MariaDB
                                                 │
                                                 └── SSE /api/queue/events (eventos em tempo real)
```

- **Schemas Zod únicos** vivem em `shared/src/index.ts` e são consumidos pelo backend (pipe de validação) e pelo frontend (validação de formulários). O pacote gera CJS + ESM; o build roda automaticamente no `postinstall`.
- **Autenticação**: JWT stateless com `tokenVersion` — trocar senha ou fazer logout incrementa a versão no banco e invalida todos os tokens anteriores. Usuários recém-criados/redefinidos têm `mustChangePassword=true`, o que bloqueia os demais endpoints até a troca.
- **Tempo real**: `GET /api/queue/events` (Server-Sent Events) alimenta fila ativa, arquivados e dashboard.
- **Timezone**: datas gravadas/lidas sempre em UTC (`timezone: 'Z'` no driver + MariaDB com `default-time-zone=+00:00`). Conversão para o fuso local acontece só na UI.

## Estrutura

```
backend/src/
  auth/        login, change-password, logout, guard JWT
  queue/       check-in público, filas ativa/arquivada, status, SSE
  request-types/
  sla/         configuração de SLA esperado
  health/      GET /api/health (para orquestradores)
  common/      rate limit in-memory, pipe Zod, client-ip
  migrations/  schema versionado (TypeORM)
frontend/src/
  pages/       Home (check-in), Status público, Login, Fila, Dashboard, Arquivados, Config
  stores/      Zustand (auth, toasts)
shared/src/    schemas Zod + tipos inferidos
```

## Requisitos

- Node.js 22+
- Docker (para MariaDB local) ou uma instância MySQL/MariaDB existente

## Setup (desenvolvimento)

```bash
npm install                # instala workspaces e compila shared (postinstall)
cp backend/.env.example backend/.env
npm run db:up              # sobe MariaDB (docker compose)
npm run db:init            # migrations + seed (admin/admin)
npm run dev                # API :3000 + web :5173 (proxy /api)
```

Primeiro login com `admin/admin`: o sistema exige a troca imediata da senha.

### Variáveis de ambiente (`backend/.env`)

| Variável                                  | Default                               | Descrição                                              |
| ----------------------------------------- | ------------------------------------- | ------------------------------------------------------ |
| `PORT`                                    | `3000`                                | Porta da API                                           |
| `DB_HOST` / `DB_PORT`                     | `localhost` / `3306`                  | Conexão MariaDB                                        |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD`     | `ticket_triage` / `app` / `appsecret` | Credenciais do banco                                   |
| `DB_SYNC`                                 | `true` (dev)                          | `false` é **obrigatório** em produção (usa migrations) |
| `JWT_SECRET`                              | —                                     | Obrigatório em produção; boot falha sem ele            |
| `CORS_ORIGIN`                             | vazio                                 | Origens separadas por vírgula; vazio = same-origin     |
| `SEED_ADMIN_USER` / `SEED_ADMIN_PASSWORD` | `admin` / `admin`                     | Credenciais do seed                                    |

## Testes e qualidade

```bash
npm run lint               # ESLint nos três workspaces
npm run format             # Prettier (check: npm run format:check)
npm test                   # unitários + e2e do backend (requer o banco do docker compose)
npm run test:e2e           # somente e2e (supertest contra MariaDB real)
```

CI (GitHub Actions) roda lint + formatação + testes unitários + e2e (com serviço MariaDB) + build do frontend em cada PR.

## Deploy

```bash
export JWT_SECRET="$(openssl rand -hex 32)"
docker compose up --build -d
```

- `web` (nginx) serve a SPA em `http://localhost:8080` e faz proxy de `/api` para o serviço `api`, incluindo SSE.
- A API aplica migrations automaticamente antes de subir e expõe `GET /api/health` para health checks.

## Decisões técnicas

- **Protocolo** `DOC-XXXXXXXXXX`: aleatório criptográfico (~10¹⁵ combinações), sem colisões relevantes independentemente do tamanho da tabela.
- **Rate limit**: janela fixa in-memory por IP/IP+rota com limpeza periódica. Suficiente para instância única; ao escalar horizontalmente, substituir por Redis (`INCR` + `EXPIRE`) atrás da mesma interface.
- **Token em localStorage**: mantido por simplicidade (SPA + proxy same-origin). Cookie httpOnly eliminaria a exposição a XSS, mas exige camada anti-CSRF e refactor do fluxo de auth — reavaliar se o perfil de ameaça justificar.
