import { useRef } from 'react';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { BottomSheet, FloatingPopover } from '../../../../shared/ui';
import { useMediaQuery } from '../../../../shared/hooks/useMediaQuery';
import { useI18n } from '../../../../i18n';
import type { ComposerActionContext } from '../../../composer/composerTypes';
import popoverStyles from '../../../composer/ui/ComposerPopover.module.css';
import styles from './RequestPresetMenuAction.module.css';
import { PresetPanel } from './RequestPresetPanel';
import { RequestPresetManagerDialog } from './RequestPresetManagerDialog';
import {
  createComposerPresetManagerController,
  type RequestPresetManagerController
} from './requestPresetMenuController';

export { RequestPresetManagerDialog, createComposerPresetManagerController };
export type { RequestPresetManagerController };

const popoverId = 'request-presets.menu';

export function RequestPresetMenuAction({ context }: ElementDefinitionProps<ComposerActionContext>) {
  const { t } = useI18n();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const isMobile = useMediaQuery('(max-width: 860px)');
  const open = context.openPopover === popoverId;
  const toggle = () => context.setOpenPopover((value) => value === popoverId ? null : popoverId);
  const close = () => context.setOpenPopover(null);
  const controller = createComposerPresetManagerController(context);

  return (
    <div className={styles.wrapper} data-slot-contribution="request-presets">
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        data-testid="composer-request-presets"
        data-open={open ? 'true' : 'false'}
        aria-label={t('requestPresets.title')}
        aria-expanded={open}
        onClick={toggle}
      >
        <span aria-hidden="true">✦</span>
        {context.requestPresets.length > 0 && <em>{context.requestPresets.length}</em>}
      </button>

      {!isMobile && (
        <FloatingPopover
          open={open}
          anchorRef={buttonRef}
          className={`${popoverStyles.panel} composer-inline-popover`}
          placement="auto"
          offset={10}
          minWidth={390}
          onDismiss={close}
        >
          <PresetPanel controller={controller} close={close} />
        </FloatingPopover>
      )}

      {isMobile && (
        <BottomSheet
          open={open}
          title={t('requestPresets.title')}
          description={t('requestPresets.description')}
          size="content"
          compactHeader
          scrollHint
          onClose={close}
        >
          <PresetPanel controller={controller} close={close} />
        </BottomSheet>
      )}
    </div>
  );
}
