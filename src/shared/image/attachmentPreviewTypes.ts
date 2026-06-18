export type AttachmentPreviewItem = {
  id: string;
  role: 'target' | 'reference' | 'mask';
  label: string;
  name: string;
  size: number;
  type?: string;
  previewUrl?: string;
  lastModified?: number;
};
