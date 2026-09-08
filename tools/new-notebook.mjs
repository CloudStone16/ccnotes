/* Scaffold a new notebook folder + registry entry. Assembler fills it in later. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ROOT, CONTENT, slugify, loadRegistry, saveRegistry } from "./lib.mjs";

const [, , subject, unitRaw, title] = process.argv;
if (!subject || !unitRaw || !title) {
  console.error('usage: node tools/new-notebook.mjs "<Subject>" <unitNo> "<Title>"');
  process.exit(2);
}
const unitNo = parseInt(unitRaw, 10);
if (!Number.isInteger(unitNo) || unitNo < 1) { console.error("unitNo must be a positive integer"); process.exit(2); }

const subjectSlug = slugify(subject);
const alias = `${subjectSlug}-u${unitNo}`;
const reg = loadRegistry();
if (reg.notebooks.some((n) => n.alias === alias)) {
  console.error(`a notebook with alias "${alias}" already exists (${reg.notebooks.find((n) => n.alias === alias).id})`);
  process.exit(1);
}
let id;
do { id = "ccnotes_" + crypto.randomBytes(4).toString("hex").slice(0, 6); }
while (reg.notebooks.some((n) => n.id === id));

const rel = `${subjectSlug}/${id}`;
const dir = path.join(CONTENT, rel);
for (const d of ["sections", "isa", "data", "assets/viz", "assets/img", "build"])
  fs.mkdirSync(path.join(dir, d), { recursive: true });
fs.writeFileSync(path.join(dir, "build", ".gitkeep"), "");
fs.writeFileSync(path.join(dir, "_SCAFFOLD.md"),
`# ${subject} — Unit ${unitNo}: ${title}

id: ${id}
alias: ${alias}
status: draft

Next: drop this unit's decks in \`inbox/${subjectSlug}/unit-${unitNo}/\` and run the
\`ccnotes-build\` skill with:  id=${id}  decks=inbox/${subjectSlug}/unit-${unitNo}

The assembler writes manifest.json, index.html, isa/index.html, SKILL_SOURCE.md and
flips status to "ready" once tools/validate-notebook.mjs passes.
`);

// create (and mark) the inbox folder the user drops decks into
const inboxRel = `inbox/${subjectSlug}/unit-${unitNo}`;
const inboxDir = path.join(ROOT, inboxRel);
fs.mkdirSync(inboxDir, { recursive: true });
fs.writeFileSync(path.join(inboxDir, "PUT-DECKS-HERE.txt"),
  `Drop this unit's slide decks in this folder (.zip / .pptx / .pdf / exported Google Slides),\n` +
  `then, with your coding agent running from the repo root: run ccnotes-build for notebook ${id} from ${inboxRel}\n` +
  `This file is ignored by the build.\n`);

reg.notebooks.push({ id, alias, subject, subjectSlug, unitNo, title, path: rel, status: "draft", createdAt: new Date().toISOString() });
saveRegistry(reg);

console.log(`created ${id}  (${alias})`);
console.log(`  notebook:  content/${rel}`);
console.log(`  decks in:  ${inboxDir}/   (created — drop deck files here)`);
console.log(`  then:      run ccnotes-build for notebook ${id} from ${inboxRel}`);
