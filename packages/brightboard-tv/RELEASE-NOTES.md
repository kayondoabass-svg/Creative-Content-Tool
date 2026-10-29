# BrightboardTV v1.0.1

An update to the standalone open-source presentation software for teachers,
speakers and teams. Keep the existing v1.0.0 release and its downloads unchanged.

## New in this update

- Local `.pptx` PowerPoint import and merge for supported text, embedded images,
  basic shape outlines and private speaker notes, with cancellation and explicit
  compatibility warnings. Existing saved content is not converted. Older binary
  `.ppt` files must first be saved as `.pptx` or PDF.
- Working presenter-panel collapse/reopen and a more compact desktop editor with
  independently scrolling page navigation.
- Presentation size reporting and optional image compression into a separate
  optimized copy, preserving the original presentation.
- A 20-page ceiling for the independent standalone application. Hosted BrightBoard
  plans support 20 free, 50 standard and 100 institution/business pages; account
  and billing services are not part of these standalone downloads.
- Recovery of existing oversized presentations without silently truncating pages.

## Included

- Interactive whiteboard and multi-page presentations with presenter notes.
- Local saving, portable lesson files, imports and exports.
- Original schematic 3D models and presentation/classroom tools.
- Installable web app with offline preparation.
- Approved phone/tablet control of synchronized audience displays.
- Independent presentation relay, editable source, tests and build configuration.

## Downloads

- **BrightboardTV-source-v1.0.1.zip**: editable independent source. Requires
  Node.js 22.12 or later, `npm ci`, `npm run build`, then `npm start`.
- **BrightboardTV-prebuilt-v1.0.1.zip**: source plus compiled browser files and
  relay. Requires Node.js 22.12 or later, `npm ci --omit=dev`, then `npm start`.
- **SHA256SUMS.txt**: SHA-256 checksums for both ZIPs.

Extract either ZIP and run commands inside its `Brightboard-TV` folder.
The default server address is http://localhost:4174.
See `RUN-PREBUILT.md` and `README.md` for installation and hosting instructions.

## Important limits

Phone pairing requires a reachable relay and HTTPS hosting for normal device
use. This is a web app, not an EXE/APK or whole-device screen/audio mirroring.
Browser installation and offline preparation do not create a local relay.

The Apache-2.0 distribution contains only the independent presentation core.
It does not include BrightBoard accounts, billing, AI services, founder tools,
customer information, credentials, private application source or Git history.
See `LICENSE`, `NOTICE`, `ASSETS.md` and `THIRD_PARTY_NOTICES.md`.

GitHub download reporting counts the attached software ZIP assets only.
Automatic GitHub "Source code" archives, clones, checksum downloads and browser
installs are not software release downloads in the founder counter.
