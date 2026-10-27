/**
 * Platform-aware save-path rules.
 * Browser MVP uses File System Access API or download fallback;
 * native Mac / mobile clients should implement the same contract.
 */

export type PlatformKind = 'mac' | 'ios' | 'android' | 'browser';

export interface StoragePolicy {
  platform: PlatformKind;
  /** Whether the user can pick an arbitrary absolute directory. */
  allowsArbitraryPath: boolean;
  /** Human-readable guidance shown in Settings. */
  guidance: string;
  /** Suggested default path label. */
  defaultPathLabel: string;
}

export function detectPlatform(): PlatformKind {
  if (typeof navigator === 'undefined') return 'browser';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'mac';
  return 'browser';
}

export function resolveStoragePolicy(platform: PlatformKind = detectPlatform()): StoragePolicy {
  switch (platform) {
    case 'mac':
      return {
        platform,
        allowsArbitraryPath: true,
        guidance: '選擇任意資料夾，例如 ~/Pictures/LensQuest。每次搜尋會建立日期 / 查詢 hash 子目錄。',
        defaultPathLabel: '~/Pictures/LensQuest',
      };
    case 'ios':
      return {
        platform,
        allowsArbitraryPath: false,
        guidance: '預設寫入 App Documents；可用 Files 選擇可存取目錄（security-scoped bookmark）。',
        defaultPathLabel: 'On My iPhone / LensQuest',
      };
    case 'android':
      return {
        platform,
        allowsArbitraryPath: false,
        guidance: '透過 Storage Access Framework 選擇資料夾，或寫入 App-specific external 目錄。',
        defaultPathLabel: 'Documents/LensQuest',
      };
    default:
      return {
        platform: 'browser',
        allowsArbitraryPath: 'showDirectoryPicker' in globalThis,
        guidance:
          '瀏覽器原型：支援則使用「選擇資料夾」API；否則以個別下載模擬寫入指定路徑名稱。',
        defaultPathLabel: 'LensQuest Downloads',
      };
  }
}

export function buildSaveRelativePath(
  queryHash: string,
  index: number,
  extension = 'jpg',
): string {
  const date = new Date().toISOString().slice(0, 10);
  const shortHash = queryHash.slice(0, 8);
  const seq = String(index + 1).padStart(3, '0');
  return `${date}/${shortHash}/${seq}.${extension}`;
}
