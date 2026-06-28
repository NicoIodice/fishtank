// Re-export from shared hooks � see src/hooks/useRowDetailStyle.ts
// (moved out of the activity feature to avoid cross-feature imports)
export type {
  RowDetailStyleValue,
  UseRowDetailStyleResult,
} from "@/hooks/useRowDetailStyle";
export { useRowDetailStyle } from "@/hooks/useRowDetailStyle";
