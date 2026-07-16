import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from './api.js';
import Onboarding from './components/Onboarding.jsx';
import Wizard from './components/Wizard.jsx';
import Dashboard from './components/Dashboard.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import MarketplaceModal from './components/MarketplaceModal.jsx';

export default function App() {
  const { i18n } = useTranslation();
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(window.location.hash === '#settings');
  const [showMarket, setShowMarket] = useState(false);
  const pollRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const s = await api.state();
      setState(s);
      if (s.config.locale && s.config.locale !== i18n.language) {
        i18n.changeLanguage(s.config.locale);
      }
      return s;
    } catch (e) {
      setError(e.message);
    }
  }, [i18n]);

  useEffect(() => {
    refresh();
    const onHash = () => setShowSettings(window.location.hash === '#settings');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [refresh]);

  // Poll while widgets are being generated.
  useEffect(() => {
    const active = state?.jobs?.some((j) => j.status === 'queued' || j.status === 'generating');
    if (active && !pollRef.current) {
      pollRef.current = setInterval(refresh, 2500);
    } else if (!active && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [state, refresh]);

  if (error) return <div className="fatal">⚠️ {error}</div>;
  if (!state) return <div className="loading-screen"><div className="ring" /></div>;

  const phase = !state.config.onboarded
    ? 'onboarding'
    : !state.config.template
      ? 'wizard'
      : 'dashboard';

  return (
    <>
      {phase === 'onboarding' && <Onboarding state={state} onDone={refresh} />}
      {phase === 'wizard' && <Wizard state={state} onDone={refresh} />}
      {phase === 'dashboard' && (
        <Dashboard
          state={state}
          refresh={refresh}
          onOpenSettings={() => setShowSettings(true)}
          onOpenMarket={() => setShowMarket(true)}
        />
      )}
      {showSettings && (
        <SettingsPanel
          state={state}
          onClose={() => {
            setShowSettings(false);
            if (window.location.hash === '#settings') {
              history.replaceState(null, '', window.location.pathname);
            }
          }}
          refresh={refresh}
        />
      )}
      {showMarket && (
        <MarketplaceModal state={state} onClose={() => setShowMarket(false)} refresh={refresh} />
      )}
    </>
  );
}
