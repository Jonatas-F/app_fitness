import { loadCheckins } from "./checkinStorage";

const WORKOUT_EXECUTION_KEY = "shapeCertoWorkoutExecution";

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
  const letters = split.replace("Treino ", "").split("");

  return {
    weeklyTrainingDays: availability.weeklyTrainingDays,
    trainingShift: availability.trainingShift,
    split,
    workouts: letters.map((letter) => ({
      id: letter,
      title: `Treino ${letter}`,
      focus:
        letter === "A"
          ? "Peito, ombro e triceps"
          : letter === "B"
            ? "Costas e biceps"
            : letter === "C"
              ? "Pernas"
              : "Complementar",
      exercises: (defaultExercises[letter] || defaultExercises.D).map((name) => ({
        id: `${letter}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name,
        suggestedSets: "3",
        suggestedReps: "8-12",
        executionVideoUrl: "",
        userVideoFileName: "",
        aiFeedback: "",
        notes: "",
        sets: [
          { set: 1, weight: "", reps: "" },
          { set: 2, weight: "", reps: "" },
          { set: 3, weight: "", reps: "" },
        ],
      })),
    })),
    updatedAt: new Date().toISOString(),
  };
}

export function loadWorkoutExecution() {
  const raw = localStorage.getItem(WORKOUT_EXECUTION_KEY);
  return raw ? safeParse(raw, createDefaultWorkoutPlan()) : createDefaultWorkoutPlan();
}

export function saveWorkoutExecution(plan) {
  const next = {
    ...plan,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(WORKOUT_EXECUTION_KEY, JSON.stringify(next));
  return next;
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
