# FOCUS Widget Specification (v1)

A FOCUS widget is a folder with two files:

```
my-widget/
├── manifest.json
└── index.html
```

The same format is used by built-in widgets, AI-generated widgets and
Marketplace widgets. Packages exported for the Marketplace are a single JSON
document: `{ "manifest": {...}, "html": "..." }`.

## manifest.json

```jsonc
{
  "id": "my-widget",              // set by FOCUS on install
  "name": "My Widget",            // string, or {"en": "...", "es": "..."}
  "emoji": "🧩",
  "version": "1.0.0",
  "author": "you",
  "description": "One line",      // string or {en, es}
  "defaultSize": { "w": 3, "h": 2 },   // grid cells (12-column grid, ~90px rows)
  "settings": [
    {
      "key": "api_key",           // snake_case
      "label": "API key",
      "type": "secret",           // text | secret | url | number
      "required": true,
      "help": "Where to get it"
    }
  ],
  "allowedDomains": ["api.example.com"],  // hosts the widget may fetch from
  "sampleData": { "anything": "the widget can render as a preview" }
}
```

Notes:

- **`settings` with `"type": "secret"`** are stored encrypted by FOCUS and are
  **never** sent into the widget. Use them via placeholders (below).
- **`allowedDomains`** is a strict allowlist enforced by the local proxy.
  Subdomains are included (`open-meteo.com` covers `api.open-meteo.com`).
  `"*"` allows any host (built-in news widget uses it for arbitrary RSS
  feeds); Marketplace review discourages it. The special entry
  `"focus://system"` grants access to local system endpoints
  (`focus://system/disk`).
- **`sampleData`** powers the "sample data" preview shown before the widget is
  configured, and Marketplace previews.

## index.html

A complete standalone HTML document. It runs inside a **sandboxed iframe**
(`allow-scripts`, opaque origin, no cookies, no direct network). Style rules:

- Transparent background — the shell draws the card around you.
- System font stack, self-contained CSS, no external resources.
- Localize your UI with `ctx.locale` (`en`, `es`, …).

### The bridge API

Include the bridge and use the `focus` global:

```html
<script src="/bridge.js"></script>
<script>
(async () => {
  const ctx = await focus.init();
  // ctx = { instanceId, locale, settings, secretsSet, sampleData, manifest }

  // Proxied fetch — only hosts in allowedDomains:
  const res = await focus.fetch('https://api.example.com/data?key={{settings.api_key}}');
  // res = { status, headers, bodyText }

  // Persistent per-widget storage:
  await focus.store.set('counter', 42);
  const n = await focus.store.get('counter');

  // Tell the shell you need configuration (shows the red badge):
  if (!ctx.secretsSet.includes('api_key')) {
    renderSample(ctx.sampleData);
    focus.requestSetup();
  }

  // Open this widget's settings dialog:
  // focus.openSettings();
})();
</script>
```

### Secret placeholders

Secrets never enter the iframe. To use one in a request, embed
`{{settings.<key>}}` in the URL or a header value passed to `focus.fetch` —
the local server substitutes the real value before the request leaves the
machine. Non-secret settings can also be referenced this way.

### Sample data etiquette

If required settings are missing, render `ctx.sampleData` with a subtle
"sample data" tag and call `focus.requestSetup()`. Users should always see
*something* beautiful.

## Publishing to the Marketplace

Export from FOCUS (widget header → ↗) — the exporter **refuses to export
anything containing credentials** (the same scanner runs again server-side on
upload). Upload the resulting `.focuswidget.json` in your creator dashboard.
