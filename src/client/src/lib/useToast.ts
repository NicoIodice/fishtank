import { useState, useCallback, useRef, useEffect } from "react";

export type ToastVariant = "error" | "success" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info", persist?: boolean) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, variant }]);
      // Error toasts persist by default; success/info auto-dismiss after 4s.
      // Explicit persist parameter overrides the default.
      const shouldPersist = persist !== undefined ? persist : variant === "error";
      if (!shouldPersist) {
        const timer = setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
          timers.current.delete(id);
        }, 4000);
        timers.current.set(id, timer);
      }
      return id;
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Cleanup all pending timers on unmount to prevent setState after unmount
  useEffect(() => {
    const currentTimers = timers.current;
    return () => {
      currentTimers.forEach((timer) => clearTimeout(timer));
      currentTimers.clear();
    };
  }, []);

  return { toasts, showToast, dismissToast };
}
