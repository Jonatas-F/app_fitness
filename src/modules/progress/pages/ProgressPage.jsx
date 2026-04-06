import { useLocation } from 'react-router-dom';
import ModulePageLayout from '../../../components/ModulePageLayout';
import { progressViews } from '../../../data/appData';
import './ProgressPage.css';

function getProgressView(pathname) {
  if (pathname.endsWith('/fotos')) return 'photos';
  if (pathname.endsWith('/comparar')) return 'compare';
  if (pathname.endsWith('/bioimpedancia')) return 'bio';
  if (pathname.endsWith('/medidas')) return 'measurements';
  return 'overview';
}

export default function ProgressPage() {
  const { pathname } = useLocation();
  const viewKey = getProgressView(pathname);

  return (
    <div className="progress-page">
      <ModulePageLayout {...progressViews[viewKey]} />
    </div>
  );
}