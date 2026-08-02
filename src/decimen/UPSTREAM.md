# Decimen upstream

Waypoint vendors the wire-sensitive optical-transfer core from **Decimen v0.2.0**, licensed under MIT.

- Repository: `https://github.com/bashalarmistalt/decimen-optical-transfer`
- Commit: `ed4cbcf558b80913fcba2e91193f71801f8e919c`
- Vendored on: 2026-08-02
- License: see `LICENSE` in this directory

The files in `shared/` and `receive/{worker,worker-factory,wasm-url}.ts` are preserved from that commit. In particular, the fountain distribution, deterministic logarithm, frame header, compression container, checksum, QR rasterizer, progress estimates, no-signal timer, and worker-pool scheduling are wire-sensitive and must not be refactored without the golden-vector tests proving compatibility.

Waypoint-specific adaptations live outside those preserved files:

- `integration.ts` fixes the payload type to `application/x-navpack`, serializes NavPack v1, and validates received data with Waypoint.
- `sender.ts` binds Decimen’s encoder and QR rasterizer to a React-owned canvas and defaults to 1465 bytes/frame, 24 FPS, ECC L.
- `receiver.ts` binds camera capture and worker decoding to the React route, then applies Decimen’s container and checksum verification.
- React screens own lifecycle, wake-lock release, visibility pausing, IndexedDB persistence, and navigation.

The upstream golden tests are ported under `tests/` and run with Vitest.
