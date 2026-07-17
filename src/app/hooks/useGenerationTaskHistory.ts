import { useEffect, useRef, useState } from 'react';
import type { GenerationTask } from '../../domain/generationTask';
import {
  defaultMaxStoredGenerationTasks,
  normalizeMaxStoredGenerationTasks,
  retainGenerationTasksByCompletedLimit
} from '../../domain/generationHistorySettings';
import { collectGenerationTasksObjectUrls, revokeBrowserObjectUrls } from '../../domain/generationTaskObjectUrls';
import { applyGenerationTasksDelta, parseGenerationTasksDeltaEventData, parseGenerationTasksEventData } from '../../domain/generationTaskEvents';
import { createTaskCancellationRegistry } from '../../processes/generation-task-lifecycle';
import {
  cacheGenerationTaskHistoryFallback,
  clearGenerationTaskHistory,
  getGenerationTaskHistoryPersistenceSignature,
  loadGenerationTaskHistory,
  loadGenerationTaskHistoryFallback
} from '../../processes/storage-sync/generationTaskHistory';

function readTasksEvent(event: MessageEvent) {
  return parseGenerationTasksEventData(event.data);
}

function readTasksDeltaEvent(event: MessageEvent) {
  return parseGenerationTasksDeltaEventData(event.data);
}

function withoutDeletedTasks(tasks: GenerationTask[], deletedTaskIds: Set<string>): GenerationTask[] {
  return deletedTaskIds.size > 0 ? tasks.filter((task) => !deletedTaskIds.has(task.id)) : tasks;
}

export function useGenerationTaskHistory(maxStoredGenerationTasks = defaultMaxStoredGenerationTasks) {
  const historyLimit = normalizeMaxStoredGenerationTasks(maxStoredGenerationTasks);
  const historyLimitRef = useRef(historyLimit);
  const fallbackCacheSignatureRef = useRef('');
  const [tasks, setTasks] = useState<GenerationTask[]>(() => {
    const cachedTasks = loadGenerationTaskHistoryFallback();
    fallbackCacheSignatureRef.current = getGenerationTaskHistoryPersistenceSignature(cachedTasks);
    return retainGenerationTasksByCompletedLimit(cachedTasks, historyLimit);
  });
  const taskCancellationRegistryRef = useRef(createTaskCancellationRegistry());
  const liveTaskObjectUrlsRef = useRef<Set<string>>(new Set());
  const latestTasksRef = useRef<GenerationTask[]>(tasks);
  const deletedTaskIdsRef = useRef<Set<string>>(new Set());
  const serverRevisionRef = useRef(0);
  const serverSnapshotLoadedRef = useRef(false);

  const cacheFallbackIfChanged = (nextTasks: GenerationTask[]) => {
    const signature = getGenerationTaskHistoryPersistenceSignature(nextTasks);
    if (signature === fallbackCacheSignatureRef.current) return;
    fallbackCacheSignatureRef.current = signature;
    cacheGenerationTaskHistoryFallback(nextTasks, historyLimitRef.current);
  };

  useEffect(() => {
    latestTasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    historyLimitRef.current = historyLimit;
    setTasks((current) => {
      const nextTasks = retainGenerationTasksByCompletedLimit(current, historyLimit);
      latestTasksRef.current = nextTasks;
      cacheFallbackIfChanged(nextTasks);
      return nextTasks;
    });
  }, [historyLimit]);

  useEffect(() => {
    let cancelled = false;
    void loadGenerationTaskHistory(historyLimit).then((persistedTasks) => {
      if (cancelled) return;
      setTasks((current) => {
        if (serverSnapshotLoadedRef.current) return current;
        const nextTasks = taskCancellationRegistryRef.current.activeCount() > 0
          ? current
          : retainGenerationTasksByCompletedLimit(
            withoutDeletedTasks(persistedTasks, deletedTaskIdsRef.current),
            historyLimitRef.current
          );
        latestTasksRef.current = nextTasks;
        return nextTasks;
      });
    });
    return () => { cancelled = true; };
  }, [historyLimit]);

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const source = new EventSource('/api/generation-tasks/events');
    source.addEventListener('tasks', (event) => {
      const snapshot = readTasksEvent(event as MessageEvent);
      if (!snapshot || snapshot.revision < serverRevisionRef.current) return;
      serverSnapshotLoadedRef.current = true;
      serverRevisionRef.current = snapshot.revision;
      const nextTasks = retainGenerationTasksByCompletedLimit(
        withoutDeletedTasks(snapshot.tasks, deletedTaskIdsRef.current),
        historyLimitRef.current
      );
      latestTasksRef.current = nextTasks;
      setTasks(nextTasks);
      cacheFallbackIfChanged(nextTasks);
    });
    source.addEventListener('tasks-delta', (event) => {
      const delta = readTasksDeltaEvent(event as MessageEvent);
      if (!delta || delta.revision <= serverRevisionRef.current) return;
      serverSnapshotLoadedRef.current = true;
      serverRevisionRef.current = delta.revision;
      const nextTasks = retainGenerationTasksByCompletedLimit(
        withoutDeletedTasks(applyGenerationTasksDelta(latestTasksRef.current, delta), deletedTaskIdsRef.current),
        historyLimitRef.current
      );
      latestTasksRef.current = nextTasks;
      setTasks(nextTasks);
      cacheFallbackIfChanged(nextTasks);
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

  const ingestServerTask = (task: GenerationTask) => {
    const current = latestTasksRef.current;
    const exists = current.some((item) => item.id === task.id);
    const nextTasks = retainGenerationTasksByCompletedLimit(
      withoutDeletedTasks(
        exists ? current.map((item) => item.id === task.id ? task : item) : [task, ...current],
        deletedTaskIdsRef.current
      ),
      historyLimitRef.current
    );
    latestTasksRef.current = nextTasks;
    setTasks(nextTasks);
    cacheFallbackIfChanged(nextTasks);
  };

  const deleteTask = (taskId: string) => {
    taskCancellationRegistryRef.current.cancel(taskId);
    deletedTaskIdsRef.current.add(taskId);
    const nextTasks = latestTasksRef.current.filter((task) => task.id !== taskId);
    latestTasksRef.current = nextTasks;
    setTasks(nextTasks);
    cacheFallbackIfChanged(nextTasks);
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
    ingestServerTask,
    deleteTask,
    clearTasks
  };
}
