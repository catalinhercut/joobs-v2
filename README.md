# Web Crawler Dashboard

A modern web crawling application with AI-powered content extraction, built with React, Node.js, and PostgreSQL.

## Features

### 🚀 Enhanced Crawling
- **URL Crawling**: Extract content from any website
- **AI Prompts**: Use custom prompts to extract specific information
- **Metadata Extraction**: Automatic extraction of titles, descriptions, and meta tags
- **Error Handling**: Robust error handling and status tracking

### 🎨 Modern UI with shadcn/ui
- **Responsive Design**: Works on desktop and mobile
- **Dark/Light Mode**: Built-in theme support
- **Component Library**: Using shadcn/ui components
- **Tailwind CSS**: Modern styling with utility classes

### 📊 Data Management
- **PostgreSQL Storage**: Persistent data storage
- **Crawl History**: Browse all your crawled websites
- **Search & Filter**: Find specific crawls quickly
- **Pagination**: Handle large datasets efficiently

### 🔍 Detailed Views
- **Crawl Details**: View complete crawl information
- **Content Preview**: See extracted content
- **Metadata Display**: View all extracted metadata
- **Status Tracking**: Monitor crawl success/failure

## Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Web      │    │     API     │    │   Crawl4AI  │    │ PostgreSQL  │
│   (React)   │◄──►│  (Node.js)  │◄──►│  (Official) │◄──►│ (Database)  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

- **Web**: React frontend with shadcn/ui components
- **API**: Node.js proxy server for routing requests and database operations
- **Crawl4AI**: Official crawl4ai Docker image (unclecode/crawl4ai:0.7.3)
- **PostgreSQL**: Database for storing crawl results

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for development)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd web-crawler-dashboard
   ```

2. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Web Interface: http://localhost:5173
   - API: http://localhost:3000
   - Crawl4AI Service: http://localhost:11235

### Development Setup

1. **Install dependencies**
   ```bash
   # Web frontend
   cd web && npm install

   # API server
   cd ../api && npm install

   # Crawl4AI service uses official Docker image (no npm install needed)
   ```

2. **Start development servers**
   ```bash
   # Start all services with Docker Compose
   docker-compose -f docker-compose.local.yml up -d

   # Or start individually:
   # Terminal 1 - Database & Crawl4AI
   docker-compose -f docker-compose.local.yml up postgres crawl4ai

   # Terminal 2 - API server (development mode)
   cd api && npm run dev

   # Terminal 3 - Web frontend (development mode)
   cd web && npm run dev
   ```

## Usage

### Basic Crawling
1. Enter a URL in the crawl form
2. Optionally add an extraction prompt
3. Click "Start Crawl" to begin
4. View results in the dashboard

### Advanced Features
- **Custom Prompts**: Add specific instructions for content extraction
- **History Search**: Use the search bar to find specific crawls
- **Detail Views**: Click "Details" to see complete crawl information
- **Export Data**: Access raw data through the API endpoints

## API Endpoints

### Crawling
- `POST /crawl` - Start a new crawl
  ```json
  {
    "url": "https://example.com",
    "prompt": "Extract all product names and prices"
  }
  ```

### Data Retrieval
- `GET /crawl/results` - Get all crawl results (paginated)
- `GET /crawl/results/:id` - Get specific crawl result
- `GET /health` - Health check

## Database Schema

```sql
CREATE TABLE crawl_results (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT,
  content TEXT,
  metadata JSONB,
  crawled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'success'
);
```

## Environment Variables

### Web (.env)
```
VITE_API_BASE_URL=http://localhost:3000
```

### API (.env)
```
PORT=3000
DB_HOST=postgres
DB_PORT=5432
DB_NAME=n8n
DB_USER=n8n
DB_PASSWORD=changeme123
CRAWL4AI_API_URL=http://crawl4ai:11235
```

### Crawl4AI (.env)
```
# Using official crawl4ai Docker image
# AI Configuration (optional)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
OLLAMA_URL=http://localhost:11434
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details