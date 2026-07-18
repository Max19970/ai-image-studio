import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { getGalleryBreadcrumbs, getGalleryParentPath, galleryRootPath, normalizeGalleryPath } from '../../../../domain/galleryFilesystem';
import type { GalleryFolder } from '../../../../domain/galleryFilesystem';
import { hasGalleryDragPayload, readGalleryDragPayload } from '../../../../entities/gallery/galleryDrag';
import { galleryMetadataKey, galleryPinSet } from '../../../../entities/gallery/galleryMetadata';
import type { GalleryLayoutContext } from '../../../../interface/context/workspace/gallery';
import { useI18n } from '../../../../i18n';
import { ChevronRightIcon, FolderIcon, FolderOpenIcon, PinIcon } from '../../../../shared/ui';
import { GalleryFolderTreeToolbar } from './GalleryFolderTreeToolbar';
import styles from './GalleryFolderTree.module.css';

interface FolderTreeNode {
  folder: GalleryFolder;
  children: FolderTreeNode[];
}

interface GalleryFolderTreeProps {
  context: GalleryLayoutContext;
  activePath?: string;
  onSelectPath?: (path: string) => void;
  onNavigate?: () => void;
  compact?: boolean;
  showPinned?: boolean;
  showToolbar?: boolean;
  showToolbarTitle?: boolean;
}

function buildFolderTree(folders: GalleryFolder[]): FolderTreeNode[] {
  const knownPaths = new Set(folders.map((folder) => folder.path));
  const childrenByParent = new Map<string, GalleryFolder[]>();

  for (const folder of folders) {
    const parentPath = getGalleryParentPath(folder.path);
    const effectiveParent = parentPath === galleryRootPath || knownPaths.has(parentPath) ? parentPath : galleryRootPath;
    const siblings = childrenByParent.get(effectiveParent) ?? [];
    siblings.push(folder);
    childrenByParent.set(effectiveParent, siblings);
  }

  const createNodes = (parentPath: string): FolderTreeNode[] => [...(childrenByParent.get(parentPath) ?? [])]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((folder) => ({ folder, children: createNodes(folder.path) }));

  return createNodes(galleryRootPath);
}

function FolderBranch({
  node,
  depth,
  activePath,
  expandedPaths,
  onToggle,
  onNavigate,
  onDropItem
}: {
  node: FolderTreeNode;
  depth: number;
  activePath: string;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onNavigate: (path: string) => void;
  onDropItem: (path: string, dataTransfer: DataTransfer) => void;
}) {
  const { t } = useI18n();
  const expanded = expandedPaths.has(node.folder.path);
  const hasChildren = node.children.length > 0;
  const active = activePath === node.folder.path;
  const [dropActive, setDropActive] = useState(false);

  return (
    <li className={styles.branch}>
      <div className={styles.row} style={{ '--folder-depth': depth } as CSSProperties}>
        <button
          type="button"
          className={styles.disclosure}
          disabled={!hasChildren}
          aria-label={expanded ? t('gallery.folderTreeCollapse', { name: node.folder.name }) : t('gallery.folderTreeExpand', { name: node.folder.name })}
          aria-expanded={hasChildren ? expanded : undefined}
          onClick={() => onToggle(node.folder.path)}
        >
          {hasChildren ? <ChevronRightIcon size={16} /> : <span aria-hidden="true" />}
        </button>
        <button
          type="button"
          className={styles.folderButton}
          data-active={active}
          data-drop-active={dropActive}
          aria-current={active ? 'page' : undefined}
          onClick={() => onNavigate(node.folder.path)}
          onDragOver={(event) => {
            if (!hasGalleryDragPayload(event.dataTransfer)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            setDropActive(true);
          }}
          onDragLeave={() => setDropActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDropActive(false);
            onDropItem(node.folder.path, event.dataTransfer);
          }}
        >
          {expanded || active
            ? <FolderOpenIcon className={styles.folderIcon} size={20} />
            : <FolderIcon className={styles.folderIcon} size={20} />}
          <span>{node.folder.name}</span>
        </button>
      </div>
      {hasChildren && (
        <div
          className={styles.childrenDisclosure}
          data-expanded={expanded}
          aria-hidden={!expanded}
          inert={!expanded}
        >
          <ul className={styles.children}>
            {node.children.map((child) => (
              <FolderBranch
                key={child.folder.path}
                node={child}
                depth={depth + 1}
                activePath={activePath}
                expandedPaths={expandedPaths}
                onToggle={onToggle}
                onNavigate={onNavigate}
                onDropItem={onDropItem}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

export function GalleryFolderTree({
  context,
  activePath = context.activePath,
  onSelectPath,
  onNavigate,
  compact = false,
  showPinned = true,
  showToolbar = true,
  showToolbarTitle = true
}: GalleryFolderTreeProps) {
  const { t } = useI18n();
  const tree = useMemo(() => buildFolderTree(context.folders), [context.folders]);
  const pinKeys = useMemo(() => galleryPinSet(context.commands.galleryPins), [context.commands.galleryPins]);
  const pinnedFolders = context.folders.filter((folder) => pinKeys.has(galleryMetadataKey('folder', folder.path)));
  const pinnedTasks = context.allTasks.filter((task) => pinKeys.has(galleryMetadataKey('task', task.id)));
  const activeFolder = context.folders.find((folder) => folder.path === activePath) ?? null;
  const activeFolderPinned = activeFolder ? pinKeys.has(galleryMetadataKey('folder', activeFolder.path)) : false;
  const [rootDropActive, setRootDropActive] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set(
    getGalleryBreadcrumbs(activePath).map((crumb) => crumb.path).filter((path) => path !== galleryRootPath)
  ));

  useEffect(() => {
    const ancestors = getGalleryBreadcrumbs(activePath).map((crumb) => crumb.path).filter((path) => path !== galleryRootPath);
    setExpandedPaths((current) => new Set([...current, ...ancestors]));
  }, [activePath]);

  const navigate = (path: string) => {
    const normalized = normalizeGalleryPath(path);
    if (onSelectPath) onSelectPath(normalized);
    else context.commands.setActivePath(normalized);
    onNavigate?.();
  };

  const moveDroppedItem = (path: string, dataTransfer: DataTransfer) => {
    const payload = readGalleryDragPayload(dataTransfer);
    if (!payload) return;
    void context.commands.moveItem(payload.itemKind, payload.itemId, path).catch((error) => {
      window.alert(error instanceof Error ? error.message : String(error));
    });
  };

  const toggle = (path: string) => {
    setExpandedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <>
      <nav className={`${styles.tree} ${compact ? styles.compact : ''}`} aria-label={t('gallery.folderTree')}>
        {showToolbar && (
          <GalleryFolderTreeToolbar
            context={context}
            activePath={activePath}
            activeFolder={activeFolder}
            activeFolderPinned={activeFolderPinned}
            showTitle={showToolbarTitle}
            onFolderCreated={() => setExpandedPaths((current) => new Set([...current, activePath]))}
          />
        )}

        <div className={styles.scrollArea}>
          {showPinned && (pinnedFolders.length > 0 || pinnedTasks.length > 0) && (
            <section className={styles.section}>
              <h3>{t('gallery.folderTreePinned')}</h3>
              <div className={styles.pinnedList}>
                {pinnedFolders.map((folder) => (
                  <button key={folder.path} type="button" className={styles.pinnedItem} onClick={() => navigate(folder.path)}>
                    <PinIcon className={styles.pinIcon} />
                    <span>{folder.name}</span>
                  </button>
                ))}
                {pinnedTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    className={styles.pinnedItem}
                    onClick={() => {
                      context.commands.setActivePath(normalizeGalleryPath(task.galleryPaths?.[0] ?? task.galleryPath));
                      context.commands.openTaskDetail(task);
                      onNavigate?.();
                    }}
                  >
                    <PinIcon className={styles.pinIcon} />
                    <span>{task.request.prompt || task.request.modelLabel || task.id}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className={styles.section}>
            {!showToolbar && <h3>{t('gallery.folderTreeFolders')}</h3>}
            <button
              type="button"
              className={styles.rootButton}
              data-active={activePath === galleryRootPath}
              data-drop-active={rootDropActive}
              aria-current={activePath === galleryRootPath ? 'page' : undefined}
              onClick={() => navigate(galleryRootPath)}
              onDragOver={(event) => {
                if (!hasGalleryDragPayload(event.dataTransfer)) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setRootDropActive(true);
              }}
              onDragLeave={() => setRootDropActive(false)}
              onDrop={(event) => {
                event.preventDefault();
                setRootDropActive(false);
                moveDroppedItem(galleryRootPath, event.dataTransfer);
              }}
            >
              {activePath === galleryRootPath ? <FolderOpenIcon size={20} /> : <FolderIcon size={20} />}
              <span>{t('gallery.rootFolder')}</span>
            </button>
            {tree.length > 0 ? (
              <ul className={styles.rootList}>
                {tree.map((node) => (
                  <FolderBranch
                    key={node.folder.path}
                    node={node}
                    depth={0}
                    activePath={activePath}
                    expandedPaths={expandedPaths}
                    onToggle={toggle}
                    onNavigate={navigate}
                    onDropItem={moveDroppedItem}
                  />
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>{t('gallery.folderTreeEmpty')}</p>
            )}
          </section>
        </div>
      </nav>
    </>
  );
}
