import ModulePageLayout from '../../../components/ModulePageLayout';
import { dashboardData } from '../../../data/appData';
import './DashboardPage.css';

export default function DashboardPage() {
  return (
    <div className="dashboard-page">
      <ModulePageLayout {...dashboardData} />
    </div>
  );
}