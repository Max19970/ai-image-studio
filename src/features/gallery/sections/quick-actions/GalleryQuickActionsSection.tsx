import { useRef, useState, type MouseEvent } from 'react';
import { Button, BottomSheet, FloatingPopover } from '../../../../shared/ui';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { GalleryCardActionContext } from '../../../../interface/context/workspace/gallery';
import { SlotHost } from '../../../../interface/SlotHost';
import { useI18n } from '../../../../i18n';
import styles from './GalleryQuickActionsSection.module.css';

function stopTileClick(event: MouseEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function GalleryActionList({ context, onAction }: { context: GalleryCardActionContext; onAction: () => void }) {
  const { t } = useI18n();

  const openDetails = () => {
    context.onOpenTask(context.activeImage ?? undefined);
    onAction();
  };

  const closeAfterChildAction = () => {
    window.requestAnimationFrame(onAction);
  };

  return (
    <div className={styles.actionList} role="menu" aria-label={t('gallery.quickActions')} onClick={closeAfterChildAction}>
      <Button variant="ghost" size="compact" fullWidth className={styles.actionItem} role="menuitem" onClick={openDetails}>
        {t('gallery.actionOpenDetails')}
      </Button>
      <SlotHost<GalleryCardActionContext> slot="gallery/card-menu-actions" context={context} as={null} />
    </div>
  );
}

export function GalleryQuickActionsSection({ context }: ElementDefinitionProps<GalleryCardActionContext>) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const close = () => setOpen(false);
  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    stopTileClick(event);
    setOpen((value) => !value);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        data-testid="gallery-quick-actions"
        aria-label={t('gallery.quickActionsOpen')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        <svg className={styles.dotsIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="6" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="18" cy="12" r="1.7" />
        </svg>
      </button>
      <FloatingPopover
        open={open}
        anchorRef={triggerRef}
        className={styles.menuPanel}
        placement="auto"
        offset={8}
        minWidth={188}
        role="menu"
        ariaLabel={t('gallery.quickActions')}
        returnFocusOnEscape={false}
        onDismiss={close}
      >
        <GalleryActionList context={context} onAction={close} />
      </FloatingPopover>
      <BottomSheet
        open={open}
        onClose={close}
        title={t('gallery.quickActions')}
        size="compact"
        compactHeader
        ariaLabel={t('gallery.quickActions')}
        className={styles.mobileSheet}
      >
        <GalleryActionList context={context} onAction={close} />
      </BottomSheet>
    </>
  );
}
