import http from "node:http";
import { URL } from "node:url";
import axios from "axios";
import * as cheerio from "cheerio";
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
      
      // Try to extract specific content based on the prompt
      if (prompt.toLowerCase().includes('game') || prompt.toLowerCase().includes('casino')) {
        // Look for game-related content
        const gameContent = await page.evaluate(() => {
          const gameElements = document.querySelectorAll(
            '[class*="game"], [class*="slot"], [class*="casino"], [data-game], .game-item, .slot-item, .casino-game'
          );
          
          const games = [];
          gameElements.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 2 && text.length < 100) {
              games.push(text);
            }
          });
          
          // Also look for links that might be games
          const gameLinks = document.querySelectorAll('a[href*="game"], a[href*="slot"], a[href*="casino"]');
          gameLinks.forEach(link => {
            const text = link.textContent?.trim();
            if (text && text.length > 2 && text.length < 100) {
              games.push(text);
            }
          });
          
          return games.length > 0 ? games.join('\n') : null;
        });
        
        if (gameContent) {
          finalContent = `Games found:\n${gameContent}\n\nFull page content:\n${pageData.textContent}`;
        }
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

    if (u.pathname === "/") {
      res.writeHead(200);
      return res.end(
        JSON.stringify({
          service: "crawl4ai",
          endpoints: {
            "POST /crawl": "Crawl a URL",
            "GET /results": "Get crawl results",
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
