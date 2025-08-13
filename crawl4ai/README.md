# Crawl4AI Service

A web crawling service built with crawl4ai that stores results in PostgreSQL.

## Endpoints

- `POST /crawl` - Crawl a URL
- `GET /results` - Get crawl results with pagination
- `GET /health` - Health check
- `GET /` - Service info

## Usage

### Crawl a URL
```bash
curl -X POST http://localhost:4000/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### Get Results
```bash
curl "http://localhost:4000/results?limit=10&offset=0"
```

## Local Development

The service runs on port 4000 and connects to the shared PostgreSQL database.

## Database Schema

The service creates a `crawl_results` table with:
- `id` - Auto-incrementing primary key
- `url` - The crawled URL
- `title` - Page title
- `content` - Extracted content (markdown/HTML)
- `metadata` - JSON metadata from crawl4ai
- `crawled_at` - Timestamp
- `status` - success/failed/error