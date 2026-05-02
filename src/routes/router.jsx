import { Suspense, lazy } from "react";
import { createBrowserRouter } from "react-router-dom";

const AppLayout = lazy(() => import("../layouts/AppLayout"));
const HomePage = lazy(() => import("../modules/home/pages/HomePage"));
const CheckoutPage = lazy(() => import("../modules/checkout/pages/CheckoutPage"));
const DashboardPage = lazy(() => import("../modules/dashboard/pages/DashboardPage"));
const WorkoutsPage = lazy(() => import("../modules/workouts/pages/WorkoutsPage"));
const NutritionPage = lazy(() => import("../modules/nutrition/pages/NutritionPage"));
const CheckinsPage = lazy(() => import("../modules/checkins/pages/CheckinsPage"));
const ChatPage = lazy(() => import("../modules/chat/pages/ChatPage"));
const ProfilePage = lazy(() => import("../modules/profile/pages/ProfilePage"));
const SettingsPage = lazy(() => import("../modules/settings/pages/SettingsPage"));
const NotFoundPage = lazy(() => import("../modules/shared/pages/NotFoundPage"));

function withSuspense(element) {
  return (
    <Suspense fallback={<div className="route-loading-state">Carregando...</div>}>
      {element}
    </Suspense>
  );
}

export const router = createBrowserRouter(
  [
    { path: "/", element: withSuspense(<HomePage />) },
    { path: "/checkout", element: withSuspense(<CheckoutPage />) },
    {
      element: withSuspense(<AppLayout />),
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

        { path: "perfil", element: withSuspense(<ProfilePage />) },
        { path: "perfil/editar", element: withSuspense(<ProfilePage />) },

        { path: "configuracoes", element: withSuspense(<SettingsPage />) },

        { path: "*", element: withSuspense(<NotFoundPage />) },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  }
);
