/**
 * The three areas where the user may have unsaved state:
 * - "mappings-editor": Mappings page edit mode
 * - "mocks-root-path": Settings page Mocks Root path pending state
 * - "service-modal": Add/Edit Service modal unsaved form data
 */
export type UnsavedSource =
  | "mappings-editor"
  | "mocks-root-path"
  | "service-modal";

/**
 * Maps each UnsavedSource to its user-facing label for sign-out messages.
 */
export const SOURCE_LABELS: Record<UnsavedSource, string> = {
  "mappings-editor": "the Mappings editor",
  "mocks-root-path": "an unsaved Mocks Root path",
  "service-modal": "unsaved form data",
};
