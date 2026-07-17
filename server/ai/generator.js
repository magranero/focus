import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chat, PROVIDERS } from './providers.js';
import {
  getConfig,
  getSecret,
  saveCustomWidget,
  upsertLayoutItem,
  getManifest,
  resolveWidgetDir
} from '../store.js';

/**
 * Background widget-generation agents. Each job immediately reserves space on
 * the grid with a placeholder item; when the LLM finishes, the placeholder
 * becomes a real widget. Several jobs can run in parallel.
 */

const MAX_CONCURRENT = 3;
const jobs = new Map(); // id -> job
let running = 0;

const SYSTEM_PROMPT = `You are a widget generator for FOCUS, a local browser start page.
You output EXACTLY this structure (no commentary before or after):

===META===
{
  "name": "short widget title",
  "emoji": "one emoji representing the widget",
  "w": <grid width 2-6>,
  "h": <grid height 2-5>,
  "settings": [
    {"key": "snake_case_key", "label": "Human label", "type": "text"|"secret"|"url"|"number", "required": true|false, "help": "see rules below"}
  ],
  "allowedDomains": ["api.example.com"],
  "sampleData": { ...any JSON the widget can render as realistic dummy data... }
}
===HTML===
<complete single-file widget HTML document>

The META block is strict JSON (no comments, no trailing commas). The HTML block is raw HTML, NOT wrapped in JSON or markdown fences.

Rules for the HTML:
- A complete standalone document rendered inside a sandboxed iframe (~grid cells of 90px).
- Must include <script src="/bridge.js"></script> and use the injected "focus" API:
    const ctx = await focus.init();            // {instanceId, locale, settings, secretsSet, sampleData}
    const res = await focus.fetch(url, opts);  // proxied fetch: {status, headers, bodyText}. ONLY urls on allowedDomains.
    await focus.store.set(key, value); await focus.store.get(key);  // persistent per-widget storage
    focus.requestSetup();                      // call when required settings are missing -> shows a red badge
- Secrets NEVER reach the widget. To use one in a request, embed the placeholder {{settings.<key>}} inside the url or a header value passed to focus.fetch; the local server substitutes the real value.
- If required settings are missing (check ctx.settings / ctx.secretsSet), render sampleData with a subtle "sample data" tag AND call focus.requestSetup().
- Style: dark, modern, self-contained CSS. Background transparent (the shell draws the card). System font stack. No external resources (no CDNs, no webfonts, no images from the network except data the widget legitimately fetches).
- All text visible to the user must be written in the locale given at init (fall back to English).
- Keep it robust: try/catch around fetches, show a friendly error state.

Settings guidance:
- Only ask for settings the widget truly needs. Prefer keyless public APIs (e.g. open-meteo.com for weather, no key).
- Mark anything sensitive (API keys, tokens, passwords) as "type": "secret".
- "allowedDomains" must list every host the widget will fetch from.
- "help" is MANDATORY for every secret/API-key setting and must be a mini-guide in the user's locale containing, in this order: whether it is FREE or PAID, the exact URL where to get it, and the 2-4 short steps to obtain it. Example: "Gratis — en https://openweathermap.org/api: crea cuenta → My API keys → copia la key". For non-secret settings, a short example value is enough.`;

function extractSpec(text) {
  const metaMatch = text.match(/===META===\s*([\s\S]*?)\s*===HTML===/);
  const htmlMatch = text.match(/===HTML===\s*([\s\S]*)$/);
  if (metaMatch && htmlMatch) {
    const meta = JSON.parse(sliceJson(metaMatch[1]));
    let html = htmlMatch[1].trim();
    // Strip accidental markdown fences around the HTML.
    html = html.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').trim();
    return { ...meta, html };
  }
  // Fallback: the whole answer is one JSON object with an "html" field.
  return JSON.parse(sliceJson(text));
}

function sliceJson(raw) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const s = fenced ? fenced[1] : raw;
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Model returned no JSON object');
  return s.slice(start, end + 1);
}

function aiCredentials() {
  const cfg = getConfig();
  const provider = cfg.ai.provider;
  if (!provider) throw new Error('No AI provider configured');
  return {
    provider,
    model: cfg.ai.model || PROVIDERS[provider].defaultModel,
    apiKey: getSecret(`ai_${provider}_key`),
    baseUrl: cfg.ai.baseUrl
  };
}

export function createJob({ prompt, x = 0, y = 0, w = 3, h = 3, locale = 'en', extraSecrets = [] }) {
  const id = `w${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`;
  const job = {
    id,
    instanceId: id,
    prompt,
    status: 'queued', // queued | generating | done | error
    error: null,
    createdAt: Date.now(),
    locale
  };
  jobs.set(id, job);

  // Reserve grid space right away with a placeholder.
  upsertLayoutItem({ id, widget: `custom/${id}`, x, y, w, h, placeholder: true });
  saveCustomWidget(
    id,
    {
      id,
      name: 'Generating…',
      emoji: '✨',
      version: '0.0.0',
      generating: true,
      prompt,
      settings: [],
      allowedDomains: [],
      sampleData: null
    },
    PLACEHOLDER_HTML(prompt)
  );

  // Credentials the user pasted in the prompt become instance secrets that the
  // generated widget can reference as {{settings.secret_N}}.
  job.extraSecrets = extraSecrets;

  pump();
  return job;
}

/**
 * Re-chat with the agent about an existing custom widget: the model receives
 * the current manifest + html and an edit instruction, and returns the full
 * updated widget. The current widget keeps rendering; on failure it is
 * restored untouched.
 */
export function createEditJob({ instanceId, instruction, locale = 'en', extraSecrets = [] }) {
  const dir = resolveWidgetDir(`custom/${instanceId}`);
  if (!dir) throw new Error('widget not found');
  const manifest = getManifest(`custom/${instanceId}`);
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');

  const job = {
    id: `e${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`,
    instanceId,
    edit: { instruction, prevManifest: manifest, prevHtml: html },
    prompt: instruction,
    status: 'queued',
    error: null,
    createdAt: Date.now(),
    locale,
    extraSecrets
  };
  jobs.set(job.id, job);

  saveCustomWidget(
    instanceId,
    { ...manifest, generating: true },
    PLACEHOLDER_HTML(instruction)
  );

  pump();
  return job;
}

export function listJobs() {
  return [...jobs.values()].sort((a, b) => b.createdAt - a.createdAt);
}

function pump() {
  if (running >= MAX_CONCURRENT) return;
  const next = [...jobs.values()].find((j) => j.status === 'queued');
  if (!next) return;
  running++;
  next.status = 'generating';
  run(next)
    .catch((err) => {
      next.status = 'error';
      next.error = err.message;
      if (next.edit) {
        // Failed edit: put the previous working widget back untouched.
        saveCustomWidget(
          next.instanceId,
          { ...next.edit.prevManifest, generating: false, lastEditError: err.message },
          next.edit.prevHtml
        );
        return;
      }
      const manifest = getManifest(`custom/${next.id}`);
      saveCustomWidget(
        next.id,
        { ...manifest, name: 'Generation failed', generating: false, error: err.message },
        ERROR_HTML(err.message)
      );
    })
    .finally(() => {
      running--;
      pump();
    });
  pump(); // fill remaining slots
}

async function run(job) {
  const creds = aiCredentials();
  const secretNote = job.extraSecrets.length
    ? `\nThe user provided ${job.extraSecrets.length} credential(s), already stored securely as settings keys: ${job.extraSecrets
        .map((s) => s.key)
        .join(', ')}. Declare them in "settings" as type "secret" and use {{settings.<key>}} placeholders in requests.`
    : '';
  const userContent = job.edit
    ? `Locale: ${job.locale}
You previously generated this widget. Here is its current state:

===META===
${JSON.stringify(
        {
          name: job.edit.prevManifest.name,
          emoji: job.edit.prevManifest.emoji,
          w: job.edit.prevManifest.defaultSize?.w,
          h: job.edit.prevManifest.defaultSize?.h,
          settings: job.edit.prevManifest.settings,
          allowedDomains: job.edit.prevManifest.allowedDomains,
          sampleData: job.edit.prevManifest.sampleData
        },
        null,
        2
      )}
===HTML===
${job.edit.prevHtml}

The user wants this change: ${job.edit.instruction}${secretNote}

Return the COMPLETE updated widget in the same ===META=== / ===HTML=== format. Keep everything that still works; only change what the instruction requires.`
    : `Locale: ${job.locale}\nWidget request: ${job.prompt}${secretNote}`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userContent }
  ];
  let spec;
  let lastErr;
  for (let attempt = 0; attempt < 2 && !spec; attempt++) {
    try {
      const text = await chat(creds, messages);
      const parsed = extractSpec(text);
      if (!parsed.html || !parsed.name) throw new Error('Model output missing name/html');
      spec = parsed;
    } catch (err) {
      lastErr = err;
    }
  }
  if (!spec) throw lastErr;

  const manifest = {
    id: job.instanceId,
    name: String(spec.name).slice(0, 60),
    emoji: spec.emoji || '🧩',
    version: '1.0.0',
    author: 'you',
    generating: false,
    prompt: job.edit ? job.edit.prevManifest.prompt : job.prompt,
    edits: job.edit
      ? [...(job.edit.prevManifest.edits || []), job.edit.instruction]
      : undefined,
    defaultSize: { w: clamp(spec.w, 2, 6, 3), h: clamp(spec.h, 2, 5, 3) },
    settings: Array.isArray(spec.settings) ? spec.settings : [],
    allowedDomains: Array.isArray(spec.allowedDomains) ? spec.allowedDomains : [],
    sampleData: spec.sampleData ?? null
  };
  saveCustomWidget(job.instanceId, manifest, spec.html);
  if (!job.edit) {
    // New widgets adopt the model's suggested size; edits keep the user's.
    upsertLayoutItem({
      id: job.instanceId,
      w: manifest.defaultSize.w,
      h: manifest.defaultSize.h,
      placeholder: false
    });
  }
  job.status = 'done';
}

function clamp(v, min, max, dflt) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : dflt;
}

const PLACEHOLDER_HTML = (prompt) => `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;font-family:system-ui,sans-serif;color:#cbd5e1;background:transparent}
.wrap{display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;height:100%;padding:12px;box-sizing:border-box;text-align:center}
.spinner{width:26px;height:26px;border:3px solid #334155;border-top-color:#38bdf8;border-radius:50%;animation:s 1s linear infinite}
@keyframes s{to{transform:rotate(360deg)}}
p{margin:0;font-size:12px;opacity:.8;max-width:100%;overflow:hidden;text-overflow:ellipsis}
</style></head><body><div class="wrap"><div class="spinner"></div>
<p>${escapeHtml(prompt).slice(0, 120)}</p></div></body></html>`;

const ERROR_HTML = (msg) => `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;font-family:system-ui,sans-serif;color:#fca5a5;background:transparent}
.wrap{display:flex;flex-direction:column;gap:8px;align-items:center;justify-content:center;height:100%;padding:12px;box-sizing:border-box;text-align:center}
p{margin:0;font-size:12px;opacity:.9}
</style></head><body><div class="wrap"><div style="font-size:22px">⚠️</div>
<p>${escapeHtml(msg).slice(0, 200)}</p></div></body></html>`;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
