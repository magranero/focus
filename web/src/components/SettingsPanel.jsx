import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api.js';

export default function SettingsPanel({ state, onClose, refresh }) {
  const { t, i18n } = useTranslation();
  const cfg = state.config;
  const [provider, setProvider] = useState(cfg.ai.provider || 'openai');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(cfg.ai.baseUrl || 'http://localhost:11434');
  const [model, setModel] = useState(cfg.ai.model || '');
  const [marketplaceUrl, setMarketplaceUrl] = useState(cfg.marketplaceUrl);
  const [msg, setMsg] = useState(null);
  const isOllama = provider === 'ollama';
  const homeUrl = `${window.location.protocol}//${window.location.host}`;

  async function setLocale(l) {
    i18n.changeLanguage(l);
    await api.patchConfig({ locale: l });
    refresh();
  }

  async function saveAI() {
    setMsg(null);
    try {
      await api.aiConfig({
        provider,
        apiKey: apiKey || undefined,
        baseUrl: isOllama ? baseUrl : undefined,
        model: model || undefined
      });
      setApiKey('');
      setMsg({ ok: true, text: t('settings.saved') });
      refresh();
    } catch (e) {
      setMsg({ ok: false, text: e.data?.error || e.message });
    }
  }

  async function ping() {
    setMsg(null);
    try {
      const r = await api.aiPing();
      setMsg({ ok: true, text: `✓ ${r.text}` });
    } catch (e) {
      setMsg({ ok: false, text: e.data?.error || e.message });
    }
  }

  async function saveMarketplace() {
    await api.patchConfig({ marketplaceUrl });
    setMsg({ ok: true, text: t('settings.saved') });
    refresh();
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card modal settings">
        <h2>⚙︎ {t('settings.title')}</h2>

        <section>
          <h3>{t('settings.startPage')}</h3>
          <p className="hint">{t('settings.startPageHelp')}</p>
          <div className="row">
            <code className="url">{homeUrl}</code>
            <button className="ghost" onClick={() => navigator.clipboard.writeText(homeUrl)}>📋</button>
          </div>
        </section>

        <section>
          <h3>{t('settings.language')}</h3>
          <div className="row">
            {['en', 'es'].map((l) => (
              <button
                key={l}
                className={cfg.locale === l ? 'primary' : 'ghost'}
                onClick={() => setLocale(l)}
              >
                {l === 'en' ? 'English' : 'Español'}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3>{t('settings.ai')}</h3>
          <div className="row wrap">
            {Object.entries(state.providers).map(([id, p]) => (
              <button
                key={id}
                className={provider === id ? 'primary' : 'ghost'}
                onClick={() => setProvider(id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          {isOllama ? (
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
          ) : (
            <input
              type="password"
              placeholder={cfg.secrets[`ai_${provider}_key`] ? '•••••••• (saved)' : t('onboarding.apiKey')}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          )}
          <input
            placeholder={`model (${state.providers[provider]?.defaultModel || 'auto'})`}
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
          <div className="row">
            <button className="primary" onClick={saveAI}>{t('settings.save')}</button>
            <button className="ghost" onClick={ping}>{t('settings.aiPing')}</button>
          </div>
        </section>

        <section>
          <h3>{t('settings.marketplaceUrl')}</h3>
          <div className="row">
            <input value={marketplaceUrl} onChange={(e) => setMarketplaceUrl(e.target.value)} />
            <button className="ghost" onClick={saveMarketplace}>{t('settings.save')}</button>
          </div>
        </section>

        {msg && <p className={msg.ok ? 'success' : 'error'}>{msg.text}</p>}
        <div className="row spread">
          <span />
          <button className="primary" onClick={onClose}>{t('settings.close')}</button>
        </div>
      </div>
    </div>
  );
}
