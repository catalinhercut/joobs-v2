import http from "node:http";
import { URL } from "node:url";
import axios from "axios";
import puppeteer from "puppeteer";
import pg from "pg";
// Environment variables are passed from docker-compose, no need for dotenv

const { Pool } = pg;

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || "postgres",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "n8n",
  user: process.env.DB_USER || "n8n",
  password: process.env.DB_PASSWORD || "changeme123",
};

console.log("Database config:", {
  ...dbConfig,
  password: "***"
});

const pool = new Pool(dbConfig);

// Initialize database tables
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crawl_results (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT,
        content TEXT,
        metadata JSONB,
        crawled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'success'
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_crawl_results_crawled_at 
      ON crawl_results(crawled_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_crawl_results_status 
      ON crawl_results(status)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_crawl_results_url 
      ON crawl_results(url)
    `);

    console.log("Database tables and indexes initialized");
  } catch (error) {
    console.error("Database initialization error:", error);
  }
}

// Browser instance for reuse
let browser = null;

// AI-powered content extraction
async function extractContentWithAI(content, prompt, metadata = {}) {
  if (!prompt || prompt.trim().length === 0) {
    return content;
  }

  try {
    // Get AI configuration from environment
    const aiConfig = getAIConfig();
    
    if (aiConfig.enabled) {
      console.log(`Using AI extraction with ${aiConfig.provider} - ${aiConfig.model}`);
      return await extractWithAI(content, prompt, aiConfig);
    } else {
      console.log('AI extraction disabled, using local processing');
      // Fallback to intelligent local processing
      return await extractWithLocalProcessing(content, prompt, metadata);
    }
  } catch (error) {
    console.error('AI extraction error:', error);
    console.log('Falling back to local processing');
    
    try {
      return await extractWithLocalProcessing(content, prompt, metadata);
    } catch (fallbackError) {
      console.error('Local processing also failed:', fallbackError);
      return `Extraction Request: "${prompt}"\n\n--- Original Content (Extraction Failed) ---\n${content}`;
    }
  }
}

function getAIConfig() {
  const provider = process.env.AI_PROVIDER || 'openai';
  const model = process.env.AI_MODEL || getDefaultModel(provider);
  const apiKey = getAPIKey(provider);
  const maxTokens = parseInt(process.env.AI_MAX_TOKENS) || 2000;
  const temperature = parseFloat(process.env.AI_TEMPERATURE) || 0.1;
  
  return {
    enabled: !!apiKey || provider === 'ollama',
    provider,
    model,
    apiKey,
    maxTokens,
    temperature
  };
}

function getDefaultModel(provider) {
  const defaults = {
    openai: 'gpt-3.5-turbo',
    anthropic: 'claude-3-haiku-20240307',
    ollama: 'llama2'
  };
  return defaults[provider] || 'gpt-3.5-turbo';
}

function getAPIKey(provider) {
  switch (provider.toLowerCase()) {
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    case 'ollama':
      return null; // Ollama doesn't need API key
    default:
      return process.env.AI_API_KEY;
  }
}

async function extractWithAI(content, prompt, config) {
  const { provider, model, apiKey, maxTokens, temperature } = config;
  
  console.log(`Using AI extraction: ${provider} - ${model}`);
  
  switch (provider.toLowerCase()) {
    case 'openai':
      return await extractWithOpenAI(content, prompt, { model, apiKey, maxTokens, temperature });
    case 'anthropic':
      return await extractWithAnthropic(content, prompt, { model, apiKey, maxTokens, temperature });
    case 'ollama':
      return await extractWithOllama(content, prompt, { model, maxTokens, temperature });
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

async function extractWithOpenAI(content, prompt, config) {
  const { model, apiKey, maxTokens, temperature } = config;
  
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: model || 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'You are a web content extraction specialist. Extract and format the requested information from the provided web content. Be precise and only include relevant information that matches the user\'s request. If the requested information is not found, clearly state that.'
      },
      {
        role: 'user',
        content: `Please extract the following from this web content:\n\nREQUEST: ${prompt}\n\nWEB CONTENT:\n${content.substring(0, 8000)}`
      }
    ],
    max_tokens: maxTokens || 2000,
    temperature: temperature || 0.1
  }, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data.choices[0].message.content;
}

async function extractWithAnthropic(content, prompt, config) {
  const { model, apiKey, maxTokens, temperature } = config;
  
  const response = await axios.post('https://api.anthropic.com/v1/messages', {
    model: model || 'claude-3-haiku-20240307',
    max_tokens: maxTokens || 2000,
    temperature: temperature || 0.1,
    messages: [
      {
        role: 'user',
        content: `You are a web content extraction specialist. Extract and format the requested information from the provided web content. Be precise and only include relevant information that matches the user's request. If the requested information is not found, clearly state that.

REQUEST: ${prompt}

WEB CONTENT:
${content.substring(0, 8000)}`
      }
    ]
  }, {
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    }
  });

  return response.data.content[0].text;
}

async function extractWithOllama(content, prompt, config) {
  const { model, maxTokens, temperature } = config;
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  
  const response = await axios.post(`${ollamaUrl}/api/generate`, {
    model: model || 'llama2',
    prompt: `You are a web content extraction specialist. Extract and format the requested information from the provided web content. Be precise and only include relevant information that matches the user's request.

REQUEST: ${prompt}

WEB CONTENT:
${content.substring(0, 8000)}

EXTRACTED CONTENT:`,
    stream: false,
    options: {
      temperature: temperature || 0.1,
      num_predict: maxTokens || 2000
    }
  });

  return response.data.response;
}

async function extractWithLocalProcessing(content, prompt, metadata) {
  const promptLower = prompt.toLowerCase();
  const contentLower = content.toLowerCase();

  // Analyze the prompt to understand what's being requested
  const extractionTypes = {
    contact: ['contact', 'email', 'phone', 'address', 'location'],
    prices: ['price', 'cost', 'fee', 'rate', 'pricing', '$', 'usd', 'eur'],
    games: ['game', 'casino', 'slot', 'poker', 'blackjack', 'roulette'],
    products: ['product', 'item', 'buy', 'shop', 'store', 'catalog'],
    events: ['event', 'date', 'time', 'schedule', 'calendar', 'when'],
    people: ['team', 'staff', 'employee', 'member', 'person', 'who'],
    links: ['link', 'url', 'website', 'page', 'navigation'],
    text: ['text', 'content', 'description', 'about', 'information']
  };

  // Determine extraction type
  let extractionType = 'text';
  let maxMatches = 0;

  for (const [type, keywords] of Object.entries(extractionTypes)) {
    const matches = keywords.filter(keyword => promptLower.includes(keyword)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      extractionType = type;
    }
  }

  console.log(`Detected extraction type: ${extractionType} for prompt: "${prompt}"`);

  // Extract based on type
  let extractedContent = '';

  switch (extractionType) {
    case 'contact':
      extractedContent = extractContactInfo(content);
      break;
    case 'prices':
      extractedContent = extractPriceInfo(content);
      break;
    case 'games':
      extractedContent = extractGameInfo(content);
      break;
    case 'products':
      extractedContent = extractProductInfo(content);
      break;
    case 'events':
      extractedContent = extractEventInfo(content);
      break;
    case 'people':
      extractedContent = extractPeopleInfo(content);
      break;
    case 'links':
      extractedContent = extractLinkInfo(content);
      break;
    default:
      extractedContent = extractRelevantText(content, prompt);
  }

  // If no specific content found, try keyword-based extraction
  if (!extractedContent || extractedContent.trim().length === 0) {
    extractedContent = extractByKeywords(content, prompt);
  }

  return `Extraction Request: "${prompt}"\n\n--- Extracted Content ---\n${extractedContent}\n\n--- Full Page Content ---\n${content}`;
}

function extractContactInfo(content) {
  const results = [];

  // Extract emails
  const emails = content.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || [];
  if (emails.length > 0) {
    results.push(`Emails:\n${emails.map(email => `- ${email}`).join('\n')}`);
  }

  // Extract phone numbers
  const phones = content.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [];
  if (phones.length > 0) {
    results.push(`Phone Numbers:\n${phones.map(phone => `- ${phone}`).join('\n')}`);
  }

  // Extract addresses (basic pattern)
  const addresses = content.match(/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)[^.]*(?:\d{5})?/gi) || [];
  if (addresses.length > 0) {
    results.push(`Addresses:\n${addresses.map(addr => `- ${addr.trim()}`).join('\n')}`);
  }

  return results.join('\n\n');
}

function extractPriceInfo(content) {
  const prices = content.match(/\$\d+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:USD|EUR|GBP|dollars?|euros?|pounds?)/gi) || [];
  if (prices.length > 0) {
    return `Prices Found:\n${prices.map(price => `- ${price}`).join('\n')}`;
  }
  return '';
}

function extractGameInfo(content) {
  const gameKeywords = ['slot', 'poker', 'blackjack', 'roulette', 'baccarat', 'craps', 'jackpot', 'casino', 'game'];
  const lines = content.split('\n');
  const gameLines = lines.filter(line =>
    gameKeywords.some(keyword => line.toLowerCase().includes(keyword)) &&
    line.trim().length > 3 && line.trim().length < 100
  );

  if (gameLines.length > 0) {
    return `Games Found:\n${gameLines.map(game => `- ${game.trim()}`).join('\n')}`;
  }
  return '';
}

function extractProductInfo(content) {
  // Look for product-like patterns
  const lines = content.split('\n');
  const productLines = lines.filter(line => {
    const lower = line.toLowerCase();
    return (lower.includes('$') || lower.includes('price') || lower.includes('buy')) &&
      line.trim().length > 10 && line.trim().length < 150;
  });

  if (productLines.length > 0) {
    return `Products Found:\n${productLines.map(product => `- ${product.trim()}`).join('\n')}`;
  }
  return '';
}

function extractEventInfo(content) {
  const datePatterns = content.match(/\b\w+\s+\d{1,2},?\s+\d{4}\b|\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g) || [];
  const timePatterns = content.match(/\b\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\b/g) || [];

  const results = [];
  if (datePatterns.length > 0) {
    results.push(`Dates Found:\n${datePatterns.map(date => `- ${date}`).join('\n')}`);
  }
  if (timePatterns.length > 0) {
    results.push(`Times Found:\n${timePatterns.map(time => `- ${time}`).join('\n')}`);
  }

  return results.join('\n\n');
}

function extractPeopleInfo(content) {
  // Look for names and titles
  const namePatterns = content.match(/(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+[A-Z][a-z]+\s+[A-Z][a-z]+|[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+(?:CEO|CTO|Manager|Director|President))?/g) || [];

  if (namePatterns.length > 0) {
    return `People Found:\n${namePatterns.map(name => `- ${name}`).join('\n')}`;
  }
  return '';
}

function extractLinkInfo(content) {
  const urls = content.match(/https?:\/\/[^\s]+/g) || [];
  if (urls.length > 0) {
    return `Links Found:\n${urls.map(url => `- ${url}`).join('\n')}`;
  }
  return '';
}

function extractByKeywords(content, prompt) {
  // Extract keywords from prompt
  const keywords = prompt.toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['what', 'where', 'when', 'how', 'why', 'the', 'and', 'or', 'but', 'for', 'with'].includes(word));

  if (keywords.length === 0) return '';

  const lines = content.split('\n');
  const relevantLines = lines.filter(line =>
    keywords.some(keyword => line.toLowerCase().includes(keyword)) &&
    line.trim().length > 10
  );

  if (relevantLines.length > 0) {
    return `Content matching "${prompt}":\n${relevantLines.slice(0, 20).map(line => `- ${line.trim()}`).join('\n')}`;
  }

  return '';
}

function extractRelevantText(content, prompt) {
  // Find paragraphs that contain keywords from the prompt
  const keywords = prompt.toLowerCase().split(/\s+/).filter(word => word.length > 3);
  const paragraphs = content.split('\n\n');

  const relevantParagraphs = paragraphs.filter(para =>
    keywords.some(keyword => para.toLowerCase().includes(keyword)) &&
    para.trim().length > 50
  );

  if (relevantParagraphs.length > 0) {
    return relevantParagraphs.slice(0, 5).join('\n\n');
  }

  return content.substring(0, 1000) + '...';
}

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/chromium-browser',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
  }
  return browser;
}

// Crawl function with Puppeteer for JavaScript support
async function crawlUrl(url, options = {}) {
  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Set user agent and viewport
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    // Set timeout and navigation options
    const timeout = options.timeout || 60000;
    await page.setDefaultTimeout(timeout);

    console.log(`Crawling URL: ${url}`);

    // Navigate to the page with more lenient wait conditions
    await page.goto(url, {
      waitUntil: ['domcontentloaded'],
      timeout
    });

    // Wait a bit more for any dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract page content
    const pageData = await page.evaluate(() => {
      // Remove unwanted elements
      const elementsToRemove = document.querySelectorAll(
        'script, style, nav, header, footer, aside, .nav, .header, .footer, .sidebar, .advertisement, .ads, .cookie-banner'
      );
      elementsToRemove.forEach(el => el.remove());

      // Get title
      const title = document.title || document.querySelector('h1')?.textContent?.trim() || '';

      // Get main content
      let textContent = document.body?.textContent || '';
      textContent = textContent.replace(/\s+/g, ' ').trim();

      // Get metadata
      const getMetaContent = (selector) => {
        const element = document.querySelector(selector);
        return element ? element.getAttribute('content') || element.getAttribute('href') || '' : '';
      };

      return {
        title,
        textContent,
        metadata: {
          title,
          description: getMetaContent('meta[name="description"]'),
          keywords: getMetaContent('meta[name="keywords"]'),
          ogTitle: getMetaContent('meta[property="og:title"]'),
          ogDescription: getMetaContent('meta[property="og:description"]'),
          ogImage: getMetaContent('meta[property="og:image"]'),
          canonical: getMetaContent('link[rel="canonical"]'),
          author: getMetaContent('meta[name="author"]'),
          url: window.location.href,
          timestamp: new Date().toISOString()
        }
      };
    });

    // Apply extraction prompt if provided
    let finalContent = pageData.textContent;
    if (options.extractionPrompt || options.prompt) {
      const prompt = options.extractionPrompt || options.prompt;
      console.log(`Applying extraction prompt: "${prompt}"`);

      try {
        finalContent = await extractContentWithAI(pageData.textContent, prompt, pageData.metadata);
        console.log(`AI extraction completed. Content length: ${finalContent.length}`);
      } catch (error) {
        console.error('AI extraction failed, using original content:', error);
        finalContent = `Extraction Request: "${prompt}"\n\n--- Original Content ---\n${pageData.textContent}`;
      }
    }

    // Enhanced metadata
    const metadata = {
      ...pageData.metadata,
      contentLength: finalContent.length,
      extractionPrompt: options.extractionPrompt || options.prompt || null,
      crawlMethod: 'puppeteer',
      loadTime: Date.now() - Date.now() // This would be calculated properly in real implementation
    };

    // Store in database
    const query = `
      INSERT INTO crawl_results (url, title, content, metadata, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, crawled_at
    `;

    const values = [
      url,
      pageData.title || null,
      finalContent,
      JSON.stringify(metadata),
      "success",
    ];

    const dbResult = await pool.query(query, values);

    console.log(`Successfully crawled ${url} - Content length: ${finalContent.length}`);

    return {
      id: dbResult.rows[0].id,
      url,
      title: pageData.title,
      content: finalContent,
      metadata,
      crawled_at: dbResult.rows[0].crawled_at,
      success: true,
    };
  } catch (error) {
    console.error("Crawl error:", error);

    // Store error in database
    const query = `
      INSERT INTO crawl_results (url, content, metadata, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id, crawled_at
    `;

    const values = [
      url,
      error.message,
      JSON.stringify({
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString(),
        crawlMethod: 'puppeteer'
      }),
      "error",
    ];

    const dbResult = await pool.query(query, values);

    return {
      id: dbResult.rows[0].id,
      url,
      error: error.message,
      crawled_at: dbResult.rows[0].crawled_at,
      success: false,
    };
  } finally {
    if (page) {
      await page.close();
    }
  }
}

// Get crawl results
async function getCrawlResults(limit = 50, offset = 0) {
  try {
    const query = `
      SELECT id, url, title, content, metadata, crawled_at, status
      FROM crawl_results
      ORDER BY crawled_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

export const startServer = (port = Number(process.env.PORT ?? 4000)) => {
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, `http://${req.headers.host}`);
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
    res.setHeader("access-control-allow-headers", "content-type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      return res.end();
    }

    if (u.pathname === "/health") {
      res.writeHead(200);
      return res.end(JSON.stringify({ status: "ok", service: "crawl4ai" }));
    }

    if (u.pathname === "/ready") {
      res.writeHead(200);
      return res.end(JSON.stringify({ ready: true }));
    }

    if (u.pathname === "/crawl" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const { url, options, prompt } = JSON.parse(body);
          if (!url) {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "URL is required" }));
          }

          // Merge prompt into options
          const crawlOptions = {
            ...options,
            extractionPrompt: prompt || options?.extractionPrompt,
          };

          const result = await crawlUrl(url, crawlOptions);
          res.writeHead(200);
          res.end(JSON.stringify(result));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      return;
    }

    if (u.pathname === "/results" && req.method === "GET") {
      try {
        const limit = parseInt(u.searchParams.get("limit")) || 50;
        const offset = parseInt(u.searchParams.get("offset")) || 0;
        const results = await getCrawlResults(limit, offset);
        res.writeHead(200);
        res.end(JSON.stringify({ results, count: results.length }));
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      }
      return;
    }

    // Get specific crawl result by ID
    if (u.pathname.match(/^\/results\/\d+$/)) {
      const id = u.pathname.split('/').pop();
      try {
        const query = `
          SELECT id, url, title, content, metadata, crawled_at, status
          FROM crawl_results
          WHERE id = $1
        `;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
          res.writeHead(404);
          return res.end(JSON.stringify({ error: "Crawl not found" }));
        }

        res.writeHead(200);
        res.end(JSON.stringify(result.rows[0]));
      } catch (error) {
        console.error("Database error:", error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      }
      return;
    }

    // AI Configuration endpoints
    if (u.pathname === "/ai/config" && req.method === "GET") {
      try {
        const config = getAIConfig();
        // Don't expose API keys in the response
        const safeConfig = {
          ...config,
          apiKey: config.apiKey ? '***' : null,
          hasApiKey: !!config.apiKey
        };
        res.writeHead(200);
        res.end(JSON.stringify(safeConfig));
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      }
      return;
    }

    if (u.pathname === "/ai/test" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const { prompt } = JSON.parse(body);
          const testContent = "This is a test content for AI extraction. It contains sample data like email@example.com, phone number 555-123-4567, and price $29.99.";
          
          const result = await extractContentWithAI(testContent, prompt || "Extract all contact information");
          res.writeHead(200);
          res.end(JSON.stringify({ 
            success: true, 
            result,
            config: {
              provider: process.env.AI_PROVIDER || 'openai',
              model: process.env.AI_MODEL || 'gpt-3.5-turbo'
            }
          }));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ 
            success: false, 
            error: error.message,
            config: {
              provider: process.env.AI_PROVIDER || 'openai',
              model: process.env.AI_MODEL || 'gpt-3.5-turbo'
            }
          }));
        }
      });
      return;
    }

    if (u.pathname === "/") {
      res.writeHead(200);
      return res.end(
        JSON.stringify({
          service: "crawl4ai",
          endpoints: {
            "POST /crawl": "Crawl a URL with optional AI extraction",
            "GET /results": "Get crawl results",
            "GET /results/:id": "Get specific crawl result",
            "GET /ai/config": "Get AI configuration",
            "POST /ai/test": "Test AI extraction",
            "GET /health": "Health check",
          },
          time: new Date().toISOString(),
        })
      );
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  });

  server.listen(port, () => {
    console.log(`Crawl4AI service listening on :${port}`);
  });

  return server;
};

// Initialize and start
async function main() {
  await initDatabase();
  startServer();
}

main().catch(console.error);
