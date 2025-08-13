import http from "node:http";
import { URL } from "node:url";
import axios from "axios";
import * as cheerio from "cheerio";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || "postgres",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "n8n",
  user: process.env.DB_USER || "n8n",
  password: process.env.DB_PASSWORD || "local_dev_password",
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
    console.log("Database tables initialized");
  } catch (error) {
    console.error("Database initialization error:", error);
  }
}

// Crawl function
async function crawlUrl(url, options = {}) {
  try {
    // Fetch the HTML content
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      maxRedirects: 5,
    });

    const html = response.data;

    // Parse with cheerio
    const $ = cheerio.load(html);

    // Extract title
    const title =
      $("title").text().trim() || $("h1").first().text().trim() || "";

    // Remove script, style, and other non-content elements
    $(
      "script, style, nav, header, footer, aside, .nav, .header, .footer, .sidebar"
    ).remove();

    // Extract text content
    const textContent = $("body").text().replace(/\s+/g, " ").trim();

    // Extract metadata
    const metadata = {
      title,
      description: $('meta[name="description"]').attr("content") || "",
      keywords: $('meta[name="keywords"]').attr("content") || "",
      ogTitle: $('meta[property="og:title"]').attr("content") || "",
      ogDescription: $('meta[property="og:description"]').attr("content") || "",
      ogImage: $('meta[property="og:image"]').attr("content") || "",
      canonical: $('link[rel="canonical"]').attr("href") || "",
      author: $('meta[name="author"]').attr("content") || "",
      url: response.request.res.responseUrl || url,
      statusCode: response.status,
      contentType: response.headers["content-type"] || "",
      contentLength: textContent.length,
      timestamp: new Date().toISOString(),
    };

    // Store in database
    const query = `
      INSERT INTO crawl_results (url, title, content, metadata, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, crawled_at
    `;

    const values = [
      url,
      title || null,
      textContent,
      JSON.stringify(metadata),
      "success",
    ];

    const dbResult = await pool.query(query, values);

    return {
      id: dbResult.rows[0].id,
      url,
      title,
      content: textContent,
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
        status: error.response?.status,
        statusText: error.response?.statusText,
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
          const { url, options } = JSON.parse(body);
          if (!url) {
            res.writeHead(400);
            return res.end(JSON.stringify({ error: "URL is required" }));
          }

          const result = await crawlUrl(url, options);
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
