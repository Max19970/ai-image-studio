import { useState } from 'react';
import type { GenerationTask } from '../../../domain/generationTask';
import { useGenerationTaskHistory } from '../../hooks/useGenerationTaskHistory';
import type { TaskHistoryCommands } from '../../commands/types';
import type { StateSetter } from '../types';

export interface TaskSelectionState {
  tasks: GenerationTask[];
  taskHistory: TaskHistoryCommands;
  selectedTaskId: string | null;
  setSelectedTaskId: StateSetter<string | null>;
  selectedImageId: string | null;
  setSelectedImageId: StateSetter<string | null>;
}

export function useTaskSelectionState(): TaskSelectionState {
  const {
    tasks,
    setTasks,
    registerAborter,
    releaseAborter,
    updateTask,
    deleteTask,
    clearTasks
  } = useGenerationTaskHistory();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  return {
    tasks,
    taskHistory: {
      setTasks,
      updateTask,
      registerAborter,
      releaseAborter,
      deleteTask,
      clearTasks
    },
    selectedTaskId,
    setSelectedTaskId,
    selectedImageId,
    setSelectedImageId
  };
}
