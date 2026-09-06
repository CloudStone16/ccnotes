/* Download KaTeX + mermaid into viewer/note-kit/vendor/ so notes render math and
 * diagrams fully offline. Run once: `bun run setup`. Safe to re-run. */
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { fileURLToPath } from "node:url";

const VENDOR = path.resolve(fileURLToPath(import.meta.url), "../../viewer/note-kit/vendor");
const KATEX = "0.16.11";
const MERMAID = "10.9.1";
const CDN = (p) => `https://cdnjs.cloudflare.com/ajax/libs/${p}`;

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return get(res.headers.location).then(resolve, reject);
      if (res.statusCode !== 200) return reject(new Error(`${res.statusCode} ${url}`));
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("error", reject);
  });
}
async function save(url, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const buf = await get(url);
  fs.writeFileSync(dest, buf);
  console.log(`  ${path.relative(VENDOR, dest)}  (${(buf.length / 1024).toFixed(0)} kB)`);
  return buf;
}

async function main() {
  console.log("KaTeX " + KATEX);
  await save(CDN(`KaTeX/${KATEX}/katex.min.js`), path.join(VENDOR, "katex/katex.min.js"));
  const css = (await save(CDN(`KaTeX/${KATEX}/katex.min.css`), path.join(VENDOR, "katex/katex.min.css"))).toString();
  const fonts = [...new Set((css.match(/fonts\/[A-Za-z0-9_.-]+\.(?:woff2|woff|ttf)/g) || []))];
  console.log(`  ${fonts.length} font files`);
  for (const f of fonts) {
    try { await save(CDN(`KaTeX/${KATEX}/${f}`), path.join(VENDOR, "katex", f)); }
    catch (e) { console.warn("  skip " + f + " (" + e.message + ")"); }
  }
  console.log("mermaid " + MERMAID);
  await save(CDN(`mermaid/${MERMAID}/mermaid.min.js`), path.join(VENDOR, "mermaid/mermaid.min.js"));
  console.log("\ndone. Math + diagrams now render offline.");
}
main().catch((e) => { console.error("setup failed:", e.message); console.error("Notes still work; math shows as raw text until this succeeds."); process.exit(1); });
