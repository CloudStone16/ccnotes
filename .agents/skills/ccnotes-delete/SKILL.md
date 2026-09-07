---
name: ccnotes-delete
description: Permanently delete a ccnotes notebook and everything tied to it — the content folder, its ccnotes-doubt-<id> skill, and its registry entry. Use when the user asks to delete or remove a notebook / unit. Destructive; confirm first.
---

# ccnotes-delete — permanent removal

1. Identify the notebook: take an `id` or `alias`; confirm against `content/registry.json`
   (show the user its subject, unit, title).
2. **Confirm with the user explicitly** — this is irreversible and deletes the notes, the
   generated tutoring skills, and the catalog entry. Quote exactly what will be removed:
   - `content/<path>/` (all sections, data, visualizations)
   - `.agents/skills/ccnotes-doubt-<id>/` and `.claude/skills/ccnotes-doubt-<id>/`
   - the `content/registry.json` entry
3. On a clear yes: `node tools/delete-notebook.mjs <id> --yes` (or bun).
4. Tell the user to refresh / restart the server so the catalog updates. Confirm the skill
   folders are gone.

Never delete without step 2. If the user names a unit ambiguously, list matches and ask.
