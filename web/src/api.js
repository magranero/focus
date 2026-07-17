async function req(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || res.statusText), { data });
  return data;
}

export const api = {
  state: () => req('GET', '/api/state'),
  patchConfig: (patch) => req('POST', '/api/config', patch),
  aiTest: (body) => req('POST', '/api/ai/test', body),
  aiConfig: (body) => req('POST', '/api/ai/config', body),
  aiPing: () => req('POST', '/api/ai/ping'),
  applyTemplate: (template) => req('POST', '/api/template', { template }),
  saveLayout: (items) => req('PUT', '/api/layout', { items }),
  addWidget: (body) => req('POST', '/api/widgets/add', body),
  removeWidget: (id) => req('DELETE', `/api/widgets/${id}`),
  widgetContext: (id) => req('GET', `/api/widgets/${id}/context`),
  widgetProxy: (id, payload) => req('POST', `/api/widgets/${id}/proxy`, payload),
  widgetStoreGet: (id, key) => req('GET', `/api/widgets/${id}/store/${encodeURIComponent(key)}`),
  widgetStoreSet: (id, key, value) =>
    req('PUT', `/api/widgets/${id}/store/${encodeURIComponent(key)}`, { value }),
  saveWidgetSettings: (id, values) => req('POST', `/api/widgets/${id}/settings`, { values }),
  aiCreate: (body) => req('POST', '/api/ai/create', body),
  aiEdit: (body) => req('POST', '/api/ai/edit', body),
  catalog: () => req('GET', '/api/marketplace/catalog'),
  install: (body) => req('POST', '/api/marketplace/install', body),
  exportWidget: (id) => req('GET', `/api/widgets/${id}/export`)
};

/** Manifest names/descriptions can be strings or {en, es} objects. */
export function localized(value, locale) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[locale] || value.en || Object.values(value)[0] || '';
}
