import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import FirstCheckinModal from '../components/onboarding/FirstCheckinModal';
import GuidedTour from '../components/onboarding/GuidedTour';
import TokenHistoryModal from '../components/TokenHistoryModal';
import { useOnboarding } from '../hooks/useOnboarding';
import { usePlan } from '../hooks/usePlan';
import { getStoredApiUser } from '../services/api/client';
import { loadRemoteSettings } from '../services/settingsService';
import './AppLayout.css';

const SETTINGS_KEY = "shapeCertoSettings";

/** Sincroniza settings do backend → localStorage ao abrir o app.
 *  Garante que avatar e nome do Personal sobrevivam à limpeza do localStorage (iOS Safari). */
function syncSettingsFromBackend() {
  const user = getStoredApiUser();
  if (!user) return;
  loadRemoteSettings()
    .then(({ settings, skipped }) => {
      if (skipped || !settings?.personal) return;
      try {
        const local = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
        // Só sobrescreve se o backend tiver dados mais completos
        const merged = {
          ...local,
          personal: {
            ...(local.personal || {}),
            name:     settings.personal.name     || local.personal?.name     || "Personal Virtual",
            avatarId: settings.personal.avatarId || local.personal?.avatarId || "default-personal",
          },
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      } catch { /* silencioso */ }
    })
    .catch(() => {});
}

export default function AppLayout() {
  const { showFirstCheckin, showTour, completeFirstCheckin, completeOnboarding } = useOnboarding();
  const { planId } = usePlan();

  // Só exibe os modais de onboarding quando há sessão ativa
  const isLoggedIn = Boolean(getStoredApiUser());

  // Sincroniza settings do backend → localStorage na primeira montagem
  useEffect(() => {
    syncSettingsFromBackend();

    // Re-sincroniza quando o usuário faz login
    function onAuth() { syncSettingsFromBackend(); }
    window.addEventListener("shape-certo-auth-updated", onAuth);
    return () => window.removeEventListener("shape-certo-auth-updated", onAuth);
  }, []);

  // Modal de histórico de tokens — aberto pelo TokenChip via evento global
  const [tokenHistoryOpen, setTokenHistoryOpen]   = useState(false);
  const [tokenHistorySub,  setTokenHistorySub]    = useState(null);

  useEffect(() => {
    function onOpen(e) {
      setTokenHistorySub(e.detail?.subscription ?? null);
      setTokenHistoryOpen(true);
    }
    window.addEventListener("shape-certo-open-token-history", onOpen);
    return () => window.removeEventListener("shape-certo-open-token-history", onOpen);
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="app-shell__content">
        <Outlet />
      </main>

      <BottomNav />

      {isLoggedIn && showFirstCheckin && (
        <FirstCheckinModal planId={planId} onComplete={completeFirstCheckin} />
      )}
      {isLoggedIn && showTour && (
        <GuidedTour onComplete={completeOnboarding} />
      )}

      {tokenHistoryOpen && (
        <TokenHistoryModal
          subscription={tokenHistorySub}
          onClose={() => setTokenHistoryOpen(false)}
        />
      )}
    </div>
  );
}
