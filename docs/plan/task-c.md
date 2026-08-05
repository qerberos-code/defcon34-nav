# Task C — Visitor UI integration + branding

Owns: `src/App.tsx`, `src/components/Visitor.tsx`, `src/styles.css`. Nothing else.

## Interface contract (Task B provides, do not read B's code)
`import { buildDefconPack } from '../defcon/pack'` — `buildDefconPack(): Promise<NavPack>`, throws `Error` with a human-readable message on failure. Expose no checkpoint IDs: apply the pack **bare** (`{ pack }`), never preselect checkpointId/targetCheckpointId.

## Deliverables
1. `src/components/Visitor.tsx` welcome screen (the `if (!state)` branch): add a **primary, topmost** button `Load DEF CON 34 map`:
   - onClick: `buildDefconPack()` → `applyVisitorState({ pack }, 'DEF CON 34 map loaded — pick where you are.')`
   - catch → `setMessage(error.message)`; disable the button while loading (local state) to prevent double-taps.
   - Keep existing scan/import/demo options below it.
   - Update welcome copy: heading mentions DEF CON 34.
2. `src/App.tsx` branding: brand block becomes `DC34 NAV` / `DEF CON 34 · LVCC` (keep hrefs, structure, offline badge untouched).
3. `src/styles.css`: only if the new button needs it (existing `.button.accent.large.full` classes likely suffice — prefer reuse).

## Acceptance
- ✓ `npm run typecheck` passes **once Task B's `src/defcon/pack.ts` exists** — if it is missing when you finish, report that explicitly; do not stub it yourself (B owns that path).
- ✓ No changes outside owned files (`git status` clean elsewhere).

## Constraints
- Never create or edit anything under `src/defcon/` — that is Task B's territory.
- Match the file's existing dense one-line JSX style.
