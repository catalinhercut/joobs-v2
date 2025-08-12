# Production Deployment Guide

## 🚀 Coolify Deployment Options

### Option 1: Full Stack Deployment (Recommended)

Deploy the entire application stack (API + Web + n8n + PostgreSQL) from the repository root:

1. **Create a new application in Coolify**
2. **Set application type to "Docker Compose"**
3. **Point to this repository's main branch**
4. **Use the root `docker-compose.yml`**
5. **Configure environment variables (see below)**

### Option 2: Individual Service Deployment

Deploy n8n as a separate service:

1. **Create a new application in Coolify**
2. **Set build pack to "Dockerfile"**
3. **Set base directory to `n8n/`**
4. **Use `n8n/docker-compose.yml`**

## 🔧 Environment Configuration

Copy `env.production.example` and configure:

```bash
# Required - Change these values
POSTGRES_PASSWORD=your_secure_db_password
N8N_BASIC_AUTH_PASSWORD=your_admin_password

# Domains - Set your actual domains
API_HOST=api.yourdomain.com
WEB_HOST=yourdomain.com
N8N_HOST=n8n.yourdomain.com
WEBHOOK_URL=https://n8n.yourdomain.com

# Optional - Customize as needed
TIMEZONE=UTC
N8N_LOG_LEVEL=info
```

## 📋 Pre-Deployment Checklist

- [ ] Set strong passwords for database and n8n admin
- [ ] Configure proper domain names
- [ ] Verify SSL certificate settings in Coolify
- [ ] Set up backup strategy for PostgreSQL
- [ ] Configure monitoring/alerts

## 🔍 Troubleshooting

### Nixpacks Detection Error
If you get "Nixpacks failed to detect the application type":
1. Change build pack from "Nixpacks" to "Dockerfile" or "Docker Compose"
2. Ensure the correct base directory is set

### Build Context Issues
- For full stack: Use repository root with `docker-compose.yml`
- For n8n only: Use `n8n/` directory with `n8n/docker-compose.yml`

### Environment Variables
- Ensure all required environment variables are set in Coolify
- Double-check domain names and SSL configuration
- Verify database credentials

## 📚 Service URLs

After deployment:
- **Web App**: `https://yourdomain.com`
- **API**: `https://api.yourdomain.com`
- **n8n**: `https://n8n.yourdomain.com`

## 🔒 Security Notes

1. **Change default passwords** before deployment
2. **Use HTTPS** for all services (configured via Coolify)
3. **Set up database backups** using Coolify's backup features
4. **Monitor logs** for any security issues
5. **Regularly update** container images
