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
  const expected = expectedImageCount(task);
  const hasPendingSlide = !isTerminalGenerationStatus(task.status) && task.images.length < expected;
  const shouldUseCarousel = Boolean(task.batch) || task.images.length > 1 || hasPendingSlide;
  const preferredActiveImage = image ?? (!isTerminalGenerationStatus(task.status) ? task.images[task.images.length - 1] : task.images[0]) ?? null;
  const fallbackActiveImage = preferredActiveImage;
  const [activeImage, setActiveImage] = useState<GeneratedImage | null>(fallbackActiveImage);
  const label = useDetailStatusLabel(task.status);
  const hydrated = useHydratedDetailAssets(task, activeImage);

  useEffect(() => {
    setActiveImage(image ?? (!isTerminalGenerationStatus(task.status) ? task.images[task.images.length - 1] : task.images[0]) ?? null);
  }, [image, task.images, task.status]);

  const layoutContext: DetailLayoutContext = {
    task: hydrated.task,
    activeImage: hydrated.activeImage,
    fallbackActiveImage: hydrated.activeImage ?? fallbackActiveImage,
    label,
    shouldUseCarousel,
    onBack: commands.backToGallery,
    onSelectImage: commands.selectImage,
    onRestoreRequest: commands.restoreRequest,
    onStartHiresFix: commands.startHiresFix,
    onCancelTask: commands.cancelTask,
    setActiveImage
  };

  return (
    <main className={styles.page} data-testid="detail-page">
      <div className={styles.shell}>
        <SlotHost<DetailLayoutContext> slot="detail/topbar" context={layoutContext} as={null} />
        <div className={styles.workspace} data-detail-workspace>
          <SlotHost<DetailLayoutContext> slot="detail/hero" context={layoutContext} className={styles.stageColumn} />
          <SlotHost<DetailLayoutContext> slot="detail/request-drawer" context={layoutContext} className={styles.inspectorColumn} />
        </div>
      </div>
    </main>
  );
}
