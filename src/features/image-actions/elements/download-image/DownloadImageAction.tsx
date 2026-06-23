import type { MouseEvent } from 'react';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui';
import type { ButtonProps } from '../../../../shared/ui';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { ImageDownloadActionContext } from '../../../../interface/context/adapters/imageDownload';
import {
  assetDownloadHref,
  isTelegramMiniAppDownloadRoute,
  requestDownloadFallback,
  requestTelegramDownloadFallback,
  shouldRouteThroughServer
} from './downloadImageRequest';
import styles from './DownloadImageAction.module.css';

type DownloadImageActionProps = {
  labelKey?: string;
  presentation?: 'link' | 'button';
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  tone?: ButtonProps['tone'];
  fullWidth?: ButtonProps['fullWidth'];
};

function resolveDownloadHref(context: ImageDownloadActionContext, sourceHref: string): string {
  return context.storageAssetKey ? assetDownloadHref(context.storageAssetKey, context.filename) : sourceHref;
}

export function DownloadImageAction({ context, props }: ElementDefinitionProps<ImageDownloadActionContext, DownloadImageActionProps>) {
  const { t } = useI18n();
  if (!context.href) return null;
  const href = resolveDownloadHref(context, context.href);
  const sourceHref = context.href;
  const label = t(props.labelKey ?? 'gallery.download');

  const handleClick = async (event: MouseEvent<HTMLElement>) => {
    context.onClick?.(event);

    if (isTelegramMiniAppDownloadRoute()) {
      event.preventDefault();
      await requestTelegramDownloadFallback({ href, sourceHref, filename: context.filename, storageAssetKey: context.storageAssetKey });
      return;
    }

    if (!shouldRouteThroughServer(sourceHref, context.storageAssetKey)) return;

    event.preventDefault();
    await requestDownloadFallback({
      href,
      sourceHref,
      filename: context.filename,
      storageAssetKey: context.storageAssetKey,
      storageAssetLoaded: context.storageAssetLoaded
    });
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
