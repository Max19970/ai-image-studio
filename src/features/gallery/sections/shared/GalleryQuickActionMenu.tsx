import { useRef, useState, type ReactNode, type MouseEvent } from 'react';
import { BottomSheet, EllipsisIcon, FloatingPopover } from '../../../../shared/ui';
import { useMediaQuery } from '../../../../shared/hooks/useMediaQuery';
import { useI18n } from '../../../../i18n';
import styles from './GalleryQuickActionMenu.module.css';

interface GalleryQuickActionMenuProps {
  children: (api: { close: () => void }) => ReactNode;
  triggerClassName?: string;
  panelClassName?: string;
  sheetClassName?: string;
  triggerLabel?: string;
  menuLabel?: string;
  testId?: string;
}

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

function stopTileClick(event: MouseEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

export function GalleryQuickActionMenu({
  children,
  triggerClassName,
  panelClassName,
  sheetClassName,
  triggerLabel,
  menuLabel,
  testId = 'gallery-quick-actions'
}: GalleryQuickActionMenuProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const isMobile = useMediaQuery('(max-width: 860px)');
  const resolvedTriggerLabel = triggerLabel ?? t('gallery.quickActionsOpen');
  const resolvedMenuLabel = menuLabel ?? t('gallery.quickActions');

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
        className={cx(styles.trigger, triggerClassName)}
        data-testid={testId}
        aria-label={resolvedTriggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        <EllipsisIcon className={styles.dotsIcon} size={20} strokeWidth={2} />
      </button>
      {!isMobile && (
        <FloatingPopover
          open={open}
          anchorRef={triggerRef}
          className={cx(styles.menuPanel, panelClassName)}
          placement="auto"
          offset={8}
          minWidth={188}
          role="menu"
          ariaLabel={resolvedMenuLabel}
          returnFocusOnEscape={false}
          onDismiss={close}
        >
          <div className={styles.actionList} role="menu" aria-label={resolvedMenuLabel}>
            {children({ close })}
          </div>
        </FloatingPopover>
      )}
      {isMobile && (
        <BottomSheet
          open={open}
          onClose={close}
          title={resolvedMenuLabel}
          closeLabel={t('attachment.close')}
          size="compact"
          compactHeader
          ariaLabel={resolvedMenuLabel}
          className={cx(styles.mobileSheet, sheetClassName)}
        >
          <div className={styles.actionList} role="menu" aria-label={resolvedMenuLabel}>
            {children({ close })}
          </div>
        </BottomSheet>
      )}
    </>
  );
}
