import { loadCheckins, saveCheckin } from "./checkinStorage";

const WORKOUT_EXECUTION_KEY = "shapeCertoWorkoutExecution";
const WORKOUT_SESSION_HISTORY_KEY = "shapeCertoWorkoutSessionHistory";

const weekDayWorkouts = [
  {
    id: "monday",
    title: "Segunda-feira",
    shortTitle: "Segunda",
    focus: "Peito, ombro e triceps",
  },
  {
    id: "tuesday",
    title: "Terca-feira",
    shortTitle: "Terca",
    focus: "Costas e biceps",
  },
  {
    id: "wednesday",
    title: "Quarta-feira",
    shortTitle: "Quarta",
    focus: "Pernas",
  },
  {
    id: "thursday",
    title: "Quinta-feira",
    shortTitle: "Quinta",
    focus: "Gluteos, posterior e complementares",
  },
  {
    id: "friday",
    title: "Sexta-feira",
    shortTitle: "Sexta",
    focus: "Acessorios e condicionamento",
  },
  {
    id: "saturday",
    title: "Sabado",
    shortTitle: "Sabado",
    focus: "Full body tecnico",
  },
  {
    id: "sunday",
    title: "Domingo",
    shortTitle: "Domingo",
    focus: "Mobilidade, core e recuperacao ativa",
  },
];

const defaultExercises = {
  monday: [
    "Supino maquina",
    "Chest press",
    "Desenvolvimento maquina",
    "Triceps extension machine",
  ],
  tuesday: ["Puxada alta", "Remada baixa", "Pullover machine", "Biceps curl machine"],
  wednesday: ["Leg press 45", "Cadeira extensora", "Mesa flexora", "Panturrilha sentada"],
  thursday: ["Hip thrust machine", "Abdutora", "Reverse fly machine", "Abdominal crunch machine"],
  friday: ["Shoulder press", "Lateral raise machine", "Shrug machine", "Rotary torso"],
  saturday: ["Leg press horizontal", "Chest press", "Seated row", "Abdominal crunch machine"],
  sunday: ["Rotary torso", "Roman chair", "Back extension machine", "Functional trainer"],
};

function safeParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function latestTrainingAvailability() {
  const latest = loadCheckins().find(
    (item) => item.status !== "missed" && (item.weeklyTrainingDays || item.trainingShift)
  );

  return {
    weeklyTrainingDays: latest?.weeklyTrainingDays || "4",
    trainingShift: latest?.trainingShift || "",
  };
}

function normalizeWeeklyTrainingDays(days) {
  const numericDays = Number(days || 4);
  return Math.min(Math.max(numericDays || 4, 1), 7);
}

export function resolveWorkoutSplit(days) {
  const safeDays = normalizeWeeklyTrainingDays(days);
  return `${safeDays} dia${safeDays === 1 ? "" : "s"} por semana`;
}

function createExercise(dayId, name) {
  return {
    id: `${dayId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name,
    suggestedSets: "3",
    suggestedReps: "8-12",
    restSeconds: 90,
    executionVideoUrl: "",
    userVideoFileName: "",
    aiFeedback: "",
    notes: "",
    sets: Array.from({ length: 5 }, (_, index) => ({
      set: index + 1,
      enabled: index < 3,
      weight: "",
      reps: "",
    })),
  };
}

export function createDefaultWorkoutPlan() {
  const availability = latestTrainingAvailability();
  const enabledCount = normalizeWeeklyTrainingDays(availability.weeklyTrainingDays);

  return {
    weeklyTrainingDays: String(enabledCount),
    trainingShift: availability.trainingShift,
    split: resolveWorkoutSplit(enabledCount),
    workouts: weekDayWorkouts.map((day, dayIndex) => ({
      id: day.id,
      title: day.title,
      shortTitle: day.shortTitle,
      enabled: dayIndex < enabledCount,
      focus: day.focus,
      exercises: (defaultExercises[day.id] || defaultExercises.thursday).map((name) =>
        createExercise(day.id, name)
      ),
    })),
    updatedAt: new Date().toISOString(),
  };
}

export function loadWorkoutExecution() {
  const raw = localStorage.getItem(WORKOUT_EXECUTION_KEY);
  const parsed = raw ? safeParse(raw, createDefaultWorkoutPlan()) : createDefaultWorkoutPlan();
  const fallback = createDefaultWorkoutPlan();
  const existingById = new Map((parsed.workouts || []).map((workout) => [workout.id, workout]));
  const enabledCount = normalizeWeeklyTrainingDays(
    parsed.weeklyTrainingDays || fallback.weeklyTrainingDays
  );

  return {
    ...fallback,
    ...parsed,
    weeklyTrainingDays: String(enabledCount),
    split: resolveWorkoutSplit(enabledCount),
    workouts: fallback.workouts.map((fallbackWorkout, workoutIndex) => {
      const existing = existingById.get(fallbackWorkout.id);

      return {
        ...fallbackWorkout,
        ...existing,
        enabled:
          typeof existing?.enabled === "boolean" ? existing.enabled : workoutIndex < enabledCount,
        exercises: (existing?.exercises?.length ? existing.exercises : fallbackWorkout.exercises).map(
          (exercise) => {
            const prescribedSets = Number(exercise.suggestedSets || 3);
            const existingSets = Array.isArray(exercise.sets) ? exercise.sets : [];

            return {
              ...exercise,
              restSeconds: Number(exercise.restSeconds || 90),
              sets: Array.from({ length: 5 }, (_, index) => ({
                set: index + 1,
                enabled:
                  typeof existingSets[index]?.enabled === "boolean"
                    ? existingSets[index].enabled
                    : index < prescribedSets,
                weight: existingSets[index]?.weight || "",
                reps: existingSets[index]?.reps || "",
              })),
            };
          }
        ),
      };
    }),
  };
}

export function saveWorkoutExecution(plan) {
  const next = {
    ...plan,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(WORKOUT_EXECUTION_KEY, JSON.stringify(next));
  return next;
}

export function loadWorkoutSessionHistory() {
  const raw = localStorage.getItem(WORKOUT_SESSION_HISTORY_KEY);
  const parsed = raw ? safeParse(raw, []) : [];
  return Array.isArray(parsed) ? parsed : [];
}

export function saveWorkoutSession(workout, options = {}) {
  const history = loadWorkoutSessionHistory();
  const createdAt = new Date().toISOString();
  const session = {
    id: `session-${workout.id}-${Date.now()}`,
    workoutId: workout.id,
    workoutTitle: workout.title,
    startedAt: options.startedAt || createdAt,
    createdAt,
    exercises: workout.exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      sets: exercise.sets.map((set) => ({
        set: set.set,
        enabled: set.enabled !== false,
        weight: set.weight || "",
        reps: set.reps || "",
      })),
    })),
  };

  const updated = [session, ...history];
  localStorage.setItem(WORKOUT_SESSION_HISTORY_KEY, JSON.stringify(updated));
  saveCheckin(
    {
      cadence: "daily",
      trainingPerformance: "realizado",
      adherence: "100",
      protocolAction: "monitor",
      notes: `${workout.title} finalizado. Sessao registrada pelo treino atual.`,
      photos: [],
    },
    {
      createdAt,
      allowMultiplePerDay: true,
    }
  );
  return updated;
}

export function getPreviousWorkoutSession(workoutId) {
  return loadWorkoutSessionHistory().find((session) => session.workoutId === workoutId);
}

export function getWorkoutDashboardSummary(plan = loadWorkoutExecution()) {
  const enabledWorkouts = plan.workouts.filter((workout) => workout.enabled);
  const exercises = enabledWorkouts.flatMap((workout) => workout.exercises);
  const completedSets = exercises.flatMap((exercise) =>
    exercise.sets.filter((set) => set.weight || set.reps)
  );
  const weights = completedSets
    .map((set) => Number(String(set.weight).replace(",", ".")))
    .filter((value) => Number.isFinite(value) && value > 0);

  return {
    split: plan.split,
    weeklyTrainingDays: plan.weeklyTrainingDays,
    trainingShift: plan.trainingShift || "--",
    workoutCount: enabledWorkouts.length,
    exerciseCount: exercises.length,
    completedSets: completedSets.length,
    maxWeight: weights.length ? Math.max(...weights) : 0,
  };
}
