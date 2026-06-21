import { useEffect, useRef, useState } from 'react';
import type { GenerationTask } from '../../domain/generationTask';
import { collectGenerationTasksObjectUrls, revokeBrowserObjectUrls } from '../../domain/generationTaskObjectUrls';
import { createTaskCancellationRegistry } from '../../processes/generation-task-lifecycle';
import {
  cacheGenerationTaskHistoryFallback,
  clearGenerationTaskHistory,
  loadGenerationTaskHistory,
  loadGenerationTaskHistoryFallback
} from '../../processes/storage-sync';

interface GenerationTasksEvent {
  revision: number;
  tasks: GenerationTask[];
}

interface GenerationTasksDeltaEvent {
  revision: number;
  taskIds: string[];
  upserted: GenerationTask[];
  deletedIds: string[];
}

function readTasksEvent(event: MessageEvent): GenerationTasksEvent | null {
  try {
    const data = JSON.parse(event.data) as { revision?: unknown; tasks?: unknown };
    if (!Array.isArray(data.tasks)) return null;
    return {
      revision: typeof data.revision === 'number' ? data.revision : 0,
      tasks: data.tasks as GenerationTask[]
    };
  } catch {
    return null;
  }
}

function readTasksDeltaEvent(event: MessageEvent): GenerationTasksDeltaEvent | null {
  try {
    const data = JSON.parse(event.data) as { revision?: unknown; taskIds?: unknown; upserted?: unknown; deletedIds?: unknown };
    if (typeof data.revision !== 'number' || !Array.isArray(data.taskIds) || !Array.isArray(data.upserted) || !Array.isArray(data.deletedIds)) return null;
    return {
      revision: data.revision,
      taskIds: data.taskIds.filter((id): id is string => typeof id === 'string'),
      upserted: data.upserted as GenerationTask[],
      deletedIds: data.deletedIds.filter((id): id is string => typeof id === 'string')
    };
  } catch {
    return null;
  }
}

function withoutDeletedTasks(tasks: GenerationTask[], deletedTaskIds: Set<string>): GenerationTask[] {
  return deletedTaskIds.size > 0 ? tasks.filter((task) => !deletedTaskIds.has(task.id)) : tasks;
}

function applyTasksDelta(current: GenerationTask[], delta: GenerationTasksDeltaEvent): GenerationTask[] {
  const tasksById = new Map(current.map((task) => [task.id, task]));
  for (const deletedId of delta.deletedIds) tasksById.delete(deletedId);
  for (const task of delta.upserted) tasksById.set(task.id, task);

  const orderedTasks = delta.taskIds.flatMap((taskId) => {
    const task = tasksById.get(taskId);
    return task ? [task] : [];
  });
  const orderedIds = new Set(delta.taskIds);
  const localOnlyTasks = current.filter((task) => !orderedIds.has(task.id) && tasksById.has(task.id));
  return [...orderedTasks, ...localOnlyTasks];
}

export function useGenerationTaskHistory() {
  const [tasks, setTasks] = useState<GenerationTask[]>(() => loadGenerationTaskHistoryFallback());
  const taskCancellationRegistryRef = useRef(createTaskCancellationRegistry());
  const liveTaskObjectUrlsRef = useRef<Set<string>>(new Set());
  const latestTasksRef = useRef<GenerationTask[]>(tasks);
  const deletedTaskIdsRef = useRef<Set<string>>(new Set());
  const serverRevisionRef = useRef(0);
  const serverSnapshotLoadedRef = useRef(false);

  useEffect(() => {
    latestTasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    let cancelled = false;
    void loadGenerationTaskHistory().then((persistedTasks) => {
      if (cancelled) return;
      setTasks((current) => {
        if (serverSnapshotLoadedRef.current) return current;
        const nextTasks = taskCancellationRegistryRef.current.activeCount() > 0 ? current : withoutDeletedTasks(persistedTasks, deletedTaskIdsRef.current);
        latestTasksRef.current = nextTasks;
        return nextTasks;
      });
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const source = new EventSource('/api/generation-tasks/events');
    source.addEventListener('tasks', (event) => {
      const snapshot = readTasksEvent(event as MessageEvent);
      if (!snapshot || snapshot.revision < serverRevisionRef.current) return;
      serverSnapshotLoadedRef.current = true;
      serverRevisionRef.current = snapshot.revision;
      const nextTasks = withoutDeletedTasks(snapshot.tasks, deletedTaskIdsRef.current);
      latestTasksRef.current = nextTasks;
      setTasks(nextTasks);
      cacheGenerationTaskHistoryFallback(nextTasks);
    });
    source.addEventListener('tasks-delta', (event) => {
      const delta = readTasksDeltaEvent(event as MessageEvent);
      if (!delta || delta.revision <= serverRevisionRef.current) return;
      serverSnapshotLoadedRef.current = true;
      serverRevisionRef.current = delta.revision;
      const nextTasks = withoutDeletedTasks(applyTasksDelta(latestTasksRef.current, delta), deletedTaskIdsRef.current);
      latestTasksRef.current = nextTasks;
      setTasks(nextTasks);
      cacheGenerationTaskHistoryFallback(nextTasks);
    });
    source.onerror = () => {
      // Browser will retry automatically. Keep the last known task list visible between reconnect attempts.
    };
    return () => source.close();
  }, []);

  useEffect(() => {
    const nextUrls = collectGenerationTasksObjectUrls(tasks);
    const staleUrls = [...liveTaskObjectUrlsRef.current].filter((url) => !nextUrls.has(url));
    revokeBrowserObjectUrls(staleUrls);
    liveTaskObjectUrlsRef.current = nextUrls;
  }, [tasks]);

  const registerAborter = (taskId: string, controller: AbortController) => {
    taskCancellationRegistryRef.current.register(taskId, controller);
  };

  const releaseAborter = (taskId: string) => {
    taskCancellationRegistryRef.current.release(taskId);
  };

  const updateTask = (taskId: string, recipe: (task: GenerationTask) => GenerationTask) => {
    setTasks((prev) => prev.map((task) => task.id === taskId ? recipe(task) : task));
  };

  const deleteTask = (taskId: string) => {
    taskCancellationRegistryRef.current.cancel(taskId);
    deletedTaskIdsRef.current.add(taskId);
    const nextTasks = latestTasksRef.current.filter((task) => task.id !== taskId);
    latestTasksRef.current = nextTasks;
    setTasks(nextTasks);
    cacheGenerationTaskHistoryFallback(nextTasks);
  };

  const clearTasks = () => {
    taskCancellationRegistryRef.current.cancelAll();
    for (const task of latestTasksRef.current) deletedTaskIdsRef.current.add(task.id);
    latestTasksRef.current = [];
    setTasks([]);
    void clearGenerationTaskHistory();
  };

  return {
    tasks,
    setTasks,
    registerAborter,
    releaseAborter,
    updateTask,
    deleteTask,
    clearTasks
  };
}
