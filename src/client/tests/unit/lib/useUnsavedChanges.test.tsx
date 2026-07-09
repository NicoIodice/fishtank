import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  UnsavedChangesProvider,
  useUnsavedChanges,
} from "@/hooks/useUnsavedChanges";
import type { ReactNode } from "react";

/**
 * ATDD component tests for useUnsavedChanges hook — Story 4.6
 *
 * RED PHASE scaffolds covering:
 *   - Global unsaved state context and hook functionality
 *   - Register/clear unsaved sources
 *   - Dynamic sign-out message generation with 1, 2, and 3 sources
 *   - Context provider enforcement
 *
 * ACs covered:
 *   AC-4  — Sign-out with unsaved Mapping edits shows confirmation
 *   AC-5  — Sign-out with pending Mocks Root path shows confirmation
 *   AC-6  — Sign-out with both Mapping edits AND Mocks Root path
 *   AC-7  — Sign-out with in-progress Service modal
 *   AC-8  — Sign-out with all three unsaved states
 *   AC-9  — Sign-out with no unsaved state proceeds immediately
 *
 * These tests verify the global unsaved state tracking mechanism works correctly
 * and generates appropriate sign-out confirmation messages based on active sources.
 */

// Wrapper component for hook testing
const wrapper = ({ children }: { children: ReactNode }) => (
  <UnsavedChangesProvider>{children}</UnsavedChangesProvider>
);

describe("useUnsavedChanges hook", () => {
  it("throws error when used outside provider", () => {
    // AC: Context enforcement
    // EXPECTED: Error with "useUnsavedChanges must be used within UnsavedChangesProvider"
    // ACTUAL: Hook does not exist yet — this test will FAIL (RED)
    expect(() => {
      renderHook(() => useUnsavedChanges());
    }).toThrow("useUnsavedChanges must be used within UnsavedChangesProvider");
  });

  it("starts with no unsaved sources", () => {
    // AC-9: No unsaved state means sign-out proceeds immediately
    // EXPECTED: hasAnyUnsaved = false, getSignOutMessage() = null
    // ACTUAL: Hook does not exist yet — this test will FAIL (RED)
    const { result } = renderHook(() => useUnsavedChanges(), { wrapper });

    expect(result.current.hasAnyUnsaved).toBe(false);
    expect(result.current.getSignOutMessage()).toBeNull();
    expect(result.current.unsavedSources.size).toBe(0);
  });

  it("registers and clears a single unsaved source (mappings-editor)", () => {
    // AC-4: Sign-out with unsaved Mapping edits
    // EXPECTED: registerUnsaved adds source, clearUnsaved removes it
    // ACTUAL: Hook does not exist yet — this test will FAIL (RED)
    const { result } = renderHook(() => useUnsavedChanges(), { wrapper });

    act(() => {
      result.current.registerUnsaved("mappings-editor");
    });

    expect(result.current.hasAnyUnsaved).toBe(true);
    expect(result.current.unsavedSources.has("mappings-editor")).toBe(true);
    expect(result.current.getSignOutMessage()).toBe(
      "You have unsaved changes in the Mappings editor. Sign out now? Unsaved changes will be lost.",
    );

    act(() => {
      result.current.clearUnsaved("mappings-editor");
    });

    expect(result.current.hasAnyUnsaved).toBe(false);
    expect(result.current.getSignOutMessage()).toBeNull();
  });

  it("generates correct message for pending Mocks Root path", () => {
    // AC-5: Sign-out with pending Mocks Root path
    // EXPECTED: Message includes "unsaved Mocks Root path"
    // ACTUAL: Hook does not exist yet — this test will FAIL (RED)
    const { result } = renderHook(() => useUnsavedChanges(), { wrapper });

    act(() => {
      result.current.registerUnsaved("mocks-root-path");
    });

    expect(result.current.getSignOutMessage()).toBe(
      "You have an unsaved Mocks Root path. Sign out now? Unsaved changes will be lost.",
    );
  });

  it("generates correct message for in-progress Service modal", () => {
    // AC-7: Sign-out with in-progress Add/Edit Service modal
    // EXPECTED: Message includes "unsaved form data"
    // ACTUAL: Hook does not exist yet — this test will FAIL (RED)
    const { result } = renderHook(() => useUnsavedChanges(), { wrapper });

    act(() => {
      result.current.registerUnsaved("service-modal");
    });

    expect(result.current.getSignOutMessage()).toBe(
      "You have unsaved form data. Sign out now? Unsaved changes will be lost.",
    );
  });

  it("combines two sources in correct order (Mapping + Mocks Root)", () => {
    // AC-6: Sign-out with both Mapping edits AND Mocks Root path
    // EXPECTED: Message combines both in order: Mappings editor → Mocks Root path
    // ACTUAL: Hook does not exist yet — this test will FAIL (RED)
    const { result } = renderHook(() => useUnsavedChanges(), { wrapper });

    act(() => {
      result.current.registerUnsaved("mappings-editor");
      result.current.registerUnsaved("mocks-root-path");
    });

    expect(result.current.getSignOutMessage()).toBe(
      "You have unsaved changes in the Mappings editor and an unsaved Mocks Root path. Sign out now? Unsaved changes will be lost.",
    );
  });

  it("combines all three sources in correct order", () => {
    // AC-8: Sign-out with all three unsaved states
    // EXPECTED: Message combines all in order: Mappings → Mocks Root → form data
    // ACTUAL: Hook does not exist yet — this test will FAIL (RED)
    const { result } = renderHook(() => useUnsavedChanges(), { wrapper });

    act(() => {
      result.current.registerUnsaved("mappings-editor");
      result.current.registerUnsaved("mocks-root-path");
      result.current.registerUnsaved("service-modal");
    });

    expect(result.current.getSignOutMessage()).toBe(
      "You have unsaved changes in the Mappings editor, an unsaved Mocks Root path, and unsaved form data. Sign out now? Unsaved changes will be lost.",
    );
  });

  it("handles idempotent registration (same source twice)", () => {
    // Edge case: Registering the same source multiple times should not duplicate
    // EXPECTED: Set semantics — single entry per source
    // ACTUAL: Hook does not exist yet — this test will FAIL (RED)
    const { result } = renderHook(() => useUnsavedChanges(), { wrapper });

    act(() => {
      result.current.registerUnsaved("mappings-editor");
      result.current.registerUnsaved("mappings-editor");
    });

    expect(result.current.unsavedSources.size).toBe(1);
    expect(result.current.hasAnyUnsaved).toBe(true);
  });

  it("handles clearing a source that was never registered", () => {
    // Edge case: Clearing non-existent source should be safe no-op
    // EXPECTED: No error, state unchanged
    // ACTUAL: Hook does not exist yet — this test will FAIL (RED)
    const { result } = renderHook(() => useUnsavedChanges(), { wrapper });

    act(() => {
      result.current.clearUnsaved("mappings-editor");
    });

    expect(result.current.hasAnyUnsaved).toBe(false);
    expect(result.current.getSignOutMessage()).toBeNull();
  });
});
