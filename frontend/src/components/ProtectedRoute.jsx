import { Navigate } from "react-router-dom";
import { useAuthContext } from "../hooks/useAuthContext";
import { usePermission } from "../hooks/usePermission";
import { LoadingScreen } from "../components/ui";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuthContext();
  const { isAdmin } = usePermission();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (adminOnly && !isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
