import type { GenerationTask } from './generationTask';

export interface GenerationTasksEvent {
  revision: number;
  tasks: GenerationTask[];
}

export interface GenerationTasksDeltaEvent {
  revision: number;
  taskIds?: string[];
  upserted: GenerationTask[];
  deletedIds: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isGenerationTaskLike(value: unknown): value is GenerationTask {
  return isRecord(value) && typeof value.id === 'string';
}

function readGenerationTasks(value: unknown): GenerationTask[] | null {
  if (!Array.isArray(value)) return null;
  return value.every(isGenerationTaskLike) ? value : null;
}

function readTaskIds(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : undefined;
}

function readDeletedIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((id): id is string => typeof id === 'string');
}

export function parseGenerationTasksEventData(rawData: string): GenerationTasksEvent | null {
  try {
    const data = JSON.parse(rawData) as { revision?: unknown; tasks?: unknown };
    const tasks = readGenerationTasks(data.tasks);
    if (!tasks) return null;
    return {
      revision: typeof data.revision === 'number' ? data.revision : 0,
      tasks
    };
  } catch {
    return null;
  }
}

export function parseGenerationTasksDeltaEventData(rawData: string): GenerationTasksDeltaEvent | null {
  try {
    const data = JSON.parse(rawData) as { revision?: unknown; taskIds?: unknown; upserted?: unknown; deletedIds?: unknown };
    const upserted = readGenerationTasks(data.upserted);
    const deletedIds = readDeletedIds(data.deletedIds);
    if (typeof data.revision !== 'number' || !upserted || !deletedIds) return null;
    return {
      revision: data.revision,
      ...(Array.isArray(data.taskIds) ? { taskIds: readTaskIds(data.taskIds) ?? [] } : {}),
      upserted,
      deletedIds
    };
  } catch {
    return null;
  }
}

function applyUnorderedTasksDelta(current: GenerationTask[], delta: GenerationTasksDeltaEvent): GenerationTask[] {
  const deletedIds = new Set(delta.deletedIds);
  const upsertedById = new Map(delta.upserted.map((task) => [task.id, task]));
  const nextTasks = current.flatMap((task) => {
    if (deletedIds.has(task.id)) return [];
    return [upsertedById.get(task.id) ?? task];
  });
  const nextIds = new Set(nextTasks.map((task) => task.id));
  const newTasks = delta.upserted.filter((task) => !nextIds.has(task.id));
  return [...newTasks, ...nextTasks];
}

export function applyGenerationTasksDelta(current: GenerationTask[], delta: GenerationTasksDeltaEvent): GenerationTask[] {
  if (delta.taskIds === undefined) return applyUnorderedTasksDelta(current, delta);

  const tasksById = new Map(current.map((task) => [task.id, task]));
  for (const deletedId of delta.deletedIds) tasksById.delete(deletedId);
  for (const task of delta.upserted) tasksById.set(task.id, task);

  const orderedTasks = delta.taskIds.flatMap((taskId) => {
    const task = tasksById.get(taskId);
    return task ? [task] : [];
  });
  const orderedIds = new Set(delta.taskIds);
  const localOnlyTasks = current.filter((task) => !orderedIds.has(task.id) && tasksById.has(task.id));
  const unorderedNewTasks = delta.upserted.filter((task) => !orderedIds.has(task.id) && !localOnlyTasks.some((item) => item.id === task.id));
  return [...orderedTasks, ...unorderedNewTasks, ...localOnlyTasks];
}
