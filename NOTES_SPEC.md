# NOTES_SPEC — canonical contract for ccnotes notebooks

Every `ccnotes-*` skill (in `.claude/skills/`, mirrored to `.agents/skills/`) MUST read this
file before doing work, and MUST follow it exactly. `tools/validate-notebook.mjs` enforces the
machine-checkable parts. If this file and a skill disagree, this file wins — fix the skill.

---

## 1. Vocabulary

| Term | Meaning |
|---|---|
| **Subject** | A course, e.g. "Operating Systems". Has a slug: lowercase, `[a-z0-9-]`, spaces -> `-`. |
| **Unit** | One syllabus unit of a subject. Exactly one **notebook** per unit. |
| **Notebook** | The build output for one unit: a folder under `content/<subjectSlug>/<id>/`. |
| **Deck** | One source slide file (`.pptx`, `.pdf`, or exported Google Slides). A unit has 1+ decks. |
| **Section** | One chapter of a notebook. Default: one section per deck. A very large deck MAY be split into multiple sections; small related decks MUST NOT be merged. |
| **id** | `ccnotes_` + 6 chars `[a-z0-9]`. Assigned by `tools/new-notebook.mjs`. Immutable. |
| **alias** | Human handle `<subjectSlug>-u<unitNo>`, e.g. `operating-systems-u3`. Unique. |

---

## 2. Notebook folder layout (exact)

```
content/<subjectSlug>/<id>/
  manifest.json            REQUIRED  — see section 4
  index.html               REQUIRED  — unit landing page, built from templates/unit-index.html
  SKILL_SOURCE.md          REQUIRED  — digest powering the doubt-clarifier skill, see section 9
  sections/
    01-<slug>.html         REQUIRED  — >=1, built from templates/section.html, see section 5
    02-<slug>.html
    ...
  isa/
    index.html             REQUIRED  — ISA-prep page, built from templates/isa-index.html
  data/
    flashcards.json        REQUIRED  — schema: templates/schemas/flashcards.schema.json
    mcqs.json              REQUIRED  — schema: templates/schemas/mcqs.schema.json
    theory.json            REQUIRED  — schema: templates/schemas/theory.schema.json
    quickref.json          REQUIRED  — schema: templates/schemas/quickref.schema.json
    formulas.json          REQUIRED  — schema: templates/schemas/formulas.schema.json  (may be {"formulas":[]})
  assets/
    viz/                   0+ interactive visualization files (self-contained .html), see section 6
    img/                   extracted slide images referenced by sections
  build/                   BUILD ARTIFACTS — kept for re-runs, ignored by the viewer
    decks.json             list of decks + per-deck slide counts (from ccnotes-slide-extract)
    <deckSlug>/slides.json per-slide extracted content
    <deckSlug>/coverage.json  slide ids the section author marked covered
    viz-report.json        verification verdicts (from ccnotes-viz-verify)
```

Nothing else at the notebook root. No external network assets anywhere in `sections/`,
`index.html`, `isa/`, or `assets/` (see section 7).

---

## 3. The "enhanced, not invented" rule (the heart of the system)

1. **Include everything.** Every fact, definition, bullet, diagram, table, example, and
   footnote in the deck appears in the notes. Nothing is dropped as "obvious".
2. **Enhance for understanding.** Rewrite terse slide bullets into clear prose. If a slide
   is rushed, cramped, or assumes a leap, expand it: add the missing step, a worked example,
   an analogy, or a visualization. The notes should be *easier* to learn from than the deck.
3. **Add nothing external.** No facts, frameworks, examples, or terminology that are not
   present in or directly implied by the deck. If the deck is wrong or unclear and you
   cannot resolve it from the deck itself, add a `note-kit` `[data-reveal]` block titled
   "Gap in source" describing what is missing — do not fill it with outside knowledge.
4. **Traceability.** Every slide id must be accounted for. Each section ends with a
   collapsed "Slide mapping" block listing `slide N -> which subsection covers it`.
   `build/<deck>/coverage.json` records the same, and validation checks the union covers
   every slide the extractor found.

### 3.1. Mathematical Formatting & KaTeX Contract

1. **Strict LaTeX Delimiters:** Every mathematical variable, Greek letter (\(\theta, \sigma, \eta, \alpha, \mathbf{w}, \xi\)), expression, and formula across section HTMLs, worked examples, MCQ stems, MCQ options, MCQ explanations, flashcards, quickref points, formula sheets, and theory model answers **must** be formatted in standard LaTeX delimiters:
   - Inline math: `\( ... \)` (or `$ ... $` in markdown theory files).
   - Display/block math: `$$ ... $$` or `\[ ... \]`.
2. **Zero Raw ASCII / Programmer Math:** Never output raw code strings in options or prose (e.g., `delta_j = a_j * (1 - a_j) * sum_k (delta_k * w_jk)`, `w <- w + eta*...`, `||w||/2`, or `x_1, x_2, ..., x_n`). These look unpolished, fail to render in KaTeX, and violate the spec.
3. **Equation Wrapping & Alignment:** Multi-step derivations and long equality chains (chains with multiple `$=$` signs or lines exceeding 85 characters) **must** be formatted using `\begin{aligned} ... \end{aligned}` so that formulas wrap onto multiple lines aligned at the `$=$` operator, preventing horizontal overflow.

### 3.2. Layout, Container Width & Zero-Scrollbars Standard

1. **Fluid Container Sizing:** Note containers must expand naturally (`--maxw: min(94vw, 1080px)`) to provide ample room for equations, tables, and multi-column callouts.
2. **Zero Scrollbars:** Desktop scrollbars must never appear on math blocks, worked examples, code boxes, or callout cards. All elements must employ global scrollbar suppression (`scrollbar-width: none !important; -ms-overflow-style: none !important; ::-webkit-scrollbar { display: none !important; }`).
3. **Interactive Visualizer Iframes:** All widgets in `assets/viz/*.html` must use `overflow: hidden;` on `html, body` and dynamically adapt height to avoid iframe scrollbars.

---

## 4. `manifest.json`

```json
{
  "id": "ccnotes_a1b2c3",
  "alias": "operating-systems-u3",
  "subject": "Operating Systems",
  "subjectSlug": "operating-systems",
  "unitNo": 3,
  "title": "Memory Management",
  "summary": "One-paragraph plain-language overview of the unit.",
  "builtAt": "2026-09-06T12:00:00.000Z",
  "sourceDecks": [
    { "slug": "01-intro-to-memory", "file": "Intro to Memory.pptx", "kind": "pptx", "slides": 22 }
  ],
  "sections": [
    { "n": 1, "slug": "intro-to-memory", "title": "Introduction to Memory", "file": "sections/01-intro-to-memory.html", "deckSlug": "01-intro-to-memory", "topics": ["address binding", "logical vs physical address"] }
  ],
  "slideCoverage": { "total": 22, "covered": 22 },
  "counts": { "sectionMcqs": 18, "flashcards": 40, "mcq1": 15, "mcq2": 10, "theory4": 6, "viz": 5 }
}
```

`topics[]` feed the left-nav "jump to topic" and search. Dates are ISO-8601 UTC.

---

## 5. Section HTML (`sections/NN-slug.html`)

Built by copying `templates/section.html` and filling regions. Hard requirements:

- `<html data-ccnotes-section>` root marker.
- Loads exactly `/note-kit/note-kit.css` and `/note-kit/note-kit.js` (served by main server),
  nothing else external.
- Regions, in order:
  1. `<header>` with `<h1>` = section title and a `.crumb` = `Subject / Unit N`.
  2. `<main class="prose">` — the enhanced content. Use semantic headings `<h2>/<h3>`,
     `NoteKit` widgets, `\( \)` / `$$ $$` for math, ` ```mermaid ` for diagrams,
     `<figure>` + `<iframe class="viz" src="../assets/viz/<name>.html">` for verified viz.
  3. `<section data-section-check>` — the section MCQ check: a `[data-mcq]` element whose
     JSON is 3-8 questions testing *understanding* of this section (not in the slides).
  4. `<details data-slide-mapping>` — the traceability block from section 3.4.
- No `<script>` other than the single note-kit include and JSON `<script type="application/json">`
  payloads for widgets. All logic lives in note-kit or in a verified viz file.

---

## 6. Visualizations (`assets/viz/<name>.html`)

- One self-contained HTML file per visualization. May use inline `<script>`/`<style>`,
  SVG, Canvas, or `/note-kit/note-kit.js` helpers. **No external URLs.**
- Must render correctly on a dark (`#0e0f13`-ish) background with no host CSS.
- Must be about a concept that is actually in the deck (see section 3.3).
- Interactive where it adds understanding (sliders, step buttons, toggles) — label every control.
- Every viz is verified by `ccnotes-viz-verify`; the verdict goes in `build/viz-report.json`:

```json
{ "viz": [ { "file": "assets/viz/paging.html", "concept": "page table translation",
             "checks": { "renders": true, "consoleClean": true, "conceptMatch": true,
                         "darkModeReadable": true, "controlsWork": true },
             "verdict": "pass", "notes": "" } ] }
```

A notebook may ship only when every entry is `"verdict": "pass"`.

---

## 7. Offline / self-contained rule

`sections/`, `index.html`, `isa/index.html`, and everything in `assets/` MUST NOT reference
any `http://` or `https://` URL. The only allowed absolute paths are `/note-kit/*`
(served by the main server). Math fonts, diagram rendering, and charts all come from
`note-kit` vendored assets. Validation greps for `https?://` and fails the build if found.

---

## 8. Data files

### `data/flashcards.json`
```json
{ "deck": [
  { "id": "fc-001", "front": "What is external fragmentation?",
    "back": "Free memory split into blocks too small to satisfy a request, though the total is enough.",
    "section": 2, "tags": ["fragmentation"], "kind": "concept" } ] }
```
`kind`: `concept | definition | formula | distinction | procedure`.
**Coverage contract:** a student who can answer every card correctly is thorough with the
unit. Every key term, definition, formula, and A-vs-B distinction in the deck has a card.

### `data/mcqs.json`
```json
{
  "sectionChecks": [
    { "section": 1, "items": [ { "id": "sc-1-1", "stem": "...", "options": ["A","B","C","D"],
      "answer": 2, "explanation": "...", "difficulty": "easy|medium|hard",
      "conceptRef": "logical vs physical address" } ] }
  ],
  "isa": {
    "mark1": [ { "id": "m1-01", "stem": "...", "options": ["A","B","C","D"], "answer": 0,
                 "explanation": "...", "section": 3, "conceptRef": "..." } ],
    "mark2": [ { "id": "m2-01", "stem": "...", "options": ["A","B","C","D"], "answer": 1,
                 "explanation": "...", "section": 3, "conceptRef": "...",
                 "why": "what makes this a 2-mark / multi-step question" } ]
  }
}
```
`answer` is the 0-based index of the correct option. MCQs test understanding and application;
they must NOT be answerable by string-matching a slide bullet. `sectionChecks[].items` is the
same pool embedded in each section's `data-section-check`.

### `data/theory.json`  (4-mark ISA)
```json
{ "questions": [
  { "id": "t4-01", "marks": 4, "section": 2, "prompt": "Explain ... with a diagram.",
    "modelAnswer": "Full model answer in markdown.",
    "markingScheme": [ "1 mark: correct definition", "1 mark: labelled diagram",
                       "2 marks: two consequences with examples" ],
    "sourceSlides": [7,8,9] } ] }
```

### `data/quickref.json`
```json
{ "sections": [
  { "title": "Address translation", "points": [ "Logical address = page number + offset", "..." ] } ],
  "keyTerms": [ { "term": "TLB", "definition": "Translation Lookaside Buffer — cache of recent page-table entries." } ] }
```

### `data/formulas.json`
```json
{ "formulas": [
  { "id": "f-01", "name": "Effective access time (paging)",
    "latex": "EAT = (1-p)\\cdot m + p\\cdot(page\\ fault\\ time)",
    "symbols": [ { "sym": "p", "meaning": "page-fault rate" }, { "sym": "m", "meaning": "memory access time" } ],
    "useWhen": "Estimating paging performance with demand paging.",
    "section": 4 } ] }
```

---

## 9. `SKILL_SOURCE.md` (powers the doubt-clarifier skill)

Compact, self-contained digest. Sections:
1. **Unit overview** — 1 paragraph.
2. **Per-section summary** — for each section: title, 3-6 bullet takeaways, key terms.
3. **Glossary** — every key term -> one-line definition.
4. **Formula list** — name -> latex -> when used.
5. **Common misconceptions** — pulled from the deck's emphasis / contrasts.
6. **File map** — `sections/NN-slug.html` -> topics, so a clarifier agent can open the right file.

Target <= 500 lines. It must let a fresh agent answer doubts on this unit **using only the
deck's content**, and cite `section N` / `slide M` for every claim.

---

## 10. IDs & registry

- `tools/new-notebook.mjs "<Subject>" <unitNo> "<Title>"` assigns `id`, makes the folder
  skeleton, adds a `content/registry.json` entry with `status: "draft"`.
- `ccnotes-assemble` flips `status` to `"ready"` only after `validate-notebook.mjs` passes.
- `tools/delete-notebook.mjs <id|alias>` removes the folder, the generated doubt skills
  (`.claude/skills/ccnotes-doubt-<id>/` and `.agents/skills/ccnotes-doubt-<id>/`), and the
  registry entry.

---

## 11. Validation invariants (`tools/validate-notebook.mjs`)

A notebook is **ready** only if ALL hold:

1. `manifest.json` valid against `manifest.schema.json`; every `sections[].file` exists.
2. `build/decks.json` exists; `sum(slides)` == `manifest.slideCoverage.total`;
   union of every `build/<deck>/coverage.json` covered-id set has size == total (no gaps).
3. Each `sections/*.html` contains `data-section-check` and `data-slide-mapping` markers.
4. All five `data/*.json` present and schema-valid.
5. `mcqs.isa.mark1` length >= 10, `mcqs.isa.mark2` length >= 8, `theory.questions` (marks==4) length >= 5,
   `flashcards.deck` length >= 8 * sectionCount.
6. `build/viz-report.json` present; every `viz[].verdict === "pass"`.
7. No `https?://` match anywhere under `sections/`, `assets/`, `index.html`, `isa/`.
8. `SKILL_SOURCE.md` present, >= 40 lines, contains headings for Glossary and Formula list.
9. `id` and `alias` unique in `content/registry.json`.
10. All mathematical expressions across `data/*.json` and section HTMLs parse cleanly in KaTeX without syntax errors, with zero unformatted ASCII math in MCQ options.

Exit non-zero on any failure with a precise list. `ccnotes-assemble` must not register on failure.
