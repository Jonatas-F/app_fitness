import { apiEndpoints } from "../api/endpoints";
import { apiRequest } from "../api/client";

function dispatchTokensUpdated() {
  window.dispatchEvent(new CustomEvent("shape-certo-tokens-updated"));
}

export async function generateWorkoutWithAi({
  goal = "",
  persist = false,
  trainingAvailableDays = "",
  trainingExperience = "",
  trainingAge = "",
  availableMinutes = "",
  trainingPreference = "",
  trainingPreferenceFreeText = "",
  muscleGroupCombinations = "",
  workoutDayProtocol = "",
  favoriteExercises = "",
  adherenceAdjustedDays = undefined,
  // monthly protocol review fields
  keepWorkoutProtocol = "",
  lastProtocolFeeling = "",
  muscularSoreness = "",
  generalDisposition = "",
  laggingMuscleGroups = "",
  requestedWorkoutChanges = "",
} = {}) {
  const result = await apiRequest(apiEndpoints.aiWorkout, {
    method: "POST",
    body: JSON.stringify({
      goal, persist, trainingAvailableDays, trainingExperience, trainingAge,
      availableMinutes, trainingPreference, trainingPreferenceFreeText,
      muscleGroupCombinations, workoutDayProtocol, favoriteExercises,
      keepWorkoutProtocol, lastProtocolFeeling, muscularSoreness,
      generalDisposition, laggingMuscleGroups, requestedWorkoutChanges,
      ...(adherenceAdjustedDays != null ? { adherenceAdjustedDays } : {}),
    }),
  });
  dispatchTokensUpdated();
  return result;
}
