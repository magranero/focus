# ◎ FOCUS

**Your personal, AI-powered browser start page. 100% local, 100% yours.**

*Lee esto en [español](README.es.md).*

FOCUS is a small desktop app (Windows / macOS) that serves a beautiful, fully
personalized start page at `http://localhost:8642`. Set it as your browser's
home page and see your whole day at a glance — then create any widget you can
imagine just by describing it. AI builds it for you, locally.

## How it works

1. **Connect an AI** — bring your own API key (OpenAI, Anthropic, Google
   Gemini) or use a local [Ollama](https://ollama.com) — no key needed, nothing
   ever leaves your machine.
2. **Three steps to your page**
   1. *Choose a template* — Overview (classic at-a-glance), Minimal, Dashboard
      or Sidebar.
   2. *Pick your widgets* — clock & world time, weather (no API key), countdown,
      tasks, RSS news, disk space, webcam/embed, quick links, search bar.
   3. *Create your own with AI* — click any empty space, describe the widget
      ("La Liga standings", "time in Tokyo", "days until my holidays") and an
      agent builds it in the background while you keep working. Create as many
      in parallel as you like.

## Features

- 🧠 **AI widget creator** — background agents generate widgets from plain
  language; a placeholder reserves the space instantly.
- 🔴 **Red-dot notifications** — if a widget needs an API key or permission, a
  red badge appears; click it to finish setup. Until then the widget shows
  realistic **sample data** so you can see what you'll get.
- 🔒 **Credentials stay home** — API keys are encrypted with your OS keychain
  (Keychain / DPAPI via Electron `safeStorage`). Widgets run in sandboxed
  iframes and never see secrets: requests go through a local proxy that
  substitutes `{{settings.key}}` placeholders server-side. If you paste a
  credential into the AI prompt box, FOCUS detects it, moves it to encrypted
  settings automatically and (gently) tells you off.
- 🛍️ **Marketplace** — install widgets made by the community, free or paid,
  and publish your own (always exported **without** credentials).
- 🌍 **English & Spanish** out of the box.
- 🖥️ Tray app: autostarts at login, serves your page, stays out of the way.

## Install

Download the latest release for macOS (.dmg) or Windows (.exe) from
[Releases](https://github.com/magranero/focus/releases), run it, and set
`http://localhost:8642` as your browser start page (Settings → copy button).

## Run from source

```bash
git clone https://github.com/magranero/focus.git
cd focus
npm install
npm start          # builds the UI and launches the tray app
# or, for development:
npm run dev        # local server :8642 + Vite dev server :5173
```

## Create widgets programmatically

Widgets are tiny self-contained folders — a `manifest.json` plus an
`index.html` rendered in a sandboxed iframe with a small `focus.*` bridge API.
See the full spec in [docs/widget-spec.md](docs/widget-spec.md).

## Contributing

PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
