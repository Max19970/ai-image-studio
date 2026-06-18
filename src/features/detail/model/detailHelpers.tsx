import type { GenerationTask } from '../../../domain/generationTask';
import { useI18n } from '../../../i18n';
import { statusToUiTone } from '../../../domain/generationStatus';

export const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

export function useDetailStatusLabel(status: GenerationTask['status']) {
  const { t } = useI18n();
  return t(`status.${status}`);
}

export function statusPillToneClass(status: GenerationTask['status']) {
  return statusToUiTone(status);
}

export function expectedImageCount(task: GenerationTask): number {
  if (task.batch) {
    return task.batch.items.reduce((sum, item) => sum + Math.max(1, Number(item.request.payload.n ?? item.request.params.n ?? 1)), 0);
  }
  return Math.max(1, Number(task.request.payload.n ?? task.request.params.n ?? 1));
}
