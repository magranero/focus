import fs from 'node:fs';
import path from 'node:path';
import { getDataDir, getWidgetsDir } from './paths.js';
import { encryptSecret, decryptSecret } from './crypto.js';

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const configFile = () => path.join(getDataDir(), 'config.json');
const layoutFile = () => path.join(getDataDir(), 'layout.json');

const DEFAULT_CONFIG = {
  onboarded: false,
  locale: 'en',
  template: null,
  ai: { provider: null, model: null, baseUrl: null },
  marketplaceUrl: 'https://focus-widgets.netlify.app',
  secrets: {},        // name -> encrypted value (global secrets, incl. AI keys)
  widgetSettings: {}, // instanceId -> { key: value } (non-secret)
  widgetSecrets: {}   // instanceId -> { key: encrypted value }
};

export function getConfig() {
  return { ...DEFAULT_CONFIG, ...readJson(configFile(), {}) };
}

export function patchConfig(patch) {
  const cfg = { ...getConfig(), ...patch };
  writeJson(configFile(), cfg);
  return cfg;
}

/** Config safe to send to the frontend: secret values replaced by `true`. */
export function publicConfig() {
  const cfg = getConfig();
  return {
    ...cfg,
    secrets: Object.fromEntries(Object.keys(cfg.secrets).map((k) => [k, true])),
    widgetSecrets: Object.fromEntries(
      Object.entries(cfg.widgetSecrets).map(([id, obj]) => [
        id,
        Object.fromEntries(Object.keys(obj).map((k) => [k, true]))
      ])
    )
  };
}

export function setSecret(name, value) {
  const cfg = getConfig();
  cfg.secrets[name] = encryptSecret(value);
  writeJson(configFile(), cfg);
}

export function getSecret(name) {
  const cfg = getConfig();
  return cfg.secrets[name] ? decryptSecret(cfg.secrets[name]) : null;
}

export function deleteSecret(name) {
  const cfg = getConfig();
  delete cfg.secrets[name];
  writeJson(configFile(), cfg);
}

export function setWidgetSettings(instanceId, values, secretKeys = []) {
  const cfg = getConfig();
  cfg.widgetSettings[instanceId] = cfg.widgetSettings[instanceId] || {};
  cfg.widgetSecrets[instanceId] = cfg.widgetSecrets[instanceId] || {};
  for (const [k, v] of Object.entries(values)) {
    if (v === null || v === '') continue;
    if (secretKeys.includes(k)) cfg.widgetSecrets[instanceId][k] = encryptSecret(v);
    else cfg.widgetSettings[instanceId][k] = v;
  }
  writeJson(configFile(), cfg);
}

export function getWidgetSettings(instanceId) {
  const cfg = getConfig();
  return {
    settings: cfg.widgetSettings[instanceId] || {},
    secretsSet: Object.keys(cfg.widgetSecrets[instanceId] || {})
  };
}

export function getWidgetSecret(instanceId, key) {
  const cfg = getConfig();
  const enc = (cfg.widgetSecrets[instanceId] || {})[key];
  return enc ? decryptSecret(enc) : null;
}

// ---- Layout ----

export function getLayout() {
  return readJson(layoutFile(), { items: [] });
}

export function setLayout(layout) {
  writeJson(layoutFile(), layout);
  return layout;
}

export function upsertLayoutItem(item) {
  const layout = getLayout();
  const i = layout.items.findIndex((it) => it.id === item.id);
  if (i >= 0) layout.items[i] = { ...layout.items[i], ...item };
  else layout.items.push(item);
  return setLayout(layout);
}

export function removeLayoutItem(id) {
  const layout = getLayout();
  layout.items = layout.items.filter((it) => it.id !== id);
  const cfg = getConfig();
  delete cfg.widgetSettings[id];
  delete cfg.widgetSecrets[id];
  writeJson(configFile(), cfg);
  return setLayout(layout);
}

// ---- Widget definitions ----

const BUILTIN_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), 'builtin-widgets');

export function builtinDir() {
  return BUILTIN_DIR;
}

export function listBuiltinWidgets() {
  return fs
    .readdirSync(BUILTIN_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => readJson(path.join(BUILTIN_DIR, d.name, 'manifest.json'), null))
    .filter(Boolean);
}

export function listCustomWidgets() {
  const dir = getWidgetsDir();
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => readJson(path.join(dir, d.name, 'manifest.json'), null))
    .filter(Boolean);
}

/** widgetRef: "builtin/clock" or "custom/<id>" -> absolute folder path or null */
export function resolveWidgetDir(widgetRef) {
  const [kind, id] = String(widgetRef).split('/');
  if (!id || id.includes('..') || id.includes(path.sep)) return null;
  const dir = kind === 'builtin' ? path.join(BUILTIN_DIR, id) : path.join(getWidgetsDir(), id);
  return fs.existsSync(path.join(dir, 'manifest.json')) ? dir : null;
}

export function getManifest(widgetRef) {
  const dir = resolveWidgetDir(widgetRef);
  return dir ? readJson(path.join(dir, 'manifest.json'), null) : null;
}

export function saveCustomWidget(id, manifest, html) {
  const dir = path.join(getWidgetsDir(), id);
  fs.mkdirSync(dir, { recursive: true });
  writeJson(path.join(dir, 'manifest.json'), manifest);
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  return dir;
}

// ---- Per-widget key/value storage (bridge focus.store) ----

const widgetStoreFile = () => path.join(getDataDir(), 'widget-store.json');

export function widgetStoreGet(instanceId, key) {
  const all = readJson(widgetStoreFile(), {});
  return (all[instanceId] || {})[key] ?? null;
}

export function widgetStoreSet(instanceId, key, value) {
  const all = readJson(widgetStoreFile(), {});
  all[instanceId] = all[instanceId] || {};
  all[instanceId][key] = value;
  writeJson(widgetStoreFile(), all);
}
