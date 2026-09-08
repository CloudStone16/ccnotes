---
name: ccnotes-viz-build
description: Build self-contained interactive visualizations (SVG/Canvas/JS, dark-mode, offline) for a ccnotes notebook from a viz-requests list. Use when ccnotes-build asks for visualizations or re-work of failing ones.
---

# ccnotes-viz-build — viz-requests -> assets/viz/*.html

Read `NOTES_SPEC.md` section 6. One request = one file `assets/viz/<name>.html`.

## Requirements per file
- Fully self-contained: inline `<style>` + `<script>`, or `/note-kit/note-kit.js` helpers
  (`NoteKit.chart`). **No external URLs, no CDNs, no imports.**
- Renders on a dark `#0a0b0e`/`#0e0f13` background with its own minimal CSS (host CSS absent).
- Readable: labels on every axis / node / control; legend where needed; font >= 13px;
  colours from the note-kit palette (`--accent #6cc4c0`, `--good`, `--warn`, `--bad`, greys).
- Interactive where it teaches: sliders / step buttons / toggles / drag. Label every control
  and show current values. Provide a "reset" where state accumulates.
- Depicts a concept **actually in the source slides** (`sourceSlides` in the request). No
  new information.
- Deterministic: no randomness that changes the teaching point; `prefers-reduced-motion`
  respected for animations.
- Size target < 60 kB. Works standalone when opened directly (it will be in an iframe).

## Rebuild mode
When ccnotes-build passes failing items + verifier notes, fix exactly those issues and
overwrite just those files.

## Report (<=10 lines)
one line per file: `name — concept — interactive? — approx size`.
