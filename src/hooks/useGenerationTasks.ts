import { useCallback, useMemo, useState } from 'react';
import type { GenerationTask, GeneratedImage } from '../domain/types';

/**
 * Minimal state extraction for generation tasks.
 * Phase 1 refactor: move task operations out of App.tsx
 */
export function useGenerationTasks(initial: GenerationTask[]) {
  const [tasks, setTasks] = useState<GenerationTask[]>(initial);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const activeTask = useMemo(
    () => tasks.find(t => t.id === activeTaskId) ?? null,
    [tasks, activeTaskId]
  );

  const addTask = useCallback((task: GenerationTask) => {
    setTasks(prev => [task, ...prev]);
  }, []);

  const updateTask = useCallback((taskId: string, patch: Partial<GenerationTask>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...patch } : t));
  }, []);

  const removeTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setActiveTaskId(prev => prev === taskId ? null : prev);
  }, []);

  const setActiveImage = useCallback((image: GeneratedImage | null) => {
    if (!image) return;
    setTasks(prev => prev);
  }, []);

  return {
    tasks,
    activeTask,
    activeTaskId,
    setActiveTaskId,
    addTask,
    updateTask,
    removeTask,
    setTasks
  };
}