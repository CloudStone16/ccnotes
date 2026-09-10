# ccnotes

**A local platform for interactive, exam-focused study notes that coding agents build from your slide decks.**

You give it a unit's slide decks. A coding agent (Codex, Claude Code, Gemini CLI, or Google Antigravity) reads every slide, one deck at a time, and
produces a single interactive notebook for that unit: enhanced notes (everything in the slides,
made clearer — nothing invented), per-section MCQ checks, a flashcard deck, a quick-reference
sheet, a formula sheet, and an ISA-prep pack (1-mark MCQs, 2-mark MCQs, 4-mark theory with
model answers). A small zero-dependency server lets you browse it all — subject → unit →
section — search everything, and jump straight to an answer.

Every notebook also gets its own auto-generated **doubt-clarifier skill** (in `.claude/skills/`,
mirrored to `.agents/skills/`), so a fresh agent session can be handed the notebook id and
instantly has full context to tutor you on that unit.

Everything renders **offline** in **dark mode**, tuned to be readable and non-distracting.

---

## Requirements

- [**Node.js**](https://nodejs.org) (>= 20) or [**Bun**](https://bun.sh) — zero external npm dependencies.
- [**Codex**](https://developers.openai.com/codex/), [**Claude Code**](https://claude.com/claude-code), [**Gemini CLI**](https://geminicli.com), or [**Google Antigravity**](https://antigravity.google) — to run the note-building skills.
- A POSIX shell with `unzip` and `curl` (standard on macOS/Linux).

## Install

```bash
git clone git@github.com:CloudStone16/ccnotes.git
cd ccnotes
npm run setup        # one-time: downloads offline assets and exposes the skills to Codex, Gemini, and Antigravity
```

(`bun run setup` works too.)

Codex only needs the agent files, so it can be bootstrapped without downloading the browser
assets: `npm run setup:codex`. Use `npm run check:agent-skills` to verify the generated
`.agents/skills/` tree matches the committed skill source.

Optional — add the `ccnotes` command to your shell (`~/.zshrc`):

```bash
echo 'alias ccnotes="$HOME/dev/ccnotes/scripts/ccnotes.sh"' >> ~/.zshrc
# adjust the path if you cloned elsewhere, then open a new terminal
```

---

## Run the server

```bash
ccnotes start        # background server → http://localhost:4319
ccnotes stop
ccnotes restart
ccnotes status       # run state + health check
ccnotes logs         # tail -f the server log
ccnotes open         # open the browser
```

Without the alias: `npm start` (foreground) or `node server.mjs`.

**In the browser:**

| | |
|---|---|
| Left tree | subject → unit → section / ISA prep / quick reference / formula sheet / flashcards |
| `/` | focus search — matches section text, topics, and key terms across every notebook |
| `j` / `k` | previous / next section |
| health dot (top-left) | per-notebook validation status |

Notes render inside a sandboxed `<iframe>`, so each note can run arbitrary JavaScript with no
risk to the shell.

---

## Make notes for a unit

The `ccnotes-*` skills are **project-local**: `.claude/skills/` (Claude Code, the source of
truth) and its generated mirror `.agents/skills/` (Codex, Gemini CLI, and Antigravity). So
**run your agent from this repo root**.

1. **Open the repo in your agent**
   - **Codex**: run `npm run setup:codex`, then open the repo root in the Codex app, IDE extension, or CLI. Codex reads `AGENTS.md` and discovers the generated `.agents/skills/` automatically.
   - **Claude Code**: open the repo folder in Claude desktop, or run `claude` in your terminal.
   - **Google Antigravity**: open the repo folder in Antigravity (run `npm run setup` first if `.agents/skills/` is missing).

2. **Scaffold the unit** (once per unit):

   ```bash
   ccnotes new "Operating Systems" 3 "Memory Management"
   # or: node tools/new-notebook.mjs "Operating Systems" 3 "Memory Management"
   ```

   This creates the notebook folder **and** the inbox folder, and prints both — e.g.
   `inbox/operating-systems/unit-3/`.

3. **Drop the decks** for that unit into that inbox folder — any mix of `.zip`, `.pptx`,
   `.pdf`, or exported Google Slides. One deck or many.

4. **Tell your agent to build it:**

   > run ccnotes-build for notebook `ccnotes_xxxxxx` from `inbox/operating-systems/unit-3`

5. When it finishes: **refresh the server**. The notebook is live, and a
   `ccnotes-doubt-<id>` skill now exists in `.claude/skills/` and `.agents/skills/`.

Repeat 2–5 for each unit. Same subject, different unit = just another `ccnotes new`.

### What `ccnotes-build` does

It orchestrates a pipeline of sub-skills, mostly in parallel subagents, tracking progress in
`content/<…>/build/PROGRESS.md` so an interrupted build resumes cleanly:

| stage | skill | output |
|---|---|---|
| extract (one deck at a time) | `ccnotes-slide-extract` | `build/<deck>/slides.json` — verbatim slide content |
| author (one section per deck, two passes) | `ccnotes-section-author` | `sections/NN-*.html` + coverage map + visualization requests |
| visualize + verify (loop until clean) | `ccnotes-viz-build` ↔ `ccnotes-viz-verify` | `assets/viz/*.html`, browser-checked for render / console / concept / readability / controls |
| assess (parallel) | `ccnotes-mcq`, `ccnotes-flashcards`, `ccnotes-theory`, `ccnotes-quickref` | `data/*.json` |
| assemble | `ccnotes-assemble` | `index.html`, `isa/index.html`, `manifest.json`, `SKILL_SOURCE.md` |
| validate + register | `tools/validate-notebook.mjs` | notebook goes `ready` only if every invariant passes |
| tutor skill | `tools/gen-doubt-skill.mjs` | `.agents/skills/ccnotes-doubt-<id>/` & `.claude/skills/ccnotes-doubt-<id>/` |

The contract every skill follows is [`NOTES_SPEC.md`](NOTES_SPEC.md). Core rules:

- **Include everything** in the deck — no fact, bullet, table row, or diagram label dropped.
- **Enhance, don't invent** — rushed slides get elaborated; nothing is added from outside the deck.
- **Traceable** — every slide number maps to a subsection; the validator checks 100% coverage.
- **Offline** — no external URLs anywhere in a notebook.

---

## Ask doubts about a unit

Each notebook has a generated skill named `ccnotes-doubt-<id>` (description includes the id,
alias, and topic list). In any Codex, Gemini, Antigravity, or Claude Code session
**run from this repo**:

> load ccnotes-doubt-ccnotes_xxxxxx — I have a doubt about page tables

The skill gives the agent that unit's digest (`SKILL_SOURCE.md`), the section files, and the
practice items, and constrains it to answer from the unit's own material with `section` /
`slide` citations.

---

## Delete a unit

```bash
node tools/delete-notebook.mjs <id|alias> --yes
# or: bun tools/delete-notebook.mjs <id|alias> --yes
```

Removes the notebook folder, its `ccnotes-doubt-<id>` skills from both `.agents/` and `.claude/`, and its registry entry. Or ask
your agent to run the `ccnotes-delete` skill (it confirms first).

## Validate the library

```bash
ccnotes validate      # every notebook against NOTES_SPEC §11
```

or click the health dot in the sidebar.

---

## Project layout

```
server.mjs               zero-dependency HTTP server (shell, note-kit, content, /api/*, /health)
scripts/
  ccnotes.sh             the `ccnotes` CLI
  setup-vendor.mjs       downloads KaTeX + mermaid for offline rendering
viewer/
  index.html shell.*     the browsing shell (nav tree, search, keyboard)
  note-kit/              shared interactive layer injected into every note
    note-kit.js  .css     MCQ / quiz / flashcards / theory / tabs / steps / reveal / math / mermaid / charts
    vendor/               KaTeX + mermaid (git-ignored; run `npm run setup`)
AGENTS.md                project instructions loaded automatically by Codex
NOTES_SPEC.md            the contract every build skill obeys
templates/
  section.html unit-index.html isa-index.html
  progress.md             per-build progress tracker
  schemas/*.json          JSON Schemas the validator enforces
tools/
  scan.mjs                builds the catalog + search index
  validate-notebook.mjs   enforces every NOTES_SPEC §11 invariant
  validate-all.mjs
  new-notebook.mjs delete-notebook.mjs gen-doubt-skill.mjs sync-skills.mjs
.claude/skills/ccnotes-* build pipeline skills (source of truth, in git)
.agents/skills/          generated mirror for Codex, Gemini CLI, Antigravity (git-ignored)
content/                  built notebooks (git-ignored — your notes)
inbox/                    your source slide decks (git-ignored)
```

## What is not in git

Your slide decks (`inbox/`), your built notebooks (`content/`), the generated
`ccnotes-doubt-*` skills, the generated `.agents/skills/` mirror, and the vendored
KaTeX/mermaid assets. Clone the repo, run `npm run setup`, and build your own notebooks
from your own decks.

## Scope

ISA (in-semester assessment) prep is built: 1-mark MCQ, 2-mark MCQ, 4-mark theory, flashcards.
ESA (end-semester) support is not built yet.


