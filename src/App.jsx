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

      const pendingReturnTo = sessionStorage.getItem(GOOGLE_RETURN_KEY);
      sessionStorage.removeItem(GOOGLE_RETURN_KEY);

      // Novo usuário via Google → redirecionar para checkout com aviso
      let nextPath;
      if (sessionData.is_new) {
        const base = pendingReturnTo?.startsWith("/checkout") ? pendingReturnTo : "/checkout";
        const sep  = base.includes("?") ? "&" : "?";
        nextPath = `${base}${sep}new=1`;
      } else {
        nextPath =
          pendingReturnTo && pendingReturnTo.startsWith("/") && !pendingReturnTo.startsWith("//")
            ? pendingReturnTo
            : `${window.location.pathname}${window.location.search}`;
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
