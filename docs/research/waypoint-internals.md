# Waypoint internals (research, 2026-08-04)

## Data model (src/types.ts)
- `NavPack` = one event + **one floor image** (`imageDataUrl`) + routing graph (`nodes`/`edges`, coords normalized 0–1 of image) + `destinations` + `checkpoints`.
- Visitor navigation is **checkpoint → checkpoint** (`shortestRoute` Dijkstra over nodes/edges, src/lib/routing.ts). Only checkpoints are selectable as location/destination.
- Coordinates: fractions of image width/height (see demo.ts using .12/.5 etc.).

## How a pack reaches the visitor (src/components/Visitor.tsx)
- Load persisted `VisitorState { pack, checkpointId, targetCheckpointId }` from IndexedDB (`src/lib/storage.ts`, fixed keys).
- Or: scan animated location QR / import `.navpack` file / **"Try the demo event" button → `createDemoPack()` then `applyVisitorState`**.
- The demo button is the preload pattern to copy for a "Load DEF CON 34" button.

## Multi-floor problem
- One image per pack. DC34 poster conveniently renders **all 3 floors on one canvas** → use the whole poster as the single floor image; connect floors with edges at escalator positions. Dijkstra works across; drawn route jumps between floor drawings (acceptable, labeled via "Escalators" checkpoints).

## Offline
- vite-plugin-pwa precaches build assets; pack image is embedded as data URL inside the pack stored in IndexedDB → fully offline after first load.

## Constraints found
- `src/decimen/**` is vendored (do not touch).
- `validateNavPack` runs on every save/load — data must conform.
- Route weight uses `imagePixelDistance` × calibration for meters; calibration optional (omit → "Route ready" instead of meters). LVCC West Hall 1 exhibit floor is ~600 ft wide; rough calibration possible but skip for v1 (poster scale differs per floor).
