import type { ElementDefinition } from '../../../../interface/registry/types';
import type { ImageDownloadActionContext } from '../../../../interface/context/adapters/imageDownload';
import { DownloadImageAction } from './DownloadImageAction';

type DownloadImageActionProps = {
  labelKey?: string;
  presentation?: 'link' | 'button';
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'default' | 'compact' | 'micro';
  tone?: 'neutral' | 'danger' | 'accent';
};

export default {
  id: 'imageActions.downloadImage',
  label: 'Download image',
  Component: DownloadImageAction,
  defaultProps: {
    labelKey: 'gallery.download',
    presentation: 'button',
    variant: 'secondary'
  },
  enabled: (context) => Boolean(context.href)
} satisfies ElementDefinition<ImageDownloadActionContext, DownloadImageActionProps>;
