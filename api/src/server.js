import http from "node:http";
import { URL } from "node:url";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;
const CRAWL4AI_URL = process.env.CRAWL4AI_API_URL || "http://crawl4ai:4000";

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || "postgres",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "n8n",
  user: process.env.DB_USER || "n8n",
  password: process.env.DB_PASSWORD || "changeme123",
});

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

    // Proxy crawl4ai endpoints
    if (u.pathname.startsWith("/crawl")) {
      const crawlUrl = `${CRAWL4AI_URL}${u.pathname}${u.search}`;
      const proxyReq = http.request(
        crawlUrl,
        {
          method: req.method,
          headers: {
            ...req.headers,
            host: new URL(CRAWL4AI_URL).host,
          },
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );

      proxyReq.on("error", (err) => {
        console.error("Proxy error:", err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: "Crawl service unavailable" }));
      });

      req.pipe(proxyReq);
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

startServer();
