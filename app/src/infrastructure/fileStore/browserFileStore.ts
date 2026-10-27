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
  mode: 'desktop' | 'directory' | 'download';
}

type DirectoryPickerWindow = Window &
  typeof globalThis & {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
  };

function toBase64(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]!);
  return btoa(binary);
}

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

function triggerBrowserDownload(
  fileName: string,
  bytes: ArrayBuffer,
  mime = 'application/octet-stream',
) {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function buildManifest(request: FileStoreSaveRequest, entries: ManifestEntry[]): SaveManifest {
  return {
    queryHash: request.queryHash,
    saveRootLabel: request.saveRootLabel,
    createdAt: new Date().toISOString(),
    entries,
  };
}

async function saveWithDesktop(request: FileStoreSaveRequest): Promise<FileStoreSaveResult | null> {
  const desktop = window.lensquestDesktop;
  if (!desktop?.isDesktop) return null;

  const rootDir = await desktop.pickDirectory();
  if (!rootDir) {
    throw new DOMException('The user aborted a request.', 'AbortError');
  }

  const entries: ManifestEntry[] = [];
  const filesPayload: Array<{ relativePath: string; fileName: string; base64: string }> = [];

  for (const file of request.files) {
    const relative = buildSaveRelativePath(request.queryHash, file.index, file.extension);
    const fileName = relative.split('/').pop()!;
    entries.push({
      fileName,
      relativePath: relative,
      sourceUrl: file.sourceUrl,
      hitId: file.hitId,
      score: file.score,
      savedAt: new Date().toISOString(),
    });
    filesPayload.push({
      relativePath: relative,
      fileName,
      base64: toBase64(file.bytes),
    });
  }

  const manifest = buildManifest(request, entries);
  const manifestJson = JSON.stringify(manifest, null, 2);
  filesPayload.push({
    relativePath: `manifest-${request.queryHash.slice(0, 8)}.json`,
    fileName: `manifest-${request.queryHash.slice(0, 8)}.json`,
    base64: btoa(unescape(encodeURIComponent(manifestJson))),
  });

  const result = await desktop.saveFiles({ rootDir, files: filesPayload });
  return {
    manifest,
    savedPaths: result.saved,
    mode: 'desktop',
  };
}

/**
 * FileStore priority:
 * 1) Electron desktop native directory write
 * 2) Browser File System Access API
 * 3) Individual downloads fallback
 */
export async function saveWithBrowserFileStore(
  request: FileStoreSaveRequest,
): Promise<FileStoreSaveResult> {
  const desktopResult = await saveWithDesktop(request);
  if (desktopResult) return desktopResult;

  const entries: ManifestEntry[] = [];
  const savedPaths: string[] = [];
  const win = window as DirectoryPickerWindow;
  const tryDirectory = typeof win.showDirectoryPicker === 'function';

  if (tryDirectory) {
    try {
      const root = await win.showDirectoryPicker!();
      for (const file of request.files) {
        const relative = buildSaveRelativePath(request.queryHash, file.index, file.extension);
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

      const manifest = buildManifest(request, entries);
      const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest, null, 2));
      await writeFile(
        root,
        `manifest-${request.queryHash.slice(0, 8)}.json`,
        manifestBytes.buffer.slice(
          manifestBytes.byteOffset,
          manifestBytes.byteOffset + manifestBytes.byteLength,
        ),
      );

      return { manifest, savedPaths, mode: 'directory' };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
    }
  }

  for (const file of request.files) {
    const relative = buildSaveRelativePath(request.queryHash, file.index, file.extension);
    const safeName = relative.replaceAll('/', '__');
    triggerBrowserDownload(
      safeName,
      file.bytes,
      `image/${file.extension === 'jpg' ? 'jpeg' : file.extension}`,
    );
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

  const manifest = buildManifest(request, entries);
  const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest, null, 2));
  triggerBrowserDownload(
    `manifest-${request.queryHash.slice(0, 8)}.json`,
    manifestBytes.buffer.slice(
      manifestBytes.byteOffset,
      manifestBytes.byteOffset + manifestBytes.byteLength,
    ),
    'application/json',
  );

  return { manifest, savedPaths, mode: 'download' };
}
