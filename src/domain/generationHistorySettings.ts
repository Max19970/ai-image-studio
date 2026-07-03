export const defaultMaxStoredGenerationTasks = 1000;
export const minStoredGenerationTasks = 1;
export const maxStoredGenerationTasks = 10000;

export function normalizeMaxStoredGenerationTasks(
  value: unknown,
  fallback = defaultMaxStoredGenerationTasks
): number {
  const numeric = Math.floor(Number(value));
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(maxStoredGenerationTasks, Math.max(minStoredGenerationTasks, numeric));
}
