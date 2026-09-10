/* Regenerate .agents/skills/ as an exact mirror of .claude/skills/.
 *
 * .claude/skills/ is the single source of truth (committed). Codex, Gemini CLI,
 * and Antigravity read .agents/skills/, which is generated (git-ignored). Run
 * this after editing a skill, or via `npm run setup`. Skill bodies are written
 * tool-neutrally so the same text serves every supported agent.
 */
import fs from "node:fs";
import path from "node:path";
import { CLAUDE_SKILLS, AGENTS_SKILLS } from "./lib.mjs";

const checkOnly = process.argv.includes("--check");

if (!fs.existsSync(CLAUDE_SKILLS)) {
  console.error(`no source skills dir: ${CLAUDE_SKILLS}`);
  process.exit(1);
}

function copyRecursive(src, dest) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const child of fs.readdirSync(dir)) {
    const full = path.join(dir, child);
    if (fs.statSync(full).isDirectory()) files.push(...listFiles(full, base));
    else files.push(path.relative(base, full));
  }
  return files.sort();
}

function validateSkill(name) {
  const entry = path.join(CLAUDE_SKILLS, name, "SKILL.md");
  if (!fs.existsSync(entry)) throw new Error(`${name}: SKILL.md missing`);
  const body = fs.readFileSync(entry, "utf8");
  const frontmatter = body.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] ?? "";
  if (!/^name:\s*\S+/m.test(frontmatter)) throw new Error(`${name}: frontmatter name missing`);
  if (!/^description:\s*\S+/m.test(frontmatter)) throw new Error(`${name}: frontmatter description missing`);
}

function compareTrees(src, dest) {
  const sourceFiles = listFiles(src);
  const destFiles = listFiles(dest);
  if (sourceFiles.join("\n") !== destFiles.join("\n")) return false;
  return sourceFiles.every((rel) =>
    fs.readFileSync(path.join(src, rel)).equals(fs.readFileSync(path.join(dest, rel)))
  );
}

const want = new Set(
  fs.readdirSync(CLAUDE_SKILLS).filter((n) => fs.statSync(path.join(CLAUDE_SKILLS, n)).isDirectory())
);

for (const name of want) validateSkill(name);

if (checkOnly) {
  const actual = fs.existsSync(AGENTS_SKILLS)
    ? fs.readdirSync(AGENTS_SKILLS).filter((n) => fs.statSync(path.join(AGENTS_SKILLS, n)).isDirectory())
    : [];
  const inSync = actual.length === want.size
    && actual.every((name) => want.has(name))
    && [...want].every((name) => compareTrees(
      path.join(CLAUDE_SKILLS, name),
      path.join(AGENTS_SKILLS, name)
    ));
  if (!inSync) {
    console.error(".agents/skills/ is missing or stale; run `npm run sync-skills`");
    process.exit(1);
  }
  console.log(`verified ${want.size} Codex-compatible skill mirror(s) in .agents/skills/`);
  process.exit(0);
}

fs.mkdirSync(AGENTS_SKILLS, { recursive: true });

// Drop anything in the mirror that no longer exists in the source.
for (const name of fs.readdirSync(AGENTS_SKILLS)) {
  if (!want.has(name)) {
    fs.rmSync(path.join(AGENTS_SKILLS, name), { recursive: true, force: true });
  }
}

// Mirror every source skill dir (replace, don't merge).
let n = 0;
for (const name of want) {
  const dest = path.join(AGENTS_SKILLS, name);
  fs.rmSync(dest, { recursive: true, force: true });
  copyRecursive(path.join(CLAUDE_SKILLS, name), dest);
  n++;
}

console.log(`mirrored ${n} skill(s) → .agents/skills/ (Codex / Gemini / Antigravity)`);
