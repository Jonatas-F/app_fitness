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
  adherenceAdjustedDays = undefined,
} = {}) {
  return apiRequest(apiEndpoints.aiWorkout, {
    method: "POST",
    body: JSON.stringify({
      goal, persist, trainingAvailableDays, trainingExperience, trainingAge,
      availableMinutes, trainingPreference, trainingPreferenceFreeText,
      muscleGroupCombinations,
      ...(adherenceAdjustedDays != null ? { adherenceAdjustedDays } : {}),
    }),
  });
}
