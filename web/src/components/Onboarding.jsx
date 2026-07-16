import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api.js';

export default function Onboarding({ state, onDone }) {
  const { t, i18n } = useTranslation();
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('http://localhost:11434');
  const [status, setStatus] = useState('idle'); // idle | testing | ok | error
  const [error, setError] = useState(null);
  const [models, setModels] = useState([]);
  const [model, setModel] = useState('');

  const providers = state.providers;
  const isOllama = provider === 'ollama';

  async function test() {
    setStatus('testing');
    setError(null);
    const res = await api
      .aiTest({ provider, apiKey: apiKey || undefined, baseUrl: isOllama ? baseUrl : undefined })
      .catch((e) => ({ ok: false, error: e.message }));
    if (res.ok) {
      setStatus('ok');
      if (res.models) {
        setModels(res.models);
        if (!model) setModel(res.models[0]);
      }
    } else {
      setStatus('error');
      setError(res.error);
    }
  }

  async function save() {
    setError(null);
    try {
      await api.aiConfig({
        provider,
        apiKey: apiKey || undefined,
        baseUrl: isOllama ? baseUrl : undefined,
        model: model || undefined
      });
      await onDone();
    } catch (e) {
      setStatus('error');
      setError(e.data?.error || e.message);
    }
  }

  return (
    <div className="fullscreen center">
      <div className="card onboarding">
        <div className="lang-switch">
          {['en', 'es'].map((l) => (
            <button
              key={l}
              className={i18n.language === l ? 'on' : ''}
              onClick={() => {
                i18n.changeLanguage(l);
                api.patchConfig({ locale: l });
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="logo">◎</div>
        <h1>{t('onboarding.welcome')}</h1>
        <p className="muted">{t('onboarding.intro')}</p>
        <h3>{t('onboarding.pickProvider')}</h3>
        <div className="provider-grid">
          {Object.entries(providers).map(([id, p]) => (
            <button
              key={id}
              className={`provider ${provider === id ? 'selected' : ''}`}
              onClick={() => {
                setProvider(id);
                setStatus('idle');
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        {isOllama ? (
          <>
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
            {models.length > 0 && (
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}
            <p className="hint">{t('onboarding.ollamaHint')}</p>
          </>
        ) : (
          <>
            <input
              type="password"
              placeholder={t('onboarding.apiKey')}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoFocus
            />
            <p className="hint">🔒 {t('onboarding.keyHint')}</p>
          </>
        )}
        {error && <p className="error">{error}</p>}
        <div className="row">
          <button className="ghost" onClick={test} disabled={status === 'testing'}>
            {status === 'testing'
              ? t('onboarding.testing')
              : status === 'ok'
                ? `✓ ${t('onboarding.connected')}`
                : t('onboarding.test')}
          </button>
          <button className="primary" onClick={save} disabled={!isOllama && !apiKey}>
            {t('onboarding.continue')}
          </button>
        </div>
      </div>
    </div>
  );
}
