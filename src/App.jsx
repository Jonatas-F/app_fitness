import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import CadastroPage from "./pages/auth/CadastroPage";
import LoginPage from "./pages/auth/LoginPage";
import HomePage from "./pages/public/HomePage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />
      <Route path="/app" element={<AppShell />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;