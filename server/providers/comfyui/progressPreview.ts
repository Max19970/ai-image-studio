import type { ProviderPreviewStreamMode } from '../types';

const COMFYUI_PREVIEW_THROTTLE_MS = 2_500;
const COMFYUI_THROTTLED_PREVIEW_MAX_BYTES = 1_500_000;

interface ComfyUiPreviewThrottleState {
  lastEmittedAt: number;
}

export function createPreviewThrottleState(): ComfyUiPreviewThrottleState {
  return { lastEmittedAt: 0 };
}

export function normalizePreviewStreamMode(mode?: ProviderPreviewStreamMode): ProviderPreviewStreamMode {
  return mode ?? 'throttled';
}

export function shouldEmitPreview(
  preview: { bytes: Buffer },
  mode: ProviderPreviewStreamMode,
  state: ComfyUiPreviewThrottleState,
  now = Date.now()
): boolean {
  if (mode === 'off') return false;
  if (mode === 'full') return true;
  if (preview.bytes.length > COMFYUI_THROTTLED_PREVIEW_MAX_BYTES) return false;
  if (state.lastEmittedAt > 0 && now - state.lastEmittedAt < COMFYUI_PREVIEW_THROTTLE_MS) return false;
  state.lastEmittedAt = now;
  return true;
}

function hasImageSignature(buffer: Buffer, offset: number): boolean {
  if (buffer.length <= offset + 4) return false;
  const png = buffer[offset] === 0x89 && buffer[offset + 1] === 0x50 && buffer[offset + 2] === 0x4e && buffer[offset + 3] === 0x47;
  const jpeg = buffer[offset] === 0xff && buffer[offset + 1] === 0xd8;
  const webp = buffer.toString('ascii', offset, offset + 4) === 'RIFF' && buffer.toString('ascii', offset + 8, offset + 12) === 'WEBP';
  return png || jpeg || webp;
}

function detectImageFormat(buffer: Buffer): string {
  if (hasImageSignature(buffer, 0)) {
    if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpeg';
    if (buffer.toString('ascii', 0, 4) === 'RIFF') return 'webp';
  }
  return 'png';
}

export function extractPreviewImage(buffer: Buffer): { bytes: Buffer; format: string } | null {
  const stableOffsets = [0, 8, 12];
  const stableOffset = stableOffsets.find((candidate) => hasImageSignature(buffer, candidate));
  if (stableOffset !== undefined) {
    const bytes = buffer.subarray(stableOffset);
    return { bytes, format: detectImageFormat(bytes) };
  }

  const scanLimit = Math.min(buffer.length - 12, 64 * 1024);
  for (let offset = 0; offset <= scanLimit; offset += 1) {
    if (!hasImageSignature(buffer, offset)) continue;
    const bytes = buffer.subarray(offset);
    return { bytes, format: detectImageFormat(bytes) };
  }
  return null;
}

export async function messageDataToBuffer(data: unknown): Promise<Buffer> {
  if (data instanceof Blob) return Buffer.from(await data.arrayBuffer());
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (Buffer.isBuffer(data)) return data;
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  return Buffer.from(await new Response(data as BodyInit).arrayBuffer());
}
