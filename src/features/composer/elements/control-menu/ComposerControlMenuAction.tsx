import { useEffect, useRef, useState } from 'react';
import { DisclosureChevron, FloatingPopover } from '../../../../shared/ui';
import { useI18n } from '../../../../i18n';
import type { ComposerActionContext } from '../../composerTypes';
import { ProviderModelPickerPanel } from '../../../../entities/provider/ui';
import { providerModeAllowsImageAttachments, providerModeAllowsMask } from '../../../../entities/provider/attachmentCompatibility';
import { RequestPresetManagerDialog, createComposerPresetManagerController } from '../../../request-presets/elements/preset-menu/RequestPresetMenuAction';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import styles from './ComposerControlMenu.module.css';
import popoverStyles from '../../ui/ComposerPopover.module.css';

const popoverId = 'composer.controls';
type MenuView = 'main' | 'models';

interface MenuProps {
  context: ComposerActionContext;
  onOpenPresets: () => void;
  onOpenModels: () => void;
}

function MenuAction({
  icon,
  label,
  danger = false,
  testId,
  onClick
}: {
  icon: string;
  label: string;
  danger?: boolean;
  testId?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.action} ${danger ? styles.danger : ''}`}
      data-testid={testId}
      onClick={onClick}
    >
      <span className={styles.icon} aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function MainMenu({ context, onOpenPresets, onOpenModels }: MenuProps) {
  const { t } = useI18n();
  const canUseImages = providerModeAllowsImageAttachments(context.providerMode);
  const canUseMask = providerModeAllowsMask(context.providerMode);
  const selectedProvider = context.providers.find((provider) => provider.id === context.selectedModel?.providerId) ?? null;
  const runAndClose = (action: () => void) => {
    action();
    context.setOpenPopover(null);
  };

  return (
    <div className={styles.menu} data-testid="composer-controls-panel" data-control-surface={context.controlSurface.id}>
      {context.providerModes.length > 1 && (
        <section className={styles.modeSection} aria-label={t('composer.mode')}>
          <span className={styles.sectionLabel}>{t('composer.mode')}</span>
          <div className={styles.modeSwitch}>
            {context.providerModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={styles.modeButton}
                data-testid={`composer-mode-${mode.id}`}
                data-active={context.providerMode.id === mode.id}
                onClick={() => context.actions.setProviderMode(mode.id)}
              >
                {t(mode.labelKey)}
              </button>
            ))}
          </div>
        </section>
      )}

      <button
        type="button"
        className={styles.modelRow}
        data-testid="composer-model-picker"
        aria-label={t('composer.model')}
        onClick={onOpenModels}
      >
        <span className={styles.modelCopy}>
          <small>{selectedProvider?.name ?? t('composer.provider')}</small>
          <strong>{context.selectedModel?.name ?? t('detail.notSet')}</strong>
        </span>
        <DisclosureChevron direction="right" className={styles.rowChevron} />
      </button>

      <div className={styles.divider} />

      <div className={styles.actionList}>
        {canUseImages && (
          <MenuAction
            icon="＋"
            label={t('composer.addImages')}
            testId="composer-add-attachments"
            onClick={() => runAndClose(context.actions.openAttachmentPicker)}
          />
        )}
        {canUseMask && (
          <MenuAction
            icon="◌"
            label={context.hasMask ? t('composer.replaceMask') : t('composer.addMask')}
            testId="composer-add-mask"
            onClick={() => runAndClose(context.actions.openMaskPicker)}
          />
        )}
        {context.controlSurface.showParameters && (
          <MenuAction
            icon="⚙"
            label={t('composer.paramsTitle')}
            testId="composer-parameters"
            onClick={() => runAndClose(context.actions.openParameters)}
          />
        )}
        <MenuAction
          icon="✦"
          label={t('requestPresets.open')}
          testId="request-presets-open"
          onClick={onOpenPresets}
        />
        {canUseMask && context.hasMask && (
          <MenuAction
            icon="−"
            label={t('composer.clearMask')}
            danger
            testId="composer-clear-mask"
            onClick={() => runAndClose(context.actions.clearMask)}
          />
        )}
        {(canUseImages || canUseMask) && context.attachmentsCount > 0 && (
          <MenuAction
            icon="×"
            label={t('composer.clearAttachments')}
            danger
            onClick={() => runAndClose(context.actions.clearAttachments)}
          />
        )}
      </div>

      <div className={styles.divider} />

      <div className={styles.queueToolbar} aria-label={t('composer.queueActions')}>
        <button type="button" data-testid="composer-add-request" onClick={() => runAndClose(context.actions.addDraft)}>
          <span aria-hidden="true">＋</span>
          {t('composer.addRequest')}
        </button>
        <button type="button" onClick={() => runAndClose(context.actions.duplicateActiveDraft)}>
          <span aria-hidden="true">⧉</span>
          {t('composer.duplicateRequest')}
        </button>
        {context.draftsCount > 1 && (
          <button type="button" className={styles.danger} onClick={() => runAndClose(context.actions.removeActiveDraft)}>
            <span aria-hidden="true">×</span>
            {t('composer.removeRequest')}
          </button>
        )}
      </div>
    </div>
  );
}

function ModelMenu({ context, onBack }: { context: ComposerActionContext; onBack: () => void }) {
  const { t } = useI18n();
  const selectModel = (modelId: string) => {
    context.actions.changeModel(modelId);
    context.setOpenPopover(null);
  };

  return (
    <div className={`${styles.menu} ${styles.modelMenu}`} data-testid="composer-model-list">
      <header className={styles.drillHeader}>
        <button type="button" className={styles.backButton} onClick={onBack} aria-label={t('attachment.back')}>
          <DisclosureChevron direction="left" />
        </button>
        <div>
          <strong>{t('composer.model')}</strong>
          <span>{t('composer.modelPickerDescription')}</span>
        </div>
      </header>

      <ProviderModelPickerPanel
        value={context.selectedModel?.id ?? ''}
        models={context.models}
        providers={context.providers}
        onChange={selectModel}
        density="compact"
        testId="composer-grouped-model-picker"
      />
    </div>
  );
}

export function ComposerControlMenuAction({ context }: ElementDefinitionProps<ComposerActionContext>) {
  const { t } = useI18n();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [view, setView] = useState<MenuView>('main');
  const open = context.openPopover === popoverId;
  const close = () => context.setOpenPopover(null);
  const presetController = createComposerPresetManagerController(context);

  useEffect(() => {
    if (!open) setView('main');
  }, [open]);

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
        onClick={() => context.setOpenPopover((value) => value === popoverId ? null : popoverId)}
      >
        <span aria-hidden="true">＋</span>
        {context.attachmentsCount > 0 && <em>{context.attachmentsCount}</em>}
      </button>

      <FloatingPopover
        open={open}
        anchorRef={buttonRef}
        className={`${popoverStyles.panel} ${styles.floatingMenu} ${view === 'models' ? styles.modelPickerFloating : styles.mainFloating} composer-inline-popover`}
        placement="auto"
        offset={8}
        viewportMargin={view === 'models' ? 12 : 8}
        minWidth={view === 'models' ? 704 : 284}
        ariaLabel={t('composer.controls')}
        onDismiss={close}
      >
        {view === 'main' ? (
          <MainMenu
            context={context}
            onOpenModels={() => setView('models')}
            onOpenPresets={() => {
              close();
              setPresetsOpen(true);
            }}
          />
        ) : (
          <ModelMenu context={context} onBack={() => setView('main')} />
        )}
      </FloatingPopover>

      <RequestPresetManagerDialog
        open={presetsOpen}
        controller={presetController}
        onClose={() => setPresetsOpen(false)}
      />
    </div>
  );
}
