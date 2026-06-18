import { useEffect, useRef } from 'react';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { BatchDraftLayoutContext } from '../../batchComposerTypes';
import { useI18n } from '../../../../i18n';
import styles from './BatchDraftPromptSection.module.css';

export function BatchDraftPromptSection({ context }: ElementDefinitionProps<BatchDraftLayoutContext>) {
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    const nextHeight = Math.min(textarea.scrollHeight, 220);
    textarea.style.height = `${Math.max(72, nextHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 220 ? 'auto' : 'hidden';
  }, [context.draft.params.prompt]);

  return (
    <div className={styles.promptWrap}>
      <textarea
        ref={textareaRef}
        value={context.draft.params.prompt}
        onChange={(event) => context.actions.patchParams({ prompt: event.target.value })}
        placeholder={context.draft.mode === 'generate' ? t('composer.placeholder.generate') : t('composer.placeholder.edit')}
      />
      {context.draft.params.prompt.length > 0 && (
        <button type="button" className={styles.clearPromptButton} onClick={() => context.actions.patchParams({ prompt: '' })} aria-label={t('composer.clearPrompt')} title={t('composer.clearPrompt')}>×</button>
      )}
    </div>
  );
}
