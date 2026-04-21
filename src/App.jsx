import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/router';
import { saveApiSession } from './services/api/client';

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
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch (error) {
      console.warn("Nao foi possivel restaurar a sessao Google local.", error);
    }
  }, []);

  return <RouterProvider router={router} />;
}
