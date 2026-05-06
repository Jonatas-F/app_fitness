import { apiEndpoints } from "../api/endpoints";
import { apiRequest } from "../api/client";

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
  return apiRequest(apiEndpoints.aiWorkout, {
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
}
