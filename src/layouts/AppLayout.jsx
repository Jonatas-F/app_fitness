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
import './AppLayout.css';

export default function AppLayout() {
  const { showFirstCheckin, showTour, completeFirstCheckin, completeOnboarding } = useOnboarding();
  const { planId } = usePlan();

  // Só exibe os modais de onboarding quando há sessão ativa
  const isLoggedIn = Boolean(getStoredApiUser());

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
