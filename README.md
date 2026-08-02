# Waypoint

> **Turn any floor-plan image into private, offline-capable event navigation—without beacons, accounts or dependable venue Wi-Fi.**

Waypoint is an offline-first, checkpoint-based indoor event navigation system. Organizers turn a floor-plan image into a route graph, destinations, and printable QR checkpoints, then package the complete event as one portable `.navpack`. After loading and caching the Waypoint website once, visitors can receive that package from an animated Decimen QR broadcast and navigate locally without accounts, a backend, or venue internet.

> [!IMPORTANT]
> **The current web demo is not offline from first contact.** Each device must initially load the Waypoint website over the internet and wait for **Offline-ready**. After that one-time load, the cached app can reopen and operate without a connection, provided the visitor uses the same browser and site address and the browser has not removed the site's stored data.

## Why Waypoint

- **Works without venue internet after initial caching.** Visitors who loaded Waypoint beforehand can receive maps when venue Wi-Fi is unavailable, overloaded, or deliberately disabled.
- **One-to-many distribution.** One display broadcasts the package to any number of visible receivers without sending a separate copy to each device.
- **Reduced peak congestion.** At a 1,000-person event, distributing a 2 MB map optically could avoid about 2 GB of navpack traffic—approximately 27 Mbps during a ten-minute arrival surge. This estimate does not include each visitor's initial website load.
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

Waypoint is best described as **offline-capable after an initial online load**, not as a completely offline web application.

Before arriving—or while a connection is still available—a visitor must open the production deployment and wait for **Offline-ready**. The service worker then precaches the navigation shell, optical sender and receiver, decoder worker, and ZXing WASM assets. The visitor does not need to open every route separately. Imported organizer and visitor state is stored in IndexedDB.

After caching, the visitor can close the tab or browser and later reopen Waypoint without a network connection when all of the following remain true:

- They return to the same site address and use the same browser profile.
- They are not using private or incognito browsing.
- The browser has retained Waypoint's service-worker cache and IndexedDB data.
- A deployment update is not required; the last cached version continues to run offline.

Clearing site data removes the cached application and imported events. Mobile browsers may also evict site data under storage pressure or after long periods of inactivity. A home-screen installation makes reopening easier, but it does not remove the initial online-load requirement or guarantee that browser-managed storage will never be evicted.

Once the application itself is cached, receiving a `.navpack` through Decimen, scanning checkpoints, calculating routes, and reopening an imported event do not require venue internet. A first-time visitor who has never loaded Waypoint cannot install the website from the Decimen broadcast alone; the optical stream carries the event package, not the application.

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

## License

Waypoint is licensed under the [Apache License 2.0](LICENSE).

The vendored Decimen optical-transfer source remains under its upstream MIT license. Third-party dependencies retain their respective licenses.

## Decimen attribution

Waypoint vendors the MIT-licensed Decimen v0.2.0 optical-transfer core at commit `ed4cbcf558b80913fcba2e91193f71801f8e919c`. See [`src/decimen/UPSTREAM.md`](src/decimen/UPSTREAM.md) and [`src/decimen/LICENSE`](src/decimen/LICENSE).
