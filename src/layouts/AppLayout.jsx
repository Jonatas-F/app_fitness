import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import './AppLayout.css';

export default function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />

      <main className="app-shell__content">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}