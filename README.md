# Waypoint

Waypoint is an offline-first, checkpoint-based indoor event navigation MVP. Organizers overlay a route graph, destinations, and QR checkpoints on a floor-plan image, then export one portable `.navpack`. Visitors import that file and navigate locally without accounts or a backend.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. Use **Load demo event** for the fastest organizer-to-visitor walkthrough.

## Verify

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

The production build registers the offline service worker. Vite development mode intentionally does not.
