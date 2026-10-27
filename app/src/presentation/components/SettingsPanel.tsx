import { resolveStoragePolicy } from '../../domain/storagePolicy';
import type { AppSettings } from '../../domain/types';

interface SettingsPanelProps {
  open: boolean;
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}

export function SettingsPanel({ open, settings, onChange }: SettingsPanelProps) {
  if (!open) return null;

  const policy = resolveStoragePolicy();

  return (
    <section className="lq-settings" aria-label="儲存與搜尋設定">
      <h2>設定</h2>
      <p className="lq-settings__hint">
        平台：{policy.platform} · {policy.guidance}
      </p>
      <div className="lq-settings__grid">
        <div className="lq-field">
          <label htmlFor="save-path">儲存路徑標籤</label>
          <input
            id="save-path"
            value={settings.savePathLabel}
            onChange={(e) => onChange({ savePathLabel: e.target.value })}
            placeholder={policy.defaultPathLabel}
          />
        </div>
        <div className="lq-field">
          <label htmlFor="max-results">最多結果數</label>
          <input
            id="max-results"
            type="number"
            min={4}
            max={24}
            value={settings.maxResults}
            onChange={(e) => onChange({ maxResults: Number(e.target.value) || 12 })}
          />
        </div>
        <div className="lq-field">
          <label htmlFor="min-score">最低相似度</label>
          <input
            id="min-score"
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={settings.minScore}
            onChange={(e) => onChange({ minScore: Number(e.target.value) || 0.35 })}
          />
        </div>
        <div className="lq-field">
          <label htmlFor="concurrency">下載併發</label>
          <input
            id="concurrency"
            type="number"
            min={1}
            max={8}
            value={settings.downloadConcurrency}
            onChange={(e) => onChange({ downloadConcurrency: Number(e.target.value) || 4 })}
          />
        </div>
        <div className="lq-field">
          <label htmlFor="naming">命名規則</label>
          <select
            id="naming"
            value={settings.namingPattern}
            onChange={(e) =>
              onChange({ namingPattern: e.target.value as AppSettings['namingPattern'] })
            }
          >
            <option value="index">日期 / hash / 序號</option>
            <option value="source_hash">來源 hash</option>
          </select>
        </div>
      </div>
    </section>
  );
}
