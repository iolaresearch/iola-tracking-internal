import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Applications from "./pages/Applications";
import Outreach from "./pages/Outreach";
import ActionItems from "./pages/ActionItems";
import KnowledgeBase from "./pages/KnowledgeBase";
import Alerts from "./pages/Alerts";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="applications" element={<Applications />} />
          <Route path="outreach" element={<Outreach />} />
          <Route path="action-items" element={<ActionItems />} />
          <Route path="knowledge" element={<KnowledgeBase />} />
          <Route path="alerts" element={<Alerts />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
