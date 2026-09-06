/* Enforce the NOTES_SPEC section 11 invariants for one notebook. */
import fs from "node:fs";
import path from "node:path";
import { ROOT, CONTENT, readJson, loadRegistry, walk } from "./lib.mjs";
import { validate } from "./minivalidate.mjs";

const SCHEMA_DIR = path.join(ROOT, "templates", "schemas");
const schema = (n) => readJson(path.join(SCHEMA_DIR, n));

export function validateNotebook(nbDir) {
  const errors = [];
  const E = (m) => errors.push(m);
  const rel = path.relative(CONTENT, nbDir);
  const has = (p) => fs.existsSync(path.join(nbDir, p));
  const rd = (p, fb) => readJson(path.join(nbDir, p), fb);

  // 1. manifest
  let m = null;
  if (!has("manifest.json")) E("manifest.json missing");
  else {
    m = rd("manifest.json");
    const me = validate(schema("manifest.schema.json"), m);
    me.forEach((e) => E("manifest: " + e));
    for (const s of m.sections || []) if (!has(s.file)) E(`section file missing: ${s.file}`);
  }
  if (!has("index.html")) E("index.html missing");
  if (!has("isa/index.html")) E("isa/index.html missing");

  // 2. slide coverage
  const decks = rd("build/decks.json", null);
  if (!decks || !Array.isArray(decks.decks)) E("build/decks.json missing or malformed");
  else if (m) {
    const total = decks.decks.reduce((n, d) => n + (d.slides || 0), 0);
    if (m.slideCoverage && total !== m.slideCoverage.total)
      E(`slide total mismatch: decks.json=${total} manifest=${m.slideCoverage.total}`);
    const covered = new Set();
    for (const d of decks.decks) {
      const cov = rd(`build/${d.slug}/coverage.json`, null);
      if (!cov || !Array.isArray(cov.covered)) { E(`build/${d.slug}/coverage.json missing`); continue; }
      cov.covered.forEach((x) => covered.add(`${d.slug}#${x}`));
    }
    if (covered.size !== total) E(`slide coverage gap: ${covered.size}/${total} slides mapped`);
  }

  // 3. section markers
  for (const s of (m && m.sections) || []) {
    if (!has(s.file)) continue;
    const html = fs.readFileSync(path.join(nbDir, s.file), "utf8");
    if (!/data-section-check/.test(html)) E(`${s.file}: no data-section-check region`);
    if (!/data-slide-mapping/.test(html)) E(`${s.file}: no data-slide-mapping region`);
  }

  // 4. data files + schemas
  const dataFiles = {
    "data/flashcards.json": "flashcards.schema.json",
    "data/mcqs.json": "mcqs.schema.json",
    "data/theory.json": "theory.schema.json",
    "data/quickref.json": "quickref.schema.json",
    "data/formulas.json": "formulas.schema.json"
  };
  const parsed = {};
  for (const [f, sc] of Object.entries(dataFiles)) {
    if (!has(f)) { E(`${f} missing`); continue; }
    try { parsed[f] = rd(f); } catch (e) { E(`${f}: invalid JSON`); continue; }
    validate(schema(sc), parsed[f]).forEach((e) => E(`${f}: ${e}`));
  }

  // 5. bank sizes
  const secCount = (m && m.sections && m.sections.length) || 1;
  const mcq = parsed["data/mcqs.json"];
  if (mcq && mcq.isa) {
    if ((mcq.isa.mark1 || []).length < 10) E(`ISA 1-mark MCQs: ${(mcq.isa.mark1 || []).length} < 10`);
    if ((mcq.isa.mark2 || []).length < 8) E(`ISA 2-mark MCQs: ${(mcq.isa.mark2 || []).length} < 8`);
  }
  const th = parsed["data/theory.json"];
  if (th && (th.questions || []).filter((q) => q.marks === 4).length < 5)
    E(`4-mark theory questions: ${(th.questions || []).filter((q) => q.marks === 4).length} < 5`);
  const fc = parsed["data/flashcards.json"];
  if (fc && (fc.deck || []).length < 8 * secCount)
    E(`flashcards: ${(fc.deck || []).length} < ${8 * secCount} (8 x ${secCount} sections)`);

  // 6. viz report
  const vr = rd("build/viz-report.json", null);
  if ((m && m.counts && m.counts.viz > 0) || has("assets/viz")) {
    if (!vr || !Array.isArray(vr.viz)) E("build/viz-report.json missing");
    else vr.viz.forEach((v) => { if (v.verdict !== "pass") E(`viz not passing: ${v.file} (${v.verdict})`); });
  }

  // 7. offline rule
  for (const sub of ["sections", "assets", "isa"]) {
    walk(path.join(nbDir, sub), (f) => {
      if (!/\.(html|htm|css|js|svg)$/i.test(f)) return;
      const txt = fs.readFileSync(f, "utf8");
      const bad = txt.match(/https?:\/\/[^\s"')]+/g);
      if (bad) E(`external URL in ${path.relative(nbDir, f)}: ${bad[0]}`);
    });
  }
  if (has("index.html")) {
    const bad = fs.readFileSync(path.join(nbDir, "index.html"), "utf8").match(/https?:\/\/[^\s"')]+/g);
    if (bad) E(`external URL in index.html: ${bad[0]}`);
  }

  // 8. SKILL_SOURCE.md
  if (!has("SKILL_SOURCE.md")) E("SKILL_SOURCE.md missing");
  else {
    const src = fs.readFileSync(path.join(nbDir, "SKILL_SOURCE.md"), "utf8");
    if (src.split("\n").length < 40) E("SKILL_SOURCE.md too short (<40 lines)");
    if (!/#+\s*Glossary/i.test(src)) E("SKILL_SOURCE.md: no Glossary heading");
    if (!/#+\s*Formula/i.test(src)) E("SKILL_SOURCE.md: no Formula list heading");
  }

  // 9. registry uniqueness
  if (m) {
    const reg = loadRegistry();
    const ids = reg.notebooks.filter((n) => n.id === m.id);
    const aliases = reg.notebooks.filter((n) => n.alias === m.alias);
    if (ids.length > 1) E(`duplicate id in registry: ${m.id}`);
    if (aliases.length > 1) E(`duplicate alias in registry: ${m.alias}`);
  }

  return { id: m && m.id, path: rel, ok: errors.length === 0, errors };
}

if (process.argv[1] && process.argv[1].endsWith("validate-notebook.mjs")) {
  const target = process.argv[2];
  if (!target) { console.error("usage: bun tools/validate-notebook.mjs <path-to-notebook-dir | id | alias>"); process.exit(2); }
  let dir = target;
  if (!fs.existsSync(dir)) {
    const reg = loadRegistry();
    const hit = reg.notebooks.find((n) => n.id === target || n.alias === target);
    if (!hit) { console.error("not found: " + target); process.exit(2); }
    dir = path.join(CONTENT, hit.path);
  }
  const r = validateNotebook(dir);
  if (r.ok) { console.log(`OK  ${r.path}  (${r.id})`); process.exit(0); }
  console.error(`FAIL  ${r.path}\n` + r.errors.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}
