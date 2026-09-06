import fs from "node:fs";
import path from "node:path";
import { CONTENT } from "./lib.mjs";
import { validateNotebook } from "./validate-notebook.mjs";

export function validateAll() {
  const out = [];
  if (!fs.existsSync(CONTENT)) return out;
  for (const subj of fs.readdirSync(CONTENT)) {
    const sd = path.join(CONTENT, subj);
    if (!fs.statSync(sd).isDirectory()) continue;
    for (const id of fs.readdirSync(sd)) {
      const nb = path.join(sd, id);
      if (fs.statSync(nb).isDirectory() && fs.existsSync(path.join(nb, "manifest.json")))
        out.push(validateNotebook(nb));
    }
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith("validate-all.mjs")) {
  const r = validateAll();
  for (const n of r) console.log(`${n.ok ? "OK  " : "FAIL"}  ${n.path}${n.ok ? "" : "\n" + n.errors.map((e) => "     - " + e).join("\n")}`);
  const bad = r.filter((n) => !n.ok).length;
  console.log(`\n${r.length} notebook(s), ${bad} failing`);
  process.exit(bad ? 1 : 0);
}
