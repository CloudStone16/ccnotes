---
name: ccnotes-viz-verify
description: Verify every visualization in a ccnotes notebook by loading it in a browser and checking render, console, concept match, dark-mode readability, and controls. Writes build/viz-report.json. Use when ccnotes-build asks to verify visualizations.
---

# ccnotes-viz-verify — check assets/viz/*.html, write build/viz-report.json

Read `NOTES_SPEC.md` section 6.

## Setup
Ensure the server runs (`node server.mjs`, port 4319). Each viz is reachable at
`http://localhost:4319/content/<subjectSlug>/<id>/assets/viz/<name>.html`.
Use whatever browser-automation tools your agent has (Codex: browser or computer-use tools;
Claude Code: `mcp__Claude_Browser__*`; Antigravity: its browser subagent) to navigate,
screenshot, read console messages, read the DOM, and exercise controls.

## Per-file checks
| check | pass condition |
|---|---|
| `renders` | visible content within 2s; no blank frame; no unstyled flash left behind |
| `consoleClean` | no errors or uncaught rejections in console (warnings OK) |
| `conceptMatch` | what's drawn matches the request's `concept` + `sourceSlides` (open slides.json to confirm — no extra claims) |
| `darkModeReadable` | text/lines have adequate contrast on the dark bg; nothing black-on-black; labels legible at default size |
| `controlsWork` | every slider/button/toggle changes the view as its label implies; reset works |

Take a screenshot of each viz (initial + after operating one control) for the record.

## Output — build/viz-report.json
```json
{ "checkedAt": "<iso>", "viz": [
  { "file": "assets/viz/paging.html", "concept": "page table translation",
    "checks": { "renders": true, "consoleClean": true, "conceptMatch": true,
                "darkModeReadable": true, "controlsWork": true },
    "verdict": "pass", "notes": "" } ] }
```
`verdict` is `pass` only if all five checks pass; else `fail` with `notes` telling
ccnotes-viz-build exactly what to fix.

## Report (<=10 lines)
`N viz, P pass, F fail` + one line per failure.
