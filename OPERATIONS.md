# Local
docker compose -f docker-compose.local.yml up --build
# API → http://localhost:3000, WEB → http://localhost:5173, n8n → http://localhost:5678

# Prod (Coolify)
- Push to main → Auto Deploy on Push triggers for API & WEB.
- n8n updates: click Deploy (or enable image tracking).

# Backups
- n8n volume: backup ./.data/n8n (local) or the named volume (prod).
- In Coolify: schedule backups for the n8n volume.

# Health
- API: /health, /ready
- WEB: served by nginx image
- n8n: UI health is visible at root after boot


