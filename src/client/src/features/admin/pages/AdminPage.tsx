import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AdminConsolePage } from "./AdminConsolePage";

/**
 * AdminPage wrapper with role guard (AC-1).
 * Redirects Standard Users to /services.
 * Renders AdminConsolePage for Admin role users.
 */
export function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role !== "Admin") {
      navigate("/services", { replace: true });
    }
  }, [user, navigate]);

  // While checking auth or if not Admin, render nothing (redirect happens in useEffect)
  if (!user || user.role !== "Admin") {
    return null;
  }

  return <AdminConsolePage />;
}
