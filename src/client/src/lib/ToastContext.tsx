import { createContext, useContext, type ReactNode } from "react";
import { useToast, type ToastVariant } from "./useToast";
import { ToastContainer } from "@/components/ui/ToastContainer";

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, showToast, dismissToast } = useToast();
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useShowToast() {
  const ctx = useContext(ToastContext);
  // Return a no-op when rendered outside ToastProvider (e.g., isolated unit tests).
  if (!ctx) return () => {};
  return ctx.showToast;
}
