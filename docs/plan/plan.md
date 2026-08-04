# Plan: DEF CON 34 Navigator (2026-08-04)

## Overview
Fork Waypoint into a DEF CON 34 LVCC navigator: the app ships preloaded with the DC34 poster map and a checkpoint graph covering all villages/tracks/services across 3 floors. A visitor opens the site once, taps "Load DEF CON 34", picks where they are and where they want to go, and gets an offline shortest route. Con starts 2026-08-06 — scope is ruthlessly v1.

## Hard constraints (absolute)
- Never edit `src/decimen/**`.
- Never break `npm run typecheck` or `npm test`.
- The visitor flow must work fully offline after first page load.
- All DC34-specific code/data lives in `src/defcon/`; generic components may only gain minimal, generic hooks (a preload button/branding), never DC34 data inline.
- Pack must pass `validateNavPack` (src/lib/navpack.ts).
- Map image asset: `public/defcon34-map.jpg`, ≤ 1.2MB, ≥ 3000px wide.

## Current state (2026-08-04)
- Fresh clone of Waypoint on branch `defcon34`; upstream tests green (assumed — verified in Phase 0).
- Poster rendered at `docs/research/maps-1.png` (10800×7200); POI table in `docs/research/lvcc-maps.md`.

## Architecture decisions
| Decision | Choice | Why |
|---|---|---|
| Multi-floor handling | One pack, full poster as single image, floors linked by "Escalators" edges | NavPack supports one image; poster already composites 3 floors; Dijkstra spans floors for free |
| Data delivery | Image in `public/`, fetched + embedded as data URL at pack build time, persisted via existing IndexedDB visitor state | Reuses Waypoint storage/validation; PWA precaches asset |
| Preload UX | "Load DEF CON 34" primary button on visitor welcome (pattern: existing demo button) | Smallest possible touch to generic UI |
| Checkpoints vs destinations | Every POI is a checkpoint (routable both as location and target); destinations list mirrors majors | Waypoint routes only checkpoint→checkpoint |
| Calibration | Omitted in v1 | Poster mixes per-floor scales; "Route ready" without meters is honest |
| Branding | Header title/subtitle swap to "DC34 NAV / DEF CON 34 · LVCC" | Cosmetic, low risk |

## Phases (dependency-ordered)
1. **Phase 0 — baseline**: `npm install`, `npm run typecheck`, `npm test` green on clean clone.
2. **Phase A — map asset + PWA config** (owns `public/defcon34-map.jpg`, `vite.config.ts`): downscale poster → JPEG; **add `jpg` to PWA globPatterns** (review finding #9 — `.jpg` is not precached today, which silently breaks the offline constraint). Verify: `sips -g pixelWidth public/defcon34-map.jpg` ≥3000, `stat -f%z` ≤1.2MB file (data URL will be ~1.33×, that's fine — the file-size budget is the only binding one).
3. **Phase B — data + pack builder** (owns `src/defcon/**`): `data.ts` exports `MAP_WIDTH`/`MAP_HEIGHT` constants + nodes/edges/checkpoints (every checkpoint needs a **unique shortCode**; destinations stay an empty array — legacy, visitor routing is checkpoint-only per readiness.ts). `pack.ts` splits **`assemblePack(imageDataUrl): NavPack`** (pure, testable) from **`buildDefconPack(): Promise<NavPack>`** (fetches `import.meta.env.BASE_URL + 'defcon34-map.jpg'`, blob→dataURL, delegates). Test `src/defcon/pack.test.ts` targets `assemblePack` with a tiny inline `data:image/` fixture (review finding #12 — vitest runs in node, no server, no fetch of public assets): validateNavPack passes, graph fully connected, no dangling routeNodeIds, shortCodes unique.
4. **Phase C — UI integration** (owns `src/App.tsx`, `src/components/Visitor.tsx`, `src/styles.css`): Visitor welcome gains "Load DEF CON 34 map" primary button calling `buildDefconPack()` → `applyVisitorState({ pack }, …)` — apply pack **bare**, no preselected checkpoint IDs (contract exposes none); catch errors → `setMessage`. App.tsx branding swap. Contract: import only `buildDefconPack` from `../defcon/pack` (async, throws Error with message). Note: C only typechecks after B lands — final `typecheck`/`test` gate runs post-merge, not on C's branch alone.
5. **Phase D — verify + refine**: browser walkthrough (load pack, Registration → AI Village route within Floor 1; Registration → Packet Hacking Village crossing floors via Escalators), marker positions against poster, **label-density check** (~60 always-on checkpoint labels may be soup — if so, cull minor checkpoints), and the **stale-state path**: with demo state saved, welcome screen is unreachable until Exit Location — verify a demo-state user can reach the DC34 button. Coordinate corrections in `data.ts` only.

## Parallelization
Phases B and C have disjoint file ownership and a declared interface → can run as concurrent agents. A blocks B (needs image dims). D is serial after B+C.

## Phase E — native mobile wrap (added 2026-08-04 via Stage 7 refinement)
Capacitor wraps the built web app for iOS + Android; web assets bundle into the native app (offline without SW). Steps: install @capacitor/{core,cli,ios,android} → `cap init` (appId com.qerberos.dc34nav, webDir dist) → `npm run build` → `cap add ios` / `cap add android` → iOS: NSCameraUsageDescription in Info.plist, verify in Simulator; Android: project generated locally, built on the Ryzen box (Android SDK lives there). Device installs: iOS via Xcode signing (user's Apple account), Android via sideloaded APK. Verify: app boots in iOS Simulator, DC34 map loads, route renders — all with network disabled.

## Review log (Stage 4, 2026-08-04)
Cold review found 2 blockers (jpg missing from PWA precache glob + no owner for vite.config.ts; pack.test.ts unfetchable in node vitest) and minors (shortCodes, dead destinations, dims-as-comment, base path, C-branch typecheck, label density, stale-state reachability). All folded into the phases above.

## Open questions
- Escalator positions are approximations — acceptable for v1, flagged in checkpoint labels ("Escalators (approx)")? → v1: yes.
- Exact px dims of final JPEG — resolved in Phase A.

## Verification playbook
- `npm run typecheck` — must pass
- `npm test` — must pass, including new `src/defcon/pack.test.ts`
- `npm run build` — must pass; confirm `dist/` contains defcon34-map.jpg in precache manifest
- Browser: dev server → #/visitor → "Load DEF CON 34 map" → select "Registration" as current, "AI Village" as target → route line renders within Floor 1; then target "Packet Hacking Village" → route crosses to Floor 3 drawing via Escalators nodes
