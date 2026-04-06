import { Outlet } from 'react-router-dom';
import './AppLayout.css';

export default function AppLayout() {
  return (
    <div className="app-shell">
      <main
        className="app-shell__content"
        style={{
          display: 'block',
          width: '100%',
          color: '#ffffff',
          padding: '40px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '32px' }}>Layout carregado</h1>
        <p style={{ marginTop: '12px', fontSize: '18px' }}>
          Se você está vendo este texto, o router e o layout estão funcionando.
        </p>

        <div style={{ marginTop: '32px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}