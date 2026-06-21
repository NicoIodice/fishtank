import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null; // or a loading spinner; keep it simple for now
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (
    user.forcePasswordChange &&
    location.pathname !== "/setup/change-password"
  ) {
    return <Navigate to="/setup/change-password" replace />;
  }

  return <>{children}</>;
}
