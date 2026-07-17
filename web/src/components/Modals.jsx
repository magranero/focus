import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, localized } from '../api.js';

/** Renders help text with any URLs turned into clickable links. */
function Linkify({ text }) {
  const parts = String(text).split(/(https?:\/\/[^\s,)»"']+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noreferrer">{p}</a>
        ) : (
          p
        )
      )}
    </>
  );
}

function Modal({ onClose, children, wide }) {
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`card modal ${wide ? 'wide' : ''}`}>{children}</div>
    </div>
  );
}

export function AICreatorModal({ at, editItem, onClose, refresh }) {
  const { t, i18n } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // {credentialWarning}
  const [error, setError] = useState(null);
  const isEdit = !!editItem;

  async function create() {
    if (!prompt.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = isEdit
        ? await api.aiEdit({ instanceId: editItem.id, instruction: prompt.trim() })
        : await api.aiCreate({ prompt: prompt.trim(), x: at.x, y: at.y });
      setResult(res);
      refresh();
      if (!res.credentialWarning) setTimeout(onClose, 1200);
    } catch (e) {
      setError(e.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2>✨ {isEdit
        ? t('creator.editTitle', { name: localized(editItem.manifest?.name, i18n.language) })
        : t('creator.title')}</h2>
      {isEdit && editItem.manifest?.prompt && (
        <p className="hint">«{editItem.manifest.prompt}»</p>
      )}
      {!result ? (
        <>
          <textarea
            rows={3}
            autoFocus
            placeholder={isEdit ? t('creator.editPlaceholder') : t('creator.placeholder')}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) create();
            }}
          />
          {error && <p className="error">{error}</p>}
          <div className="row spread">
            <button className="ghost" onClick={onClose}>✕</button>
            <button className="primary" onClick={create} disabled={busy || !prompt.trim()}>
              {busy ? '…' : t('creator.create')}
            </button>
          </div>
        </>
      ) : (
        <>
          <p>🚀 {t('creator.queued')}</p>
          {result.credentialWarning && (
            <p className="warning">
              ⚠️ {t('creator.credWarning', { count: result.credentialWarning.count })}
            </p>
          )}
          <div className="row spread">
            <span />
            <button className="primary" onClick={onClose}>OK</button>
          </div>
        </>
      )}
    </Modal>
  );
}

export function WidgetSettingsModal({ item, onClose, refresh, onSaved }) {
  const { t, i18n } = useTranslation();
  const [values, setValues] = useState(null);
  const [secretsSet, setSecretsSet] = useState([]);
  const manifest = item.manifest || {};
  const fields = manifest.settings || [];

  useEffect(() => {
    api.widgetContext(item.id).then((ctx) => {
      setValues({ ...ctx.settings });
      setSecretsSet(ctx.secretsSet);
    });
  }, [item.id]);

  async function save() {
    await api.saveWidgetSettings(item.id, values);
    await refresh();
    onSaved?.(item.id);
    onClose();
  }

  if (!values) return null;
  return (
    <Modal onClose={onClose}>
      <h2>{t('widgetSettings.title', { name: localized(manifest.name, i18n.language) })}</h2>
      {fields.map((f) => (
        <label key={f.key} className="field">
          <span>
            {f.label}
            {f.required ? ' *' : ''}
          </span>
          <input
            type={f.type === 'secret' ? 'password' : f.type === 'number' ? 'number' : 'text'}
            placeholder={f.type === 'secret' && secretsSet.includes(f.key) ? '••••••••' : ''}
            value={values[f.key] ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
          />
          {f.help && (
            <span className="hint help-guide">💡 <Linkify text={f.help} /></span>
          )}
          {f.type === 'secret' && <span className="hint">🔒 {t('widgetSettings.secretHint')}</span>}
        </label>
      ))}
      <div className="row spread">
        <button className="ghost" onClick={onClose}>{t('widgetSettings.cancel')}</button>
        <button className="primary" onClick={save}>{t('widgetSettings.save')}</button>
      </div>
    </Modal>
  );
}

export function AddWidgetModal({ state, onClose, refresh }) {
  const { t, i18n } = useTranslation();
  async function add(w) {
    await api.addWidget({ widget: `builtin/${w.id}` });
    await refresh();
    onClose();
  }
  return (
    <Modal onClose={onClose} wide>
      <h2>＋ {t('dash.addWidget')}</h2>
      <div className="widget-pick-grid">
        {state.builtinWidgets.map((w) => (
          <button key={w.id} className="wpick" onClick={() => add(w)}>
            <span className="emoji">{w.emoji}</span>
            <strong>{localized(w.name, i18n.language)}</strong>
            <span className="hint">{localized(w.description, i18n.language)}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
