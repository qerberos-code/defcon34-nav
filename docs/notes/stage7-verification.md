# Stage 7 verification notes (2026-08-04)

Verified in browser (dev server, 1280×720):
- "Load DEF CON 34 map" button loads the pack; 61 checkpoints render on the poster.
- Route Registration → AI Village: renders within Floor 1 via west chain (Chillout → Food Court → Atrium) then Hall 2 spine. Correct.
- Route Registration → Packet Hacking Village: crosses floors via Escalators (F1) → Escalators (F2) → Escalators (F3). Correct.
- No console errors. `npm run build`: 12 precache entries, defcon34-map.jpg included (review blocker #9 verified fixed).

## Known v1 limitations (accepted)
- Label density in Hall 1/2 and Floor 2 mid-leg is crowded but legible at desktop size; mobile users can zoom the canvas. Culling deferred.
- Escalator positions are approximate (labeled as such in plan).
- Header aria-label still reads "Waypoint home" (cosmetic).
- No distance in meters (no calibration; poster mixes per-floor scales).
