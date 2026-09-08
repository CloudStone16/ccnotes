---
name: ccnotes-section-author
description: Turn ONE deck's slides.json into ONE enhanced interactive section HTML for a ccnotes notebook. Use when ccnotes-build asks to author a section. Enforces "include everything, enhance for understanding, invent nothing".
---

# ccnotes-section-author — slides.json -> sections/NN-slug.html

Read `NOTES_SPEC.md` sections 3, 5, 6 now. Then work.

Inputs: `build/<NN-slug>/slides.json`, the notebook `manifest`-to-be data (subject, unitNo),
`templates/section.html`.
Outputs: `sections/NN-<slug>.html`, `build/<NN-slug>/coverage.json`, a viz-requests list
(return in your report; ccnotes-build collects them).

## Hard process rule (anti-hallucination + no missed detail)
Two passes over `build/<NN-slug>/slides.json`:

**Pass 1 — draft, slide by slide.** Read slide 1 -> write its content into the section ->
add slide 1 to `covered[]` in a running `coverage.json` -> slide 2 -> ...
**Never** read the whole slides array and write from memory.

**Pass 2 — audit.** Re-read `slides.json` from the top against the finished section. For each
slide confirm every fact / bullet / table row / diagram label / speaker-note point actually
appears in the notes. Anything missing: add it now. Only slides that fully survive the audit
stay in `covered[]`. If a slide's content is genuinely too thin to teach from, elaborate it
(worked example, analogy, extra step) — do not drop it.

Log both passes in one line each to `build/PROGRESS.md` `## Subagent log`, and put any
"rushed / needs elaboration / gap in source" item in `## Gaps to revisit`.

## Content rules
1. **Include everything** on every slide: definitions, bullets, examples, table rows,
   diagram labels, speaker notes. Nothing dropped as "obvious".
2. **Enhance:** expand terse bullets into clear prose; add a worked example / analogy /
   step list where a slide is rushed or assumes a leap. Notes must be easier than the deck.
3. **Invent nothing.** No facts/terms/examples not in the deck. Genuine gap -> a
   `<div data-reveal="Gap in source">...</div>` describing what's missing. No outside fill.
4. Group the slides into 2–5 `<h2>` subsections with a logical arc; keep slide order within.
5. Use note-kit blocks: `data-callout`, `data-reveal`, `data-tabs`, `data-steps`,
   `\( \)` / `$$ $$`, `<pre class="mermaid">`, `<canvas data-chart>`.
   For anything that deserves a real interactive diagram, DON'T build it here — add a
   viz-request instead and leave a `<figure><iframe class="viz" src="../assets/viz/<name>.html">`
   placeholder (ccnotes-viz-build fills it, ccnotes-viz-verify checks it).
6. Fill the `data-section-check` block with 3–8 short MCQs you write now (understanding, not
   recall). ccnotes-mcq may later replace/extend them — that's fine.
7. Fill `data-slide-mapping`: every slide number -> the subsection that covers it.

## viz-requests item shape (return these)
```json
{ "name": "page-table-translation", "concept": "how a logical address becomes physical via the page table",
  "sourceSlides": [7,8], "type": "interactive-diagram|animation|chart|simulator",
  "spec": "what it should show, what the user can control, what stays labelled" }
```

## coverage.json
`{ "deck": "01-intro", "total": 22, "covered": [1,2,3, ... ,22] }`  (every slide number you handled)

## Report (<=15 lines)
section file path, slides covered/total, viz-requests (names + one line each),
any "Gap in source" notes, subsection titles.
