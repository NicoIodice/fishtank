import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface SetupStatus {
  needsSetup: boolean;
}

interface FirstRunGateProps {
  children: ReactNode;
}

export function FirstRunGate({ children }: FirstRunGateProps) {
  const location = useLocation();

  const { data, isLoading } = useQuery<SetupStatus>({
    queryKey: ["setup-status"],
    queryFn: () => apiFetch<SetupStatus>("/api/setup/status"),
    staleTime: 30_000,
    retry: false,
  });

  if (isLoading) {
    return null;
  }

  const isSetupRoute = location.pathname.startsWith("/setup");

  if (data?.needsSetup && !isSetupRoute) {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
}
