# Digital Library — Production Deployment Guide

Deploy the **React (Vite) frontend** on **Netlify**, the **Node.js microservices** on **Railway**, and automate builds with **GitHub Actions**.

| Layer | Platform | Public URL |
|-------|----------|------------|
| Frontend SPA | Netlify | `https://the-boook-club.netlify.app` |
| API Gateway | Railway | `https://<api-gateway>.up.railway.app` |
| Microservices | Railway (private + HTTP health) | Internal / per-service URLs |
| MySQL | Railway MySQL | `MYSQL_URL` (private) |
| Redis | Railway Redis | `REDIS_URL` (private) |
| RabbitMQ | CloudAMQP / Railway plugin | `RABBITMQ_URL` (private) |

---

## 1. Recommended repository layout

```
digital-library/
├── .github/workflows/
│   ├── frontend.yml          # Lint, build, Netlify deploy on main
│   └── backend.yml           # Validate services, optional Railway redeploy
├── frontend/
│   ├── netlify.toml          # Netlify build + SPA redirects
│   ├── public/_redirects     # SPA fallback (backup)
│   ├── .env.example          # VITE_GATEWAY_TARGET
│   └── src/config/apiBase.js # Uses import.meta.env.VITE_GATEWAY_TARGET
├── microservices/
│   ├── .env.example          # Shared backend variable reference
│   ├── docker-compose.yml    # Local full stack (optional)
│   ├── api-gateway/          # Public HTTP entry (port from PORT)
│   ├── auth-service/
│   ├── user-service/
│   ├── book-service/
│   └── borrow-service/
└── DEPLOYMENT.md             # This file
```

**Rule:** Only variables prefixed with `VITE_` are exposed to the browser. All JWT, DB, Redis, and RabbitMQ secrets stay on Railway.

---

## 2. Prerequisites

1. GitHub repository with `main` branch.
2. [Netlify](https://www.netlify.com/) account.
3. [Railway](https://railway.app/) account.
4. CLI tools (optional): `npm`, Railway CLI, Netlify CLI.

Generate strong secrets (32+ characters):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use the **same** `ACCESS_SECRET` on `auth-service` and `api-gateway`.

---

## 3. Railway — backend architecture

### 3.1 Create a Railway project

1. **New Project** → **Deploy from GitHub repo** → select this repository.
2. Add plugins:
   - **MySQL** (one database for all services, or separate DBs per service if you prefer isolation).
   - **Redis** (for api-gateway response cache).
   - **RabbitMQ** — use [CloudAMQP](https://www.cloudamqp.com/) or a RabbitMQ template; copy `AMQP_URL` into `RABBITMQ_URL`.

### 3.2 Create one Railway service per component

Create **six services** in the same project (monorepo pattern):

| Service name | Root directory | Dockerfile path | Start command |
|--------------|----------------|-----------------|---------------|
| `auth-service` | `microservices` | `auth-service/Dockerfile` | `node index.js` (in image) |
| `user-service` | `microservices` | `user-service/Dockerfile` | same |
| `book-service` | `microservices` | `book-service/Dockerfile` | same |
| `borrow-service` | `microservices` | `borrow-service/Dockerfile` | same |
| `api-gateway` | `microservices` | `api-gateway/Dockerfile` | same |

For each service in Railway **Settings**:

- **Root Directory:** `microservices`
- **Builder:** Dockerfile (path from `railway.toml` in each service folder)
- **Watch paths:** service folder, `observability/`, `proto/`
- **Health check path:** `/health`

Railway injects **`PORT`** for HTTP. Do not hardcode listen ports in production.

### 3.3 gRPC wiring (gateway → microservices)

The gateway talks to backends over **gRPC** (not public HTTP for users/books/borrow). In Railway:

1. Enable **private networking** between services.
2. On **api-gateway**, set:

```env
NODE_ENV=production
CONSUL_ENABLED=false
AUTH_SERVICE_URL=${{auth-service.RAILWAY_PUBLIC_DOMAIN}}   # or private HTTP URL
AUTH_SERVICE_GRPC=${{auth-service.RAILWAY_PRIVATE_DOMAIN}}:5010
USER_SERVICE_GRPC=${{user-service.RAILWAY_PRIVATE_DOMAIN}}:5012
BOOK_SERVICE_GRPC=${{book-service.RAILWAY_PRIVATE_DOMAIN}}:5013
BORROW_SERVICE_GRPC=${{borrow-service.RAILWAY_PRIVATE_DOMAIN}}:5014
```

Replace `${{service.RAILWAY_*}}` with Railway’s **variable references** from the dashboard (Variables → Add Reference).

On each microservice, keep fixed gRPC ports:

| Service | `*_GRPC_PORT` |
|---------|----------------|
| auth-service | `AUTH_GRPC_PORT=5010` |
| user-service | `USER_GRPC_PORT=5012` |
| book-service | `BOOK_GRPC_PORT=5013` |
| borrow-service | `BORROW_GRPC_PORT=5014` |

Expose gRPC ports in Railway **Networking** if required by your plan (private network often uses internal DNS without public exposure).

### 3.4 Environment variables per service

Copy from `microservices/.env.example` and `microservices/<service>/.env.example`.

**auth-service**

```env
NODE_ENV=production
MYSQL_URL=${{MySQL.MYSQL_URL}}
ACCESS_SECRET=<shared-secret>
REFRESH_SECRET=<shared-secret>
AUTH_GRPC_PORT=5010
CONSUL_ENABLED=false
```

**user-service / book-service / borrow-service**

```env
NODE_ENV=production
MYSQL_URL=${{MySQL.MYSQL_URL}}
RABBITMQ_URL=<amqp-url>
USER_GRPC_PORT=5012   # adjust per service
CONSUL_ENABLED=false
```

**api-gateway** (public entry — use this URL in the frontend)

```env
NODE_ENV=production
ACCESS_SECRET=<same-as-auth>
REDIS_URL=${{Redis.REDIS_URL}}
CORS_ORIGIN=https://your-app.netlify.app
AUTH_SERVICE_URL=https://<auth-service-public-domain>
AUTH_SERVICE_GRPC=<auth-private-host>:5010
USER_SERVICE_GRPC=<user-private-host>:5012
BOOK_SERVICE_GRPC=<book-private-host>:5013
BORROW_SERVICE_GRPC=<borrow-private-host>:5014
CONSUL_ENABLED=false
```

Generate the gateway’s public URL: **api-gateway** → **Settings** → **Networking** → **Generate domain**.  
That URL is your **`VITE_GATEWAY_TARGET`** (no trailing slash).

### 3.5 Deploy order

1. MySQL, Redis, RabbitMQ plugins.
2. `auth-service` → wait for healthy `/health`.
3. `user-service`, `book-service`, `borrow-service`.
4. `api-gateway` last (depends on gRPC targets and Redis).

### 3.6 Verify backend

```bash
curl https://<api-gateway-domain>/health
```

Expect `status: "UP"` and dependency checks when all services are running.

---

## 4. Netlify — frontend

### 4.1 Connect the site

1. Netlify → **Add new site** → **Import from Git**.
2. Select the repository.
3. Build settings (also defined in `frontend/netlify.toml`):

| Setting | Value |
|---------|--------|
| Base directory | `frontend` |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node version | `20` |

### 4.2 Environment variables (Netlify UI)

| Variable | Example | Notes |
|----------|---------|--------|
| `VITE_GATEWAY_TARGET` | `https://api-gateway-xxx.up.railway.app` | **Required** at build time |

Redeploy after changing `VITE_*` variables (they are baked into the static bundle).

### 4.3 SPA routing

`frontend/netlify.toml` and `frontend/public/_redirects` send all routes to `index.html` so React Router works on refresh.

### 4.4 Local development

```bash
cd frontend
cp .env.example .env.local
# VITE_GATEWAY_TARGET=http://127.0.0.1:4000
npm install
npm run dev
```

With an empty `VITE_GATEWAY_TARGET` in dev, `apiBase.js` returns `""` and Vite proxies `/auth`, `/users`, etc. to the gateway (see `vite.config.js`).

---

## 5. GitHub Actions CI/CD

Workflows live in `.github/workflows/`.

### 5.1 Frontend (`frontend.yml`)

On every push/PR touching `frontend/`:

- `npm ci` → `npm run lint` → `npm run build` (fails on errors).

On push to **`main`**:

- Requires secret `VITE_GATEWAY_TARGET`.
- Deploys `frontend/dist` to Netlify when `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` are set.

### 5.2 Backend (`backend.yml`)

On every push/PR touching `microservices/`:

- Installs and syntax-checks each service + observability package.

On push to **`main`** (optional):

- `RAILWAY_TOKEN` → `railway redeploy` (if configured).

**Recommended:** Also enable **Railway GitHub integration** per service so every merge to `main` triggers a native Railway build without CLI.

### 5.3 GitHub repository secrets

| Secret | Used by | Description |
|--------|---------|-------------|
| `VITE_GATEWAY_TARGET` | Frontend workflow + Netlify build | Public api-gateway URL |
| `NETLIFY_AUTH_TOKEN` | Frontend deploy | Netlify personal access token |
| `NETLIFY_SITE_ID` | Frontend deploy | Site UUID from Netlify |
| `RAILWAY_TOKEN` | Backend deploy (optional) | Railway account token |
| `INTEGRATION_GATEWAY_URL` | Integration tests (optional) | Deployed gateway for CI tests |
| `ACCESS_SECRET` | Integration tests (optional) | Match production JWT secret |

**Do not** add backend secrets to Netlify.

---

## 6. Security checklist

- [ ] `ACCESS_SECRET` and `REFRESH_SECRET` are long random values; identical `ACCESS_SECRET` on auth + gateway.
- [ ] No `.env` files committed (see root `.gitignore`).
- [ ] `NODE_ENV=production` on all Railway services.
- [ ] `CORS_ORIGIN` lists only your Netlify URL(s).
- [ ] Frontend uses only `VITE_GATEWAY_TARGET` (no API keys in the bundle).
- [ ] `MYSQL_URL` and Redis/RabbitMQ URLs are private, not exposed to the browser.
- [ ] Consul disabled in production (`CONSUL_ENABLED=false`).

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| CORS error in browser | Gateway `CORS_ORIGIN` missing Netlify URL | Add exact origin `https://....netlify.app` |
| 502 on `/auth/*` | `AUTH_SERVICE_URL` wrong or auth down | Check auth `/health`, fix URL |
| gRPC errors in gateway logs | Wrong `*_SERVICE_GRPC` host/port | Use Railway private domains + fixed gRPC ports |
| Blank API calls in production | `VITE_GATEWAY_TARGET` not set at Netlify build | Set variable, trigger rebuild |
| `ACCESS_SECRET must be set` on boot | Missing secret in production | Set env on auth + gateway |
| RabbitMQ warnings | `RABBITMQ_URL` invalid | Fix URL; consumers optional for basic HTTP |

---

## 8. Quick reference — environment variables

### Frontend (Netlify only)

```env
VITE_GATEWAY_TARGET=https://<api-gateway>.up.railway.app
```

### Backend (Railway — see `microservices/.env.example`)

```env
NODE_ENV=production
PORT=<injected-by-railway>
MYSQL_URL=mysql://...
ACCESS_SECRET=...
REFRESH_SECRET=...
REDIS_URL=redis://...
RABBITMQ_URL=amqp://...
CORS_ORIGIN=https://<netlify-app>.netlify.app
AUTH_SERVICE_URL=...
AUTH_SERVICE_GRPC=host:5010
USER_SERVICE_GRPC=host:5012
BOOK_SERVICE_GRPC=host:5013
BORROW_SERVICE_GRPC=host:5014
CONSUL_ENABLED=false
```

---

## 9. Alternative: Netlify-only deploy hook

If you prefer Netlify’s built-in Git deploy instead of GitHub Actions for the frontend:

1. Connect the repo in Netlify UI (section 4).
2. Disable the deploy step in `frontend.yml` or remove `NETLIFY_*` secrets.
3. Keep the workflow **build** job to fail PRs when lint/build breaks.

Railway can use the same pattern: native GitHub deploy on `main` without `RAILWAY_TOKEN`.

---

*Digital Library System — enterprise deployment template for university / production coursework.*
