import { useLocation, useParams } from 'react-router-dom';
import ModulePageLayout from '../../../components/ModulePageLayout';
import { workoutsViews } from '../../../data/appData';
import './WorkoutsPage.css';

function getWorkoutView(pathname, workoutId) {
  if (workoutId) return 'detail';
  if (pathname.endsWith('/historico')) return 'history';
  if (pathname.endsWith('/gerar')) return 'generate';
  return 'list';
}

export default function WorkoutsPage() {
  const { pathname } = useLocation();
  const { workoutId } = useParams();

  const viewKey = getWorkoutView(pathname, workoutId);
  const content = { ...workoutsViews[viewKey] };

  if (workoutId) {
    content.title = `Treino ${workoutId}`;
    content.footerNote = `Rota dinâmica funcionando em /treinos/${workoutId}. Depois ela deve buscar o treino real pelo id no backend.`;
  }

  return (
    <div className="workouts-page">
      <ModulePageLayout {...content} />
    </div>
  );
}