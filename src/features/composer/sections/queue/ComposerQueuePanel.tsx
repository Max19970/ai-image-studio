import { useMemo, useRef, useState } from 'react';
import { useI18n } from '../../../../i18n';
import { CheckIcon, CircleAlertIcon, CopyIcon, EllipsisIcon, FloatingPopover, PlusIcon, Trash2Icon, XIcon } from '../../../../shared/ui';
import type { ComposerLayoutContext } from '../../composerTypes';
import type { ComposerDraftIssue } from '../../model/composerDraftReadiness';
import popoverStyles from '../../ui/ComposerPopover.module.css';
import styles from './ComposerQueuePanel.module.css';

const issueKeys: Record<Exclude<ComposerDraftIssue, null>, string> = {
  'missing-model': 'composer.queueIssueModel',
  'missing-prompt': 'composer.queueIssuePrompt',
  'missing-attachments': 'composer.queueIssueAttachments',
  'invalid-parameters': 'composer.queueIssueParameters'
};

interface Props {
  context: ComposerLayoutContext;
  onClose: () => void;
}

export function ComposerQueuePanel({ context, onClose }: Props) {
  const { t } = useI18n();
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const [openItemMenuId, setOpenItemMenuId] = useState<string | null>(null);
  const readinessById = useMemo(
    () => new Map(context.draftReadiness.map((item) => [item.draftId, item])),
    [context.draftReadiness]
  );
  const modelNames = useMemo(
    () => new Map(context.models.map((model) => [model.id, model.name])),
    [context.models]
  );
  const menuDraft = openItemMenuId
    ? context.drafts.find((draft) => draft.id === openItemMenuId) ?? null
    : null;

  const focusItem = (index: number) => {
    const count = context.drafts.length;
    if (count === 0) return;
    itemRefs.current[(index + count) % count]?.focus();
  };

  const closeItemMenu = () => setOpenItemMenuId(null);
  const runItemAction = (action: () => void) => {
    closeItemMenu();
    action();
  };

  return (
    <aside className={styles.panel} data-testid="composer-queue-panel" aria-label={t('composer.queueTitle')}>
      <header className={styles.header}>
        <div>
          <strong>{t('composer.queueTitle')}</strong>
          <span>{t('composer.queueReadiness', {
            ready: context.queueSummary.readyCount,
            total: context.queueSummary.totalCount
          })}</span>
        </div>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label={t('composer.hideQueue')}>
          <XIcon size={17} />
        </button>
      </header>

      <ol className={styles.list}>
        {context.drafts.map((draft, index) => {
          const readiness = readinessById.get(draft.id);
          const selected = draft.id === context.activeDraftId;
          const prompt = draft.params.prompt.trim() || t('composer.queueEmptyPrompt');
          const issue = readiness?.issue ?? null;
          const statusText = issue ? t(issueKeys[issue]) : t('composer.queueReady');
          const menuOpen = openItemMenuId === draft.id;
          return (
            <li key={draft.id} className={styles.item} data-selected={selected ? 'true' : 'false'}>
              <button
                ref={(element) => { itemRefs.current[index] = element; }}
                type="button"
                className={styles.selectButton}
                onClick={() => {
                  closeItemMenu();
                  context.actions.selectDraft(draft.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    focusItem(index + 1);
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    focusItem(index - 1);
                  }
                }}
                aria-current={selected ? 'true' : undefined}
              >
                <span className={styles.index}>{index + 1}</span>
                <span className={styles.copy}>
                  <strong>{prompt}</strong>
                  <span>{modelNames.get(draft.selectedModelId) ?? t('detail.notSet')} · {t('composer.queueImages', { count: readiness?.expectedImageCount ?? 1 })}</span>
                </span>
                <span
                  className={issue ? styles.issue : styles.ready}
                  title={statusText}
                  aria-label={statusText}
                >
                  {issue ? <CircleAlertIcon size={17} strokeWidth={2.1} /> : <CheckIcon size={15} strokeWidth={2.4} />}
                </span>
              </button>
              <button
                ref={menuOpen ? menuAnchorRef : undefined}
                type="button"
                className={styles.itemMenuButton}
                data-testid={`composer-queue-item-actions-${index + 1}`}
                aria-label={t('composer.queueItemActions')}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={(event) => {
                  menuAnchorRef.current = event.currentTarget;
                  setOpenItemMenuId((value) => value === draft.id ? null : draft.id);
                }}
              >
                <EllipsisIcon size={18} strokeWidth={2} />
              </button>
            </li>
          );
        })}
      </ol>

      <footer className={styles.footer}>
        <button type="button" className={styles.addButton} onClick={() => runItemAction(context.actions.addDraft)}>
          <PlusIcon size={16} strokeWidth={2.1} />
          {t('composer.addRequest')}
        </button>
        {context.queueSummary.invalidCount > 0 && (
          <span className={styles.queueIssue} role="status">
            {t('composer.queueNeedsAttention', { count: context.queueSummary.invalidCount })}
          </span>
        )}
      </footer>

      <FloatingPopover
        open={Boolean(menuDraft)}
        anchorRef={menuAnchorRef}
        className={`${popoverStyles.panel} ${styles.itemMenuPopover} composer-inline-popover`}
        placement="auto"
        offset={6}
        viewportMargin={8}
        minWidth={176}
        role="menu"
        ariaLabel={t('composer.queueItemActions')}
        onDismiss={closeItemMenu}
      >
        {menuDraft && (
          <div className={styles.itemMenuContent} data-testid="composer-queue-item-menu">
            <button type="button" role="menuitem" onClick={() => runItemAction(() => context.actions.duplicateDraft(menuDraft.id))}>
              <CopyIcon size={16} />
              {t('composer.duplicateRequest')}
            </button>
            <button type="button" role="menuitem" className={styles.dangerAction} onClick={() => runItemAction(() => context.actions.removeDraft(menuDraft.id))}>
              <Trash2Icon size={16} />
              {t('composer.removeRequest')}
            </button>
          </div>
        )}
      </FloatingPopover>
    </aside>
  );
}
