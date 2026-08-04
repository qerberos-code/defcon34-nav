# Task B — DEF CON 34 pack data + builder

Owns: `src/defcon/**` (create the directory). Nothing else.

## Deliverables
1. `src/defcon/data.ts`
   - `export const MAP_WIDTH = 3600; export const MAP_HEIGHT = 2400;`
   - Nodes, edges, checkpoints built from the POI table in `docs/research/lvcc-maps.md` (coords are normalized 0–1 fractions of the full poster, same convention as `src/demo.ts`).
   - Every POI from the research table becomes a checkpoint with a **unique shortCode** (e.g. REG, TRK1, AERO…) and its own route node at the POI coordinates.
   - Corridor spine nodes per floor, POI nodes edge-connected to the nearest spine node. Suggested spines (refine as needed):
     - **Floor 1** (wedge tilts right going down): chain (0.20,0.15)→(0.22,0.22)→(0.26,0.38)→(0.29,0.47)→(0.31,0.55)→(0.33,0.62)→(0.35,0.665)→(0.37,0.74)→(0.39,0.80)→(0.41,0.85). West chain: Registration(0.067,0.90)→Chillout(0.082,0.807)→Food Court(0.193,0.733)→Atrium(0.19,0.60), Atrium↔(0.31,0.55) spine, Registration↔(0.41,0.85) south spine.
     - **Floor 2** (A-shape): entry (0.645,0.476) then left leg up-right (0.655,0.46)→(0.68,0.42)→(0.71,0.37)→(0.735,0.32)→(0.76,0.27)→(0.80,0.21); right leg down from top: (0.82,0.30)→(0.80,0.35)→(0.83,0.42)→(0.843,0.469); crossbar between legs near workshops.
     - **Floor 3** (A-shape): entry (0.670,0.852) then (0.695,0.81)→(0.72,0.77)→(0.74,0.72)→(0.755,0.67)→(0.77,0.63); right-leg nodes near (0.79,0.72) and (0.77,0.765).
   - Floor-transition checkpoints "Escalators (Floor 1/2/3)" at F1 Atrium (0.19,0.60), F2 entry (0.645,0.476), F3 entry (0.670,0.852); edges F1↔F2, F2↔F3 (these are the ONLY cross-floor edges).
   - `destinations` stays `[]` (legacy; visitor routing is checkpoint-only).
2. `src/defcon/pack.ts`
   - `export function assemblePack(imageDataUrl: string): NavPack` — pure; event `{ id: 'defcon34', name: 'DEF CON 34 · LVCC', createdAt: '2026-08-04T00:00:00.000Z' }`, floor `{ id: 'lvcc-all', name: 'LVCC West Hall (Floors 1–3)', imageDataUrl, imageWidth: MAP_WIDTH, imageHeight: MAP_HEIGHT }`, no calibration.
   - `export async function buildDefconPack(): Promise<NavPack>` — `fetch(import.meta.env.BASE_URL + 'defcon34-map.jpg')`, blob → data URL (FileReader), delegate to `assemblePack`. Throw `Error` with a human message on failure.
3. `src/defcon/pack.test.ts` — tests **assemblePack only** (vitest runs in node: no fetch, no server), using a tiny inline `data:image/gif;base64,…` fixture:
   - `validateNavPack(assemblePack(fixture))` does not throw
   - graph fully connected: BFS from the Registration node reaches every checkpoint's routeNodeId
   - all checkpoint shortCodes unique; all edge/checkpoint node references exist

## Acceptance (command-verifiable)
- ✓ `npx vitest run src/defcon` passes
- ✓ `npm run typecheck` passes
- ✓ `npm test` passes (no existing test broken)

## Constraints
- Never edit files outside `src/defcon/`. Never touch `src/decimen/**`.
- Follow existing code style (see `src/demo.ts`, `src/lib/*`).
