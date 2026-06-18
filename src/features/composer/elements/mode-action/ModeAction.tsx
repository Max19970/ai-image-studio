import { useRef } from 'react';
import { FloatingPopover } from '../../../../shared/ui';
import { useI18n } from '../../../../i18n';
import { ActionIconButton } from '../../ui/ActionIconButton';
import type { ComposerActionContext } from '../../composerTypes';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import styles from './ModeAction.module.css';
import popoverStyles from '../../ui/ComposerPopover.module.css';

const popoverId = 'composer.mode';

export function ModeAction({ context }: ElementDefinitionProps<ComposerActionContext>) {
  const { t } = useI18n();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const open = context.openPopover === popoverId;

  return (
    <div className={`${styles.wrapper} ${open ? styles.open : ''}`} data-slot-contribution="mode">
      <ActionIconButton
        buttonRef={buttonRef}
        testId="composer-mode"
        icon="◐"
        label={`${t('composer.generate')} / ${t('composer.edit')}`}
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
        <button type="button" className={`${popoverStyles.choice} ${context.mode === 'generate' ? popoverStyles.active : ''}`} onClick={() => { context.actions.setMode('generate'); context.setOpenPopover(null); }}>
          <strong>{t('composer.generate')}</strong>
          <small>{t('composer.placeholder.generate')}</small>
        </button>
        <button type="button" className={`${popoverStyles.choice} ${context.mode === 'edit' ? popoverStyles.active : ''}`} onClick={() => { context.actions.setMode('edit'); context.setOpenPopover(null); }}>
          <strong>{t('composer.edit')}</strong>
          <small>{t('composer.placeholder.edit')}</small>
        </button>
      </FloatingPopover>
    </div>
  );
}
