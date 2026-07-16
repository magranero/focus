import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api.js';

export default function MarketplaceModal({ state, onClose, refresh }) {
  const { t } = useTranslation();
  const [catalog, setCatalog] = useState(null);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState(null);
  const [installedIds, setInstalledIds] = useState([]);

  useEffect(() => {
    api.catalog().then(setCatalog).catch(() => setCatalog({ widgets: [], source: 'sample' }));
  }, []);

  async function installFree(w) {
    setMsg(null);
    try {
      await api.install({ pkg: w.pkg });
      setInstalledIds((xs) => [...xs, w.id]);
      refresh();
    } catch (e) {
      setMsg({ ok: false, text: e.data?.error || e.message });
    }
  }

  async function redeem() {
    setMsg(null);
    try {
      await api.install({ code: code.trim() });
      setMsg({ ok: true, text: t('market.installed') });
      setCode('');
      refresh();
    } catch (e) {
      setMsg({ ok: false, text: e.data?.error || e.message });
    }
  }

  const fmtPrice = (w) =>
    w.price === 0
      ? t('market.free')
      : new Intl.NumberFormat(undefined, { style: 'currency', currency: w.currency || 'EUR' })
          .format(w.price / 100);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card modal wide">
        <h2>🛍️ {t('market.title')}</h2>
        {!catalog ? (
          <div className="ring" />
        ) : (
          <>
            {catalog.source === 'sample' && <p className="hint">{t('market.sampleNote')}</p>}
            <div className="market-grid">
              {catalog.widgets.map((w) => (
                <div key={w.id} className="market-card">
                  <span className="emoji">{w.emoji}</span>
                  <strong>{w.name}</strong>
                  <span className="hint">{w.description}</span>
                  <span className="author">@{w.author}</span>
                  <div className="row spread">
                    <span className="price">{fmtPrice(w)}</span>
                    {w.pkg ? (
                      <button
                        className="primary"
                        disabled={installedIds.includes(w.id)}
                        onClick={() => installFree(w)}
                      >
                        {installedIds.includes(w.id) ? `✓ ${t('market.installed')}` : t('market.install')}
                      </button>
                    ) : (
                      <a
                        className="button primary"
                        href={`${state.config.marketplaceUrl}/widget/${w.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t('market.buy')}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <section>
              <h3>{t('market.redeemTitle')}</h3>
              <div className="row">
                <input
                  placeholder={t('market.redeemPlaceholder')}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <button className="primary" disabled={!code.trim()} onClick={redeem}>
                  {t('market.redeem')}
                </button>
              </div>
            </section>
            {msg && <p className={msg.ok ? 'success' : 'error'}>{msg.text}</p>}
          </>
        )}
      </div>
    </div>
  );
}
