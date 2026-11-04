# BrightBoard Editor

Free, MIT-licensed, browser-local procedural image, video and audio creation.
This is not photorealistic AI, speech generation or a model API client.

## Run the prebuilt edition

Extract the complete prebuilt ZIP, then open `index.html` in a recent desktop
Chrome, Edge or Firefox. Keep `brand-logo.png` alongside it. All application
code and styles are included; no CDN, login, API key or internet is required.
If your browser blocks local files, serve the extracted folder with a local
static server. The source edition includes `npm run serve` after building.
Do not expect iOS Files/Quick Look to execute a full web app: use a supported
browser and local/static hosting there.

## Build the source edition

Install Node.js 20+, run `npm install` in this independent project, then
`npm run build`. Internet is needed to install public development packages,
not to run the built application. `npm run serve` opens a local-only HTTP
server at http://127.0.0.1:4178. The build output is in `dist`.

## Create and keep work

Open **How to use BrightBoard Editor** above the workspace for the built-in
step-by-step guide. The guide is included locally and works offline.

Choose one of six scenes (flow, tree, waves, pattern, mark, 3D sculpture).
Add/edit/move/resize/reorder/hide text, cards and ellipses. The 3D mode is a
perspective-projected rotating cube, not a general mesh/model editor.
Use presets, seed, colours, density, speed, duration and camera controls.
Layer motion supports float, pulse and slide. Export a project JSON backup
before replacing work or clearing browser data. Drafts are device-local,
not cloud saves, and browser/file-origin storage may be unavailable.

PNG/JPEG are rerendered from geometry at selected dimensions. SVG is genuine
vector output including built-in backgrounds and overlays. 8K stills require
a capable device (34 MP maximum); do not assume phone memory supports them.
No resolution is silently reduced. JPEG backgrounds are opaque.

Audio uses local oscillation/noise, beat envelopes and a binary step sequence.
Use Play/Stop sound to audition, Export WAV for mono 24 kHz/16-bit PCM.
The Include audio checkbox controls video only; audio export is always possible.

Video uses native MediaRecorder, a matched supported WebM/MP4 container,
optional synthesized audio, real-time progress and cancellation. Keep the app
visible while recording. Browser support, encoding performance and requested
FPS/resolution vary; 4K is not guaranteed. No 8K video, arbitrary media imports,
speech synthesis, MP4 transcoding or seamless-loop guarantee is included.

## Local SDK

Load the included `media-sdk.js` locally. `BrightBoardMedia.newProject()`,
`validateProject(project)`, `renderSVG(project, seconds)`,
`encodeWAV(project.audio, project.duration)` and `audioSamples(...)` work
without any account or network. Use a project exported from the editor as a
validated settings example. Never evaluate untrusted JavaScript.

## Hosted developer API

The private BrightBoard website separately offers a free hosted API with
account-owned keys. Its key/account server code and database are deliberately
NOT part of this public repository or ZIP. No API key is bundled.
Read https://www.brightboardapp.com/developers after the website is deployed.
MCP is coming soon; no MCP endpoint exists yet.

Website operator: hosted MP4 requires `ffmpeg` on PATH with libx264 and AAC.
The API reports video unavailable if FFmpeg is absent. Image/audio and the
offline editor do not require FFmpeg. Commercial pricing is not enabled.

## Publishing on GitHub

Recommended repository name: `brightboard-editor`.

Upload the contents of the SOURCE ZIP as repository files. Attach both SOURCE
and PREBUILT ZIPs plus `BrightBoard-Editor-SHA256SUMS.txt` to a v1.0.0 release. Do not upload your
private BrightBoard project, `.env`, keys, server database or private Git history.
The two ZIPs have different purposes: one is editable source, one runs immediately.

## License

MIT. Retain LICENSE and THIRD-PARTY-NOTICES.txt. BrightBoard's name/logo are
brand marks, not a grant of trademark rights. Brand assets are included only
for attribution and identification of this BrightBoard distribution.
