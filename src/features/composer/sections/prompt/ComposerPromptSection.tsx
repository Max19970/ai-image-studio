import { useEffect, useRef } from 'react';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { ComposerLayoutContext } from '../../composerTypes';
import { useI18n } from '../../../../i18n';
import styles from '../../ComposerLayout.module.css';

export function ComposerPromptSection({ context }: ElementDefinitionProps<ComposerLayoutContext>) {
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    const nextHeight = Math.min(textarea.scrollHeight, 240);
    textarea.style.height = `${Math.max(52, nextHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 240 ? 'auto' : 'hidden';
  }, [context.prompt]);

  return (
    <div className={styles.promptWrap} data-composer-slot="input">
      <textarea
        ref={textareaRef}
        data-testid="composer-prompt"
        value={context.prompt}
        onChange={(event) => context.actions.changePrompt(event.target.value)}
        onKeyDown={context.actions.handlePromptKeyDown}
        placeholder={context.mode === 'generate' ? t('composer.placeholder.generate') : t('composer.placeholder.edit')}
      />
      {context.prompt.length > 0 && (
        <button
          type="button"
          className={styles.clearPromptButton}
          onClick={() => context.actions.changePrompt('')}
          aria-label={t('composer.clearPrompt')}
          title={t('composer.clearPrompt')}
        >
          ×
        </button>
      )}
    </div>
  );
}
