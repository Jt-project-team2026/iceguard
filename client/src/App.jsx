import { Navigate, Route, Routes } from "react-router-dom";
import UserPage from "./pages/UserPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<UserPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
