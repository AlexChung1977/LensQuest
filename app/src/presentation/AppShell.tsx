import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { DropZone } from './components/DropZone';
import { ResultsGrid } from './components/ResultsGrid';
import { SettingsPanel } from './components/SettingsPanel';
import { useSearchSession } from './hooks/useSearchSession';

export function AppShell() {
  const session = useSearchSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const busy = session.phase === 'uploading' || session.phase === 'searching' || session.phase === 'downloading';
  const showHero = session.phase === 'idle';

  return (
    <div className="lq-shell">
      <header className="lq-topbar">
        <div className="lq-brand">
          <p className="lq-brand__name">LensQuest</p>
          <p className="lq-brand__tag">以圖找圖 · 存到你指定的路徑</p>
        </div>
        <div className="lq-topbar__actions">
          <button
            type="button"
            className="lq-btn lq-btn--ghost"
            onClick={() => setSettingsOpen((v) => !v)}
          >
            {settingsOpen ? '關閉設定' : '設定'}
          </button>
          {session.phase !== 'idle' && (
            <button type="button" className="lq-btn" onClick={session.reset} disabled={busy}>
              新的搜尋
            </button>
          )}
        </div>
      </header>

      <SettingsPanel
        open={settingsOpen}
        settings={session.settings}
        onChange={session.updateSettings}
      />

      <AnimatePresence mode="wait">
        {showHero ? (
          <motion.section
            key="hero"
            className="lq-hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            <h1 className="lq-hero__brand">LensQuest</h1>
            <p className="lq-hero__headline">丟進一張圖，找出網路上的相似畫面。</p>
            <p className="lq-hero__support">
              初版架構：選圖 → 視覺搜尋 → 勾選結果 → 寫入設定的儲存路徑（含 manifest）。
            </p>
            <DropZone disabled={busy} onFile={session.startWithFile} />
          </motion.section>
        ) : (
          <motion.section
            key="workspace"
            className="lq-workspace"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {session.query && (
              <div className="lq-query-row">
                <img
                  className="lq-query-row__thumb"
                  src={session.query.previewUrl}
                  alt={session.query.fileName}
                />
                <div className="lq-query-row__meta">
                  <h2>
                    {session.phase === 'searching' && '正在搜尋相似圖片…'}
                    {session.phase === 'uploading' && '準備查詢圖…'}
                    {session.phase === 'preview' && '搜尋結果'}
                    {session.phase === 'downloading' && '下載並儲存中…'}
                    {session.phase === 'done' && '已完成儲存'}
                    {session.phase === 'error' && '發生錯誤'}
                  </h2>
                  <p>
                    {session.query.fileName}
                    {session.query.width && session.query.height
                      ? ` · ${session.query.width}×${session.query.height}`
                      : ''}
                    {' · '}
                    hash {session.query.contentHash.slice(0, 10)}
                  </p>
                  <p>儲存路徑：{session.settings.savePathLabel}</p>
                  {(session.phase === 'searching' || session.phase === 'uploading') && (
                    <div className="lq-progress" aria-hidden>
                      <div className="lq-progress__bar" />
                    </div>
                  )}
                  {session.phase === 'downloading' && (
                    <div className="lq-progress" aria-hidden>
                      <div
                        className="lq-progress__bar lq-progress__bar--determinate"
                        style={{
                          width: `${
                            session.downloadProgress.total === 0
                              ? 0
                              : (session.downloadProgress.done / session.downloadProgress.total) * 100
                          }%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {session.errorMessage && (
              <div className="lq-banner lq-banner--error" role="alert">
                {session.errorMessage}
              </div>
            )}
            {session.saveSummary && (
              <div className="lq-banner lq-banner--ok">{session.saveSummary}</div>
            )}

            {(session.phase === 'preview' ||
              session.phase === 'downloading' ||
              session.phase === 'done' ||
              session.phase === 'error') &&
              session.hits.length > 0 && (
                <>
                  <div className="lq-toolbar">
                    <div className="lq-toolbar__left">
                      <span className="lq-count">
                        已選 {session.selectedIds.size} / {session.hits.length}
                      </span>
                      <button type="button" className="lq-btn lq-btn--ghost" onClick={session.selectAll}>
                        全選
                      </button>
                      <button
                        type="button"
                        className="lq-btn lq-btn--ghost"
                        onClick={session.clearSelection}
                      >
                        清除
                      </button>
                    </div>
                    <div className="lq-toolbar__right">
                      <button
                        type="button"
                        className="lq-btn lq-btn--primary"
                        disabled={busy || session.selectedIds.size === 0}
                        onClick={() => void session.saveSelected()}
                      >
                        存到路徑
                      </button>
                    </div>
                  </div>
                  <ResultsGrid
                    hits={session.hits}
                    selectedIds={session.selectedIds}
                    onToggle={session.toggleHit}
                  />
                </>
              )}

            {session.phase === 'preview' && session.hits.length === 0 && (
              <div className="lq-banner">沒有達到相似度門檻的結果，試試調低設定中的最低分數。</div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <footer className="lq-footer">
        LensQuest 初版 UI · mock 視覺搜尋 · 瀏覽器 File Store（目錄 API / 下載 fallback）
      </footer>
    </div>
  );
}
