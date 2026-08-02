# Waypoint

> **Turn any floor-plan image into private, offline-capable indoor navigation—without beacons, accounts or dependable venue Wi-Fi.**

Waypoint is an offline-first indoor map and checkpoint-based navigation system for temporary events and permanent venues that need straightforward wayfinding without expensive positioning infrastructure. Operators can share an existing floor plan by itself or augment it with labeled checkpoint nodes, intermediate route points, and walkable route segments. Everything travels as one portable `.navpack`. After loading and caching the Waypoint website once, visitors can receive that package from an animated **location QR** and use it locally without accounts, a backend, or dependable venue internet.

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
- **Private navigation.** Checkpoint-to-checkpoint routing happens locally, so the venue does not learn visitors' selected endpoints or movements.
- **No positioning infrastructure.** Static printed or displayed QR checkpoints replace Bluetooth beacons, UWB hardware, and Wi-Fi calibration.
- **Easy organizer setup.** Upload an existing 2D floor plan, place labeled checkpoints, draw connecting routes, and print or display the static checkpoint signs.
- **Accurate checkpoint positioning.** Scanning a sign establishes a known starting location without relying on inaccurate indoor GPS.
- **Offline resilience.** Imported maps and routes continue working during network outages and emergencies.
- **No pairing or accounts.** Visitors neither connect directly to the organizer nor identify themselves.
- **Unlimited late arrivals.** Decimen's repeating fountain stream lets a receiver begin collecting frames at any point in the broadcast.
- **Exact package recovery.** Fountain coding tolerates missed or duplicated QR frames, and Waypoint hash-verifies the reconstructed package before import.
- **Portable venue bundle.** The floor plan, route network, and checkpoint definitions travel together in one `.navpack` file.
- **Low deployment cost.** The essential infrastructure is an entrance display for the animated location QR and static checkpoint QRs printed or displayed around the venue.
- **Accessible fallback.** Visitors can select a checkpoint manually if camera scanning is unavailable.
- **Straightforward updates.** Operators can broadcast a replacement navpack containing changed booths, departments, exhibits, gates, tenants, routes, or closures.

## How it works

1. An event organizer or venue operator uploads a floor plan. It can be shared immediately as a map-only package.
2. For calculated navigation, they place labeled checkpoints first, add optional intermediate points along walkable paths, and connect those points with route segments.
3. Waypoint reports whether the package is map-only, partial navigation, or complete navigation, then exports a `.navpack` or broadcasts it as a repeating, fountain-coded **location QR**.
4. A visitor chooses **Scan location QR** to receive and verify the navpack, or imports the file directly.
5. The visitor establishes their location at one checkpoint, chooses another checkpoint as the destination, and follows the locally calculated route when the two are connected.

### Map objects and package capability

- A **checkpoint node** is a labeled physical location with a static printed or displayed QR sign. Visitors can use it as their current location or select it as a route destination.
- An **intermediate route point** is an unlabeled graph anchor used to trace a corridor, turn, or other walkable path between checkpoints.
- A **route segment** is a walkable connection between any two checkpoint or intermediate points.

A map-only navpack contains the floor plan without active navigation objects. A partial-navigation navpack contains some navigation data but has at least one checkpoint that cannot reach another checkpoint. Complete navigation means every checkpoint can reach at least one other checkpoint. Separate wings or floors may form disconnected groups and still be complete when every checkpoint has a reachable peer. Waypoint warns about limitations but permits map-only and partial packages to be shared.

NavPack version 1 still contains a `destinations` array for file compatibility. The current checkpoint-centric Studio and Visitor experience preserve imported legacy destination records during export but do not display, edit, or route to them. An organizer reopening an older navpack should add labeled checkpoints for any places that visitors need to select as route endpoints.

The optical channel is intentionally one-way and unencrypted: anyone who can see the broadcast can receive the event package. It carries venue navigation data, not visitor identity or movement data.

### Location QRs versus checkpoint QRs

A **checkpoint QR** is a static position marker. It does not animate, rotate, or transmit the navpack. It identifies one checkpoint already defined inside the imported event package. The same code can be printed on paper, mounted as venue signage, or shown as a still image on an existing digital display. It can remain in place for the event as long as that checkpoint identifier remains in the navpack.

An animated **location QR** serves a different purpose: it distributes the complete `.navpack` to visitors using Decimen. After loading the location once, visitors use **Scan checkpoint QR** or manual selection to establish or update their position. If the checkpoint scanner sees an animated location QR, it asks before switching to and receiving the updated location.

### Optional broadcast starting location

Before starting an optical broadcast, the organizer may choose one of the event's checkpoints as that broadcast's starting location, or leave it as **No starting location**. This choice applies only to the temporary broadcast: two entrance displays can send the same event while independently selecting different checkpoints. The canonical organizer map and ordinary `.navpack` downloads remain location-neutral.

When Waypoint receives a location QR with a valid starting checkpoint, it sets that checkpoint as the visitor's current location and clearly identifies the supplied position so the visitor can change it. The organizer should select a checkpoint only when the broadcasting screen is physically at that checkpoint. Waypoint validates the hint against the received event, rejects forged or missing checkpoint references, and removes the transient hint before visitor storage. Location QRs without a starting checkpoint retain the normal scan-or-select flow.

## Updating an event or venue

Waypoint updates are replacement packages, not live synchronization. An organizer can also use **Import .navpack** to reopen a previously exported package for editing on the same or another device. Import validation preserves the package's event ID, checkpoint IDs, and checkpoint short codes.

1. The operator resumes the locally saved map or imports an existing `.navpack` in Organizer mode, then changes its checkpoint nodes, route network, closures, or floor-plan image.
2. They create a fresh navpack using **Broadcast location QR** or **Download .navpack**.
3. Visitors explicitly receive or import that replacement package. Waypoint validates it and replaces the visitor's locally stored map.
4. Visitors who do not receive the replacement continue using their previously cached navpack. The current MVP does not notify them that a newer revision exists.

Most event or venue updates do **not** require replacing checkpoint signs. A checkpoint QR encodes the package's event ID and checkpoint short code, not the route network. Existing printed or displayed codes remain usable when those two identifiers remain unchanged—even if routes, map labels, or the floor-plan image change.

The organizer should update the checkpoint kit when:

- A checkpoint is added and needs a new code.
- A checkpoint is removed, making its old code invalid in the replacement navpack.
- A checkpoint's short code changes.
- A different event ID is used.

The current editor does not expose direct editing for every checkpoint property. Some changes require deleting and recreating the checkpoint. After doing so, the organizer should confirm the resulting short code before deciding whether an installed sign can be reused.

## Route accuracy and positioning

Waypoint does not automatically detect corridors, walls, or entrances from the floor-plan image. The image is a visual reference; route accuracy comes from the graph constructed and checked by the organizer.

For reliable routes, the organizer should:

1. Use a current floor plan and calibrate it between two points with a known real-world distance. Calibration affects distance estimates; it does not create or correct paths.
2. Place each labeled checkpoint at the precise location where its static code will be printed or displayed. Waypoint creates its backing graph point at the same position.
3. Add intermediate points along corridor centers, at intersections and turns, and wherever a walkable path changes direction.
4. Add route segments only between points that are genuinely connected by a walkable path. Do not draw a segment through a wall, barrier, restricted area, or temporary closure.
5. Use **Preview** to test representative checkpoint-to-checkpoint routes, including routes within each disconnected wing or floor group. Check for missing turns, implausible shortcuts, and incorrect traversal points.
6. Walk-test representative routes in the real venue before publishing the navpack, then rebroadcast a replacement if the layout changes.

Waypoint provides **discrete checkpoint positioning**, not continuous indoor tracking. Scanning or manually selecting a checkpoint establishes that known location as the route start. The app does not use indoor GPS to follow movement between signs; visitors can scan another static checkpoint whenever they need to re-establish their position.

## Offline operation

Waypoint is best described as **offline-capable after an initial online load**, not as a completely offline web application.

Before arriving—or while a connection is still available—a visitor must open the production deployment and wait for **Offline-ready**. The service worker then precaches the navigation shell, location QR sender, shared location/checkpoint scanner, decoder worker, and ZXing WASM assets. The visitor does not need to open every route separately. Imported organizer and visitor state is stored in IndexedDB.

After caching, the visitor can close the tab or browser and later reopen Waypoint without a network connection when all of the following remain true:

- They return to the same site address and use the same browser profile.
- They are not using private or incognito browsing.
- The browser has retained Waypoint's service-worker cache and IndexedDB data.
- A deployment update is not required; the last cached version continues to run offline.

Clearing site data removes the cached application and imported events. Mobile browsers may also evict site data under storage pressure or after long periods of inactivity. A home-screen installation makes reopening easier, but it does not remove the initial online-load requirement or guarantee that browser-managed storage will never be evicted.

Once the application itself is cached, receiving a `.navpack` through Decimen, scanning checkpoints, calculating routes, and reopening an imported event do not require venue internet. A first-time visitor who has never loaded Waypoint cannot install the website from the Decimen broadcast alone; the optical stream carries the event package, not the application.

Waypoint uses two clearly labeled QR types. An animated **location QR** distributes the complete navpack. A static printed or displayed **checkpoint QR** identifies one known position after that location has been loaded. The checkpoint scanner recognizes an animated location QR if one is shown accidentally and asks before switching to the updated location.

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
