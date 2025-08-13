import http from "node:http";
import { URL } from "node:url";

const CRAWL4AI_URL = process.env.CRAWL4AI_API_URL || "http://crawl4ai:4000";

export const startServer = (port = Number(process.env.PORT ?? 3000)) => {
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, `http://${req.headers.host}`);
    res.setHeader("content-type", "application/json; charset=utf-8");

    if (u.pathname === "/health") {
      res.writeHead(200);
      return res.end(JSON.stringify({ status: "ok" }));
    }

    if (u.pathname === "/ready") {
      res.writeHead(200);
      return res.end(JSON.stringify({ ready: true }));
    }

    // Proxy crawl4ai endpoints
    if (u.pathname.startsWith("/crawl") || u.pathname === "/results") {
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
