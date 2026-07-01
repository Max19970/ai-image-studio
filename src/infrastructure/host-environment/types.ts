export interface HostEnvironmentState {
  id: string;
  available: boolean;
  platform?: string | null;
  authState?: string | null;
}

export interface HostAppDecorations {
  classNames?: readonly string[];
  dataAttributes?: Record<string, string | undefined>;
}

export interface HostImageFileRequest {
  href: string;
  filename: string;
  storageAssetKey?: string;
}

export interface HostImageFileTransport {
  id: string;
  isAvailable: () => boolean;
  saveImage: (input: HostImageFileRequest) => Promise<boolean>;
}

export interface HostEnvironmentDescriptor<TState extends HostEnvironmentState = HostEnvironmentState> {
  id: string;
  order?: number;
  useState: () => TState;
  getAppDecorations?: (state: TState) => HostAppDecorations;
  imageFileTransport?: HostImageFileTransport;
}
