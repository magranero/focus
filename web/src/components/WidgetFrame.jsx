import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, localized } from '../api.js';

/**
 * Hosts one sandboxed widget iframe and answers its bridge (postMessage)
 * calls: init / fetch / store / requestSetup / openSettings.
 */
export default function WidgetFrame({ item, reload = 0, onConfigure, onEditAI, onRemove, onExport }) {
  const { t, i18n } = useTranslation();
  const iframeRef = useRef(null);
  const [setupRequested, setSetupRequested] = useState(false);

  const manifest = item.manifest || {};
  const generating = !!manifest.generating;
  const showBadge = (item.needsSetup || setupRequested) && !generating;

  // Saving settings clears the widget's own setup request.
  useEffect(() => {
    if (reload > 0) setSetupRequested(false);
  }, [reload]);

  useEffect(() => {
    async function handle(e) {
      const frame = iframeRef.current;
      if (!frame || e.source !== frame.contentWindow) return;
      const d = e.data;
      if (!d || d.__focus !== true || d.reply) return;
      const reply = (result, error) =>
        frame.contentWindow.postMessage(
          { __focus: true, reply: true, id: d.id, result, error },
          '*'
        );
      try {
        switch (d.method) {
          case 'init': {
            const ctx = await api.widgetContext(item.id);
            reply(ctx);
            break;
          }
          case 'fetch': {
            reply(await api.widgetProxy(item.id, d.args));
            break;
          }
          case 'storeGet': {
            const { value } = await api.widgetStoreGet(item.id, d.args.key);
            reply(value);
            break;
          }
          case 'storeSet': {
            await api.widgetStoreSet(item.id, d.args.key, d.args.value);
            reply(true);
            break;
          }
          case 'requestSetup':
            setSetupRequested(true);
            reply(true);
            break;
          case 'openSettings':
            onConfigure(item);
            reply(true);
            break;
          default:
            reply(null, `unknown bridge method ${d.method}`);
        }
      } catch (err) {
        reply(null, err.message);
      }
    }
    window.addEventListener('message', handle);
    return () => window.removeEventListener('message', handle);
  }, [item, onConfigure]);

  const name = generating
    ? '✨'
    : `${manifest.emoji || '🧩'} ${localized(manifest.name, i18n.language)}`;

  return (
    <div className="wg">
      <div className="wg-head" title={t('dash.dragHint', '')}>
        <span className="wg-name">{name}</span>
        <span className="wg-actions">
          {(manifest.settings || []).length > 0 && (
            <button title={t('dash.configure')} onClick={() => onConfigure(item)}>⚙︎</button>
          )}
          {item.widget.startsWith('custom/') && !generating && (
            <button title={t('dash.editAI')} onClick={() => onEditAI(item)}>✎</button>
          )}
          {item.widget.startsWith('custom/') && !generating && (
            <button title={t('dash.publish')} onClick={() => onExport(item)}>↗</button>
          )}
          <button title={t('dash.remove')} onClick={() => onRemove(item)}>✕</button>
        </span>
        {showBadge && (
          <button
            className="badge"
            title={t('dash.setupNeeded')}
            onClick={() => onConfigure(item)}
          />
        )}
      </div>
      <iframe
        ref={iframeRef}
        title={item.id}
        src={`/widgets/${item.widget}/index.html?v=${generating ? 'gen' : 'ready'}&r=${reload}`}
        sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
      />
    </div>
  );
}
