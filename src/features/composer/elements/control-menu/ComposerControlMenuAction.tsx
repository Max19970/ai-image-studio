import { useEffect, useRef, useState } from 'react';
import { BottomSheet, FloatingPopover, PopoverSelect } from '../../../../shared/ui';
import { useI18n } from '../../../../i18n';
import type { ComposerActionContext } from '../../composerTypes';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import styles from './ComposerControlMenu.module.css';
import popoverStyles from '../../ui/ComposerPopover.module.css';

const popoverId = 'composer.controls';

function useIsMobileComposerControls() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 860px)');
    const sync = () => setIsMobile(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return isMobile;
}

function MenuContent({ context }: { context: ComposerActionContext }) {
  const { t } = useI18n();
  const close = () => context.setOpenPopover(null);
  const setMode = (mode: ComposerActionContext['mode']) => {
    context.actions.setMode(mode);
    close();
  };
  const openAttachments = () => {
    context.actions.openAttachmentPicker();
    close();
  };
  const openMask = () => {
    context.actions.openMaskPicker();
    close();
  };
  const clearMask = () => {
    context.actions.clearMask();
    close();
  };
  const openParameters = () => {
    context.actions.openParameters();
    close();
  };
  const openBatch = () => {
    context.actions.openBatchComposer();
    close();
  };
  const clearAttachments = () => {
    context.actions.clearAttachments();
    close();
  };

  return (
    <div className={styles.menu}>
      <div className={styles.group}>
        <span className={styles.groupTitle}>{t('composer.mode')}</span>
        <div className={styles.modeGrid}>
          <button type="button" className={styles.modeButton} data-testid="composer-mode-generate" data-active={context.mode === 'generate'} onClick={() => setMode('generate')}>
            <strong>{t('composer.generate')}</strong>
            <small>{t('composer.modeGenerateDescription')}</small>
          </button>
          <button type="button" className={styles.modeButton} data-testid="composer-mode-edit" data-active={context.mode === 'edit'} onClick={() => setMode('edit')}>
            <strong>{t('composer.edit')}</strong>
            <small>{t('composer.modeEditDescription')}</small>
          </button>
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.groupTitle}>{t('composer.model')}</span>
        <PopoverSelect
          value={context.selectedModel?.id ?? ''}
          options={context.modelOptions}
          onChange={context.actions.changeModel}
          ariaLabel={t('composer.model')}
          placeholder={t('detail.notSet')}
          emptyText={t('app.warningNoModel')}
          className={styles.menuModelSelect}
          triggerClassName={styles.menuModelTrigger}
          panelClassName={styles.menuModelPanel}
          matchAnchorWidth={false}
          minWidth={280}
        />
      </div>

      <div className={styles.group}>
        <span className={styles.groupTitle}>{t('composer.actions')}</span>
        <button type="button" className={styles.action} data-testid="composer-add-attachments" onClick={openAttachments}>
          <span className={styles.icon} aria-hidden="true">＋</span>
          <span className={styles.copy}>
            <strong>{t('composer.addImages')}</strong>
            <small>{t('composer.addImagesDescription')}</small>
          </span>
        </button>
        <button type="button" className={styles.action} data-testid="composer-add-mask" onClick={openMask}>
          <span className={styles.icon} aria-hidden="true">◌</span>
          <span className={styles.copy}>
            <strong>{context.hasMask ? t('composer.replaceMask') : t('composer.addMask')}</strong>
            <small>{t('composer.addMaskDescription')}</small>
          </span>
        </button>
        {context.hasMask && (
          <button type="button" className={styles.action} data-testid="composer-clear-mask" onClick={clearMask}>
            <span className={styles.icon} aria-hidden="true">−</span>
            <span className={styles.copy}>
              <strong>{t('composer.clearMask')}</strong>
              <small>{t('composer.clearMaskDescription')}</small>
            </span>
          </button>
        )}
        <button type="button" className={styles.action} data-testid="composer-parameters" onClick={openParameters}>
          <span className={styles.icon} aria-hidden="true">⚙</span>
          <span className={styles.copy}>
            <strong>{t('composer.paramsTitle')}</strong>
            <small>{t('composer.paramsDescription')}</small>
          </span>
        </button>
        <button type="button" className={styles.action} data-testid="composer-batch" onClick={openBatch}>
          <span className={styles.icon} aria-hidden="true">☷</span>
          <span className={styles.copy}>
            <strong>{t('batch.open')}</strong>
            <small>{t('composer.batchDescription')}</small>
          </span>
        </button>
        {context.attachmentsCount > 0 && (
          <button type="button" className={`${styles.action} ${styles.danger}`} onClick={clearAttachments}>
            <span className={styles.icon} aria-hidden="true">×</span>
            <span className={styles.copy}>
              <strong>{t('composer.clearAttachments')}</strong>
              <small>{t('composer.clearAttachmentsDescription')}</small>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

export function ComposerControlMenuAction({ context }: ElementDefinitionProps<ComposerActionContext>) {
  const { t } = useI18n();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const isMobile = useIsMobileComposerControls();
  const open = context.openPopover === popoverId;
  const toggle = () => context.setOpenPopover((value) => value === popoverId ? null : popoverId);
  const close = () => context.setOpenPopover(null);

  return (
    <div className={styles.wrapper} data-slot-contribution="controls">
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        data-testid="composer-controls"
        data-open={open ? 'true' : 'false'}
        aria-label={t('composer.controls')}
        aria-expanded={open}
        onClick={toggle}
      >
        <span aria-hidden="true">⋯</span>
        {context.attachmentsCount > 0 && <em>{context.attachmentsCount}</em>}
      </button>

      {!isMobile && (
        <FloatingPopover
          open={open}
          anchorRef={buttonRef}
          className={`${popoverStyles.panel} composer-inline-popover`}
          placement="auto"
          offset={10}
          minWidth={310}
          onDismiss={close}
        >
          <MenuContent context={context} />
        </FloatingPopover>
      )}

      {isMobile && (
        <BottomSheet
          open={open}
          title={t('composer.controls')}
          description={t('composer.controlsDescription')}
          size="content"
          compactHeader
          scrollHint
          onClose={close}
        >
          <div className={styles.sheetBody}>
            <MenuContent context={context} />
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
