import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/router/ProtectedRoute";
import { FirstRunGate } from "@/components/router/FirstRunGate";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { SetupPage } from "@/features/auth/pages/SetupPage";
import { ChangePasswordPage } from "@/features/auth/pages/ChangePasswordPage";
import { ServicesPage } from "@/features/services/pages/ServicesPage";
import { ActivityPage } from "@/features/activity/pages/ActivityPage";
import { MappingsPage } from "@/features/mappings/pages/MappingsPage";
import { EventsPage } from "@/features/events/pages/EventsPage";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";
import { AdminPage } from "@/features/admin/pages/AdminPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <FirstRunGate>
        <LoginPage />
      </FirstRunGate>
    ),
  },
  {
    path: "/setup",
    element: <SetupPage />,
  },
  {
    path: "/setup/change-password",
    element: (
      <ProtectedRoute>
        <ChangePasswordPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/",
    element: (
      <FirstRunGate>
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      </FirstRunGate>
    ),
    children: [
      { index: true, element: <Navigate to="/services" replace /> },
      { path: "services", element: <ServicesPage /> },
      { path: "activity", element: <ActivityPage /> },
      { path: "mappings", element: <MappingsPage /> },
      { path: "events", element: <EventsPage /> },
      { path: "settings/*", element: <SettingsPage /> },
      { path: "admin", element: <AdminPage /> },
    ],
  },
]);
