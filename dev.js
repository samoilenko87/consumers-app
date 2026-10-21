import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import * as users from "./functions/api/users.js";
import * as orders from "./functions/api/orders.js";

// Load secrets from .dev.vars
const env = {};
for (const line of readFileSync(".dev.vars", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2];
}

const routes = {
  "/api/users": users.onRequestGet,
  "/api/orders": orders.onRequestGet,
};
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
};
const publicDir = fileURLToPath(new URL("./public/", import.meta.url));

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:8788");
  const handler = routes[url.pathname];

  if (handler) {
    if (req.method !== "GET") {
      res.writeHead(405).end();
      return;
    }
    const response = await handler({ request: new Request(url), env });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
    return;
  }

  const rel = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  const file = normalize(join(publicDir, rel));
  if (!file.startsWith(publicDir)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, {
      "content-type": types[extname(file)] || "application/octet-stream",
    });
    res.end(data);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(8788, () => console.log("Dev server: http://localhost:8788"));