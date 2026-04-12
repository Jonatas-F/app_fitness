import { loadCheckins } from "./checkinStorage";

const WORKOUT_EXECUTION_KEY = "shapeCertoWorkoutExecution";
const WORKOUT_SESSION_HISTORY_KEY = "shapeCertoWorkoutSessionHistory";

const defaultExercises = {
  A: [
    "Supino maquina",
    "Chest press",
    "Desenvolvimento maquina",
    "Triceps extension machine",
  ],
  B: ["Puxada alta", "Remada baixa", "Pullover machine", "Biceps curl machine"],
  C: ["Leg press 45°", "Cadeira extensora", "Mesa flexora", "Panturrilha sentada"],
  D: ["Hip thrust machine", "Abdutora", "Reverse fly machine", "Abdominal crunch machine"],
  E: ["Shoulder press", "Lateral raise machine", "Shrug machine", "Rotary torso"],
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

export function resolveWorkoutSplit(days) {
  const numericDays = Number(days || 4);

  if (numericDays <= 3) return "ABC";
  if (numericDays === 4) return "ABCD";
  if (numericDays === 5) return "ABCDE";
  return "ABCDEF";
}

export function createDefaultWorkoutPlan() {
  const availability = latestTrainingAvailability();
  const split = resolveWorkoutSplit(availability.weeklyTrainingDays);
  const enabledLetters = split.replace("Treino ", "").split("");
  const letters = ["A", "B", "C", "D", "E"];

  return {
    weeklyTrainingDays: availability.weeklyTrainingDays,
    trainingShift: availability.trainingShift,
    split,
    workouts: letters.map((letter) => ({
      id: letter,
      title: `Treino ${letter}`,
      enabled: enabledLetters.includes(letter),
      focus:
        letter === "A"
          ? "Peito, ombro e triceps"
          : letter === "B"
            ? "Costas e biceps"
            : letter === "C"
              ? "Pernas"
              : letter === "D"
                ? "Gluteos, posterior e complementares"
                : "Acessorios e condicionamento",
      exercises: (defaultExercises[letter] || defaultExercises.D).map((name) => ({
        id: `${letter}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name,
        suggestedSets: "3",
        suggestedReps: "8-12",
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
      })),
    })),
    updatedAt: new Date().toISOString(),
  };
}

export function loadWorkoutExecution() {
  const raw = localStorage.getItem(WORKOUT_EXECUTION_KEY);
  const parsed = raw ? safeParse(raw, createDefaultWorkoutPlan()) : createDefaultWorkoutPlan();
  const fallback = createDefaultWorkoutPlan();
  const existingById = new Map((parsed.workouts || []).map((workout) => [workout.id, workout]));
  const enabledLetters = String(parsed.split || fallback.split).split("");

  return {
    ...fallback,
    ...parsed,
    workouts: fallback.workouts.map((fallbackWorkout) => {
      const existing = existingById.get(fallbackWorkout.id);

      return {
        ...fallbackWorkout,
        ...existing,
        enabled:
          typeof existing?.enabled === "boolean"
            ? existing.enabled
            : enabledLetters.includes(fallbackWorkout.id),
        exercises: (existing?.exercises?.length ? existing.exercises : fallbackWorkout.exercises).map(
          (exercise) => {
            const prescribedSets = Number(exercise.suggestedSets || 3);
            const existingSets = Array.isArray(exercise.sets) ? exercise.sets : [];

            return {
              ...exercise,
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

export function saveWorkoutSession(workout) {
  const history = loadWorkoutSessionHistory();
  const session = {
    id: `session-${workout.id}-${Date.now()}`,
    workoutId: workout.id,
    workoutTitle: workout.title,
    createdAt: new Date().toISOString(),
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
  return updated;
}

export function getPreviousWorkoutSession(workoutId) {
  return loadWorkoutSessionHistory().find((session) => session.workoutId === workoutId);
}

export function getWorkoutDashboardSummary(plan = loadWorkoutExecution()) {
  const exercises = plan.workouts.flatMap((workout) => workout.exercises);
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
    workoutCount: plan.workouts.length,
    exerciseCount: exercises.length,
    completedSets: completedSets.length,
    maxWeight: weights.length ? Math.max(...weights) : 0,
  };
}
