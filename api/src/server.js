import http from "node:http";
import { URL } from "node:url";
import pg from "pg";
// Environment variables are provided by docker-compose
// import dotenv from "dotenv";
// dotenv.config();

const { Pool } = pg;
const CRAWL4AI_URL = process.env.CRAWL4AI_API_URL || "http://crawl4ai:11235";

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || "postgres",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "n8n",
  user: process.env.DB_USER || "n8n",
  password: process.env.DB_PASSWORD || "changeme123",
});

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

export const startServer = (port = Number(process.env.PORT ?? 3000)) => {
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
      return res.end(JSON.stringify({ status: "ok" }));
    }

    if (u.pathname === "/ready") {
      res.writeHead(200);
      return res.end(JSON.stringify({ ready: true }));
    }

    // Get all crawl results
    if (u.pathname === "/crawl/results" && req.method === "GET") {
      try {
        const limit = parseInt(u.searchParams.get("limit")) || 50;
        const offset = parseInt(u.searchParams.get("offset")) || 0;
        
        const query = `
          SELECT id, url, title, content, metadata, crawled_at, status
          FROM crawl_results
          ORDER BY crawled_at DESC
          LIMIT $1 OFFSET $2
        `;
        const result = await pool.query(query, [limit, offset]);
        
        res.writeHead(200);
        res.end(JSON.stringify({ results: result.rows, count: result.rows.length }));
      } catch (error) {
        console.error("Database error:", error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: "Database error" }));
      }
      return;
    }

    // Get specific crawl result by ID
    if (u.pathname.match(/^\/crawl\/results\/\d+$/)) {
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
        res.end(JSON.stringify({ error: "Database error" }));
      }
      return;
    }

    // Handle crawl requests - convert to crawl4ai format
    if (u.pathname === "/crawl" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const { url, prompt, options } = JSON.parse(body);
          if (!url) {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "URL is required" }));
          }

          console.log(`Crawling URL: ${url} with prompt: ${prompt || 'none'}`);

          // Use the markdown endpoint for better content extraction
          const crawl4aiResponse = await fetch(`${CRAWL4AI_URL}/md`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: url,
              f: prompt ? 'llm' : 'fit', // Use LLM filter if prompt provided
              q: prompt || null
            })
          });

          if (!crawl4aiResponse.ok) {
            const errorText = await crawl4aiResponse.text();
            throw new Error(`Crawl4AI error: ${errorText}`);
          }

          const crawl4aiResult = await crawl4aiResponse.json();

          // Store in database
          const query = `
            INSERT INTO crawl_results (url, title, content, metadata, status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, crawled_at
          `;

          // Extract title from markdown (first heading)
          const titleMatch = crawl4aiResult.markdown?.match(/^#\s+(.+)$/m);
          const title = titleMatch ? titleMatch[1] : null;

          const values = [
            url,
            title,
            crawl4aiResult.markdown || '',
            JSON.stringify({
              filter: crawl4aiResult.filter,
              query: crawl4aiResult.query,
              cache: crawl4aiResult.cache,
              extractionPrompt: prompt,
              crawlMethod: 'crawl4ai',
              timestamp: new Date().toISOString()
            }),
            crawl4aiResult.success ? "success" : "error",
          ];

          const dbResult = await pool.query(query, values);

          const result = {
            id: dbResult.rows[0].id,
            url,
            title,
            content: crawl4aiResult.markdown || '',
            metadata: {
              filter: crawl4aiResult.filter,
              query: crawl4aiResult.query,
              extractionPrompt: prompt
            },
            crawled_at: dbResult.rows[0].crawled_at,
            success: crawl4aiResult.success || false,
          };

          res.writeHead(200);
          res.end(JSON.stringify(result));
        } catch (error) {
          console.error("Crawl error:", error);
          
          // Store error in database
          try {
            const query = `
              INSERT INTO crawl_results (url, content, metadata, status)
              VALUES ($1, $2, $3, $4)
              RETURNING id, crawled_at
            `;

            const values = [
              JSON.parse(body).url || 'unknown',
              error.message,
              JSON.stringify({
                error: error.message,
                timestamp: new Date().toISOString(),
                crawlMethod: 'crawl4ai'
              }),
              "error",
            ];

            const dbResult = await pool.query(query, values);

            res.writeHead(500);
            res.end(JSON.stringify({
              id: dbResult.rows[0].id,
              error: error.message,
              crawled_at: dbResult.rows[0].crawled_at,
              success: false,
            }));
          } catch (dbError) {
            console.error("Database error:", dbError);
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message, success: false }));
          }
        }
      });
      return;
    }

    if (u.pathname === "/") {
      res.writeHead(200);
      return res.end(
        JSON.stringify({
          ok: true,
          time: new Date().toISOString(),
          services: {
            api: "http://localhost:3000",
            crawl4ai: CRAWL4AI_URL,
          },
        })
      );
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  });

  server.listen(port, () => {
    console.log(`API listening on :${port}`);
  });

  return server;
};

// Initialize and start
async function main() {
  await initDatabase();
  startServer();
}

main().catch(console.error);
