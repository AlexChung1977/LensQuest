import { buildSaveRelativePath } from '../../domain/storagePolicy';

export interface ManifestEntry {
  fileName: string;
  relativePath: string;
  sourceUrl: string;
  hitId: string;
  score: number;
  savedAt: string;
}

export interface SaveManifest {
  queryHash: string;
  saveRootLabel: string;
  createdAt: string;
  entries: ManifestEntry[];
}

export interface FileStoreSaveRequest {
  queryHash: string;
  saveRootLabel: string;
  files: Array<{
    hitId: string;
    sourceUrl: string;
    score: number;
    bytes: ArrayBuffer;
    extension: string;
    index: number;
  }>;
}

export interface FileStoreSaveResult {
  manifest: SaveManifest;
  savedPaths: string[];
  mode: 'directory' | 'download';
}

type DirectoryPickerWindow = Window &
  typeof globalThis & {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
  };

async function ensureDir(
  root: FileSystemDirectoryHandle,
  segments: string[],
): Promise<FileSystemDirectoryHandle> {
  let current = root;
  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment, { create: true });
  }
  return current;
}

async function writeFile(
  dir: FileSystemDirectoryHandle,
  name: string,
  bytes: ArrayBuffer,
): Promise<void> {
  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(bytes);
  await writable.close();
}

function triggerBrowserDownload(fileName: string, bytes: ArrayBuffer, mime = 'application/octet-stream') {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Browser FileStore: prefers File System Access API directory write,
 * falls back to individual downloads named after the relative path.
 */
export async function saveWithBrowserFileStore(
  request: FileStoreSaveRequest,
): Promise<FileStoreSaveResult> {
  const entries: ManifestEntry[] = [];
  const savedPaths: string[] = [];
  const win = window as DirectoryPickerWindow;

  const tryDirectory = typeof win.showDirectoryPicker === 'function';

  if (tryDirectory) {
    try {
      const root = await win.showDirectoryPicker!();
      for (const file of request.files) {
        const relative = buildSaveRelativePath(
          request.queryHash,
          file.index,
          file.extension,
        );
        const parts = relative.split('/');
        const fileName = parts.pop()!;
        const dir = await ensureDir(root, parts);
        await writeFile(dir, fileName, file.bytes);
        entries.push({
          fileName,
          relativePath: relative,
          sourceUrl: file.sourceUrl,
          hitId: file.hitId,
          score: file.score,
          savedAt: new Date().toISOString(),
        });
        savedPaths.push(`${request.saveRootLabel}/${relative}`);
      }

      const manifest: SaveManifest = {
        queryHash: request.queryHash,
        saveRootLabel: request.saveRootLabel,
        createdAt: new Date().toISOString(),
        entries,
      };
      const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest, null, 2));
      await writeFile(root, `manifest-${request.queryHash.slice(0, 8)}.json`, manifestBytes.buffer);

      return { manifest, savedPaths, mode: 'directory' };
    } catch (error) {
      // User abort or unsupported — fall through to download mode.
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
    }
  }

  for (const file of request.files) {
    const relative = buildSaveRelativePath(request.queryHash, file.index, file.extension);
    const safeName = relative.replaceAll('/', '__');
    triggerBrowserDownload(safeName, file.bytes, `image/${file.extension === 'jpg' ? 'jpeg' : file.extension}`);
    entries.push({
      fileName: safeName,
      relativePath: relative,
      sourceUrl: file.sourceUrl,
      hitId: file.hitId,
      score: file.score,
      savedAt: new Date().toISOString(),
    });
    savedPaths.push(`${request.saveRootLabel}/${relative}`);
  }

  const manifest: SaveManifest = {
    queryHash: request.queryHash,
    saveRootLabel: request.saveRootLabel,
    createdAt: new Date().toISOString(),
    entries,
  };
  const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest, null, 2));
  triggerBrowserDownload(
    `manifest-${request.queryHash.slice(0, 8)}.json`,
    manifestBytes.buffer,
    'application/json',
  );

  return { manifest, savedPaths, mode: 'download' };
}
