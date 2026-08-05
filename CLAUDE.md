# DEF CON 34 Navigator — Agent Instructions

Fork of Waypoint (github.com/Pizzawookiee/Waypoint) preloaded with DEF CON 34 maps for the Las Vegas Convention Center (Aug 6–9, 2026).

## Standing instructions (absolute)

- Never modify files outside the `Owns:` list of your task.
- Never edit `src/decimen/**` — it is vendored upstream code.
- Never remove or weaken existing tests. New behavior gets new tests.
- Never introduce a network dependency in the visitor flow — the app must work fully offline after first load.
- All map/checkpoint data lives in `src/defcon/` — never hardcode DEF CON data inside generic Waypoint components.
- Verification is command-based: `npm run typecheck` and `npm test` must pass before a task is complete.

## Layout

- `docs/research/` — findings about LVCC maps, Waypoint internals
- `docs/plan/plan.md` — the single plan file (source of truth)
- `docs/notes/` — discoveries during execution, fed back into plan
- `src/defcon/` — DEF CON 34 data: map images, checkpoint graph, preload logic

## Commands

- `npm run dev` — dev server at 127.0.0.1:5173
- `npm run typecheck` / `npm test` / `npm run build`
