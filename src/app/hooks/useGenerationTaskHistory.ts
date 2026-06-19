import { useEffect, useRef, useState } from 'react';
import type { GenerationTask } from '../../domain/generationTask';
import { collectGenerationTasksObjectUrls, revokeBrowserObjectUrls } from '../../domain/generationTaskObjectUrls';
import { createTaskCancellationRegistry } from '../../processes/generation-task-lifecycle';
import {
  clearGenerationTaskHistory,
  loadGenerationTaskHistory,
  loadGenerationTaskHistoryFallback,
  saveGenerationTaskHistory
} from '../../processes/storage-sync';

export function useGenerationTaskHistory() {
  const [tasks, setTasks] = useState<GenerationTask[]>(() => loadGenerationTaskHistoryFallback());
  const taskCancellationRegistryRef = useRef(createTaskCancellationRegistry());
  const historyHydratedRef = useRef(false);
  const liveTaskObjectUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void loadGenerationTaskHistory().then((persistedTasks) => {
      if (cancelled) return;
      historyHydratedRef.current = true;
      setTasks((current) => taskCancellationRegistryRef.current.activeCount() > 0 ? current : persistedTasks);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const nextUrls = collectGenerationTasksObjectUrls(tasks);
    const staleUrls = [...liveTaskObjectUrlsRef.current].filter((url) => !nextUrls.has(url));
    revokeBrowserObjectUrls(staleUrls);
    liveTaskObjectUrlsRef.current = nextUrls;
  }, [tasks]);

  useEffect(() => {
    if (!historyHydratedRef.current) return;
    void saveGenerationTaskHistory(tasks);
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
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const clearTasks = () => {
    taskCancellationRegistryRef.current.cancelAll();
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
