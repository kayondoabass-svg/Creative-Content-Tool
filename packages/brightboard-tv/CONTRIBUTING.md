# Contributing

1. Open an issue describing the problem or proposed improvement.
2. Fork this repository and create a focused branch.
3. Install dependencies with `npm ci` using Node 22.12+.
4. Run `npm test`, `npx tsc -p tsconfig.json` and `npm run build`.
5. Test mouse, keyboard, touch and small-screen operation as relevant.
6. Open a pull request describing behaviour, tests and any licence impact.

Keep the core independent from BrightBoard accounts, payment services and private
keys. Do not add telemetry, third-party remote code, uploaded models or student
identifiers without discussing privacy and rights first. Never commit customer
presentations, credentials, pairing tokens or personal data.

Add regressions for notes privacy, controller approval, read-only display
access, session expiry and saved-document compatibility. Preserve the versioned
portable lesson format, or supply an explicit migration.

Contributions must be your own work or appropriately licensed and compatible
with Apache-2.0. Document every third-party asset. Education illustrations need
clear subject descriptions and accuracy limitations.
