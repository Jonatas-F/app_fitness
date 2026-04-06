import { useLocation } from 'react-router-dom';
import ModulePageLayout from '../../../components/ModulePageLayout';
import { profileViews } from '../../../data/appData';
import './ProfilePage.css';

export default function ProfilePage() {
  const { pathname } = useLocation();
  const isEdit = pathname.endsWith('/editar');

  return (
    <div className="profile-page">
      <ModulePageLayout {...(isEdit ? profileViews.edit : profileViews.view)} />
    </div>
  );
}