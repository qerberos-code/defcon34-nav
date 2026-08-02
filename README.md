# Waypoint

> **Turn any floor-plan image into private, offline event navigation—without beacons, accounts or dependable Wi-Fi.**

Waypoint is an offline-first, checkpoint-based indoor event navigation system. Organizers turn a floor-plan image into a route graph, destinations, and printable QR checkpoints, then package the complete event as one portable `.navpack`. Visitors can receive that package from an animated Decimen QR broadcast and navigate locally without accounts, a backend, or venue internet.

## Why Waypoint

- **Works without venue internet.** Visitors can receive maps when Wi-Fi is unavailable, overloaded, or deliberately disabled.
- **One-to-many distribution.** One display broadcasts the package to any number of visible receivers without sending a separate copy to each device.
- **Reduced peak congestion.** At a 1,000-person event, distributing a 2 MB map optically could avoid about 2 GB of traffic—approximately 27 Mbps during a ten-minute arrival surge.
- **Private navigation.** Routing happens locally, so the venue does not learn visitors' destinations or movements.
- **No positioning infrastructure.** Printed QR checkpoints replace Bluetooth beacons, UWB hardware, and Wi-Fi calibration.
- **Easy organizer setup.** Upload a 2D floor plan, draw routes, place destinations, and print checkpoint signs.
- **Accurate checkpoint positioning.** Scanning a sign establishes a known starting location without relying on inaccurate indoor GPS.
- **Offline resilience.** Imported maps and routes continue working during network outages and emergencies.
- **No pairing or accounts.** Visitors neither connect directly to the organizer nor identify themselves.
- **Unlimited late arrivals.** Decimen's repeating fountain stream lets a receiver begin collecting frames at any point in the broadcast.
- **Exact package recovery.** Fountain coding tolerates missed or duplicated QR frames, and Waypoint hash-verifies the reconstructed package before import.
- **Portable event bundle.** The floor plan, points of interest, routing graph, and checkpoint definitions travel together in one `.navpack` file.
- **Low deployment cost.** The essential physical infrastructure is an entrance display and printed checkpoint codes around the venue.
- **Accessible fallback.** Visitors can select a checkpoint manually if camera scanning is unavailable.
- **Easy temporary updates.** Organizers can broadcast a replacement navpack containing changed booths, routes, or closures.

## How it works

1. An organizer uploads a venue floor plan and draws the walkable route graph.
2. They add destinations and place checkpoints where printed signs will be installed.
3. Waypoint exports a `.navpack` or broadcasts it as a repeating, fountain-coded Decimen QR stream.
4. A visitor receives and verifies the navpack with their camera, or imports the file directly.
5. The visitor scans the nearest checkpoint sign, chooses a destination, and follows the locally calculated route.

The optical channel is intentionally one-way and unencrypted: anyone who can see the broadcast can receive the event package. It carries venue navigation data, not visitor identity or movement data.

## Offline operation

Open a production deployment once and wait for **Offline-ready**. Waypoint precaches the navigation shell, optical sender and receiver, decoder worker, and ZXing WASM assets. Imported organizer and visitor state is stored in IndexedDB. After caching, the app can be reopened from the same browser origin without a network connection, subject to the browser retaining site data.

The static checkpoint scanner remains separate from Decimen reception. Checkpoint signs identify a known location; they do not contain the full event package.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. Use **Load demo event** for the fastest organizer-to-visitor walkthrough.

Camera access works on localhost during development. A phone deployment requires HTTPS, such as a Vercel preview or production URL.

## Verify

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

The production build registers the offline service worker. Vite development mode intentionally does not.

## Decimen attribution

Waypoint vendors the MIT-licensed Decimen v0.2.0 optical-transfer core at commit `ed4cbcf558b80913fcba2e91193f71801f8e919c`. See [`src/decimen/UPSTREAM.md`](src/decimen/UPSTREAM.md) and [`src/decimen/LICENSE`](src/decimen/LICENSE).
