/* Generate (or refresh) the per-notebook doubt-clarifier skill from its digest. */
import fs from "node:fs";
import path from "node:path";
import { ROOT, CONTENT, SKILL_DIRS, readJson, loadRegistry } from "./lib.mjs";

const target = process.argv[2];
if (!target) { console.error("usage: bun tools/gen-doubt-skill.mjs <id|alias>"); process.exit(2); }

const reg = loadRegistry();
const nb = reg.notebooks.find((n) => n.id === target || n.alias === target);
if (!nb) { console.error("not found: " + target); process.exit(1); }

const nbDir = path.join(CONTENT, nb.path);
const m = readJson(path.join(nbDir, "manifest.json"));
const digestPath = path.join(nbDir, "SKILL_SOURCE.md");
if (!fs.existsSync(digestPath)) { console.error("SKILL_SOURCE.md not found — run ccnotes-assemble first"); process.exit(1); }
const digest = fs.readFileSync(digestPath, "utf8");

const topics = [...new Set((m.sections || []).flatMap((s) => s.topics || []))];
const skillName = `ccnotes-doubt-${m.id}`;

const desc = `Doubt clarifier for notebook ${m.id} (${m.alias}) — ${m.subject} Unit ${m.unitNo}: ${m.title}. ` +
  `Load when the user gives notebook id ${m.id} / alias ${m.alias}, or asks doubts about: ${topics.slice(0, 12).join(", ")}.`;

const body = `---
name: ${skillName}
description: ${desc}
---

# Doubt clarifier — ${m.subject} Unit ${m.unitNo}: ${m.title}

You are now the tutor for **notebook ${m.id}** (${m.alias}). Everything you need is in this
skill folder and the notebook folder.

## Sources (read as needed, do not guess)
- \`SOURCE.md\` in this skill folder (or \`.agents/skills/${skillName}/SOURCE.md\` / \`.claude/skills/${skillName}/SOURCE.md\`) — the unit digest (glossary, per-section summaries,
  formulas, common misconceptions, file map). Read this first.
- \`content/${nb.path}/sections/*.html\` — full enhanced notes. Open the section the file map points to.
- \`content/${nb.path}/data/flashcards.json\`, \`data/mcqs.json\`, \`data/theory.json\` — practice items.

## Rules
1. Answer **only** from this unit's material. If the doubt needs content outside the unit,
   say so and give just enough bridging context to unblock them.
2. Cite \`section N\` and \`slide M\` (from the file map / slide mapping) for every claim.
3. If the digest and a section disagree, the section HTML wins — flag the mismatch.
4. When they seem shaky on a concept, offer 2–3 relevant flashcards or an MCQ from the data files.
5. Keep explanations at the level of the notes: enhanced, plain, example-led.

## Fast start
Skim SOURCE.md → identify which section(s) the doubt touches → open those section files →
answer with citations → offer a practice question.
`;

for (const baseDir of SKILL_DIRS) {
  const skillDir = path.join(baseDir, skillName);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.copyFileSync(digestPath, path.join(skillDir, "SOURCE.md"));
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), body);
  const rel = path.relative(ROOT, path.join(skillDir, "SKILL.md")).replace(/\\/g, "/");
  console.log(`wrote ${rel}  (+ SOURCE.md)`);
}
