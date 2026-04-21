import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/router';
import { saveApiSession } from './services/api/client';

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
      saveApiSession(JSON.parse(localSession));
      const pendingReturnTo = sessionStorage.getItem(GOOGLE_RETURN_KEY);
      sessionStorage.removeItem(GOOGLE_RETURN_KEY);

      const nextPath =
        pendingReturnTo && pendingReturnTo.startsWith("/") && !pendingReturnTo.startsWith("//")
          ? pendingReturnTo
          : `${window.location.pathname}${window.location.search}`;

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

  return <RouterProvider router={router} />;
}
