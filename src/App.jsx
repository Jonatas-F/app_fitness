import { useEffect } from "react";
import Lenis from "lenis";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes/router";
import { saveApiSession } from "./services/api/client";

const GOOGLE_RETURN_KEY = "shapeCertoGoogleReturnTo";

export default function App() {
  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const localSession = params.get("local_session");

    if (!localSession) {
      return;
    }

    try {
      const sessionData = JSON.parse(localSession);
      saveApiSession(sessionData);

      // Destino salvo antes de ir ao Google (ex.: checkout de um plano clicado)
      const pendingReturnTo = sessionStorage.getItem("shapeCertoPostLoginRedirect");
      sessionStorage.removeItem("shapeCertoPostLoginRedirect");
      // Legado — limpa a chave antiga também
      sessionStorage.removeItem(GOOGLE_RETURN_KEY);

      // Parceiros e admins nunca vão ao checkout independente do is_new
      const isPrivileged = ["partner", "admin"].includes(sessionData.plan_type);

      // Sem plano ativo → redirecionar para checkout com aviso
      let nextPath;
      if (!isPrivileged && (sessionData.is_new || sessionData.has_active_plan === false)) {
        const base = pendingReturnTo?.startsWith("/checkout") ? pendingReturnTo : "/checkout?plan=basico&cycle=monthly";
        const sep  = base.includes("?") ? "&" : "?";
        const flag = sessionData.is_new ? "new=1" : "no_plan=1";
        nextPath = `${base}${sep}${flag}`;
      } else {
        nextPath =
          pendingReturnTo && pendingReturnTo.startsWith("/") && !pendingReturnTo.startsWith("//")
            ? pendingReturnTo
            : "/dashboard";
      }

      const currentPath = `${window.location.pathname}${window.location.search}`;

      if (nextPath !== currentPath) {
        window.location.replace(nextPath);
        return;
      }

      window.history.replaceState(null, "", nextPath);
    } catch (error) {
      console.warn("Nao foi possivel restaurar a sessao Google local.", error);
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (media.matches) {
      return undefined;
    }

    const lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
      syncTouch: false,
    });

    let frame = 0;
    const raf = (time) => {
      lenis.raf(time);
      frame = window.requestAnimationFrame(raf);
    };

    frame = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return <RouterProvider router={router} />;
}
