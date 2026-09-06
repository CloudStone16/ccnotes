/* Permanently remove a notebook: folder + its doubt-clarifier skill + registry entry. */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { CONTENT, SKILLS, loadRegistry, saveRegistry } from "./lib.mjs";

const target = process.argv[2];
const assumeYes = process.argv.includes("--yes");
if (!target) { console.error("usage: bun tools/delete-notebook.mjs <id|alias> [--yes]"); process.exit(2); }

const reg = loadRegistry();
const nb = reg.notebooks.find((n) => n.id === target || n.alias === target);
if (!nb) { console.error("not found: " + target); process.exit(1); }

const nbDir = path.join(CONTENT, nb.path);
const skillDir = path.join(SKILLS, `ccnotes-doubt-${nb.id}`);
const plan = [
  fs.existsSync(nbDir) ? `  rm -rf content/${nb.path}` : `  (content folder already gone)`,
  fs.existsSync(skillDir) ? `  rm -rf .claude/skills/ccnotes-doubt-${nb.id}` : `  (doubt skill already gone)`,
  `  remove registry entry ${nb.id} (${nb.alias})`
];
console.log(`About to permanently delete "${nb.subject} — Unit ${nb.unitNo}: ${nb.title}"`);
console.log(plan.join("\n"));

async function confirm() {
  if (assumeYes) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ans = await new Promise((r) => rl.question(`\nType the id (${nb.id}) to confirm: `, r));
  rl.close();
  return ans.trim() === nb.id;
}

const rmrf = (p) => fs.existsSync(p) && fs.rmSync(p, { recursive: true, force: true });

confirm().then((ok) => {
  if (!ok) { console.log("aborted."); process.exit(1); }
  rmrf(nbDir);
  rmrf(skillDir);
  // prune now-empty subject dir
  const subjDir = path.dirname(nbDir);
  try { if (fs.readdirSync(subjDir).length === 0) fs.rmdirSync(subjDir); } catch {}
  reg.notebooks = reg.notebooks.filter((n) => n.id !== nb.id);
  saveRegistry(reg);
  console.log(`\ndeleted ${nb.id}. Restart or refresh the server to update the catalog.`);
});
