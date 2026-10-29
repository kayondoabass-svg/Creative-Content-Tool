# BrightboardTV

**Open-source interactive presentations for teachers, public speakers, CEOs,
managers, trainers and anyone who wants to present with more interaction.**

Draw and explain, explore 3D models, build reusable presentations, and control
your audience screen from a phone or tablet.

- [Use through BrightBoard](https://www.brightboardapp.com/tv/)
- [Installation and usage guide](https://www.brightboardapp.com/brightboardtv)
- [Source](https://github.com/kayondoabass-svg/Brightboard-TV)

## Included

- Multi-page board; pen, highlighter, eraser, text, shapes and arrows.
- Select/move/resize/lock, undo/redo, page backgrounds and presenter notes.
- Image and PDF import (PDF pages become editable-background raster images).
- Local autosave, presentation library and portable `.bbtv` lesson files.
- PNG/PDF export; supported 3D captures become images, not interactive PDFs.
- Five original CC0 schematic 3D models with labels, camera controls, saved
  views and hit-tested custom hotspots. Compatible GLB upload is supported.
- Countdown, local stopwatch, random name picker, groups and spotlight.
- QR/manual pairing, explicit controller approval, read-only audience screens,
  remote navigation, pointer, countdown and 3D camera control.
- Installable web app and explicit offline preparation.

No account, billing integration, AI provider or API key is required for this
core. BrightBoard's private services are not part of this repository.

## Run your own copy

Requirements: Node.js **22.12+**, npm and a current WebGL-capable browser.

```sh
git clone https://github.com/kayondoabass-svg/Brightboard-TV.git
cd Brightboard-TV
npm ci
npm run build
npm start
```

Open `http://localhost:4174`. Set `PORT` to change the listening port. The build
generates original models, compiles the application and bundles the standalone
relay server. `dist/` contains **only web files**; the server is in `build/`.

For deployment, put the Node server behind an HTTPS reverse proxy and route
`/api/tv/` to the same process. Allow requests to wait at least 25 seconds for
long polling. Never expose your source directory, private environment files,
or BrightBoard's separate production database. HTTP localhost works for local
development; use HTTPS for installation and camera features on remote devices.

This is a single-process, in-memory relay. It does not require PostgreSQL or
Redis. Multiple server instances need sticky routing/shared session storage;
do not assume rooms automatically replicate. Server restarts end active rooms.

### Development

After an initial build, run `npm start` for the relay. In a second terminal,
`npm run dev` starts Vite and proxies `/api/tv` to port 4174. The app may be
served from `/` or under the host application's `/tv/` path.

```sh
npm test
npx tsc -p tsconfig.json
```

## Present in a classroom or meeting

1. Create a presentation, add pages and import supporting material.
2. Use **Draw** for ink and **Move/Select** to manipulate objects.
3. Add speaker notes; do not type private notes onto the board itself.
4. Connect the computer to a TV/projector with HDMI or an available OS/browser
   screen-casting option. Touchscreens may additionally require a USB touch
   connection or an appropriate USB-C cable.
5. Use presentation/display mode for a clean audience screen.
6. Save a `.bbtv` backup when finished.

### Phone/tablet remote: the QR workflow

**Pair** first shows the actual UTF-8 serialized `.bbtv` and relay sizes.
Sharing is limited to 12 MB (12 × 1024 × 1024 bytes), with an 8 MB limit per
encoded image/model. Portable imports and direct local-file saves allow 64 MB.
If a presentation is too large, choose **Generate optimized preview** to make
an optional resized/compressed image copy. Compare each page's images before
downloading the separate `-optimized.bbtv` file or choosing **Open optimized copy**
to share it. The original is backed up in device recovery copies before opening
the new lesson; linked local files and account copies are never overwritten by
optimization. Page order, editable objects and positions, private notes, ink and
3D models are preserved. Models and GIFs are not compressed. Unsupported or
unreadable images, and images that would grow, stay unchanged. A copy can still
exceed the limits; reduce models separately or split the lesson if needed.
Recovery downloads remain available above 64 MB, but cannot be imported until
reduced.

1. On the presentation computer, start a sharing session.
2. Scan the QR with the phone's camera, or open the remote link and enter the
   session ID and six-digit pairing code.
3. Enter a device name and request access.
4. **Approve** that controller on the host computer.
5. Use the phone to navigate, point, blank/reveal the screen, run the countdown
   or adjust the 3D camera. Presenter notes are available to approved controllers.
6. Open the display link on an additional audience browser when needed.
7. Revoke controllers, rotate the join code or end the session from the host.

Pairing synchronizes **BrightboardTV content**, not arbitrary phone apps or
system audio. It is not a native AirPlay/Chromecast implementation. Hardware
casting support depends on your OS, browser, network and screen.

The hosted relay works across networks when both devices have internet access.
Same-Wi-Fi operation without internet requires a reachable **local self-hosted
relay**; installing the web app alone does not supply one. Browser installation
does not grant discovery/control of a TV.

### Offline

Open online once, then select **Prepare offline** for the material you will use.
The app caches its own shell and supported same-origin model assets. Imported
image/PDF content is embedded in the local presentation.

Local whiteboard tools and prepared content can work offline. Hosted remote
pairing, new AI generation and uncached external resources cannot. Browser
storage quotas/cleanup/private mode may remove local data: keep `.bbtv` backups.
The service worker deliberately does not cache `/api/` responses or any account,
payment or private BrightBoard service.

### Large lessons and local files

Hosted presentations allow **20 pages free**, **50 with a verified standard paid
BrightBoard subscription**, or **100 with an active institution plan**. The owner
uses the same bounded 100-page ceiling, not an unlimited bypass.
The independent standalone defaults to 20 pages,
without requiring an account. Limits apply to new/duplicated pages, imports,
merges and presentation sharing. Older larger documents are never truncated:
they remain available for editing down or backup export, but must fit the current
limit before presenting. An imported PDF can replace the untouched empty starter.

### PowerPoint import

Use **Library → Choose file to open** or **Choose file to merge** for `.pptx`.
Processing happens on your device, without a conversion service. Slide order,
supported text boxes, embedded PNG/JPEG/WebP/GIF images, basic shape outlines and
private speaker notes are imported. Progress and cancellation are available.
The existing lesson is not changed until the import has been prepared and checked.

This is not a full PowerPoint renderer: master layouts, backgrounds, fonts, fills,
rotation, cropping, charts, groups, tables, animations, video and vector images
may differ or be omitted. Read the import notes. For faithful appearance, export
PowerPoint to PDF first and import that PDF. Legacy binary `.ppt` files must first
be saved as `.pptx` or PDF in PowerPoint/LibreOffice.

Files are limited to 25 MB, with bounded archive expansion, image memory and
lesson size. External linked assets are never fetched. Page limits apply before
import and again when merging; an oversized import never truncates existing work.

Drafts and the device library use IndexedDB, not the small localStorage quota.
Existing localStorage drafts, saved lessons and names migrate automatically;
the original copies are removed only after migration has committed successfully.
The header reports the actual save result. If saving fails, keep the editor open
and download a `.bbtv` backup before closing it.

For direct access to a file on your computer, open **More tools**:

1. Choose **Open local .bbtv file** to select an existing presentation, or
   **Save directly to local file** to choose a new file.
2. Grant the browser permission when prompted. Further saves of that presentation
   update the chosen file; this is an explicit save, not continuous file autosave.
3. Opening another lesson does not overwrite the previously linked file.

Direct file pickers require a supported browser, typically desktop Chrome or Edge,
and HTTPS or `http://localhost`. On unsupported phones, tablets, browsers or plain
HTTP LAN addresses, use **Saved lessons & import** and **Download .bbtv backup**.
The standalone app never gains unrestricted access to your disk. File saving and
exports remain free; paid BrightBoard library controls do not apply to standalone.
Portable lesson imports are limited to 64 MB; individual PDFs, images and models
retain their 25 MB limit.

**Clear current page** asks for confirmation and removes its drawings, text,
images and model while preserving private notes and other pages. **Delete page**
also asks for confirmation; deleting the last page creates a blank replacement.
Undo can restore these page edits. **Clear local data** is a separate,
non-undoable reset of the device workspace; it never deletes an account or a
file saved outside the browser.

## Privacy and security

- Documents live in your browser unless you explicitly share them.
- A sharing session temporarily stores presentation data in relay memory.
- Bearer credentials are sent in Authorization headers, not pairing URLs.
- Controllers start pending and require host approval; displays are read-only.
- Audience display API responses have speaker notes removed.
- Pairing expires after four hours. Ending a session deletes its server data.
- Shared devices should end the session and clear local presentation data.
- The relay bounds input sizes, validates content, rate-limits requests and
  rejects cross-site browser requests. No server credentials are distributed.

Six-digit pairing codes are a discovery step, not a substitute for controller
approval. A person with the room link/code can join a read-only display and view
the presentation, so do not share those details outside your intended audience.

## Models and licences

Original application code: [Apache-2.0](LICENSE). Original generated schematic
geometry and labels: **CC0-1.0**; see [ASSETS.md](ASSETS.md).
Third-party packages retain their licences; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Models are simplified teaching diagrams, not medical/scientific measurements.
No Sketchfab, PhET, GrapeSEED or other proprietary teaching content is bundled.
Uploaded content must be owned by you or used with appropriate permission.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
and [SECURITY.md](SECURITY.md). Contributions to accessibility, international
languages, device testing and reviewed educational models are particularly useful.
