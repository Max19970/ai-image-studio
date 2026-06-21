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

function readTasksEvent(event: MessageEvent): GenerationTask[] | null {
  try {
    const data = JSON.parse(event.data) as { tasks?: unknown };
    return Array.isArray(data.tasks) ? data.tasks as GenerationTask[] : null;
  } catch {
    return null;
  }
}

function withoutDeletedTasks(tasks: GenerationTask[], deletedTaskIds: Set<string>): GenerationTask[] {
  return deletedTaskIds.size > 0 ? tasks.filter((task) => !deletedTaskIds.has(task.id)) : tasks;
}

export function useGenerationTaskHistory() {
  const [tasks, setTasks] = useState<GenerationTask[]>(() => loadGenerationTaskHistoryFallback());
  const taskCancellationRegistryRef = useRef(createTaskCancellationRegistry());
  const liveTaskObjectUrlsRef = useRef<Set<string>>(new Set());
  const latestTasksRef = useRef<GenerationTask[]>(tasks);
  const deletedTaskIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    latestTasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    let cancelled = false;
    void loadGenerationTaskHistory().then((persistedTasks) => {
      if (cancelled) return;
      setTasks((current) => {
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
      const serverTasks = readTasksEvent(event as MessageEvent);
      if (!serverTasks) return;
      const nextTasks = withoutDeletedTasks(serverTasks, deletedTaskIdsRef.current);
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
