import { createBrowserRouter } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';

import DashboardPage from '../modules/dashboard/pages/DashboardPage';
import WorkoutsPage from '../modules/workouts/pages/WorkoutsPage';
import UserGymPage from '../modules/userGym/pages/UserGymPage';
import NutritionPage from '../modules/nutrition/pages/NutritionPage';
import ProgressPage from '../modules/progress/pages/ProgressPage';
import CheckinsPage from '../modules/checkins/pages/CheckinsPage';
import ChatPage from '../modules/chat/pages/ChatPage';
import ProfilePage from '../modules/profile/pages/ProfilePage';
import SettingsPage from '../modules/settings/pages/SettingsPage';
import NotFoundPage from '../modules/shared/pages/NotFoundPage';

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppLayout />,
      children: [
        { index: true, element: <DashboardPage /> },

        { path: 'treinos', element: <WorkoutsPage /> },
        { path: 'treinos/historico', element: <WorkoutsPage /> },
        { path: 'treinos/gerar', element: <WorkoutsPage /> },
        { path: 'treinos/:workoutId', element: <WorkoutsPage /> },
        { path: 'academia', element: <UserGymPage /> },

        { path: 'dietas', element: <NutritionPage /> },
        { path: 'dietas/historico', element: <NutritionPage /> },
        { path: 'dietas/gerar', element: <NutritionPage /> },
        { path: 'dietas/:dietId', element: <NutritionPage /> },

        { path: 'progresso', element: <ProgressPage /> },
        { path: 'progresso/fotos', element: <ProgressPage /> },
        { path: 'progresso/comparar', element: <ProgressPage /> },
        { path: 'progresso/bioimpedancia', element: <ProgressPage /> },
        { path: 'progresso/medidas', element: <ProgressPage /> },

        { path: 'checkins', element: <CheckinsPage /> },
        { path: 'checkins/novo', element: <CheckinsPage /> },

        { path: 'chat', element: <ChatPage /> },

        { path: 'perfil', element: <ProfilePage /> },
        { path: 'perfil/editar', element: <ProfilePage /> },

        { path: 'configuracoes', element: <SettingsPage /> },

        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  }
);
