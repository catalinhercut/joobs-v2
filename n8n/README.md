# n8n Automation Platform

A powerful workflow automation platform for connecting various services and APIs.

## 🚀 Quick Start

### Local Development
From the **root project directory**:

```bash
# Start the complete stack (api, web, n8n, postgres)
docker-compose -f docker-compose.local.yml up -d

# View n8n logs
docker-compose -f docker-compose.local.yml logs -f n8n

# Access n8n UI
open http://localhost:5678
```

**Default credentials**: `admin` / `admin123`

### Production Deployment

**Option 1: As part of main project** (recommended for integrated setups)
- n8n is automatically included when deploying the main project to Coolify
- Uses the configuration in `../docker-compose.local.yml`

**Option 2: Standalone deployment** (for dedicated n8n instances)
```bash
# Copy and configure environment
cp env.example .env
# Edit .env with your production values

# Deploy to Coolify using this directory's docker-compose.yml
```

## 📁 Project Structure

```
n8n/
├── Dockerfile             # Production build with workflows
├── docker-compose.yml     # Standalone production deployment
├── env.example           # Environment variables template  
├── workflows/            # Sample automation workflows
│   ├── sample-webhook-automation.json
│   └── api-monitoring-automation.json
└── README.md             # This file
```

**Local Development**: Uses `../docker-compose.local.yml` (integrated with web/api)
**Production**: Can use either integrated or standalone deployment

## 🔧 Configuration

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `N8N_HOST` | Domain for n8n instance | `localhost` |
| `N8N_PROTOCOL` | HTTP protocol (http/https) | `http` |
| `WEBHOOK_URL` | Base URL for webhooks | `http://localhost:5678` |
| `POSTGRES_PASSWORD` | Database password | `n8n_password` |
| `N8N_BASIC_AUTH_USER` | Admin username | `admin` |
| `N8N_BASIC_AUTH_PASSWORD` | Admin password | `admin123` |
| `TIMEZONE` | Server timezone | `UTC` |

### Authentication
- Basic authentication is enabled by default
- Default credentials: `admin` / `admin123`
- **Change these in production!**

## 📋 Sample Workflows

### 1. Webhook Automation (`sample-webhook-automation.json`)
- **Trigger**: HTTP webhook endpoint
- **Purpose**: Process user signups and send welcome emails
- **Features**:
  - Webhook listener on `/webhook-sample`
  - Conditional logic based on action type
  - User data processing
  - Email integration
  - Response handling

**Test the webhook**:
```bash
curl -X POST http://localhost:5678/webhook/webhook-sample \
  -H "Content-Type: application/json" \
  -d '{
    "action": "user_signup",
    "user_id": "123",
    "email": "user@example.com",
    "name": "John Doe",
    "source": "web"
  }'
```

### 2. API Monitoring (`api-monitoring-automation.json`)
- **Trigger**: Cron schedule (every 5 minutes)
- **Purpose**: Monitor API health and send alerts
- **Features**:
  - Automated health checks
  - Response time monitoring
  - Slack notifications for issues
  - Status logging

## 🔧 Operations

### Useful Commands
```bash
# View running containers
docker-compose ps

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Update to latest n8n version
docker-compose pull && docker-compose up -d

# Access database
docker-compose exec postgres psql -U n8n -d n8n

# Backup database
docker-compose exec postgres pg_dump -U n8n n8n > backup.sql

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ data loss)
docker-compose down -v
```

### Importing Workflows
1. Copy JSON files to the `workflows/` directory
2. Restart the n8n container
3. Workflows will be available in the n8n UI

### Scaling & Performance
- Use external PostgreSQL for production
- Enable n8n metrics for monitoring
- Consider Redis for queue management
- Use multiple n8n instances behind a load balancer

## 🔒 Security Best Practices

1. **Change default passwords**
2. **Use HTTPS in production**
3. **Secure database credentials**
4. **Enable firewall rules**
5. **Regular security updates**
6. **Limit webhook access**
7. **Use environment-specific configs**

## 🐛 Troubleshooting

### Common Issues
1. **Container won't start**: Check environment variables and ports
2. **Database connection failed**: Verify PostgreSQL is healthy
3. **Webhooks not working**: Check network configuration and firewall
4. **Workflows not loading**: Ensure JSON syntax is valid

### Debug Commands
```bash
# Check container health
docker-compose exec n8n curl -f http://localhost:5678/healthz

# View detailed logs
docker-compose logs --tail=100 n8n

# Check database connectivity
docker-compose exec n8n npm run typeorm -- migration:show
```

## 📚 Resources

- [n8n Documentation](https://docs.n8n.io/)
- [n8n Community](https://community.n8n.io/)
- [Workflow Templates](https://n8n.io/workflows/)
- [Node Documentation](https://docs.n8n.io/integrations/)

## 🤝 Contributing

1. Add new workflows to the `workflows/` directory
2. Update this README with workflow descriptions
3. Test workflows in development environment
4. Follow n8n best practices for workflow design

---

**Note**: This setup is ready for Coolify deployment. The Traefik labels in `docker-compose.yml` will automatically configure SSL and routing when deployed through Coolify.
