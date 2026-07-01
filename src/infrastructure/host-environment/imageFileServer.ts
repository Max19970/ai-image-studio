const temporaryImageFilesPath = '/api/storage/generation-task-downloads';

export interface ServerImageFileRequest {
  href: string;
  filename: string;
  storageAssetKey?: string;
}

interface ImageFileRegistrationRequest {
  filename: string;
  src?: string;
  storageAssetKey?: string;
}

interface ImageFileRegistrationResponse {
  url?: unknown;
  filename?: unknown;
  mediaType?: unknown;
}

export interface ResolvedServerImageFile {
  url: string;
  filename: string;
  mediaType: string;
  trustedImage: boolean;
}

export async function resolveServerImageFile(request: ServerImageFileRequest): Promise<ResolvedServerImageFile | null> {
  if (request.storageAssetKey) {
    return registerImageFile({ filename: request.filename, storageAssetKey: request.storageAssetKey });
  }

  if (/^data:image\//i.test(request.href)) return registerImageFile({ filename: request.filename, src: request.href });
  if (/^blob:/i.test(request.href)) {
    const dataUrl = await readBlobUrlAsDataUrl(request.href);
    return dataUrl ? registerImageFile({ filename: request.filename, src: dataUrl }) : null;
  }

  return null;
}

async function registerImageFile(request: ImageFileRegistrationRequest): Promise<ResolvedServerImageFile | null> {
  const response = await fetch(temporaryImageFilesPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  if (!response.ok) throw new Error(await response.text());

  const data = await response.json() as ImageFileRegistrationResponse;
  if (typeof data.url !== 'string') return null;

  const filename = typeof data.filename === 'string' && data.filename.trim() ? data.filename : request.filename;
  const mediaType = typeof data.mediaType === 'string' ? data.mediaType : '';
  return { url: data.url, filename, mediaType, trustedImage: /^image\//i.test(mediaType) };
}

async function readBlobUrlAsDataUrl(href: string): Promise<string | null> {
  const response = await fetch(href);
  if (!response.ok) return null;
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image blob.'));
    reader.readAsDataURL(blob);
  });
}
