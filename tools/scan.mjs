/* Build the catalog + search index from content/. Used by server.mjs and `bun run scan`. */
import fs from "node:fs";
import path from "node:path";
import { CONTENT, readJson, stripHtml, loadRegistry } from "./lib.mjs";

export function scan() {
  const reg = loadRegistry();
  const regById = Object.fromEntries(reg.notebooks.map((n) => [n.id, n]));
  const subjects = new Map();
  const searchIndex = [];
  let notebooks = 0;

  if (fs.existsSync(CONTENT)) {
    for (const subjSlug of fs.readdirSync(CONTENT)) {
      const subjDir = path.join(CONTENT, subjSlug);
      if (!fs.statSync(subjDir).isDirectory()) continue;
      for (const id of fs.readdirSync(subjDir)) {
        const nbDir = path.join(subjDir, id);
        const manifestPath = path.join(nbDir, "manifest.json");
        if (!fs.existsSync(manifestPath) || !fs.statSync(nbDir).isDirectory()) continue;
        let m;
        try { m = readJson(manifestPath); } catch { continue; }
        notebooks++;
        const relPath = `${subjSlug}/${id}`;
        const status = (regById[m.id] && regById[m.id].status) || "draft";
        if (!subjects.has(m.subject)) subjects.set(m.subject, { subject: m.subject, subjectSlug: subjSlug, units: [] });
        subjects.get(m.subject).units.push({
          id: m.id, alias: m.alias, unitNo: m.unitNo, title: m.title, summary: m.summary || "",
          path: relPath, status, sections: (m.sections || []).map((s) => ({ n: s.n, slug: s.slug, title: s.title, file: s.file, topics: s.topics || [] })),
          counts: m.counts || {}
        });

        const crumb = `${m.subject} · U${m.unitNo}`;
        pushRecord(searchIndex, {
          url: `/content/${relPath}/index.html`, crumb, title: `${m.title} (overview)`,
          topics: (m.sections || []).flatMap((s) => s.topics || []).join(", "),
          text: m.summary || m.title
        });
        for (const s of m.sections || []) {
          const secFile = path.join(nbDir, s.file);
          let text = "";
          try { text = stripHtml(fs.readFileSync(secFile, "utf8")).slice(0, 4000); } catch {}
          pushRecord(searchIndex, {
            url: `/content/${relPath}/${s.file}`, crumb, title: s.title,
            topics: (s.topics || []).join(", "), text
          });
        }
        // light index of quick-reference key terms
        const qr = readJson(path.join(nbDir, "data", "quickref.json"), null);
        if (qr && Array.isArray(qr.keyTerms)) {
          for (const t of qr.keyTerms) pushRecord(searchIndex, {
            url: `/content/${relPath}/index.html#quickref`, crumb, title: `${t.term} — key term`,
            topics: t.term, text: t.definition
          });
        }
      }
    }
  }

  const out = {
    generatedAt: new Date().toISOString(),
    notebooks,
    subjects: [...subjects.values()].sort((a, b) => a.subject.localeCompare(b.subject)),
    searchIndex
  };
  return out;
}
function pushRecord(arr, r) {
  arr.push({ ...r, hay: `${r.title} ${r.topics} ${r.text}`.toLowerCase() });
}

if (process.argv[1] && process.argv[1].endsWith("scan.mjs")) {
  const out = scan();
  if (process.argv.includes("--print")) console.log(JSON.stringify(out, null, 2));
  else console.log(`scanned ${out.notebooks} notebook(s), ${out.searchIndex.length} search records, ${out.subjects.length} subject(s)`);
}
