import { useCallback, useEffect, useRef, useState } from 'react';
import { createQueryImage } from '../../application/createQueryImage';
import type { AppSettings, JobPhase, QueryImage, SearchHit } from '../../domain/types';
import { downloadMany } from '../../infrastructure/downloader/imageDownloader';
import { saveWithBrowserFileStore } from '../../infrastructure/fileStore/browserFileStore';
import { loadSettings, saveSettings } from '../../infrastructure/settings/settingsStore';
import { mockVisualSearchClient } from '../../infrastructure/visualSearch/mockVisualSearchClient';

export interface SearchSessionState {
  phase: JobPhase;
  query: QueryImage | null;
  hits: SearchHit[];
  selectedIds: Set<string>;
  settings: AppSettings;
  errorMessage: string | null;
  saveSummary: string | null;
  downloadProgress: { done: number; total: number };
}

export function useSearchSession() {
  const [phase, setPhase] = useState<JobPhase>('idle');
  const [query, setQuery] = useState<QueryImage | null>(null);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [settings, setSettingsState] = useState<AppSettings>(() => loadSettings());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveSummary, setSaveSummary] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState({ done: 0, total: 0 });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (query?.previewUrl) URL.revokeObjectURL(query.previewUrl);
      abortRef.current?.abort();
    };
    // Only clean up on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setQuery((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    setHits([]);
    setSelectedIds(new Set());
    setErrorMessage(null);
    setSaveSummary(null);
    setDownloadProgress({ done: 0, total: 0 });
    setPhase('idle');
  }, []);

  const startWithFile = useCallback(
    async (file: File) => {
      abortRef.current?.abort();
      setErrorMessage(null);
      setSaveSummary(null);
      setHits([]);
      setSelectedIds(new Set());
      setPhase('uploading');

      try {
        const nextQuery = await createQueryImage(file);
        setQuery((prev) => {
          if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
          return nextQuery;
        });
        setPhase('searching');

        const response = await mockVisualSearchClient.search({
          image: nextQuery,
          maxResults: settings.maxResults,
          minScore: settings.minScore,
        });

        setHits(response.hits);
        setSelectedIds(new Set(response.hits.slice(0, 6).map((h) => h.id)));
        setPhase('preview');
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : '搜尋失敗');
        setPhase('error');
      }
    },
    [settings.maxResults, settings.minScore],
  );

  const toggleHit = useCallback((hitId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(hitId)) next.delete(hitId);
      else next.add(hitId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(hits.map((h) => h.id)));
  }, [hits]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const saveSelected = useCallback(async () => {
    if (!query || selectedIds.size === 0) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setPhase('downloading');
    setErrorMessage(null);
    setSaveSummary(null);

    const selectedHits = hits.filter((h) => selectedIds.has(h.id));
    setDownloadProgress({ done: 0, total: selectedHits.length });

    let done = 0;
    try {
      const downloaded = await downloadMany(
        selectedHits.map((h) => ({ hitId: h.id, url: h.url })),
        settings.downloadConcurrency,
        () => {
          done += 1;
          setDownloadProgress({ done, total: selectedHits.length });
        },
        controller.signal,
      );

      if (downloaded.length === 0) {
        throw new Error('沒有成功下載任何圖片');
      }

      const hitById = new Map(selectedHits.map((h) => [h.id, h]));
      const result = await saveWithBrowserFileStore({
        queryHash: query.contentHash,
        saveRootLabel: settings.savePathLabel,
        files: downloaded.map((d, index) => ({
          hitId: d.hitId,
          sourceUrl: hitById.get(d.hitId)?.url ?? '',
          score: hitById.get(d.hitId)?.score ?? 0,
          bytes: d.bytes,
          extension: d.extension,
          index,
        })),
      });

      setSaveSummary(
        result.mode === 'directory'
          ? `已寫入 ${result.savedPaths.length} 張到所選資料夾，並附上 manifest。`
          : `已觸發 ${result.savedPaths.length} 個下載（含 manifest）。路徑標籤：${settings.savePathLabel}`,
      );
      setPhase('done');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setPhase('preview');
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : '儲存失敗');
      setPhase('error');
    }
  }, [hits, query, selectedIds, settings.downloadConcurrency, settings.savePathLabel]);

  return {
    phase,
    query,
    hits,
    selectedIds,
    settings,
    errorMessage,
    saveSummary,
    downloadProgress,
    startWithFile,
    toggleHit,
    selectAll,
    clearSelection,
    saveSelected,
    updateSettings,
    reset,
  } satisfies SearchSessionState & Record<string, unknown>;
}
