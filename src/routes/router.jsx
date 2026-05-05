import { Component, Suspense, lazy } from "react";
import { Navigate, createBrowserRouter, useLocation } from "react-router-dom";
import { getApiToken, getStoredApiUser, clearApiSession } from "../services/api/client";

/**
 * Captura ChunkLoadError (chunk de lazy import não encontrado no servidor)
 * e força um hard reload limpando os caches do Service Worker.
 */
class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    const isChunkError =
      error?.name === "ChunkLoadError" ||
      /failed to fetch dynamically imported module/i.test(error?.message || "") ||
      /loading chunk/i.test(error?.message || "");
    return { hasError: isChunkError };
  }

  componentDidCatch(error) {
    const isChunkError =
      error?.name === "ChunkLoadError" ||
      /failed to fetch dynamically imported module/i.test(error?.message || "") ||
      /loading chunk/i.test(error?.message || "");

    if (!isChunkError) return;

    // Limpa caches do Service Worker e recarrega
    if ("caches" in window) {
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).finally(() => {
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="route-loading-state" style={{ textAlign: "center", padding: "40px" }}>
          Atualizando o app...
        </div>
      );
    }
    return this.props.children;
  }
}

const AppLayout = lazy(() => import("../layouts/AppLayout"));
const HomePage = lazy(() => import("../modules/home/pages/HomePage"));
const CheckoutPage = lazy(() => import("../modules/checkout/pages/CheckoutPage"));
const DashboardPage = lazy(() => import("../modules/dashboard/pages/DashboardPage"));
const WorkoutsPage = lazy(() => import("../modules/workouts/pages/WorkoutsPage"));
const NutritionPage = lazy(() => import("../modules/nutrition/pages/NutritionPage"));
const CheckinsPage = lazy(() => import("../modules/checkins/pages/CheckinsPage"));
const ChatPage = lazy(() => import("../modules/chat/pages/ChatPage"));
const SettingsPage = lazy(() => import("../modules/settings/pages/SettingsPage"));
const AdminPage    = lazy(() => import("../modules/admin/pages/AdminPage"));
const NotFoundPage = lazy(() => import("../modules/shared/pages/NotFoundPage"));

function withSuspense(element) {
  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<div className="route-loading-state">Carregando...</div>}>
        {element}
      </Suspense>
    </ChunkErrorBoundary>
  );
}

function RedirectToSettings() {
  const location = useLocation();
  return <Navigate to={`/configuracoes${location.search}${location.hash}`} replace />;
}

/**
 * Guarda de rota: redireciona para / se não houver token + usuário válidos.
 * Limpa a sessão caso apenas um dos dois esteja presente (estado corrompido).
 */
function RequireAuth({ children }) {
  const token = getApiToken();
  const user  = getStoredApiUser();

  if (!token || !user) {
    // Limpa eventual estado parcial corrompido
    if (token || user) clearApiSession();
    return <Navigate to="/" replace />;
  }

  return children;
}

export const router = createBrowserRouter(
  [
    { path: "/", element: withSuspense(<HomePage />) },
    { path: "/checkout", element: withSuspense(<CheckoutPage />) },
    {
      element: <RequireAuth>{withSuspense(<AppLayout />)}</RequireAuth>,
      children: [
        { path: "dashboard", element: withSuspense(<DashboardPage />) },

        { path: "treinos", element: withSuspense(<WorkoutsPage />) },
        { path: "treinos/historico", element: withSuspense(<WorkoutsPage />) },
        { path: "treinos/gerar", element: withSuspense(<WorkoutsPage />) },
        { path: "treinos/:workoutId", element: withSuspense(<WorkoutsPage />) },

        { path: "dietas", element: withSuspense(<NutritionPage />) },
        { path: "dietas/historico", element: withSuspense(<NutritionPage />) },
        { path: "dietas/gerar", element: withSuspense(<NutritionPage />) },
        { path: "dietas/:dietId", element: withSuspense(<NutritionPage />) },

        { path: "checkins", element: withSuspense(<CheckinsPage />) },
        { path: "checkins/novo", element: withSuspense(<CheckinsPage />) },

        { path: "chat", element: withSuspense(<ChatPage />) },

        { path: "perfil", element: <RedirectToSettings /> },
        { path: "perfil/editar", element: <RedirectToSettings /> },

        { path: "configuracoes", element: withSuspense(<SettingsPage />) },

        { path: "admin", element: withSuspense(<AdminPage />) },

        { path: "*", element: withSuspense(<NotFoundPage />) },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  }
);
