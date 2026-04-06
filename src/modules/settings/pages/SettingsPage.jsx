import ModulePageLayout from '../../../components/ModulePageLayout';
import { settingsData } from '../../../data/appData';
import './SettingsPage.css';

export default function SettingsPage() {
  return (
    <div className="settings-page">
      <ModulePageLayout {...settingsData} />
    </div>
  );
}