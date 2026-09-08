# AGENTS.md — agent rules for ccnotes

**ccnotes** is a local platform for interactive, exam-focused study notes built from slide
decks. It is built and maintained with coding agents. This file is the shared contract for
any agent working in this repo — Claude Code, Google Antigravity, Codex, and anything else
that reads `AGENTS.md`.

`NOTES_SPEC.md` is the canonical, machine-checked contract for notebook *content*. This file
is the operational layer on top of it. If the two disagree, `NOTES_SPEC.md` wins.

---

## 1. Non-negotiable invariants

Every skill and every agent action in this repo must respect these (the validator,
`tools/validate-notebook.mjs`, enforces the machine-checkable ones):

1. **Enhanced, not invented.** Every fact, definition, bullet, table row, diagram label and
   speaker note from the slides must appear in the notes — nothing dropped as "obvious".
   Terse slides get worked examples, analogies and step lists. Never add a fact, term or
   framework that is not in the deck; an unavoidable gap is marked
   `<div data-reveal="Gap in source">…</div>`, never filled from outside.
2. **100% slide traceability.** Every slide number maps to exactly one subsection. The
   validator enforces `sum(covered) == total` with zero unhandled slides.
3. **Fully offline.** No `http://` or `https://` URLs anywhere in `sections/`, `assets/`,
   `index.html` or `isa/`. All CSS, JS, math (KaTeX) and diagrams (Mermaid) come from
   `/note-kit/*` served by the local server.
4. **Dark mode.** Notes and visualizations render on `#0a0b0e` / `#0e0f13`, readable and
   low-distraction.
5. **Zero dependencies.** No npm packages, no `node_modules`. Tools run on Node.js ≥ 20
   (or Bun). The server is plain `node:http`.

---

## 2. Skills

The build pipeline is a set of skills. **`.claude/skills/` is the source of truth and the
only copy in git.** `.agents/skills/` is a generated mirror for Antigravity — produced by
`node tools/sync-skills.mjs` (also run by `npm run setup`) and git-ignored. Never edit
`.agents/skills/` by hand; edit `.claude/skills/` and re-run the sync.

Both Claude Code and Antigravity discover skills by the `SKILL.md` frontmatter
(`name`, `description`) and load the body on relevance. Agents without a skill mechanism
(Codex, Gemini CLI, Cursor) should read the relevant `.claude/skills/<skill>/SKILL.md`
directly and follow it, plus the CLI commands in section 3.

| Skill | Role |
|---|---|
| `ccnotes-build` | Conductor: orchestrates the pipeline across subagents, tracking progress in `build/PROGRESS.md`. |
| `ccnotes-slide-extract` | Extracts one deck into `slides.json` and images into `assets/img/`. |
| `ccnotes-section-author` | Two-pass authoring: slide-by-slide draft, then strict audit against the slides. |
| `ccnotes-viz-build` | Builds self-contained dark-mode interactive visualizations (`assets/viz/*.html`). |
| `ccnotes-viz-verify` | Loads each visualization in a browser and checks render / console / concept / readability / controls (`build/viz-report.json`). |
| `ccnotes-mcq` | Section understanding checks + ISA 1-mark and 2-mark banks (`data/mcqs.json`). |
| `ccnotes-flashcards` | Comprehensive flashcard deck (`data/flashcards.json`). |
| `ccnotes-theory` | 4-mark ISA theory questions with model answers and marking schemes (`data/theory.json`). |
| `ccnotes-quickref` | Quick-reference points + formula sheet (`data/quickref.json`, `data/formulas.json`). |
| `ccnotes-assemble` | Assembles the HTML pages, runs the validator, marks the notebook `ready`. |
| `ccnotes-delete` | Permanently deletes a notebook and its tutoring skills (confirms first). |
| `ccnotes-doubt-<id>` | Auto-generated per-notebook tutoring skill for student Q&A with slide citations. |

---

## 3. CLI commands

Run with `node` (default) or `bun` — pick whichever is installed:

- **Scaffold a notebook**: `node tools/new-notebook.mjs "<Subject>" <unitNo> "<Title>"`
- **Validate one notebook**: `node tools/validate-notebook.mjs <id|alias>`
- **Validate the library**: `node tools/validate-all.mjs`
- **Generate / refresh a doubt skill**: `node tools/gen-doubt-skill.mjs <id|alias>` (writes to `.claude/skills/` and `.agents/skills/`)
- **Delete a notebook**: `node tools/delete-notebook.mjs <id|alias> [--yes]`
- **Mirror skills to `.agents/skills/`**: `node tools/sync-skills.mjs`
- **Start the server**: `node server.mjs` (default port 4319)

---

## 4. Pipeline execution discipline

When running `ccnotes-build`:

- **Context management.** Never paste full slide decks or large HTML files into your main
  context. Work from short subagent reports, file paths, and `build/PROGRESS.md`.
- **Decks sequential, everything else overlapped.** Extract decks one at a time, in order.
  A section author can run as soon as its deck's `slides.json` exists. The four assessment
  skills (`mcq`, `flashcards`, `theory`, `quickref`) run concurrently. Cap: 3 subagents at once.
- **Resume cleanly.** Always read `build/PROGRESS.md` first and skip anything already ticked.
- **Never invent.** Gaps go to `## Gaps to revisit` in `PROGRESS.md`, not into the notes.

---

## 5. Notes for specific agents

- **Antigravity**: skills live in `.agents/skills/` (generated). Its browser subagent covers
  `ccnotes-viz-verify`'s browser checks.
- **Claude Code**: skills live in `.claude/skills/`. Browser checks use the
  `mcp__Claude_Browser__*` tools.
- **Gemini CLI**: also reads a `GEMINI.md`; if you use it, symlink one —
  `ln -s AGENTS.md GEMINI.md`.
