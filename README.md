# ccnotes

**A local platform for interactive, exam-focused study notes that Claude Code builds from your slide decks.**

You give it a unit's slide decks. Claude Code agents read every slide, one deck at a time, and
produce a single interactive notebook for that unit: enhanced notes (everything in the slides,
made clearer — nothing invented), per-section MCQ checks, a flashcard deck, a quick-reference
sheet, a formula sheet, and an ISA-prep pack (1-mark MCQs, 2-mark MCQs, 4-mark theory with
model answers). A small zero-dependency server lets you browse it all — subject → unit →
section — search everything, and jump straight to an answer.

Every notebook also gets its own auto-generated **doubt-clarifier skill**, so a fresh Claude
Code session can be handed the notebook id and instantly has full context to tutor you on that
unit.

Everything renders **offline** in **dark mode**, tuned to be readable and non-distracting.

---

## Requirements

- [**Bun**](https://bun.sh) — the only runtime. No `npm`, no `node_modules`, zero dependencies.
- [**Claude Code**](https://claude.com/claude-code) — to run the note-building skills.
- A POSIX shell (`unzip`, `curl`) — standard on macOS/Linux.

## Install

```bash
git clone git@github.com:CloudStone16/ccnotes.git
cd ccnotes
bun run setup        # one-time: downloads KaTeX + mermaid into viewer/note-kit/vendor/ for offline math + diagrams
```

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

Without the alias: `bun run start` (foreground) or `bun server.mjs`.

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

The `ccnotes-*` skills are **project-local** (`.claude/skills/`), so **Claude Code must be
running in this repo**.

1. **Open the repo in Claude Code**
   - Desktop app: open `~/dev/ccnotes` as the working folder.
   - Terminal: `cd ~/dev/ccnotes && claude`

2. **Scaffold the unit** (once per unit):

   ```bash
   ccnotes new "Operating Systems" 3 "Memory Management"
   ```

   This creates the notebook folder **and** the inbox folder, and prints both — e.g.
   `inbox/operating-systems/unit-3/`.

3. **Drop the decks** for that unit into that inbox folder — any mix of `.zip`, `.pptx`,
   `.pdf`, or exported Google Slides. One deck or many.

4. **Tell Claude Code to build it:**

   > run ccnotes-build for notebook `ccnotes_xxxxxx` from `inbox/operating-systems/unit-3`

5. When it finishes: **refresh the server**. The notebook is live, and a
   `ccnotes-doubt-<id>` skill now exists.

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
| tutor skill | `tools/gen-doubt-skill.mjs` | `.claude/skills/ccnotes-doubt-<id>/` |

The contract every skill follows is [`NOTES_SPEC.md`](NOTES_SPEC.md). Core rules:

- **Include everything** in the deck — no fact, bullet, table row, or diagram label dropped.
- **Enhance, don't invent** — rushed slides get elaborated; nothing is added from outside the deck.
- **Traceable** — every slide number maps to a subsection; the validator checks 100% coverage.
- **Offline** — no external URLs anywhere in a notebook.

---

## Ask doubts about a unit

Each notebook has a generated skill named `ccnotes-doubt-<id>` (description includes the id,
alias, and topic list). In any Claude Code session **run from this repo**:

> load ccnotes-doubt-ccnotes_xxxxxx — I have a doubt about page tables

The skill gives the agent that unit's digest (`SKILL_SOURCE.md`), the section files, and the
practice items, and constrains it to answer from the unit's own material with `section` /
`slide` citations.

---

## Delete a unit

```bash
bun tools/delete-notebook.mjs <id|alias> --yes
```

Removes the notebook folder, its `ccnotes-doubt-<id>` skill, and its registry entry. Or ask
Claude Code to run the `ccnotes-delete` skill (it confirms first).

## Validate the library

```bash
ccnotes validate      # every notebook against NOTES_SPEC §11
```

or click the health dot in the sidebar.

---

## Project layout

```
server.mjs               zero-dependency Bun server (shell, note-kit, content, /api/*, /health)
scripts/
  ccnotes.sh             the `ccnotes` CLI
  setup-vendor.mjs       downloads KaTeX + mermaid for offline rendering
viewer/
  index.html shell.*     the browsing shell (nav tree, search, keyboard)
  note-kit/              shared interactive layer injected into every note
    note-kit.js  .css     MCQ / quiz / flashcards / theory / tabs / steps / reveal / math / mermaid / charts
    vendor/               KaTeX + mermaid (git-ignored; run `bun run setup`)
NOTES_SPEC.md             the contract every build skill obeys
templates/
  section.html unit-index.html isa-index.html
  progress.md             per-build progress tracker
  schemas/*.json          JSON Schemas the validator enforces
tools/
  scan.mjs                builds the catalog + search index
  validate-notebook.mjs   enforces every NOTES_SPEC §11 invariant
  validate-all.mjs
  new-notebook.mjs delete-notebook.mjs gen-doubt-skill.mjs
.claude/skills/ccnotes-*  the build pipeline skills
content/                  built notebooks (git-ignored — your notes)
inbox/                    your source slide decks (git-ignored)
```

## What is not in git

Your slide decks (`inbox/`), your built notebooks (`content/`), the generated
`ccnotes-doubt-*` skills, and the vendored KaTeX/mermaid assets. Clone the repo, run
`bun run setup`, and build your own notebooks from your own decks.

## Scope

ISA (in-semester assessment) prep is built: 1-mark MCQ, 2-mark MCQ, 4-mark theory, flashcards.
ESA (end-semester) support is not built yet.


