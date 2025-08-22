# Coolify Deployment Guide

This guide explains how to deploy each service separately in Coolify.

## Services Overview

The application consists of 4 main services:

1. **PostgreSQL Database** - Shared database for all services
2. **Crawl4AI Service** - Web crawling and content extraction
3. **API Service** - Backend API and database operations
4. **Web Service** - React frontend

## Deployment Order

Deploy services in this order to ensure proper dependencies:

### 1. PostgreSQL Database

**Service Type**: Database (PostgreSQL)
**Configuration**:
```
Database Name: n8n
Username: n8n
Password: changeme123
```

**Environment Variables**: None required

### 2. Crawl4AI Service

**Service Type**: Docker
**Source**: Git Repository
**Build Pack**: Dockerfile
**Dockerfile Location**: `./crawl4ai/Dockerfile`

**Environment Variables**:
```
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
OLLAMA_URL=http://localhost:11434
```

**Port**: 11235
**Health Check**: `/health`

### 3. API Service

**Service Type**: Node.js
**Source**: Git Repository
**Build Pack**: Node.js
**Build Command**: `cd api && npm install`
**Start Command**: `cd api && npm start`

**Environment Variables**:
```
NODE_ENV=production
PORT=3000
DB_HOST=<postgres-service-url>
DB_PORT=5432
DB_NAME=n8n
DB_USER=n8n
DB_PASSWORD=changeme123
CRAWL4AI_API_URL=http://<crawl4ai-service-url>:11235
```

**Port**: 3000
**Health Check**: `/health`

### 4. Web Service

**Service Type**: Node.js (Static)
**Source**: Git Repository
**Build Pack**: Node.js
**Build Command**: `cd web && npm install && npm run build`
**Start Command**: `cd web && npm run preview`

**Environment Variables**:
```
VITE_API_BASE_URL=https://<api-service-domain>
```

**Port**: 4173 (Vite preview server)
**Health Check**: `/`

## Service Dependencies

### API Service Dependencies
- PostgreSQL Database (required)
- Crawl4AI Service (required)

### Web Service Dependencies
- API Service (required)

### Crawl4AI Service Dependencies
- None (standalone service)

## Domain Configuration

### Recommended Domain Structure
```
web.yourdomain.com     -> Web Service
api.yourdomain.com     -> API Service
crawl.yourdomain.com   -> Crawl4AI Service
```

### CORS Configuration
The API service is configured to allow all origins (`*`). For production, update the CORS settings in `api/src/server.js` to only allow your web domain.

## Environment Variables Reference

### API Service
| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3000` |
| `DB_HOST` | Database host | `postgres.internal` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `n8n` |
| `DB_USER` | Database user | `n8n` |
| `DB_PASSWORD` | Database password | `changeme123` |
| `CRAWL4AI_API_URL` | Crawl4AI service URL | `http://crawl4ai:11235` |

### Web Service
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | API service URL | `https://api.yourdomain.com` |

### Crawl4AI Service
| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `sk-ant-...` |
| `OLLAMA_URL` | Ollama service URL | `http://localhost:11434` |

## Health Checks

Each service provides health check endpoints:

- **API Service**: `GET /health`
- **Crawl4AI Service**: `GET /health`
- **Web Service**: `GET /` (returns HTML)

## Troubleshooting

### Common Issues

1. **API can't connect to database**
   - Check database service is running
   - Verify database credentials
   - Ensure database allows connections from API service

2. **API can't connect to Crawl4AI**
   - Check Crawl4AI service is running
   - Verify `CRAWL4AI_API_URL` environment variable
   - Test Crawl4AI health endpoint

3. **Web can't connect to API**
   - Check API service is running
   - Verify `VITE_API_BASE_URL` environment variable
   - Check CORS configuration in API

### Logs to Check

- **API Service**: Check for database connection errors and Crawl4AI connection errors
- **Crawl4AI Service**: Check for startup errors and crawling failures
- **Web Service**: Check for build errors and API connection issues

## Scaling

### Horizontal Scaling
- **API Service**: Can be scaled horizontally (multiple instances)
- **Crawl4AI Service**: Can be scaled horizontally (multiple instances)
- **Web Service**: Can be scaled horizontally (multiple instances)

### Load Balancing
- Use Coolify's built-in load balancing for multiple instances
- API service handles database connection pooling automatically

## Security Considerations

1. **Database**: Use strong passwords and restrict access
2. **API Keys**: Store AI provider API keys securely
3. **CORS**: Configure proper CORS origins for production
4. **HTTPS**: Enable HTTPS for all services
5. **Environment Variables**: Never commit sensitive data to git

## Monitoring

### Key Metrics to Monitor
- **API Service**: Response times, error rates, database connections
- **Crawl4AI Service**: Crawl success rates, response times
- **Web Service**: Page load times, user interactions
- **Database**: Connection count, query performance

### Recommended Alerts
- Service health check failures
- High error rates (>5%)
- Database connection issues
- Crawl4AI service unavailability