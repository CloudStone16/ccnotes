---
name: ccnotes-slide-extract
description: Extract ONE slide deck (.pptx, .pdf, or exported Google Slides) into a structured slides.json for the ccnotes pipeline. Use when ccnotes-build asks to extract a deck.
---

# ccnotes-slide-extract — one deck -> slides.json

Input: one deck file + an output dir `content/<subjectSlug>/<id>/build/<NN-slug>/`.
Output: `slides.json`, plus images into `../../assets/img/<NN-slug>/`.

## Method
- **.pptx**: it's a zip. `unzip -o deck.pptx -d _x/`. Parse `ppt/slides/slideN.xml` in
  numeric order. For each slide pull: all `<a:t>` text runs (in reading order), speaker notes
  from `ppt/notesSlides/notesSlideN.xml`, table cell text, and the rel targets of images
  (`ppt/media/*`). Use the `pptx` skill if available for a cleaner pass.
- **.pdf**: use the `pdf` skill. One PDF page = one slide. Pull page text; export page images
  only if the page is mostly diagram.
- **Google Slides export**: treat as whichever format it was exported to.

Read slides **in order, one at a time**. Do not load the entire deck text into context at
once — extract slide N, append to the array, move on.

## slides.json shape
```json
{
  "deck": { "slug": "01-intro", "file": "Intro to Memory.pptx", "kind": "pptx" },
  "slides": [
    { "n": 1, "title": "Introduction to Memory",
      "text": "verbatim bullet / body text, newline-separated",
      "notes": "speaker notes verbatim or \"\"",
      "tables": [ [["h1","h2"],["r1c1","r1c2"]] ],
      "images": ["../../assets/img/01-intro/slide1-1.png"],
      "kind": "title|content|diagram|summary|section-break" }
  ]
}
```

## Rules
- **Verbatim.** Do not paraphrase, correct, or drop anything. Preserve numbers, symbols, order.
- Every slide gets an entry even if near-empty (`"kind":"section-break"`).
- `n` is 1-based and contiguous.

You are called **once per deck, sequentially** — never handle more than your one deck.

## Report back (<=10 lines)
`deck slug, kind, slide count, image count, list of slide numbers that were empty/unreadable`.
Also append that one line to `content/<subjectSlug>/<id>/build/PROGRESS.md` under `## Subagent log`.
