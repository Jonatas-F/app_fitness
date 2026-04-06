import { Link } from 'react-router-dom';
import { ROUTE_PATHS } from '../../../router/routePaths';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <section className="not-found-page">
      <div className="not-found-page__card">
        <span className="not-found-page__badge">404</span>
        <h1>Página não encontrada</h1>
        <p>
          A rota acessada não existe dentro da estrutura atual do app.
        </p>

        <div className="not-found-page__actions">
          <Link to={ROUTE_PATHS.dashboard}>Ir para o Dashboard</Link>
          <Link to={ROUTE_PATHS.workouts}>Ir para Treinos</Link>
        </div>
      </div>
    </section>
  );
}