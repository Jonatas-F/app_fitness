import { useLocation } from 'react-router-dom';
import ModulePageLayout from '../../../components/ModulePageLayout';
import { checkinViews } from '../../../data/appData';
import './CheckinsPage.css';

export default function CheckinsPage() {
  const { pathname } = useLocation();
  const isNew = pathname.endsWith('/novo');

  return (
    <div className="checkins-page">
      <ModulePageLayout {...(isNew ? checkinViews.new : checkinViews.list)} />
    </div>
  );
}