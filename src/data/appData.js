import { ROUTE_PATHS } from '../routes/routePaths';

export const navigationItems = [
  { label: 'Dashboard',      path: ROUTE_PATHS.dashboard, iconKey: 'dashboard' },
  { label: 'Treinos',        path: ROUTE_PATHS.workouts,  iconKey: 'workouts'  },
  { label: 'Dietas',         path: ROUTE_PATHS.diets,     iconKey: 'diet'      },
  { label: 'Progresso',      path: ROUTE_PATHS.progress,  iconKey: 'progress'  },
  { label: 'Check-ins',      path: ROUTE_PATHS.checkins,  iconKey: 'checkin'   },
  { label: 'Chat IA',        path: ROUTE_PATHS.chat,      iconKey: 'chat'      },
  { label: 'Perfil',         path: ROUTE_PATHS.profile,   iconKey: 'profile'   },
  { label: 'Configurações',  path: ROUTE_PATHS.settings,  iconKey: 'settings'  },
];

export const mobileNavigationItems = [
  { shortLabel: 'Início',    path: ROUTE_PATHS.dashboard, iconKey: 'dashboard' },
  { shortLabel: 'Treinos',   path: ROUTE_PATHS.workouts,  iconKey: 'workouts'  },
  { shortLabel: 'Dietas',    path: ROUTE_PATHS.diets,     iconKey: 'diet'      },
  { shortLabel: 'Progresso', path: ROUTE_PATHS.progress,  iconKey: 'progress'  },
  { shortLabel: 'Perfil',    path: ROUTE_PATHS.profile,   iconKey: 'profile'   },
];

export const quickSummary = {
  title: 'Resumo do plano',
  items: [
    'Objetivo ativo: recomposição corporal',
    'Treinos da semana: 5 sessões',
    'Meta de água: 3,2 L por dia',
    'Próximo check-in: domingo',
  ],
};

// ─── resto do arquivo (dashboardData, workoutsViews, etc.) permanece igual ───
// Cole abaixo todo o conteúdo que estava após o quickSummary no appData.js original
