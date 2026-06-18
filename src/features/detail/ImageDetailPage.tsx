import { useEffect, useState } from 'react';
import type { GeneratedImage, GenerationTask } from '../../domain/generationTask';
import type { DetailCommands } from '../../interface/context/commands';
import { SlotHost } from '../../interface/SlotHost';
import type { DetailLayoutContext } from '../../interface/context/workspace/detail';
import { isTerminalGenerationStatus } from '../../domain/generationStatus';
import { expectedImageCount, useDetailStatusLabel } from './detailUi';
import { useHydratedDetailAssets } from './model/useHydratedDetailAssets';
import styles from './ImageDetailPage.module.css';

interface Props {
  task: GenerationTask;
  image?: GeneratedImage | null;
  commands: DetailCommands;
}

export function ImageDetailPage({ task, image, commands }: Props) {
  const [requestOpen, setRequestOpen] = useState(true);
  const expected = expectedImageCount(task);
  const hasPendingSlide = !isTerminalGenerationStatus(task.status) && task.images.length < expected;
  const shouldUseCarousel = Boolean(task.batch) || task.images.length > 1 || hasPendingSlide;
  const fallbackActiveImage = image ?? task.images[0] ?? null;
  const [activeImage, setActiveImage] = useState<GeneratedImage | null>(fallbackActiveImage);
  const label = useDetailStatusLabel(task.status);
  const hydrated = useHydratedDetailAssets(task, activeImage);

  useEffect(() => {
    setActiveImage(image ?? task.images[0] ?? null);
  }, [image, task.images]);

  const layoutContext: DetailLayoutContext = {
    task: hydrated.task,
    activeImage: hydrated.activeImage,
    fallbackActiveImage: hydrated.activeImage ?? fallbackActiveImage,
    label,
    requestOpen,
    shouldUseCarousel,
    onBack: commands.backToGallery,
    onSelectImage: commands.selectImage,
    onRestoreRequest: commands.restoreRequest,
    setActiveImage,
    setRequestOpen
  };

  return (
    <main className={styles.page} data-testid="detail-page">
      <div className={styles.shell}>
        <SlotHost<DetailLayoutContext> slot="detail/topbar" context={layoutContext} as={null} />
        <SlotHost<DetailLayoutContext> slot="detail/hero" context={layoutContext} as={null} />
        <SlotHost<DetailLayoutContext> slot="detail/request-drawer" context={layoutContext} as={null} />
      </div>
    </main>
  );
}
