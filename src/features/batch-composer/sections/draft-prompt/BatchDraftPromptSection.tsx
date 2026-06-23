import { useRef, useState } from 'react';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { BatchDraftLayoutContext } from '../../batchComposerTypes';
import { useI18n } from '../../../../i18n';
import { getProviderModePromptPlaceholderKey } from '../../../../entities/provider/modeIntent';
import { useAutosizedTextarea } from '../../../../shared/hooks/useAutosizedTextarea';
import { useMediaQuery } from '../../../../shared/hooks/useMediaQuery';
import styles from './BatchDraftPromptSection.module.css';

export function BatchDraftPromptSection({ context }: ElementDefinitionProps<BatchDraftLayoutContext>) {
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isPromptFocused, setIsPromptFocused] = useState(false);
  const isMobileCompact = useMediaQuery('(max-width: 620px)');
  const promptExpanded = isPromptFocused;

  useAutosizedTextarea(textareaRef, {
    value: context.draft.params.prompt,
    focused: promptExpanded,
    collapsedRows: 1,
    focusedMinRows: isMobileCompact ? 4 : 5,
    focusedMaxRows: isMobileCompact ? 6 : 7
  });

  const placeholder = t(getProviderModePromptPlaceholderKey(context.providerMode, { compact: isMobileCompact }));

  return (
    <div className={styles.promptWrap}>
      <textarea
        ref={textareaRef}
        data-testid="batch-draft-prompt"
        data-prompt-state={promptExpanded ? 'focused' : 'collapsed'}
        data-prompt-focused={promptExpanded ? 'true' : 'false'}
        value={context.draft.params.prompt}
        onChange={(event) => context.actions.patchParams({ prompt: event.target.value })}
        onFocus={() => setIsPromptFocused(true)}
        onBlur={() => setIsPromptFocused(false)}
        placeholder={placeholder}
        wrap="soft"
      />
      {context.draft.params.prompt.length > 0 && (
        <button type="button" className={styles.clearPromptButton} onClick={() => context.actions.patchParams({ prompt: '' })} aria-label={t('composer.clearPrompt')} title={t('composer.clearPrompt')}>×</button>
      )}
    </div>
  );
}
