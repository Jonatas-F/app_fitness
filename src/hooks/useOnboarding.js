import { useState, useEffect } from "react";

const FIRST_CHECKIN_KEY  = "shapeCertoFirstCheckinDone";
const ONBOARDING_DONE_KEY = "shapeCertoOnboardingDone";

export function useOnboarding() {
  const [firstCheckinDone, setFirstCheckinDone] = useState(
    () => localStorage.getItem(FIRST_CHECKIN_KEY) === "true"
  );
  const [onboardingDone, setOnboardingDone] = useState(
    () => localStorage.getItem(ONBOARDING_DONE_KEY) === "true"
  );

  // Listen for admin reset event
  useEffect(() => {
    function onReset() {
      setFirstCheckinDone(false);
      setOnboardingDone(false);
    }
    window.addEventListener("shape-certo-reset-onboarding", onReset);
    return () => window.removeEventListener("shape-certo-reset-onboarding", onReset);
  }, []);

  function completeFirstCheckin() {
    localStorage.setItem(FIRST_CHECKIN_KEY, "true");
    setFirstCheckinDone(true);
  }
  function completeOnboarding() {
    localStorage.setItem(ONBOARDING_DONE_KEY, "true");
    setOnboardingDone(true);
  }
  function resetOnboarding() {
    localStorage.removeItem(FIRST_CHECKIN_KEY);
    localStorage.removeItem(ONBOARDING_DONE_KEY);
    setFirstCheckinDone(false);
    setOnboardingDone(false);
  }

  return {
    showFirstCheckin: !firstCheckinDone,
    showTour: firstCheckinDone && !onboardingDone,
    completeFirstCheckin,
    completeOnboarding,
    resetOnboarding,
  };
}
