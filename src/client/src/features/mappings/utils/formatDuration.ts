/**
 * Formats a duration in milliseconds to a human-readable string.
 *
 * Rules (AC-5):
 *   < 10,000 ms            → "{N}ms"       e.g. "850ms"
 *   ≥ 10,000 ms < 60,000ms → "{N.X}s"      e.g. "12.5s"
 *   ≥ 60,000 ms            → "{M}m {S}s"   e.g. "2m 3s"
 */
export function formatDuration(elapsedMs: number): string {
  if (elapsedMs < 10_000) {
    return `${Math.round(elapsedMs)}ms`;
  }
  const seconds = elapsedMs / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}
