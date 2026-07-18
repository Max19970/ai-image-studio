import { useEffect, useRef, useState } from 'react';
import type { GenerationTask } from '../../domain/generationTask';
import {
  defaultMaxStoredGenerationTasks,
  normalizeMaxStoredGenerationTasks,
  retainGenerationTasksByCompletedLimit
} from '../../domain/generationHistorySettings';
import { collectGenerationTasksObjectUrls, revokeBrowserObjectUrls } from '../../domain/generationTaskObjectUrls';
import { applyGenerationTasksDelta, parseGenerationTasksDeltaEventData, parseGenerationTasksEventData } from '../../domain/generationTaskEvents';
import {
  cacheGenerationTaskHistoryFallback,
  getGenerationTaskHistoryPersistenceSignature,
  loadGenerationTaskHistoryFallback
} from '../../processes/storage-sync/generationTaskHistory';

function readTasksEvent(event: MessageEvent) {
  return parseGenerationTasksEventData(event.data);
}

function readTasksDeltaEvent(event: MessageEvent) {
  return parseGenerationTasksDeltaEventData(event.data);
}

export function useGenerationTaskHistory(maxStoredGenerationTasks = defaultMaxStoredGenerationTasks) {
  const historyLimit = normalizeMaxStoredGenerationTasks(maxStoredGenerationTasks);
  const historyLimitRef = useRef(historyLimit);
  const fallbackCacheSignatureRef = useRef('');
  const [tasks, setTasks] = useState<GenerationTask[]>(() => {
    const cachedTasks = retainGenerationTasksByCompletedLimit(loadGenerationTaskHistoryFallback(), historyLimit);
    fallbackCacheSignatureRef.current = getGenerationTaskHistoryPersistenceSignature(cachedTasks);
    return cachedTasks;
  });
  const liveTaskObjectUrlsRef = useRef<Set<string>>(new Set());
  const latestTasksRef = useRef<GenerationTask[]>(tasks);
  const serverRevisionRef = useRef(0);

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
    if (typeof EventSource === 'undefined') return;
    const source = new EventSource('/api/generation-tasks/events');
    source.addEventListener('tasks', (event) => {
      const snapshot = readTasksEvent(event as MessageEvent);
      if (!snapshot || snapshot.revision < serverRevisionRef.current) return;
      serverRevisionRef.current = snapshot.revision;
      const nextTasks = retainGenerationTasksByCompletedLimit(snapshot.tasks, historyLimitRef.current);
      latestTasksRef.current = nextTasks;
      setTasks(nextTasks);
      cacheFallbackIfChanged(nextTasks);
    });
    source.addEventListener('tasks-delta', (event) => {
      const delta = readTasksDeltaEvent(event as MessageEvent);
      if (!delta || delta.revision <= serverRevisionRef.current) return;
      serverRevisionRef.current = delta.revision;
      const nextTasks = retainGenerationTasksByCompletedLimit(
        applyGenerationTasksDelta(latestTasksRef.current, delta),
        historyLimitRef.current
      );
      latestTasksRef.current = nextTasks;
      setTasks(nextTasks);
      cacheFallbackIfChanged(nextTasks);
    });
    source.onerror = () => {
      // EventSource reconnects automatically; keep the latest canonical projection visible.
    };
    return () => source.close();
  }, []);

  useEffect(() => {
    const nextUrls = collectGenerationTasksObjectUrls(tasks);
    const staleUrls = [...liveTaskObjectUrlsRef.current].filter((url) => !nextUrls.has(url));
    revokeBrowserObjectUrls(staleUrls);
    liveTaskObjectUrlsRef.current = nextUrls;
  }, [tasks]);

  const ingestServerTask = (task: GenerationTask) => {
    const current = latestTasksRef.current;
    const exists = current.some((item) => item.id === task.id);
    const nextTasks = retainGenerationTasksByCompletedLimit(
      exists ? current.map((item) => item.id === task.id ? task : item) : [task, ...current],
      historyLimitRef.current
    );
    latestTasksRef.current = nextTasks;
    setTasks(nextTasks);
    cacheFallbackIfChanged(nextTasks);
  };

  const deleteTask = (taskId: string) => {
    const nextTasks = latestTasksRef.current.filter((task) => task.id !== taskId);
    latestTasksRef.current = nextTasks;
    setTasks(nextTasks);
    cacheFallbackIfChanged(nextTasks);
  };

  const clearTasks = () => {
    latestTasksRef.current = [];
    setTasks([]);
    cacheFallbackIfChanged([]);
  };

  return {
    tasks,
    ingestServerTask,
    deleteTask,
    clearTasks
  };
}
