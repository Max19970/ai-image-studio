import { useRef, useState } from 'react';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { ComposerLayoutContext } from '../../composerTypes';
import { useI18n } from '../../../../i18n';
import { useAutosizedTextarea } from '../../../../shared/hooks/useAutosizedTextarea';
import { useMediaQuery } from '../../../../shared/hooks/useMediaQuery';
import styles from '../../ComposerLayout.module.css';

export function ComposerPromptSection({ context }: ElementDefinitionProps<ComposerLayoutContext>) {
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isPromptFocused, setIsPromptFocused] = useState(false);
  const isMobileCompact = useMediaQuery('(max-width: 620px)');
  const promptExpanded = isPromptFocused;

  useAutosizedTextarea(textareaRef, {
    value: context.prompt,
    focused: promptExpanded,
    collapsedRows: 1,
    focusedMinRows: isMobileCompact ? 4 : 5,
    focusedMaxRows: isMobileCompact ? 6 : 7
  });

  const isGenerateLike = context.providerMode.legacyWorkMode !== 'edit';
  const placeholder = isMobileCompact
    ? isGenerateLike ? t('composer.placeholder.generateCompact') : t('composer.placeholder.editCompact')
    : isGenerateLike ? t('composer.placeholder.generate') : t('composer.placeholder.edit');

  return (
    <div className={styles.promptWrap} data-composer-slot="input">
      <textarea
        ref={textareaRef}
        data-testid="composer-prompt"
        data-prompt-state={promptExpanded ? 'focused' : 'collapsed'}
        data-prompt-focused={promptExpanded ? 'true' : 'false'}
        value={context.prompt}
        onChange={(event) => context.actions.changePrompt(event.target.value)}
        onFocus={() => setIsPromptFocused(true)}
        onBlur={() => setIsPromptFocused(false)}
        onKeyDown={context.actions.handlePromptKeyDown}
        placeholder={placeholder}
        wrap="soft"
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
