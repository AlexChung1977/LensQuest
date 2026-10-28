import { useEffect, useState } from 'react';
import { fetchHistory } from '../../infrastructure/visualSearch/httpVisualSearchClient';

interface HistoryPanelProps {
  open: boolean;
  refreshKey: number;
}

export function HistoryPanel({ open, refreshKey }: HistoryPanelProps) {
  const [rows, setRows] = useState<
    Array<{
      job_id: string;
      status: string;
      provider: string;
      file_name: string;
      created_at: string;
      hit_count: number;
      error_message?: string;
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchHistory(20)
      .then((jobs) => {
        if (!cancelled) {
          setRows(jobs);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '讀取失敗');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, refreshKey]);

  if (!open) return null;

  return (
    <section className="lq-settings" aria-label="搜尋歷史">
      <h2>歷史紀錄</h2>
      {error && <p className="lq-settings__hint">{error}</p>}
      {!error && rows.length === 0 && (
        <p className="lq-settings__hint">尚無搜尋紀錄。完成一次搜尋後會顯示在這裡。</p>
      )}
      {rows.length > 0 && (
        <div className="lq-history-list">
          {rows.map((row) => (
            <div key={row.job_id} className="lq-history-item">
              <div className="lq-history-item__top">
                <strong>{row.file_name}</strong>
                <span>
                  {row.status} · {row.provider} · {row.hit_count} hits
                </span>
              </div>
              <div className="lq-history-item__meta">
                {new Date(row.created_at).toLocaleString()} · {row.job_id}
              </div>
              {row.error_message && (
                <div className="lq-history-item__error">{row.error_message}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
