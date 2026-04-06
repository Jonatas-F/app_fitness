import { useLocation, useParams } from 'react-router-dom';
import ModulePageLayout from '../../../components/ModulePageLayout';
import { dietsViews } from '../../../data/appData';
import './NutritionPage.css';

function getDietView(pathname, dietId) {
  if (dietId) return 'detail';
  if (pathname.endsWith('/historico')) return 'history';
  if (pathname.endsWith('/gerar')) return 'generate';
  return 'list';
}

export default function NutritionPage() {
  const { pathname } = useLocation();
  const { dietId } = useParams();

  const viewKey = getDietView(pathname, dietId);
  const content = { ...dietsViews[viewKey] };

  if (dietId) {
    content.title = `Dieta ${dietId}`;
    content.footerNote = `Rota dinâmica funcionando em /dietas/${dietId}. Depois ela deve buscar a dieta real pelo id no backend.`;
  }

  return (
    <div className="nutrition-page">
      <ModulePageLayout {...content} />
    </div>
  );
}