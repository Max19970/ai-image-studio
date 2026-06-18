import { useRef } from 'react';
import { FloatingPopover } from '../../../../shared/ui';
import { useI18n } from '../../../../i18n';
import { ActionIconButton } from '../../ui/ActionIconButton';
import type { ComposerActionContext } from '../../composerTypes';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import styles from './AssetsAction.module.css';
import popoverStyles from '../../ui/ComposerPopover.module.css';

const popoverId = 'composer.assets';

export function AssetsAction({ context }: ElementDefinitionProps<ComposerActionContext>) {
  const { t } = useI18n();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const open = context.openPopover === popoverId;

  return (
    <div className={`${styles.wrapper} ${open ? styles.open : ''}`} data-slot-contribution="assets">
      <ActionIconButton
        buttonRef={buttonRef}
        testId="composer-assets"
        icon="⊞"
        label={`${t('composer.target')} / ${t('composer.refs')} / ${t('composer.mask')}`}
        active={open}
        onClick={() => context.setOpenPopover((value) => value === popoverId ? null : popoverId)}
      />
      <FloatingPopover
        open={open}
        anchorRef={buttonRef}
        className={`${popoverStyles.panel} composer-inline-popover`}
        placement="auto"
        offset={10}
        minWidth={250}
        onDismiss={() => context.setOpenPopover(null)}
      >
        <button type="button" className={popoverStyles.choice} onClick={context.actions.openTargetPicker}>
          <strong>{t('composer.target')}</strong>
          <small>{context.targetImage ? context.targetImage.name : t('composer.targetTitle')}</small>
        </button>
        <button type="button" className={popoverStyles.choice} onClick={context.actions.openReferencePicker}>
          <strong>{t('composer.refs')}</strong>
          <small>{context.referenceImages.length > 0 ? `${context.referenceImages.length}` : t('composer.refsTitle')}</small>
        </button>
        <button type="button" className={popoverStyles.choice} onClick={context.actions.openMaskPicker}>
          <strong>{t('composer.mask')}</strong>
          <small>{context.mask ? context.mask.name : t('composer.maskTitle')}</small>
        </button>
        {context.attachments.length > 0 && (
          <button type="button" className={`${popoverStyles.choice} ${popoverStyles.danger}`} onClick={context.actions.clearAttachments}>
            <strong>×</strong>
            <small>{t('composer.clearAttachments')}</small>
          </button>
        )}
      </FloatingPopover>
    </div>
  );
}
