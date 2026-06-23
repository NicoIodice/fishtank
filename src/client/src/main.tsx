import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { ToastProvider } from "./lib/ToastContext";
import { router } from "./router";
import "./styles/theme.css";
import "./styles/globals.css";
import "bootstrap-icons/font/bootstrap-icons.css";

// Apply initial theme: read localStorage → fallback to prefers-color-scheme
try {
  const stored = localStorage.getItem("fishtank-theme");
  if (stored) {
    document.documentElement.dataset.theme = stored;
  } else {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    document.documentElement.dataset.theme = prefersDark
      ? "deep-ocean"
      : "clean-light";
  }
} catch {
  // localStorage unavailable (sandboxed iframe, strict privacy mode)
  document.documentElement.dataset.theme = "clean-light";
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
