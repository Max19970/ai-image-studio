import { useRef, useState, type ReactNode, type MouseEvent } from 'react';
import { BottomSheet, FloatingPopover } from '../../../../shared/ui';
import { useMediaQuery } from '../../../../shared/hooks/useMediaQuery';
import { useI18n } from '../../../../i18n';
import styles from './GalleryQuickActionMenu.module.css';

interface GalleryQuickActionMenuProps {
  children: (api: { close: () => void }) => ReactNode;
  triggerClassName?: string;
  panelClassName?: string;
  sheetClassName?: string;
}

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

function stopTileClick(event: MouseEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

export function GalleryQuickActionMenu({ children, triggerClassName, panelClassName, sheetClassName }: GalleryQuickActionMenuProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const isMobile = useMediaQuery('(max-width: 860px)');

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
      {!isMobile && (
        <FloatingPopover
          open={open}
          anchorRef={triggerRef}
          className={cx(styles.menuPanel, panelClassName)}
          placement="auto"
          offset={8}
          minWidth={188}
          role="menu"
          ariaLabel={t('gallery.quickActions')}
          returnFocusOnEscape={false}
          onDismiss={close}
        >
          <div className={styles.actionList} role="menu" aria-label={t('gallery.quickActions')}>
            {children({ close })}
          </div>
        </FloatingPopover>
      )}
      {isMobile && (
        <BottomSheet
          open={open}
          onClose={close}
          title={t('gallery.quickActions')}
          closeLabel={t('attachment.close')}
          size="compact"
          compactHeader
          ariaLabel={t('gallery.quickActions')}
          className={cx(styles.mobileSheet, sheetClassName)}
        >
          <div className={styles.actionList} role="menu" aria-label={t('gallery.quickActions')}>
            {children({ close })}
          </div>
        </BottomSheet>
      )}
    </>
  );
}
