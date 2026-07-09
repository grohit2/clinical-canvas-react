#!/usr/bin/env node
// local-server.mjs — HTTP server wrapping the Lambda handler for local development
// Translates HTTP requests into Lambda Function URL event format
// Usage: node local-server.mjs

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Load .env.local (must happen BEFORE importing handler) ─────────────────
const envPath = resolve(__dirname, ".env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  console.warn("No .env.local found, using environment variables");
}

// ─── Import handler (env vars are set, so AWS_ENDPOINT is picked up) ────────
const { handler } = await import("../HMSdevmrnchange/router.mjs");

// ─── HTTP Server ────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3001;
const ENDPOINT = process.env.AWS_ENDPOINT || "http://localhost:4566";
const TABLE = process.env.TABLE_NAME || "HMS-LOCAL";

const server = createServer(async (req, res) => {
  const startTime = Date.now();
  let body = "";

  req.on("data", (chunk) => { body += chunk; });
  req.on("end", async () => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    // Build Lambda Function URL-style event
    const event = {
      version: "2.0",
      rawPath: url.pathname,
      rawQueryString: url.search.slice(1),
      headers: { ...req.headers },
      queryStringParameters: Object.fromEntries(url.searchParams),
      requestContext: {
        http: {
          method: req.method,
          path: url.pathname,
          protocol: "HTTP/1.1",
          sourceIp: "127.0.0.1",
          userAgent: req.headers["user-agent"] || "",
        },
        time: new Date().toISOString(),
        timeEpoch: Date.now(),
      },
      body: body || null,
      isBase64Encoded: false,
    };

    try {
      const result = await handler(event);
      const elapsed = Date.now() - startTime;

      // Log request with color
      const status = result.statusCode || 200;
      const color = status < 400 ? "\x1b[32m" : status < 500 ? "\x1b[33m" : "\x1b[31m";
      console.log(`${color}${req.method}\x1b[0m ${url.pathname} → ${status} (${elapsed}ms)`);

      // Write response
      const headers = result.headers || {};
      for (const [k, v] of Object.entries(headers)) {
        res.setHeader(k, v);
      }
      res.writeHead(status);
      res.end(result.body || "");
    } catch (err) {
      console.error("Server error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`
┌─────────────────────────────────────────────┐
│  HMS Backend — Local Development Server     │
├─────────────────────────────────────────────┤
│  Server:     http://localhost:${PORT}           │
│  LocalStack: ${ENDPOINT.padEnd(29)}│
│  Table:      ${TABLE.padEnd(29)}│
│  Region:     ${(process.env.AWS_REGION || "ap-south-1").padEnd(29)}│
└─────────────────────────────────────────────┘
`);
});
