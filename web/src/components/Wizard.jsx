import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, localized } from '../api.js';

/** Tiny schematic preview of a template's layout. */
function TemplatePreview({ tpl }) {
  const H = Math.max(...tpl.items.map((i) => i.y + i.h), 5);
  return (
    <svg viewBox="0 0 120 62" className="tpl-preview">
      {tpl.items.map((it, i) => (
        <rect
          key={i}
          x={(it.x / 12) * 120 + 1}
          y={(it.y / H) * 60 + 1}
          width={(it.w / 12) * 120 - 2}
          height={(it.h / H) * 60 - 2}
          rx="3"
        />
      ))}
    </svg>
  );
}

export default function Wizard({ state, onDone }) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(1);
  const [template, setTemplate] = useState('overview');
  const [extras, setExtras] = useState([]);
  const [firstPrompt, setFirstPrompt] = useState('');
  const [busy, setBusy] = useState(false);

  const tplWidgets = state.templates.find((x) => x.id === template)?.items.map((i) => i.widget) || [];

  async function finish() {
    setBusy(true);
    try {
      await api.applyTemplate(template);
      for (const w of extras) {
        if (!tplWidgets.includes(w)) await api.addWidget({ widget: w });
      }
      if (firstPrompt.trim()) {
        await api.aiCreate({ prompt: firstPrompt.trim(), x: 0, y: 0 });
      }
      await onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fullscreen center">
      <div className="card wizard">
        <div className="steps">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`step-dot ${step >= n ? 'active' : ''}`}>{n}</div>
          ))}
        </div>

        {step === 1 && (
          <>
            <h2>{t('wizard.step1')}</h2>
            <p className="muted">{t('wizard.step1Sub')}</p>
            <div className="tpl-grid">
              {state.templates.map((tpl) => (
                <button
                  key={tpl.id}
                  className={`tpl ${template === tpl.id ? 'selected' : ''}`}
                  onClick={() => setTemplate(tpl.id)}
                >
                  <TemplatePreview tpl={tpl} />
                  <strong>{t(`templates.${tpl.id}`)}</strong>
                  <span className="hint">{t(`templates.${tpl.id}Desc`)}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2>{t('wizard.step2')}</h2>
            <p className="muted">{t('wizard.step2Sub')}</p>
            <div className="widget-pick-grid">
              {state.builtinWidgets.map((w) => {
                const ref = `builtin/${w.id}`;
                const inTpl = tplWidgets.includes(ref);
                const on = inTpl || extras.includes(ref);
                return (
                  <button
                    key={w.id}
                    className={`wpick ${on ? 'selected' : ''} ${inTpl ? 'locked' : ''}`}
                    onClick={() => {
                      if (inTpl) return;
                      setExtras((xs) =>
                        xs.includes(ref) ? xs.filter((x) => x !== ref) : [...xs, ref]
                      );
                    }}
                  >
                    <span className="emoji">{w.emoji}</span>
                    <strong>{localized(w.name, i18n.language)}</strong>
                    <span className="hint">{localized(w.description, i18n.language)}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2>✨ {t('wizard.step3')}</h2>
            <p className="muted">{t('wizard.step3Sub')}</p>
            <p className="tip">🔴 {t('wizard.step3Tip')}</p>
            <label className="try-label">{t('wizard.tryNow')}</label>
            <textarea
              rows={2}
              placeholder={t('wizard.tryPlaceholder')}
              value={firstPrompt}
              onChange={(e) => setFirstPrompt(e.target.value)}
            />
          </>
        )}

        <div className="row spread">
          <button className="ghost" disabled={step === 1} onClick={() => setStep(step - 1)}>
            ← {t('wizard.back')}
          </button>
          {step < 3 ? (
            <button className="primary" onClick={() => setStep(step + 1)}>
              {t('wizard.next')} →
            </button>
          ) : (
            <button className="primary" onClick={finish} disabled={busy}>
              {busy ? '…' : `🚀 ${t('wizard.finish')}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
