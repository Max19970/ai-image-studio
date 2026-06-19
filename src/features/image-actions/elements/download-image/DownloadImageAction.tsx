import type { MouseEvent } from 'react';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui';
import type { ButtonProps } from '../../../../shared/ui';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { ImageDownloadActionContext } from '../../../../interface/context/adapters/imageDownload';
import { loadGenerationTaskAsset } from '../../../../infrastructure/storage/remoteGenerationTaskHistoryStore';
import { requestTelegramMiniAppImageDownload, shouldUseTelegramMiniAppDownload } from '../../../../integrations/telegram-mini-app';
import styles from './DownloadImageAction.module.css';

type DownloadImageActionProps = {
  labelKey?: string;
  presentation?: 'link' | 'button';
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  tone?: ButtonProps['tone'];
  fullWidth?: ButtonProps['fullWidth'];
};

function triggerDownload(href: string, filename: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function DownloadImageAction({ context, props }: ElementDefinitionProps<ImageDownloadActionContext, DownloadImageActionProps>) {
  const { t } = useI18n();
  if (!context.href) return null;
  const href = context.href;
  const label = t(props.labelKey ?? 'gallery.download');

  const handleClick = async (event: MouseEvent<HTMLElement>) => {
    context.onClick?.(event);

    if (shouldUseTelegramMiniAppDownload()) {
      event.preventDefault();
      try {
        const handled = await requestTelegramMiniAppImageDownload({ href, filename: context.filename, storageAssetKey: context.storageAssetKey });
        if (handled) return;
      } catch (error) {
        console.warn('Telegram Mini App file action was not completed.', error);
      }

      if (context.storageAssetKey && context.storageAssetLoaded === false) {
        const fullImage = await loadGenerationTaskAsset(context.storageAssetKey);
        if (fullImage?.src) triggerDownload(fullImage.src, context.filename);
      } else {
        triggerDownload(href, context.filename);
      }
      return;
    }

    if (!context.storageAssetKey || context.storageAssetLoaded !== false) return;

    event.preventDefault();
    const fullImage = await loadGenerationTaskAsset(context.storageAssetKey);
    if (fullImage?.src) triggerDownload(fullImage.src, context.filename);
  };

  if (props.presentation === 'link') {
    return (
      <a className={styles.link} href={href} download={context.filename} onClick={handleClick}>
        {label}
      </a>
    );
  }

  return (
    <Button
      variant={props.variant ?? 'secondary'}
      size={props.size ?? 'default'}
      tone={props.tone ?? 'neutral'}
      fullWidth={Boolean(props.fullWidth)}
      href={href}
      download={context.filename}
      onClick={handleClick}
    >
      {label}
    </Button>
  );
}
