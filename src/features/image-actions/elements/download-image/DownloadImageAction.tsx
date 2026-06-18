import type { MouseEvent } from 'react';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui';
import type { ButtonProps } from '../../../../shared/ui';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { ImageDownloadActionContext } from '../../../../interface/context/adapters/imageDownload';
import { loadGenerationTaskAsset } from '../../../../infrastructure/storage/remoteGenerationTaskHistoryStore';
import styles from './DownloadImageAction.module.css';

type DownloadImageActionProps = {
  labelKey?: string;
  presentation?: 'link' | 'button';
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  tone?: ButtonProps['tone'];
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
  const label = t(props.labelKey ?? 'gallery.download');

  const handleClick = async (event: MouseEvent<HTMLElement>) => {
    context.onClick?.(event);
    if (!context.storageAssetKey || context.storageAssetLoaded !== false) return;

    event.preventDefault();
    const fullImage = await loadGenerationTaskAsset(context.storageAssetKey);
    if (fullImage?.src) triggerDownload(fullImage.src, context.filename);
  };

  if (props.presentation === 'link') {
    return (
      <a className={styles.link} href={context.href} download={context.filename} onClick={handleClick}>
        {label}
      </a>
    );
  }

  return (
    <Button
      variant={props.variant ?? 'secondary'}
      size={props.size ?? 'default'}
      tone={props.tone ?? 'neutral'}
      href={context.href}
      download={context.filename}
      onClick={handleClick}
    >
      {label}
    </Button>
  );
}
