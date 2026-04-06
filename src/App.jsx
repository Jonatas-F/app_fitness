import { BrowserRouter, Routes, Route } from 'react-router-dom';

function TestPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#111111',
        color: '#ffffff',
        padding: '40px',
        fontSize: '32px',
      }}
    >
      BrowserRouter funcionando
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<TestPage />} />
      </Routes>
    </BrowserRouter>
  );
}