import { useRef, useState } from 'react';
import { useI18n } from '../../../../i18n';
import { copyText } from '../../../../domain/clipboard';
import { Button, BottomSheet, FloatingPopover } from '../../../../shared/ui';
import type { DetailActionContext } from '../../../../interface/context/workspace/detail';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { sentParameters } from '../../sentParameters';
import styles from './DetailCopyMenuAction.module.css';

export function DetailCopyMenuAction({ context }: ElementDefinitionProps<DetailActionContext>) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const close = () => setOpen(false);

  const copyPrompt = () => {
    copyText(context.snapshot.prompt);
    close();
  };

  const copyPayload = () => {
    copyText(JSON.stringify(context.snapshot.payload, null, 2));
    close();
  };

  const copyParams = () => {
    copyText(JSON.stringify(sentParameters(context.snapshot, t), null, 2));
    close();
  };

  const list = (
    <div className={styles.actionList} role="menu" aria-label={t('detail.copyMenu')}>
      <Button variant="ghost" size="compact" fullWidth role="menuitem" onClick={copyPrompt}>{t('detail.copyPrompt')}</Button>
      <Button variant="ghost" size="compact" fullWidth role="menuitem" onClick={copyPayload}>{context.isBatchSnapshot ? t('detail.copyBatchPayload') : t('detail.copyPayload')}</Button>
      {!context.isBatchSnapshot && <Button variant="ghost" size="compact" fullWidth role="menuitem" onClick={copyParams}>{t('detail.copyParams')}</Button>}
    </div>
  );

  return (
    <span ref={triggerRef} className={styles.wrapper}>
      <Button
        variant="secondary"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {t('detail.copyMenu')}
      </Button>
      <FloatingPopover
        open={open}
        anchorRef={triggerRef}
        className={styles.menuPanel}
        placement="auto"
        offset={8}
        minWidth={194}
        role="menu"
        ariaLabel={t('detail.copyMenu')}
        returnFocusOnEscape={false}
        onDismiss={close}
      >
        {list}
      </FloatingPopover>
      <BottomSheet
        open={open}
        onClose={close}
        title={t('detail.copyMenu')}
        description={t('detail.copyMenuDescription')}
        closeLabel={t('attachment.close')}
        size="compact"
        compactHeader
        ariaLabel={t('detail.copyMenu')}
        className={styles.mobileSheet}
      >
        {list}
      </BottomSheet>
    </span>
  );
}
