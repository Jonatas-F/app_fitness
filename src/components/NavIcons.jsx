/* Ícones SVG stroke — estilo PrismaFlow (sem fill, só contorno) */
const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function IconDashboard({ stroke = 'currentColor' }) {
  return (
    <svg {...base} stroke={stroke}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconWorkouts({ stroke = 'currentColor' }) {
  return (
    <svg {...base} stroke={stroke}>
      <path d="M6 4v16M18 4v16" />
      <path d="M3 8h3M18 8h3M3 16h3M18 16h3" />
      <path d="M9 12h6" />
    </svg>
  );
}

export function IconDiet({ stroke = 'currentColor' }) {
  return (
    <svg {...base} stroke={stroke}>
      <path d="M12 2a7 7 0 0 1 7 7c0 4-3 6.5-3 9H8c0-2.5-3-5-3-9a7 7 0 0 1 7-7z" />
      <path d="M8.5 18h7" />
      <path d="M9 21h6" />
    </svg>
  );
}

export function IconProgress({ stroke = 'currentColor' }) {
  return (
    <svg {...base} stroke={stroke}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

export function IconCheckin({ stroke = 'currentColor' }) {
  return (
    <svg {...base} stroke={stroke}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

export function IconChat({ stroke = 'currentColor' }) {
  return (
    <svg {...base} stroke={stroke}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 10h8M8 14h5" strokeWidth={1.4} />
    </svg>
  );
}

export function IconProfile({ stroke = 'currentColor' }) {
  return (
    <svg {...base} stroke={stroke}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

export function IconSettings({ stroke = 'currentColor' }) {
  return (
    <svg {...base} stroke={stroke}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export const NAV_ICONS = {
  dashboard:    IconDashboard,
  workouts:     IconWorkouts,
  diet:         IconDiet,
  progress:     IconProgress,
  checkin:      IconCheckin,
  chat:         IconChat,
  profile:      IconProfile,
  settings:     IconSettings,
};
