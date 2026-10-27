import type { QueryImage } from '../domain/types';
import { hashBytes } from './hashBytes';

function readImageSize(previewUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = previewUrl;
  });
}

export async function createQueryImage(file: File): Promise<QueryImage> {
  const bytes = await file.arrayBuffer();
  const contentHash = await hashBytes(bytes);
  const previewUrl = URL.createObjectURL(file);
  const size = await readImageSize(previewUrl);

  return {
    id: `q-${contentHash.slice(0, 12)}`,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    byteSize: file.size,
    contentHash,
    width: size.width || undefined,
    height: size.height || undefined,
    previewUrl,
    bytes,
  };
}
