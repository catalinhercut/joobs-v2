# COOLIFY_DEPLOYMENT_PLAYBOOK.md

## Scope

Stand up a stack with:

* `api` – Node.js (ESM) HTTP API (Node **24**)
* `web` – React (Vite) SPA (Node **24**)
* `crawl4ai` – Web crawling service with crawl4ai (Node **24**)
* `n8n` – automation service (`n8nio/n8n:latest`)
* `postgres` – PostgreSQL database (shared by n8n and crawl4ai)

Run **locally** via Docker for dev, and deploy to **production** with **Coolify on Hetzner** (Render-style UI for env vars, TLS, deploys). Plan for a future **staging** env.

Assumptions:

* You own a domain, e.g. `example.com`.
* Supabase is **managed**; keys provided as env.

---

## 0) High-level checklist

1. **Local dev**: `docker-compose.local.yml` (hot-reload dev servers on host ports).
2. **Prod (Coolify)**: create resources in UI, **enable Auto Deploy on Push**, set envs + domains with Let’s Encrypt.
3. **Staging (later)**: mirror Coolify setup with `*.staging.example.com` and a separate Environment.

---

## 1) Repository layout to create

GPT-5: create exactly this tree and files.

```
repo-root/
  api/
    src/
      server.js
    package.json
    .env.example
    Dockerfile
    README.md
  web/
    index.html
    vite.config.js
    src/
      main.jsx
      App.jsx
    package.json
    .env.example
    Dockerfile
    README.md
  n8n/
    .env.example
    README.md
  
  .env.local
  docker-compose.local.yml
  OPERATIONS.md
  .dockerignore
```

---

## 2) Environment variable matrix

### 2.1 Shared (used across services)

Add to **`.env.local`** for local dev. For prod, set variables in **Coolify** at the Environment level:

```
# shared
NODE_ENV=production
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-supabase-anon-key>

# (Coolify handles TLS automatically when you attach domains)
```

### 2.2 API-specific

* Local: define in **`.env.local`** or `api/.env.example` (copied to `.env` for non-docker local)
* Prod: set in **Coolify** “Variables” of the API resource

```
PORT=3000
API_BASE_URL=https://api.example.com
LOG_LEVEL=info
```

### 2.3 Web (Vite) build-time envs

> Must be prefixed with `VITE_` and set as **Build Variables** in Coolify.

```
VITE_API_BASE_URL=https://api.example.com
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
```

For **local**, set in `.env.local`:

```
VITE_API_BASE_URL=http://localhost:3000
```

### 2.4 n8n

* Local file **`n8n/.env.example`** (copy to `n8n/.env.local`), prod set in Coolify:

```
N8N_HOST=n8n.example.com
N8N_PROTOCOL=https
WEBHOOK_URL=https://n8n.example.com/
N8N_ENCRYPTION_KEY=<long-random-string>
N8N_SECURE_COOKIE=true
GENERIC_TIMEZONE=Europe/Zurich
# optional basic auth
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=<admin>
N8N_BASIC_AUTH_PASSWORD=<strong-password>
```

For **local dev**, you can omit `HOST/PROTOCOL/WEBHOOK_URL` and just use port 5678.

---

## 3) API (Node 24, ESM)

### 3.1 `api/package.json`

```json
{
  "name": "api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js"
  },
  "dependencies": {}
}
```

### 3.2 `api/src/server.js`

```js
import http from "node:http";
import { URL } from "node:url";

export const startServer = (port = Number(process.env.PORT ?? 3000)) => {
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, `http://${req.headers.host}`);
    res.setHeader("content-type", "application/json; charset=utf-8");

    if (u.pathname === "/health") {
      res.writeHead(200);
      return res.end(JSON.stringify({ status: "ok" }));
    }

    if (u.pathname === "/ready") {
      res.writeHead(200);
      return res.end(JSON.stringify({ ready: true }));
    }

    if (u.pathname === "/") {
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true, time: new Date().toISOString() }));
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  });

  server.listen(port, () => {
    console.log(`API listening on :${port}`);
  });

  return server;
};

startServer();
```

### 3.3 `api/.env.example`

```
PORT=3000
API_BASE_URL=http://localhost:3000
NODE_ENV=development
```

### 3.4 `api/Dockerfile` (prod image)

```Dockerfile
# syntax=docker/dockerfile:1
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node","src/server.js"]
```

---

## 4) WEB (React + Vite, Node 24)

### 4.1 `web/package.json`

```json
{
  "name": "web",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --port 5173"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.0"
  }
}
```

### 4.2 `web/vite.config.js`

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: "dist" }
});
```

### 4.3 `web/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
  </html>
```

### 4.4 `web/src/main.jsx`

```jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<App />);
```

### 4.5 `web/src/App.jsx`

```jsx
import React from "react";

export const App = () => {
  const [ping, setPing] = React.useState(null);

  React.useEffect(() => {
    const call = async () => {
      const base = import.meta.env.VITE_API_BASE_URL;
      const res = await fetch(`${base}/health`);
      setPing({ status: res.status, at: new Date().toISOString() });
    };
    call().catch(console.error);
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <h1>Vite + React</h1>
      <p>API base: {import.meta.env.VITE_API_BASE_URL}</p>
      <pre>{JSON.stringify(ping, null, 2)}</pre>
    </main>
  );
};

export default App;
```

### 4.6 `web/.env.example`

```
VITE_API_BASE_URL=http://localhost:3000
```

### 4.7 `web/Dockerfile` (prod static image)

```Dockerfile
# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Optional: drop a minimal nginx.conf here if you need SPA fallback
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1
```

---

## 5) n8n

### 5.1 `n8n/.env.example`

```
# local-friendly
GENERIC_TIMEZONE=Europe/Zurich
N8N_ENCRYPTION_KEY=<dev-only-random-string>
```

### 5.2 `n8n/README.md`

* Local UI on [http://localhost:5678](http://localhost:5678)
* In prod, set `N8N_HOST/N8N_PROTOCOL/WEBHOOK_URL` and add a persistent volume.

---

## 6) Docker Compose — **Local Dev**

### 6.1 `.env.local` (root)

```
# shared
NODE_ENV=development
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=local-anon-key

# web
VITE_API_BASE_URL=http://localhost:3000
```

### 6.2 `docker-compose.local.yml`

```yaml
version: "3.9"

services:
  api:
    image: node:24-alpine
    working_dir: /app
    env_file:
      - ./.env.local
      - ./api/.env.example
    volumes:
      - ./api:/app
      - api_node_modules:/app/node_modules
    command: sh -c "npm i && npm run dev"
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 10s
      timeout: 3s
      retries: 5
      start_period: 5s

  web:
    image: node:24-alpine
    working_dir: /app
    env_file:
      - ./.env.local
      - ./web/.env.example
    volumes:
      - ./web:/app
      - web_node_modules:/app/node_modules
    command: sh -c "npm i && npm run dev -- --host 0.0.0.0"
    ports:
      - "5173:5173"

  n8n:
    image: n8nio/n8n:latest
    env_file:
      - ./n8n/.env.example
    environment:
      - N8N_DIAGNOSTICS_ENABLED=false
    volumes:
      - ./.data/n8n:/home/node/.n8n
    ports:
      - "5678:5678"
    # healthcheck optional; n8n takes a bit to boot

volumes:
  api_node_modules:
  web_node_modules:
```

**Usage (local):**

```bash
docker compose -f docker-compose.local.yml up --build
# visit: http://localhost:3000 (API), http://localhost:5173 (web), http://localhost:5678 (n8n)
```

---



## 7) Coolify — **Production (Hetzner) with Auto Deploy on Push**

1. Create a Hetzner Cloud VM with **Coolify** (App image).
2. Add DNS A records:

   * `api.example.com` → server IP
   * `app.example.com` → server IP
   * `n8n.example.com` → server IP
3. In **Coolify**:

   * **Team → Project → Environment: production**
   * **Variables → Shared**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NODE_ENV=production`
   * **Application: API**

     * Source: GitHub repo path `repo-root/api`
     * Build Pack: **Nixpacks**
     * Start Command: `npm start`
     * Health Check: `GET /health`
     * Port: `3000`
     * Domain: `api.example.com` (enable HTTPS)
     * **Auto Deploy on Push**: **enabled**
   * **Application: WEB (Static)**

     * Source: `repo-root/web`
     * Build command: `npm ci && npm run build`
     * Output dir: `dist`
     * Domain: `app.example.com` (HTTPS)
     * Build Variables: `VITE_*` from §2.3
     * **Auto Deploy on Push**: **enabled**
   * **Service: n8n (Docker Image)**

     * Image: `n8nio/n8n:latest`
     * Domain: `n8n.example.com` (HTTPS)
     * Variables: from §2.4 (prod)
     * Persistent Storage: mount volume to `/home/node/.n8n`

> No GitHub Actions. The Coolify webhooks + Auto Deploy on Push handle CI/CD.

---

## 8) Staging (later)

* Create a second **Environment** in the **same Project** (Coolify) named **staging**.
* Domains:

  * `api.staging.example.com`, `app.staging.example.com`, `n8n.staging.example.com`
* Variables:

  * Use **Environment-scoped** values (e.g., a staging Supabase project).
* Build/deploy:

  * Same as prod; enable **Auto Deploy on Push** for the staging branch (e.g., `develop`).

Optional: add `.env.staging` files to document values, and a `docker-compose.staging.yml` if you ever need to mirror staging without Coolify.

---

## 9) OPERATIONS.md (commands & tips)

Create this content in `OPERATIONS.md`:

```
# Local
docker compose -f docker-compose.local.yml up --build
# API → http://localhost:3000, WEB → http://localhost:5173, n8n → http://localhost:5678

# Prod (Coolify)
- Push to main → Auto Deploy on Push triggers for API & WEB.
- n8n updates: click Deploy (or enable image tracking).

# Prod (fallback compose)
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build

# Backups
- n8n volume: backup ./.data/n8n (local) or the named volume (prod).
- In Coolify: schedule backups for the n8n volume.

# Health
- API: /health, /ready
- WEB: served by nginx image
- n8n: UI health is visible at root after boot
```

---

## 10) `.dockerignore` (root)

```
**/node_modules
**/.DS_Store
**/dist
**/build
**/.env
**/.env.local
**/.env.prod
.data
```

---

## 11) Post-deploy smoke tests

* Local:

  * `curl -I http://localhost:3000/health` → 200
  * Open `http://localhost:5173` → shows API health JSON
  * `http://localhost:5678` → n8n UI
* Prod (Coolify):

  * `https://api.example.com/health` → 200
  * `https://app.example.com/` → loads SPA
  * `https://n8n.example.com/` → onboarding

---

### Notes for GPT-5 (Cursor)

* Keep **ESM** everywhere; export functions **at definition** (e.g., `export const startServer = ...`).
* Use **Node 24** base images in Dockerfiles and local compose.
* Do **not** add GitHub Actions; **enable Auto Deploy on Push in Coolify**.
* Create all files exactly as specified and highlight placeholders to fill:

  * Domains (`example.com`), Supabase keys, n8n encryption key, emails.


