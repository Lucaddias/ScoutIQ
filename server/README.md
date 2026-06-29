# ScoutIQ — Backend (Express API)

API REST própria do ScoutIQ. Autenticação com **JWT + bcrypt** e o **Supabase usado apenas como banco de dados** (PostgreSQL), acessado exclusivamente pelo servidor com a chave `service_role`. O front-end nunca fala direto com o Supabase.

```
React (front)  ──Bearer JWT──►  Express (este servidor)  ──service_role──►  Supabase (Postgres)
```

---

## Stack

- **Express 4** — servidor HTTP e roteamento
- **jsonwebtoken** — emissão/verificação de JWT (HS256)
- **bcryptjs** — hash de senha
- **helmet** — cabeçalhos de segurança HTTP
- **express-rate-limit** — limite de tentativas no login/registro
- **@supabase/supabase-js** — client do banco (apenas no servidor)
- **Jest + Supertest** — testes

---

## Como rodar

```bash
cd server
npm install
cp .env.example .env   # e preencha as variáveis (veja abaixo)
npm run dev            # nodemon (http://localhost:3000)
# ou
npm start              # produção
```

### Variáveis de ambiente (`server/.env`)

| Variável | Descrição |
|---|---|
| `PORT` | Porta do servidor (padrão 3000) |
| `NODE_ENV` | `development` \| `production` |
| `CLIENT_URL` | Origem do front liberada no CORS (ex.: `http://localhost:5173`) |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave **service_role** — **secreta, nunca no front** |
| `JWT_SECRET` | Segredo para assinar os JWT (use um valor longo e aleatório) |
| `JWT_EXPIRES_IN` | Validade do token (ex.: `7d`) |

> ⚠️ A `service_role` ignora o RLS e dá acesso total ao banco. Mantenha-a só no servidor.

---

## Estrutura

```
src/
├── app.js                 # monta middlewares globais (helmet, cors, json) e rotas
├── index.js               # sobe o servidor
├── config/
│   ├── env.js             # carrega variáveis de ambiente
│   └── supabase.js        # client Supabase (service_role)
├── middlewares/
│   ├── auth.js            # verifyJWT — exige Bearer token válido
│   ├── roles.js           # requireRole(...) — autorização por papel
│   ├── rateLimit.js       # authLimiter — anti força-bruta
│   ├── asyncHandler.js    # encaminha erros async ao errorHandler
│   ├── cors.js, logger.js, errorHandler.js
├── controllers/           # lógica de cada recurso
│   ├── authController.js
│   ├── athleteController.js
│   ├── userController.js
│   ├── estatisticaController.js
│   └── apoioController.js
├── routes/                # define endpoints e liga aos controllers
│   ├── index.js (agregador), auth.js, athletes.js, users.js,
│   └── estatisticas.js, apoio.js, hello.js
└── utils/
    └── httpError.js       # erro tipado com statusCode
sql/                       # migrações versionadas (aplicar no Supabase)
test/                      # testes Jest (middlewares, auth, athletes)
```

---

## Fluxo de autenticação

1. `POST /api/auth/register` ou `/login` → o servidor valida, faz `bcrypt` e devolve um **JWT** (`{ sub, email, role }`).
2. O front guarda o token e o envia em todas as chamadas: `Authorization: Bearer <token>`.
3. `verifyJWT` decodifica o token e popula `req.user`.
4. `requireRole('admin')` (quando aplicável) checa `req.user.role`.

Papéis: `user` < `scout` < `admin`.

---

## Endpoints

### Auth — `/api/auth`
| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/register` | público | cria usuário, retorna JWT |
| POST | `/login` | público | autentica, retorna JWT |
| GET | `/me` | autenticado | dados do usuário do token |

### Atletas — `/api/athletes`
| Método | Rota | Acesso |
|---|---|---|
| GET | `/` | autenticado |
| GET | `/:id` | autenticado |
| POST | `/` | scout, admin |
| PUT | `/:id` | scout, admin |
| DELETE | `/:id` | admin |

### Usuários — `/api/users`
| Método | Rota | Acesso |
|---|---|---|
| GET | `/` | admin |
| PATCH | `/:id/role` | admin |
| PATCH | `/me/upgrade` | autenticado (user → scout) |

### Estatísticas — `/api/estatisticas`
| Método | Rota | Acesso | Observação |
|---|---|---|---|
| GET | `/` | autenticado | |
| POST | `/` | scout, admin | sincroniza acumulado do atleta (RPC atômica) |
| POST | `/lote` | scout, admin | vários eventos de uma vez |
| POST | `/ajuste` | scout, admin | define valor absoluto + auditoria |
| PUT | `/:id` | scout, admin | reconcilia o acumulado |
| DELETE | `/:id` | scout, admin | decrementa o acumulado |

### Apoio à decisão — `/api/relatorios` e `/api/propostas`
CRUD escopado ao usuário (cada um vê só os seus). `GET`, `POST`, `DELETE` (+ `PATCH /relatorios/:id` para renomear).

Formato de erro padronizado: `{ "status": "error", "statusCode": <n>, "message": "..." }`.

---

## Banco de dados (migrações)

Aplicar na ordem, no SQL Editor do Supabase ou via CLI:

| Arquivo | O que faz |
|---|---|
| `sql/001_custom_auth.sql` | `password_hash` + e-mail único; desliga FK de `profiles.id` → `auth.users`; repointa FKs de relatórios/propostas |
| `sql/002_drop_role_guard.sql` | remove o trigger de role (autorização passou para o Express) |
| `sql/003_stat_rpcs.sql` | funções atômicas `increment_stat`, `set_stat`, `increment_stats` |

> O RLS permanece **ligado** de propósito: o `service_role` o ignora, mas mantê-lo é defesa extra caso a chave anon vaze.

---

## Testes

```bash
cd server
npm test        # Jest + Supertest (Supabase mockado, JWT real)
```

Cobre: middlewares (`verifyJWT`, `requireRole`), fluxo de auth (register/login/me, 400/401/409) e enforcement de papéis nos atletas (401/403/404).
