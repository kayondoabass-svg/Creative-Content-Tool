# Running the prebuilt ZIP

This ZIP contains compiled web files (`dist/`) and the compiled relay
(`build/server.cjs`). It does not require a build step.

1. Extract the ZIP.
2. Install Node.js 22.12 or newer.
3. Open a terminal inside the extracted `Brightboard-TV` folder.
4. Run:

   ```sh
   npm ci --omit=dev
   npm start
   ```

5. Open http://localhost:4174.

For a different port, set the `PORT` environment variable. A phone cannot reach
another computer using `localhost`; deploy behind HTTPS at an address both
devices can access, or have your administrator configure a local HTTPS server.
Web app installation and some browser capabilities require a secure context.

This is not an EXE/APK, native Chromecast receiver or whole-device mirroring
application. It is an installable web app with an approved presentation remote.

Use the **source ZIP**, not this compiled ZIP, to populate the GitHub repository.
The source ZIP includes editable code, tests and build configuration.
