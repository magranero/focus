# Contributing to FOCUS

Thanks for your interest! FOCUS is MIT-licensed and contributions are welcome.

## Dev setup

```bash
npm install
npm run dev     # Express server on :8642 + Vite dev server on :5173
```

Open http://localhost:5173 during development (it proxies `/api`, `/widgets`
and `/bridge.js` to the local server). `npm run preview` serves the production
build on :8642. `npm start` runs the full Electron tray app.

Data in dev mode lives in `~/.focus-homepage` (override with
`FOCUS_DATA_DIR=/tmp/focus-dev npm run dev:server`).

## Project layout

```
electron/   Tray app, safeStorage key protection
server/     Express API, AI providers, widget generator, built-in widgets
web/        React dashboard (Vite, gridstack, i18next)
docs/       Widget format spec
```

## Guidelines

- Keep widgets self-contained and localized (en + es at minimum).
- New built-in widgets: prefer keyless public APIs; declare `allowedDomains`
  narrowly; always provide `sampleData`.
- Security is not optional: widgets must never receive secrets. If your change
  touches the proxy, the bridge or the credential scanner, explain the threat
  model in the PR.
- `npm test` must pass; add tests for anything in `server/lib/`.

## Releases

Tag `vX.Y.Z` on `main` → GitHub Actions builds the mac DMG and Windows
installer and drafts a release.
