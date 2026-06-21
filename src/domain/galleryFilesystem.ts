export const galleryRootPath = '/';

export interface GalleryFolder {
  id: string;
  path: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface GalleryFolderDraft {
  parentPath: string;
  name: string;
}

export type GalleryItemKind = 'folder' | 'task';

export interface GalleryPathBreadcrumb {
  label: string;
  path: string;
}

function normalizeSegment(segment: string): string {
  return segment.trim().replace(/[\\/]+/g, ' ').replace(/\s+/g, ' ');
}

export function normalizeGalleryPath(value: unknown): string {
  if (typeof value !== 'string') return galleryRootPath;
  const normalized = value.replace(/\\/g, '/').trim();
  if (!normalized || normalized === galleryRootPath) return galleryRootPath;
  const segments = normalized
    .split('/')
    .map((segment) => normalizeSegment(segment))
    .filter((segment) => segment && segment !== '.' && segment !== '..');
  return segments.length > 0 ? `/${segments.join('/')}` : galleryRootPath;
}

export function normalizeGalleryPaths(value: unknown, fallback: unknown = galleryRootPath): string[] {
  const source = Array.isArray(value) ? value : [value ?? fallback];
  const paths: string[] = [];
  for (const item of source) {
    const path = normalizeGalleryPath(item);
    if (!paths.includes(path)) paths.push(path);
  }
  return paths.length > 0 ? paths : [galleryRootPath];
}

export function addGalleryPath(paths: unknown, path: unknown): string[] {
  return normalizeGalleryPaths([...normalizeGalleryPaths(paths), normalizeGalleryPath(path)]);
}

export function removeGalleryPath(paths: unknown, path: unknown): string[] {
  const target = normalizeGalleryPath(path);
  const next = normalizeGalleryPaths(paths).filter((item) => item !== target);
  return next.length > 0 ? next : [galleryRootPath];
}

export function normalizeGalleryFolderName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return normalizeSegment(value).slice(0, 80);
}

export function getGalleryParentPath(path: string): string {
  const normalized = normalizeGalleryPath(path);
  if (normalized === galleryRootPath) return galleryRootPath;
  const segments = normalized.split('/').filter(Boolean);
  segments.pop();
  return segments.length > 0 ? `/${segments.join('/')}` : galleryRootPath;
}

export function getGalleryPathName(path: string): string {
  const normalized = normalizeGalleryPath(path);
  if (normalized === galleryRootPath) return 'Gallery';
  return normalized.split('/').filter(Boolean).at(-1) ?? 'Gallery';
}

export function joinGalleryPath(parentPath: string, name: string): string {
  const folderName = normalizeGalleryFolderName(name);
  if (!folderName) return normalizeGalleryPath(parentPath);
  const parent = normalizeGalleryPath(parentPath);
  return normalizeGalleryPath(parent === galleryRootPath ? `/${folderName}` : `${parent}/${folderName}`);
}

export function createGalleryFolderDraft(parentPath: string, name: string, now = Date.now()): GalleryFolder | null {
  const folderName = normalizeGalleryFolderName(name);
  if (!folderName) return null;
  const path = joinGalleryPath(parentPath, folderName);
  return {
    id: path,
    path,
    name: getGalleryPathName(path),
    createdAt: now,
    updatedAt: now
  };
}

export function normalizeGalleryFolder(value: unknown): GalleryFolder | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Partial<GalleryFolder>;
  const path = normalizeGalleryPath(source.path ?? source.id);
  if (path === galleryRootPath) return null;
  const name = normalizeGalleryFolderName(source.name) || getGalleryPathName(path);
  const createdAt = Number(source.createdAt ?? Date.now());
  const updatedAt = Number(source.updatedAt ?? createdAt);
  return {
    id: path,
    path,
    name,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now()
  };
}

export function normalizeGalleryFolders(value: unknown): GalleryFolder[] {
  if (!Array.isArray(value)) return [];
  const byPath = new Map<string, GalleryFolder>();
  for (const folderLike of value) {
    const folder = normalizeGalleryFolder(folderLike);
    if (!folder) continue;
    byPath.set(folder.path, folder);
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export function getGalleryBreadcrumbs(path: string): GalleryPathBreadcrumb[] {
  const normalized = normalizeGalleryPath(path);
  const breadcrumbs: GalleryPathBreadcrumb[] = [{ label: 'Gallery', path: galleryRootPath }];
  let current = '';
  for (const segment of normalized.split('/').filter(Boolean)) {
    current = `${current}/${segment}`;
    breadcrumbs.push({ label: segment, path: normalizeGalleryPath(current) });
  }
  return breadcrumbs;
}

export function isGalleryPathInside(path: string, parentPath: string): boolean {
  const normalized = normalizeGalleryPath(path);
  const parent = normalizeGalleryPath(parentPath);
  if (parent === galleryRootPath) return normalized !== galleryRootPath;
  return normalized.startsWith(`${parent}/`);
}

export function mapGallerySubPath(path: string, sourcePath: string, targetPath: string): string {
  const normalizedPath = normalizeGalleryPath(path);
  const source = normalizeGalleryPath(sourcePath);
  const target = normalizeGalleryPath(targetPath);
  const suffix = normalizedPath === source ? '' : normalizedPath.slice(source.length);
  return normalizeGalleryPath(`${target}${suffix}`);
}
