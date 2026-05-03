import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import FirstCheckinModal from '../components/onboarding/FirstCheckinModal';
import GuidedTour from '../components/onboarding/GuidedTour';
import { useOnboarding } from '../hooks/useOnboarding';
import { usePlan } from '../hooks/usePlan';
import './AppLayout.css';

export default function AppLayout() {
  const { showFirstCheckin, showTour, completeFirstCheckin, completeOnboarding } = useOnboarding();
  const { planId } = usePlan();

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="app-shell__content">
        <Outlet />
      </main>

      <BottomNav />

      {showFirstCheckin && (
        <FirstCheckinModal planId={planId} onComplete={completeFirstCheckin} />
      )}
      {showTour && (
        <GuidedTour onComplete={completeOnboarding} />
      )}
    </div>
  );
}
