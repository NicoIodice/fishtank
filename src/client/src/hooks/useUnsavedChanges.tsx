import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { UnsavedSource } from "@/types/unsavedChanges";
import { SOURCE_LABELS } from "@/types/unsavedChanges";

interface UnsavedChangesContextValue {
  /** Current set of unsaved state sources */
  unsavedSources: Set<UnsavedSource>;
  /** Register an unsaved state source */
  registerUnsaved: (source: UnsavedSource) => void;
  /** Unregister an unsaved state source */
  clearUnsaved: (source: UnsavedSource) => void;
  /** Check if any unsaved state exists */
  hasAnyUnsaved: boolean;
  /** Get human-readable message for sign-out dialog */
  getSignOutMessage: () => string | null;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(
  null,
);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [unsavedSources, setUnsavedSources] = useState<Set<UnsavedSource>>(
    new Set(),
  );

  const registerUnsaved = useCallback((source: UnsavedSource) => {
    setUnsavedSources((prev) => new Set(prev).add(source));
  }, []);

  const clearUnsaved = useCallback((source: UnsavedSource) => {
    setUnsavedSources((prev) => {
      const next = new Set(prev);
      next.delete(source);
      return next;
    });
  }, []);

  const hasAnyUnsaved = unsavedSources.size > 0;

  const getSignOutMessage = useCallback((): string | null => {
    if (unsavedSources.size === 0) return null;

    const parts: string[] = [];
    if (unsavedSources.has("mappings-editor")) {
      parts.push(`unsaved changes in ${SOURCE_LABELS["mappings-editor"]}`);
    }
    if (unsavedSources.has("mocks-root-path")) {
      parts.push(SOURCE_LABELS["mocks-root-path"]);
    }
    if (unsavedSources.has("service-modal")) {
      parts.push(SOURCE_LABELS["service-modal"]);
    }

    // Build combined message
    if (parts.length === 1) {
      return `You have ${parts[0]}. Sign out now? Unsaved changes will be lost.`;
    }
    if (parts.length === 2) {
      return `You have ${parts[0]} and ${parts[1]}. Sign out now? Unsaved changes will be lost.`;
    }
    // 3 sources
    return `You have ${parts[0]}, ${parts[1]}, and ${parts[2]}. Sign out now? Unsaved changes will be lost.`;
  }, [unsavedSources]);

  const value: UnsavedChangesContextValue = {
    unsavedSources,
    registerUnsaved,
    clearUnsaved,
    hasAnyUnsaved,
    getSignOutMessage,
  };

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUnsavedChanges() {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx)
    throw new Error(
      "useUnsavedChanges must be used within UnsavedChangesProvider",
    );
  return ctx;
}
