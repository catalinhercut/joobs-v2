import http from "node:http";
import { URL } from "node:url";

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

    if (u.pathname === "/") {
      res.writeHead(200);
      return res.end(
        JSON.stringify({ ok: true, time: new Date().toISOString() })
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
