import { useState, useEffect, useCallback } from "react";
import { getStoredApiUser } from "../services/api/client";

const FIRST_CHECKIN_KEY   = "shapeCertoFirstCheckinDone";
const ONBOARDING_DONE_KEY = "shapeCertoOnboardingDone";

function readFromStorage() {
  return {
    firstCheckinDone: localStorage.getItem(FIRST_CHECKIN_KEY) === "true",
    onboardingDone:   localStorage.getItem(ONBOARDING_DONE_KEY) === "true",
  };
}

export function useOnboarding() {
  const [firstCheckinDone, setFirstCheckinDone] = useState(
    () => readFromStorage().firstCheckinDone
  );
  const [onboardingDone, setOnboardingDone] = useState(
    () => readFromStorage().onboardingDone
  );

  // Re-sync a partir do localStorage quando o usuário faz login/logout
  // Um usuário novo que acabou de logar ainda não tem a flag → modal abre automaticamente
  const syncFromStorage = useCallback(() => {
    const user = getStoredApiUser();
    if (!user) {
      // Logout: esconde tudo
      setFirstCheckinDone(true);
      setOnboardingDone(true);
      return;
    }
    // Se o admin pediu reset de onboarding para este usuário, limpa as flags
    if (user.reset_onboarding === true) {
      localStorage.removeItem(FIRST_CHECKIN_KEY);
      localStorage.removeItem(ONBOARDING_DONE_KEY);
      setFirstCheckinDone(false);
      setOnboardingDone(false);
      return;
    }
    // Login: relê as flags — usuário novo não terá nada salvo
    const { firstCheckinDone: f, onboardingDone: o } = readFromStorage();
    setFirstCheckinDone(f);
    setOnboardingDone(o);
  }, []);

  // Escuta login/logout
  useEffect(() => {
    window.addEventListener("shape-certo-auth-updated", syncFromStorage);
    return () => window.removeEventListener("shape-certo-auth-updated", syncFromStorage);
  }, [syncFromStorage]);

  // Escuta o botão admin "🔄 Testar 1º acesso" → abre modal imediatamente
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
