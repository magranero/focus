import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GridStack } from 'gridstack';
import { api } from '../api.js';
import WidgetFrame from './WidgetFrame.jsx';
import { AICreatorModal, WidgetSettingsModal, AddWidgetModal } from './Modals.jsx';

const CELL_HEIGHT = 90;

export default function Dashboard({ state, refresh, onOpenSettings, onOpenMarket }) {
  const { t } = useTranslation();
  const gridRef = useRef(null);
  const gridElRef = useRef(null);
  const [creatorAt, setCreatorAt] = useState(null); // {x, y} | null
  const [editing, setEditing] = useState(null); // item | null — re-chat with the agent
  const [configuring, setConfiguring] = useState(null); // item | null
  const [adding, setAdding] = useState(false);
  const [reloadMap, setReloadMap] = useState({}); // instanceId -> counter, bumps reload the iframe
  const lastMoveRef = useRef(0); // suppresses the ghost click that follows a drag/resize

  const items = state.layout.items;
  const activeJobs = state.jobs.filter(
    (j) => j.status === 'queued' || j.status === 'generating'
  ).length;

  // --- gridstack lifecycle ---
  useEffect(() => {
    const grid = GridStack.init(
      {
        column: 12,
        cellHeight: CELL_HEIGHT,
        margin: 8,
        float: true,
        handle: '.wg-head',
        resizable: { handles: 'n,e,s,w,ne,se,sw,nw' }
      },
      gridElRef.current
    );
    gridRef.current = grid;

    grid.on('change', () => {
      const positions = grid.engine.nodes.map((n) => ({
        id: n.el.getAttribute('data-item-id'),
        x: n.x,
        y: n.y,
        w: n.w,
        h: n.h
      }));
      api.saveLayout(positions).catch(() => {});
    });
    const toggle = (on) => () => {
      document.body.classList.toggle('gs-moving', on);
      lastMoveRef.current = Date.now();
    };
    grid.on('dragstart', toggle(true));
    grid.on('resizestart', toggle(true));
    grid.on('dragstop', toggle(false));
    grid.on('resizestop', toggle(false));

    return () => grid.destroy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Register new/removed DOM nodes with gridstack and sync server-side size changes.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const els = [...gridElRef.current.querySelectorAll('[data-item-id]')];
    for (const el of els) {
      const item = items.find((i) => i.id === el.getAttribute('data-item-id'));
      if (!item) {
        // Deregister from gridstack but let React own the DOM removal —
        // pulling the node out here blows up React's reconciler (issue #1).
        if (el.gridstackNode) grid.removeWidget(el, false);
        continue;
      }
      if (!el.gridstackNode) {
        grid.makeWidget(el);
      } else {
        const n = el.gridstackNode;
        if (n.w !== item.w || n.h !== item.h) {
          grid.update(el, { w: item.w, h: item.h });
        }
      }
    }
  }, [items]);

  // --- click empty space -> AI creator ---
  const onGridClick = useCallback((e) => {
    if (e.target !== gridElRef.current) return;
    // A drop at the end of a drag/resize also fires a click on the grid
    // background; don't mistake it for "create a widget here" (issue #6).
    if (Date.now() - lastMoveRef.current < 400) return;
    const rect = gridElRef.current.getBoundingClientRect();
    const cellW = rect.width / 12;
    const x = Math.min(11, Math.floor((e.clientX - rect.left) / cellW));
    const y = Math.max(0, Math.floor((e.clientY - rect.top) / (CELL_HEIGHT + 8)));
    setCreatorAt({ x, y });
  }, []);

  async function removeItem(item) {
    // Only deregister from gridstack; React removes the DOM node on refresh.
    const el = gridElRef.current.querySelector(`[data-item-id="${item.id}"]`);
    if (el?.gridstackNode) gridRef.current.removeWidget(el, false);
    await api.removeWidget(item.id);
    refresh();
  }

  async function exportItem(item) {
    try {
      const pkg = await api.exportWidget(item.id);
      const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${(pkg.manifest.name || 'widget').replace(/\W+/g, '-').toLowerCase()}.focuswidget.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert(`${t('errors.generic')}: ${e.message}`);
    }
  }

  return (
    <div className="dash">
      <div className="topbar">
        <span className="brand">◎ FOCUS</span>
        <span className="spacer" />
        {activeJobs > 0 && (
          <span className="jobs-pill">
            <span className="ring small" /> {t('dash.generating', { count: activeJobs })}
          </span>
        )}
        <button className="ghost" onClick={() => setAdding(true)}>＋ {t('dash.addWidget')}</button>
        <button className="ghost" onClick={onOpenMarket}>🛍️ {t('dash.marketplace')}</button>
        <button className="ghost" onClick={onOpenSettings}>⚙︎ {t('dash.settings')}</button>
      </div>

      <div className="grid-stack" ref={gridElRef} onClick={onGridClick}>
        {items.map((item) => (
          <div
            key={item.id}
            className="grid-stack-item"
            data-item-id={item.id}
            gs-x={item.x}
            gs-y={item.y}
            gs-w={item.w}
            gs-h={item.h}
          >
            <div className="grid-stack-item-content">
              <WidgetFrame
                item={item}
                reload={reloadMap[item.id] || 0}
                onConfigure={setConfiguring}
                onEditAI={setEditing}
                onRemove={removeItem}
                onExport={exportItem}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="empty-hint">✨ {t('dash.emptyHint')}</div>

      {creatorAt && (
        <AICreatorModal
          at={creatorAt}
          onClose={() => setCreatorAt(null)}
          refresh={refresh}
        />
      )}
      {editing && (
        <AICreatorModal
          editItem={editing}
          onClose={() => setEditing(null)}
          refresh={refresh}
        />
      )}
      {configuring && (
        <WidgetSettingsModal
          item={configuring}
          onClose={() => setConfiguring(null)}
          refresh={refresh}
          onSaved={(id) => setReloadMap((m) => ({ ...m, [id]: (m[id] || 0) + 1 }))}
        />
      )}
      {adding && (
        <AddWidgetModal
          state={state}
          onClose={() => setAdding(false)}
          refresh={refresh}
        />
      )}
    </div>
  );
}
