# Crawl4AI Service

This service uses the official crawl4ai Docker image (`unclecode/crawl4ai:0.7.3`) for web crawling and content extraction.

## Features

- **Official Crawl4AI**: Uses the latest stable version of crawl4ai
- **AI Integration**: Supports OpenAI, Anthropic, and Ollama for content extraction
- **Multiple Endpoints**: Provides various endpoints for different use cases
- **High Performance**: Built with Python and optimized for speed

## API Endpoints

The service runs on port 11235 and provides the following endpoints:

### Main Endpoints
- `POST /crawl` - Crawl URLs and return structured data
- `POST /md` - Get markdown content from URLs
- `POST /html` - Get processed HTML content
- `POST /screenshot` - Generate screenshots
- `POST /pdf` - Generate PDF documents

### Utility Endpoints
- `GET /health` - Health check
- `GET /docs` - API documentation (Swagger UI)
- `GET /openapi.json` - OpenAPI specification

## Environment Variables

```bash
# AI Provider Configuration
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
OLLAMA_URL=http://localhost:11434
```

## Usage Examples

### Basic Crawling
```bash
curl -X POST http://localhost:11235/crawl \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://example.com"]}'
```

### Markdown Extraction
```bash
curl -X POST http://localhost:11235/md \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### AI-Powered Extraction
```bash
curl -X POST http://localhost:11235/md \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "f": "llm",
    "q": "Extract all product names and prices"
  }'
```

## Deployment

### Docker
```bash
docker build -t crawl4ai-service .
docker run -p 11235:11235 crawl4ai-service
```

### Docker Compose
The service is configured in the main docker-compose files and will be automatically started with the other services.

## Documentation

For complete API documentation, visit `/docs` endpoint when the service is running, or check the official crawl4ai documentation at: https://github.com/unclecode/crawl4ai