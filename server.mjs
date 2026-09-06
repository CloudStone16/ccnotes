/* ccnotes main server — zero-dependency. Serves the viewer shell, the shared
 * note-kit, notebook content, and a small JSON API. Read-only: all mutations
 * happen through tools/*.mjs on the CLI. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scan } from "./tools/scan.mjs";
import { validateAll } from "./tools/validate-all.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.CCNOTES_PORT || 4319;
const VIEWER = path.join(ROOT, "viewer");
const NOTEKIT = path.join(VIEWER, "note-kit");
const CONTENT = path.join(ROOT, "content");

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".map": "application/json"
};

let catalogCache = null, catalogAt = 0;
function catalog() {
  const now = Date.now();
  if (!catalogCache || now - catalogAt > 1500) { catalogCache = scan(); catalogAt = now; }
  return catalogCache;
}

function send(res, code, body, type) {
  res.writeHead(code, { "Content-Type": type || "text/plain; charset=utf-8", "Cache-Control": "no-cache" });
  res.end(body);
}
function sendFile(res, file) {
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, "Not found: " + path.basename(file));
    send(res, 200, buf, MIME[path.extname(file).toLowerCase()] || "application/octet-stream");
  });
}
/* resolve a request path under a base dir, blocking traversal */
function safeJoin(base, reqPath) {
  const p = path.normalize(path.join(base, decodeURIComponent(reqPath)));
  return p.startsWith(base) ? p : null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const p = url.pathname;

  if (p === "/" || p === "/index.html") return sendFile(res, path.join(VIEWER, "index.html"));

  if (p.startsWith("/assets/")) {
    const f = safeJoin(VIEWER, p.slice("/assets/".length));
    return f ? sendFile(res, f) : send(res, 403, "no");
  }
  if (p.startsWith("/note-kit/")) {
    const f = safeJoin(NOTEKIT, p.slice("/note-kit/".length));
    return f ? sendFile(res, f) : send(res, 403, "no");
  }
  if (p.startsWith("/content/")) {
    const f = safeJoin(CONTENT, p.slice("/content/".length));
    return f ? sendFile(res, f) : send(res, 403, "no");
  }

  if (p === "/api/catalog") return send(res, 200, JSON.stringify(catalog()), MIME[".json"]);

  if (p === "/api/notebook") {
    const id = url.searchParams.get("id");
    const hit = findNotebook(id);
    if (!hit) return send(res, 404, JSON.stringify({ error: "unknown notebook" }), MIME[".json"]);
    return sendFile(res, path.join(CONTENT, hit.path, "manifest.json"));
  }

  if (p === "/health") {
    const report = safeHealth();
    if (url.searchParams.get("html") === "1") return send(res, 200, healthHtml(report), MIME[".html"]);
    return send(res, report.ok ? 200 : 500, JSON.stringify(report, null, 2), MIME[".json"]);
  }

  send(res, 404, "Not found");
});

function findNotebook(idOrAlias) {
  for (const s of catalog().subjects) for (const u of s.units)
    if (u.id === idOrAlias || u.alias === idOrAlias) return u;
  return null;
}
function safeHealth() {
  try {
    const r = validateAll();
    return { ok: r.every((n) => n.ok), generatedAt: new Date().toISOString(), notebooks: r };
  } catch (e) {
    return { ok: false, error: String(e && e.stack || e) };
  }
}
function healthHtml(r) {
  const rows = (r.notebooks || []).map((n) =>
    `<tr class="${n.ok ? "ok" : "bad"}"><td>${n.id || n.path}</td><td>${n.ok ? "ready" : "FAIL"}</td>` +
    `<td>${(n.errors || []).map((e) => e.replace(/</g, "&lt;")).join("<br>") || "&mdash;"}</td></tr>`).join("");
  return `<!DOCTYPE html><html data-theme="dark"><head><meta charset="utf-8">
<link rel="stylesheet" href="/note-kit/note-kit.css"><title>Library health</title>
<style>body{padding:32px}table{border-collapse:collapse;width:100%}td{border:1px solid var(--line);padding:8px 10px;vertical-align:top;font-size:13px}
tr.ok td:nth-child(2){color:var(--good)}tr.bad td:nth-child(2){color:var(--bad)}</style></head>
<body><h1>Library health</h1><p class="lede">${r.ok ? "All notebooks valid." : "Some notebooks need attention."}</p>
<table><tr><th>Notebook</th><th>Status</th><th>Problems</th></tr>${rows || '<tr><td colspan="3">No notebooks yet.</td></tr>'}</table>
${r.error ? `<pre>${r.error.replace(/</g, "&lt;")}</pre>` : ""}</body></html>`;
}

server.listen(PORT, () => {
  const c = catalog();
  console.log(`ccnotes  →  http://localhost:${PORT}`);
  console.log(`  ${c.notebooks} notebook(s), ${c.subjects.length} subject(s), ${c.searchIndex.length} search records`);
});
