# Waypoint

> **Turn any floor-plan image into private, offline-capable indoor navigation—without beacons, accounts or dependable venue Wi-Fi.**

Waypoint is an offline-first, checkpoint-based indoor navigation system for temporary events and permanent venues that need straightforward wayfinding without expensive positioning infrastructure. Operators turn a floor-plan image into a route graph, destinations, and static QR checkpoints that can be printed or displayed, then package the complete map as one portable `.navpack`. After loading and caching the Waypoint website once, visitors can receive that package from an animated Decimen QR broadcast and navigate locally without accounts, a backend, or dependable venue internet.

> [!IMPORTANT]
> **The current web demo is not offline from first contact.** Each device must initially load the Waypoint website over the internet and wait for **Offline-ready**. After that one-time load, the cached app can reopen and operate without a connection, provided the visitor uses the same browser and site address and the browser has not removed the site's stored data.

## Who Waypoint is for

Waypoint targets places that need clear indoor routes but do not want to install or maintain Bluetooth beacons, UWB anchors, calibrated Wi-Fi positioning, visitor accounts, or continuous location tracking.

Potential users include:

- **Temporary events:** conferences, conventions, exhibitions, and trade shows where booths, routes, and closures may change between events or during setup.
- **Healthcare and education:** hospitals, clinics, universities, colleges, and large campuses that need straightforward directions between known checkpoints and destinations.
- **Culture and hospitality:** museums, galleries, hotels, resorts, and visitor attractions where static signs can remain installed and maps can be updated independently.
- **Commercial and transport venues:** shopping centers, airports, terminals, and mixed-use developments with many entrances, services, and destinations.
- **Public facilities:** civic buildings, libraries, community centers, government offices, and other public-facing indoor spaces.

For permanent venues, checkpoint signs can remain printed or displayed in fixed locations while replacement navpacks publish updated departments, exhibits, tenants, gates, routes, or temporary closures. Waypoint supplements rather than replaces required emergency signage, accessibility planning, or venue safety systems.

## Why Waypoint

- **Works without venue internet after initial caching.** Visitors who loaded Waypoint beforehand can receive maps when venue Wi-Fi is unavailable, overloaded, or deliberately disabled.
- **One-to-many distribution.** One display broadcasts the package to any number of visible receivers without sending a separate copy to each device.
- **Reduced peak congestion.** At a 1,000-person event, distributing a 2 MB map optically could avoid about 2 GB of navpack traffic—approximately 27 Mbps during a ten-minute arrival surge. This estimate does not include each visitor's initial website load.
- **Private navigation.** Routing happens locally, so the venue does not learn visitors' destinations or movements.
- **No positioning infrastructure.** Static printed or displayed QR checkpoints replace Bluetooth beacons, UWB hardware, and Wi-Fi calibration.
- **Easy organizer setup.** Upload a 2D floor plan, draw routes, place destinations, and print or display checkpoint signs.
- **Accurate checkpoint positioning.** Scanning a sign establishes a known starting location without relying on inaccurate indoor GPS.
- **Offline resilience.** Imported maps and routes continue working during network outages and emergencies.
- **No pairing or accounts.** Visitors neither connect directly to the organizer nor identify themselves.
- **Unlimited late arrivals.** Decimen's repeating fountain stream lets a receiver begin collecting frames at any point in the broadcast.
- **Exact package recovery.** Fountain coding tolerates missed or duplicated QR frames, and Waypoint hash-verifies the reconstructed package before import.
- **Portable venue bundle.** The floor plan, points of interest, routing graph, and checkpoint definitions travel together in one `.navpack` file.
- **Low deployment cost.** The essential infrastructure is an entrance display for the animated navpack broadcast and static checkpoint codes printed or displayed around the venue.
- **Accessible fallback.** Visitors can select a checkpoint manually if camera scanning is unavailable.
- **Straightforward updates.** Operators can broadcast a replacement navpack containing changed booths, departments, exhibits, gates, tenants, routes, or closures.

## How it works

1. An event organizer or venue operator uploads a floor plan and draws the walkable route graph.
2. They add destinations and place checkpoints, generating one static QR code for each known location.
3. Waypoint exports a `.navpack` or broadcasts it as a repeating, fountain-coded Decimen QR stream.
4. A visitor receives and verifies the navpack with their camera, or imports the file directly.
5. The visitor scans the nearest printed or displayed checkpoint code, chooses a destination, and follows the locally calculated route.

The optical channel is intentionally one-way and unencrypted: anyone who can see the broadcast can receive the event package. It carries venue navigation data, not visitor identity or movement data.

### Static checkpoints versus the animated transfer

Checkpoint QR codes are **static location markers**. A checkpoint code does not animate, rotate, or transmit the navpack. It identifies one checkpoint already defined inside the imported event package. The same code can be printed on paper, mounted as venue signage, or shown as a still image on an existing digital display. It can remain in place for the event as long as that checkpoint identifier remains in the navpack.

The animated Decimen QR stream serves a different purpose: it distributes the complete `.navpack` to visitors. After receiving the map package once, visitors use the static checkpoint codes only to establish or update their known position. If scanning is unavailable, they can select the checkpoint manually using its human-readable label and code.

## Updating an event or venue

Waypoint updates are replacement packages, not live synchronization. An organizer can also use **Import .navpack** to reopen a previously exported package for editing on the same or another device. Import validation preserves the package's event ID, checkpoint IDs, and checkpoint short codes.

1. The operator resumes the locally saved map or imports an existing `.navpack` in Organizer mode, then changes the route graph, destinations, closures, or checkpoints.
2. They create a fresh navpack using **Broadcast with light** or **Download .navpack**.
3. Visitors explicitly receive or import that replacement package. Waypoint validates it and replaces the visitor's locally stored map.
4. Visitors who do not receive the replacement continue using their previously cached navpack. The current MVP does not notify them that a newer revision exists.

Most event or venue updates do **not** require replacing checkpoint signs. A checkpoint QR encodes the package's event ID and checkpoint short code, not the route graph or destination data. Existing printed or displayed codes remain usable when those two identifiers remain unchanged—even if booths, routes, other labels, or the floor-plan image change.

The organizer should update the checkpoint kit when:

- A checkpoint is added and needs a new code.
- A checkpoint is removed, making its old code invalid in the replacement navpack.
- A checkpoint's short code changes.
- A different event ID is used.

The current editor does not expose direct editing for every destination and checkpoint property. Some changes require deleting and recreating the map object. After any such change, the organizer should confirm the resulting short code before deciding whether an installed checkpoint sign can be reused.

## Route accuracy and positioning

Waypoint does not automatically detect corridors, walls, or entrances from the floor-plan image. The image is a visual reference; route accuracy comes from the graph constructed and checked by the organizer.

For reliable routes, the organizer should:

1. Use a current floor plan and calibrate it between two points with a known real-world distance. Calibration affects distance estimates; it does not create or correct paths.
2. Place route nodes along corridor centers, at intersections and turns, and at the actual usable entrances to rooms, booths, ramps, and exits.
3. Connect only nodes that are genuinely walkable. Do not draw an edge through a wall, barrier, restricted area, or temporary closure.
4. Place a destination at its visitor-facing access point. When it is created, Waypoint associates it with the nearest route node, so that nearby node must represent the correct entrance rather than merely the closest point geometrically.
5. Install each static checkpoint code at the physical location represented on the map. Waypoint likewise associates a newly placed checkpoint with the nearest route node.
6. Use **Preview** to test routes from multiple checkpoints to every important destination, checking for disconnected paths, incorrect entrances, missing turns, and implausible shortcuts.
7. Walk-test representative routes in the real venue before publishing the navpack, then rebroadcast a replacement if the layout changes.

Waypoint provides **discrete checkpoint positioning**, not continuous indoor tracking. Scanning or manually selecting a checkpoint establishes that known location as the route start. The app does not use indoor GPS to follow movement between signs; visitors can scan another static checkpoint whenever they need to re-establish their position.

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

The static checkpoint scanner remains separate from Decimen reception. Printed and displayed checkpoint codes identify known locations; they do not contain the full event package.

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
