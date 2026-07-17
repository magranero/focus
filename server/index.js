import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as store from './store.js';
import { TEMPLATES } from './templates.js';
import { PROVIDERS, testProvider, chat } from './ai/providers.js';
import { createJob, createEditJob, listJobs } from './ai/generator.js';
import { scanText, redactText } from './lib/credentialScan.js';
import { getDiskInfo } from './system.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PORT = Number(process.env.FOCUS_PORT || 8642);

export function createApp({ onQuit } = {}) {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Everything is local: refuse requests that aren't from this machine.
  app.use((req, res, next) => {
    const host = (req.headers.host || '').split(':')[0];
    if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(host)) {
      return res.status(403).json({ error: 'FOCUS only serves localhost' });
    }
    next();
  });

  app.get('/bridge.js', (req, res) => {
    res.type('application/javascript');
    res.sendFile(path.join(__dirname, 'bridge.js'));
  });

  // Widget files: /widgets/builtin/clock/index.html, /widgets/custom/<id>/...
  app.get('/widgets/:kind/:id/*', (req, res) => {
    const { kind, id } = req.params;
    const dir = store.resolveWidgetDir(`${kind}/${id}`);
    if (!dir) return res.status(404).send('widget not found');
    const rel = req.params[0] || 'index.html';
    const file = path.normalize(path.join(dir, rel));
    if (!file.startsWith(dir)) return res.status(400).send('bad path');
    if (!fs.existsSync(file)) return res.status(404).send('not found');
    res.sendFile(file);
  });

  // ---- State ----

  app.get('/api/state', (req, res) => {
    const config = store.publicConfig();
    const layout = store.getLayout();
    const items = layout.items.map((item) => {
      const manifest = store.getManifest(item.widget);
      const { settings, secretsSet } = store.getWidgetSettings(item.id);
      const required = (manifest?.settings || []).filter((s) => s.required);
      const needsSetup = required.some(
        (s) => !(s.key in settings) && !secretsSet.includes(s.key)
      );
      return { ...item, manifest, needsSetup: needsSetup && !manifest?.generating };
    });
    res.json({
      config,
      layout: { items },
      templates: TEMPLATES,
      providers: PROVIDERS,
      builtinWidgets: store.listBuiltinWidgets(),
      jobs: listJobs()
    });
  });

  app.post('/api/config', (req, res) => {
    const allowed = ['locale', 'template', 'onboarded', 'marketplaceUrl'];
    const patch = Object.fromEntries(
      Object.entries(req.body || {}).filter(([k]) => allowed.includes(k))
    );
    store.patchConfig(patch);
    res.json(store.publicConfig());
  });

  // ---- AI provider setup ----

  app.post('/api/ai/test', async (req, res) => {
    const { provider, apiKey, baseUrl } = req.body || {};
    const key = apiKey || store.getSecret(`ai_${provider}_key`);
    res.json(await testProvider({ provider, apiKey: key, baseUrl }));
  });

  app.post('/api/ai/config', async (req, res) => {
    const { provider, apiKey, baseUrl, model } = req.body || {};
    if (!PROVIDERS[provider]) return res.status(400).json({ error: 'unknown provider' });
    const key = apiKey || store.getSecret(`ai_${provider}_key`);
    const test = await testProvider({ provider, apiKey: key, baseUrl });
    if (!test.ok) return res.status(400).json(test);
    if (apiKey) store.setSecret(`ai_${provider}_key`, apiKey);
    store.patchConfig({
      ai: {
        provider,
        model: model || (provider === 'ollama' ? test.models?.[0] : PROVIDERS[provider].defaultModel),
        baseUrl: baseUrl || null
      },
      onboarded: true
    });
    res.json({ ok: true, models: test.models });
  });

  // ---- Templates & layout ----

  app.post('/api/template', (req, res) => {
    const tpl = TEMPLATES.find((t) => t.id === req.body?.template);
    if (!tpl) return res.status(400).json({ error: 'unknown template' });
    const items = tpl.items.map((it) => ({ ...it, id: newId() }));
    store.setLayout({ items });
    store.patchConfig({ template: tpl.id });
    res.json(store.getLayout());
  });

  app.put('/api/layout', (req, res) => {
    const incoming = Array.isArray(req.body?.items) ? req.body.items : [];
    const current = store.getLayout();
    // Only positions/sizes come from the client; widget refs stay server-side.
    const items = current.items.map((it) => {
      const patch = incoming.find((p) => p.id === it.id);
      return patch
        ? { ...it, x: patch.x, y: patch.y, w: patch.w, h: patch.h }
        : it;
    });
    res.json(store.setLayout({ items }));
  });

  app.post('/api/widgets/add', (req, res) => {
    const { widget, x = 0, y = 0, w, h } = req.body || {};
    const manifest = store.getManifest(widget);
    if (!manifest) return res.status(404).json({ error: 'unknown widget' });
    const item = {
      id: newId(),
      widget,
      x,
      y,
      w: w || manifest.defaultSize?.w || 3,
      h: h || manifest.defaultSize?.h || 2
    };
    store.upsertLayoutItem(item);
    res.json(item);
  });

  app.delete('/api/widgets/:instanceId', (req, res) => {
    store.removeLayoutItem(req.params.instanceId);
    res.json({ ok: true });
  });

  // ---- Widget settings ----

  app.post('/api/widgets/:instanceId/settings', (req, res) => {
    const item = store.getLayout().items.find((it) => it.id === req.params.instanceId);
    if (!item) return res.status(404).json({ error: 'unknown instance' });
    const manifest = store.getManifest(item.widget) || { settings: [] };
    const secretKeys = (manifest.settings || [])
      .filter((s) => s.type === 'secret')
      .map((s) => s.key);
    store.setWidgetSettings(req.params.instanceId, req.body?.values || {}, secretKeys);
    res.json({ ok: true });
  });

  // ---- Bridge backend (called by the dashboard shell on behalf of widgets) ----

  app.get('/api/widgets/:instanceId/context', (req, res) => {
    const item = store.getLayout().items.find((it) => it.id === req.params.instanceId);
    if (!item) return res.status(404).json({ error: 'unknown instance' });
    const manifest = store.getManifest(item.widget) || {};
    const { settings, secretsSet } = store.getWidgetSettings(req.params.instanceId);
    res.json({
      instanceId: item.id,
      locale: store.getConfig().locale,
      settings,
      secretsSet,
      sampleData: manifest.sampleData ?? null,
      manifest: { name: manifest.name, settings: manifest.settings || [] }
    });
  });

  app.post('/api/widgets/:instanceId/proxy', async (req, res) => {
    const item = store.getLayout().items.find((it) => it.id === req.params.instanceId);
    if (!item) return res.status(404).json({ error: 'unknown instance' });
    const manifest = store.getManifest(item.widget) || {};
    const { url, opts = {} } = req.body || {};
    try {
      const substituted = substituteSecrets(String(url), req.params.instanceId);
      const headers = {};
      for (const [k, v] of Object.entries(opts.headers || {})) {
        headers[k] = substituteSecrets(String(v), req.params.instanceId);
      }

      // Internal system endpoints (disk, etc.) use the pseudo-domain focus://system
      if (substituted.startsWith('focus://system/')) {
        if (!(manifest.allowedDomains || []).includes('focus://system')) {
          return res.status(403).json({ error: 'widget has no system permission' });
        }
        const data = await handleSystem(substituted);
        return res.json({ status: 200, headers: {}, bodyText: JSON.stringify(data) });
      }

      const target = new URL(substituted);
      if (!['http:', 'https:'].includes(target.protocol)) {
        return res.status(400).json({ error: 'only http(s) urls' });
      }
      const allowed = (manifest.allowedDomains || []).some(
        (d) => d === '*' || target.hostname === d || target.hostname.endsWith(`.${d}`)
      );
      if (!allowed) {
        return res.status(403).json({
          error: `domain ${target.hostname} not in widget allowedDomains`
        });
      }
      const upstream = await fetch(target, {
        method: opts.method || 'GET',
        headers,
        body: opts.body != null ? String(opts.body) : undefined,
        redirect: 'follow',
        signal: AbortSignal.timeout(15000)
      });
      const bodyText = await upstream.text();
      res.json({
        status: upstream.status,
        headers: Object.fromEntries(upstream.headers.entries()),
        bodyText
      });
    } catch (err) {
      res.status(502).json({ error: err.message });
    }
  });

  app.get('/api/widgets/:instanceId/store/:key', (req, res) => {
    res.json({ value: store.widgetStoreGet(req.params.instanceId, req.params.key) });
  });

  app.put('/api/widgets/:instanceId/store/:key', (req, res) => {
    store.widgetStoreSet(req.params.instanceId, req.params.key, req.body?.value ?? null);
    res.json({ ok: true });
  });

  // ---- AI widget creation ----

  app.post('/api/ai/create', (req, res) => {
    const { prompt, x, y } = req.body || {};
    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ error: 'empty prompt' });
    }
    if (!store.getConfig().ai.provider) {
      return res.status(400).json({ error: 'no AI provider configured' });
    }
    const findings = scanText(prompt);
    let cleanPrompt = String(prompt);
    const extraSecrets = [];
    if (findings.length) {
      cleanPrompt = redactText(prompt, findings);
      findings.forEach((f, i) => {
        extraSecrets.push({ key: `secret_${i + 1}`, kind: f.kind });
      });
    }
    const job = createJob({
      prompt: cleanPrompt,
      x,
      y,
      locale: store.getConfig().locale,
      extraSecrets
    });
    // Store pasted credentials as instance secrets so {{settings.secret_N}} resolves.
    if (findings.length) {
      store.setWidgetSettings(
        job.instanceId,
        Object.fromEntries(findings.map((f, i) => [`secret_${i + 1}`, f.match])),
        findings.map((_, i) => `secret_${i + 1}`)
      );
    }
    res.json({
      job: { id: job.id, status: job.status },
      credentialWarning: findings.length
        ? { count: findings.length, kinds: findings.map((f) => f.kind) }
        : null
    });
  });

  // Re-chat with the agent that built a custom widget.
  app.post('/api/ai/edit', (req, res) => {
    const { instanceId, instruction } = req.body || {};
    if (!instruction || !String(instruction).trim()) {
      return res.status(400).json({ error: 'empty instruction' });
    }
    if (!store.getConfig().ai.provider) {
      return res.status(400).json({ error: 'no AI provider configured' });
    }
    const findings = scanText(instruction);
    let clean = String(instruction);
    const extraSecrets = [];
    if (findings.length) {
      clean = redactText(instruction, findings);
      const { secretsSet } = store.getWidgetSettings(instanceId);
      findings.forEach((f, i) => {
        extraSecrets.push({ key: `secret_${secretsSet.length + i + 1}`, kind: f.kind });
      });
      store.setWidgetSettings(
        instanceId,
        Object.fromEntries(findings.map((f, i) => [extraSecrets[i].key, f.match])),
        extraSecrets.map((s) => s.key)
      );
    }
    try {
      const job = createEditJob({
        instanceId,
        instruction: clean,
        locale: store.getConfig().locale,
        extraSecrets
      });
      res.json({
        job: { id: job.id, status: job.status },
        credentialWarning: findings.length
          ? { count: findings.length, kinds: findings.map((f) => f.kind) }
          : null
      });
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  });

  app.get('/api/jobs', (req, res) => {
    res.json(listJobs().map(({ id, status, error, prompt }) => ({ id, status, error, prompt })));
  });

  // Quick AI sanity check used by settings ("say hi" round-trip).
  app.post('/api/ai/ping', async (req, res) => {
    const cfg = store.getConfig();
    try {
      const text = await chat(
        {
          provider: cfg.ai.provider,
          model: cfg.ai.model,
          apiKey: store.getSecret(`ai_${cfg.ai.provider}_key`),
          baseUrl: cfg.ai.baseUrl
        },
        [{ role: 'user', content: 'Reply with exactly: ok' }]
      );
      res.json({ ok: true, text: text.slice(0, 100) });
    } catch (err) {
      res.status(502).json({ ok: false, error: err.message });
    }
  });

  // ---- Marketplace ----

  app.get('/api/marketplace/catalog', async (req, res) => {
    const base = normalizeMarketplaceUrl(store.getConfig().marketplaceUrl);
    try {
      if (!base) throw new Error('no marketplace URL configured');
      const r = await fetch(`${base}/api/widgets`, { signal: AbortSignal.timeout(6000) });
      if (!r.ok) throw new Error(`marketplace answered HTTP ${r.status}`);
      const data = await r.json();
      if (!Array.isArray(data.widgets)) throw new Error('unexpected response (not a FOCUS marketplace?)');
      res.json({ source: 'remote', url: base, ...data });
    } catch (err) {
      const sample = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'marketplace-sample.json'), 'utf8')
      );
      res.json({ source: 'sample', url: base, error: err.message, ...sample });
    }
  });

  app.post('/api/marketplace/install', async (req, res) => {
    const { code, pkg } = req.body || {};
    try {
      let widgetPkg = pkg; // {manifest, html} for free/sample widgets
      if (code) {
        const base = normalizeMarketplaceUrl(store.getConfig().marketplaceUrl);
        const r = await fetch(`${base}/api/redeem`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code }),
          signal: AbortSignal.timeout(10000)
        });
        if (!r.ok) throw new Error(`redeem failed: ${(await r.text()).slice(0, 200)}`);
        widgetPkg = await r.json();
      }
      if (!widgetPkg?.manifest || !widgetPkg?.html) {
        return res.status(400).json({ error: 'invalid widget package' });
      }
      // Never install anything that ships credentials.
      const findings = scanText(widgetPkg.html + JSON.stringify(widgetPkg.manifest));
      if (findings.length) {
        return res.status(400).json({ error: 'package contains credentials; rejected' });
      }
      const id = newId();
      const manifest = { ...widgetPkg.manifest, id, generating: false };
      store.saveCustomWidget(id, manifest, widgetPkg.html);
      const item = {
        id,
        widget: `custom/${id}`,
        x: 0,
        y: 0,
        w: manifest.defaultSize?.w || 3,
        h: manifest.defaultSize?.h || 3
      };
      store.upsertLayoutItem(item);
      res.json({ ok: true, item });
    } catch (err) {
      res.status(502).json({ error: err.message });
    }
  });

  // Export a widget as a credential-free package ready for the marketplace.
  app.get('/api/widgets/:instanceId/export', (req, res) => {
    const item = store.getLayout().items.find((it) => it.id === req.params.instanceId);
    if (!item) return res.status(404).json({ error: 'unknown instance' });
    const dir = store.resolveWidgetDir(item.widget);
    if (!dir) return res.status(404).json({ error: 'widget files not found' });
    const manifest = { ...store.getManifest(item.widget) };
    const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    delete manifest.prompt;
    const findings = scanText(html + JSON.stringify(manifest));
    if (findings.length) {
      return res.status(400).json({
        error: 'export blocked: widget contains credentials',
        kinds: findings.map((f) => f.kind)
      });
    }
    res.json({ manifest, html });
  });

  // Quit the whole app (tray process included) from the web UI.
  app.post('/api/quit', (req, res) => {
    res.json({ ok: true });
    setTimeout(() => {
      if (onQuit) onQuit();
      else process.exit(0);
    }, 300);
  });

  // ---- Frontend (built SPA) ----

  const dist = path.join(__dirname, '..', 'web', 'dist');
  if (fs.existsSync(dist)) {
    // Hashed assets are immutable; index.html must always revalidate or
    // browsers keep serving a stale bundle after FOCUS updates.
    app.use(
      express.static(dist, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('cache-control', 'public, max-age=31536000, immutable');
          } else {
            res.setHeader('cache-control', 'no-cache');
          }
        }
      })
    );
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/widgets/')) return next();
      res.setHeader('cache-control', 'no-cache');
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  return app;
}

function normalizeMarketplaceUrl(raw) {
  let base = String(raw || '').trim();
  if (!base) return '';
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  return base.replace(/\/+$/, '');
}

function substituteSecrets(text, instanceId) {
  return text.replace(/\{\{settings\.([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
    const secret = store.getWidgetSecret(instanceId, key);
    if (secret != null) return secret;
    const { settings } = store.getWidgetSettings(instanceId);
    return settings[key] ?? '';
  });
}

async function handleSystem(url) {
  const what = url.replace('focus://system/', '');
  if (what === 'disk') return getDiskInfo();
  throw new Error(`unknown system endpoint: ${what}`);
}

function newId() {
  return `i${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`;
}
