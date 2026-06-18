import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { SlotHost } from '../../../../interface/SlotHost';
import type { GalleryLayoutContext, GalleryTaskCardContext } from '../../../../interface/context/workspace/gallery';
import { useI18n } from '../../../../i18n';
import styles from '../../../gallery/ResultsGallery.module.css';

export function GalleryGridSection({ context }: ElementDefinitionProps<GalleryLayoutContext>) {
  const { t } = useI18n();

  return (
    <>
      <div className={styles.grid} data-gallery-slot="grid">
        {context.tasks.map((task, index) => (
          <SlotHost<GalleryTaskCardContext>
            key={task.id}
            slot="gallery/card"
            context={{
              task,
              index,
              onOpenTask: (image) => context.commands.openTaskDetail(task, image),
              onDeleteTask: () => context.commands.deleteTask(task.id)
            }}
            as={null}
          />
        ))}
      </div>
      {context.archive.hasMore && (
        <div className={styles.loadMoreWrap}>
          <button type="button" className={styles.loadMoreButton} onClick={context.archive.showMore}>
            {t('gallery.loadMore', { count: Math.min(context.archive.pageSize, context.archive.filteredCount - context.archive.visibleCount) })}
          </button>
          <span>{t('gallery.visibleSummary', { visible: context.archive.visibleCount, filtered: context.archive.filteredCount })}</span>
        </div>
      )}
    </>
  );
}
