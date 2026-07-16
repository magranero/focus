/**
 * Thin adapters over the chat APIs of each supported provider.
 * All calls happen server-side; API keys never reach the browser.
 */

export const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    needsKey: true
  },
  anthropic: {
    label: 'Anthropic',
    defaultModel: 'claude-sonnet-5',
    needsKey: true
  },
  gemini: {
    label: 'Google Gemini',
    defaultModel: 'gemini-2.0-flash',
    needsKey: true
  },
  ollama: {
    label: 'Ollama (local)',
    defaultModel: null, // picked from installed models
    needsKey: false,
    defaultBaseUrl: 'http://localhost:11434'
  }
};

async function readError(res) {
  const text = await res.text().catch(() => '');
  return `${res.status} ${res.statusText}${text ? `: ${text.slice(0, 300)}` : ''}`;
}

/**
 * chat({provider, model, apiKey, baseUrl}, messages) -> assistant text.
 * messages: [{role: 'system'|'user'|'assistant', content: string}]
 */
export async function chat({ provider, model, apiKey, baseUrl }, messages) {
  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages })
    });
    if (!res.ok) throw new Error(await readError(res));
    const data = await res.json();
    return data.choices[0].message.content;
  }

  if (provider === 'anthropic') {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
    const rest = messages.filter((m) => m.role !== 'system');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model, max_tokens: 8192, system, messages: rest })
    });
    if (!res.ok) throw new Error(await readError(res));
    const data = await res.json();
    return data.content.map((b) => b.text || '').join('');
  }

  if (provider === 'gemini') {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: system ? { parts: [{ text: system }] } : undefined
      })
    });
    if (!res.ok) throw new Error(await readError(res));
    const data = await res.json();
    return data.candidates[0].content.parts.map((p) => p.text || '').join('');
  }

  if (provider === 'ollama') {
    const base = (baseUrl || PROVIDERS.ollama.defaultBaseUrl).replace(/\/$/, '');
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false })
    });
    if (!res.ok) throw new Error(await readError(res));
    const data = await res.json();
    return data.message.content;
  }

  throw new Error(`Unknown provider: ${provider}`);
}

/**
 * Validates credentials with the cheapest possible call.
 * Returns { ok, models?, error? }.
 */
export async function testProvider({ provider, apiKey, baseUrl }) {
  try {
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { authorization: `Bearer ${apiKey}` }
      });
      if (!res.ok) return { ok: false, error: await readError(res) };
      return { ok: true };
    }
    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
      });
      if (!res.ok) return { ok: false, error: await readError(res) };
      return { ok: true };
    }
    if (provider === 'gemini') {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      if (!res.ok) return { ok: false, error: await readError(res) };
      return { ok: true };
    }
    if (provider === 'ollama') {
      const base = (baseUrl || PROVIDERS.ollama.defaultBaseUrl).replace(/\/$/, '');
      const res = await fetch(`${base}/api/tags`);
      if (!res.ok) return { ok: false, error: await readError(res) };
      const data = await res.json();
      const models = (data.models || []).map((m) => m.name);
      if (models.length === 0) {
        return { ok: false, error: 'Ollama is running but has no models. Run: ollama pull llama3.2' };
      }
      return { ok: true, models };
    }
    return { ok: false, error: `Unknown provider: ${provider}` };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
