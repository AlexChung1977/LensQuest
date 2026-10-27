export {};

declare global {
  interface LensQuestDesktopApi {
    isDesktop: true;
    pickDirectory: () => Promise<string | null>;
    saveFiles: (payload: {
      rootDir: string;
      files: Array<{ relativePath: string; fileName?: string; base64: string }>;
    }) => Promise<{ saved: string[] }>;
  }

  interface Window {
    lensquestDesktop?: LensQuestDesktopApi;
  }
}
