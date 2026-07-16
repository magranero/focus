/**
 * Injected API for FOCUS widgets. Loaded via <script src="/bridge.js"> inside
 * a sandboxed iframe (opaque origin) — every capability goes through
 * postMessage to the dashboard shell, which talks to the local server.
 * Widgets never see credentials; use {{settings.<key>}} placeholders in
 * focus.fetch urls/headers and the server substitutes real values.
 */
(() => {
  let seq = 0;
  const pending = new Map();

  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || d.__focus !== true || !d.reply) return;
    const p = pending.get(d.id);
    if (!p) return;
    pending.delete(d.id);
    if (d.error) p.reject(new Error(d.error));
    else p.resolve(d.result);
  });

  function call(method, args) {
    return new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      window.parent.postMessage({ __focus: true, id, method, args }, '*');
      setTimeout(() => {
        if (pending.delete(id)) reject(new Error('focus bridge timeout'));
      }, 30000);
    });
  }

  const api = {
    /** -> {instanceId, locale, settings, secretsSet, sampleData} */
    init: () => call('init'),
    /** Proxied fetch. opts: {method, headers, body}. -> {status, headers, bodyText} */
    fetch: (url, opts) => call('fetch', { url, opts }),
    store: {
      get: (key) => call('storeGet', { key }),
      set: (key, value) => call('storeSet', { key, value })
    },
    /** Tell the shell this widget needs configuration (shows the red badge). */
    requestSetup: () => call('requestSetup'),
    /** Open this widget's settings dialog. */
    openSettings: () => call('openSettings')
  };

  // `window.focus` (the method) is writable; the widget API reads much nicer
  // as `focus.init()` and no widget legitimately needs to steal window focus.
  window.focus = api;
  window.FOCUS = api;
})();
