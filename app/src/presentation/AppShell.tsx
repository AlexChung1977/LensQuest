import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { DropZone } from './components/DropZone';
import { HistoryPanel } from './components/HistoryPanel';
import { ResultsGrid } from './components/ResultsGrid';
import { VideoResults } from './components/VideoResults';
import { SettingsPanel } from './components/SettingsPanel';
import { useSearchSession } from './hooks/useSearchSession';

export function AppShell() {
  const session = useSearchSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const busy =
    session.phase === 'uploading' ||
    session.phase === 'searching' ||
    session.phase === 'downloading';
  const showHero = session.phase === 'idle';

  return (
    <div className="lq-shell">
      <header className="lq-topbar">
        <div className="lq-brand">
          <p className="lq-brand__name">LensQuest</p>
          <p className="lq-brand__tag">
            以圖找圖 · 存到你指定的路徑
            <span className={`lq-status ${session.apiOnline ? 'lq-status--on' : 'lq-status--off'}`}>
              {session.apiOnline ? 'API online' : 'API offline'}
            </span>
          </p>
        </div>
        <div className="lq-topbar__actions">
          <button
            type="button"
            className="lq-btn lq-btn--ghost"
            onClick={() => {
              setHistoryOpen((v) => !v);
              if (!historyOpen) setSettingsOpen(false);
            }}
          >
            {historyOpen ? '關閉歷史' : '歷史'}
          </button>
          <button
            type="button"
            className="lq-btn lq-btn--ghost"
            onClick={() => {
              setSettingsOpen((v) => !v);
              if (!settingsOpen) setHistoryOpen(false);
            }}
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
        apiOnline={session.apiOnline}
        apiProviders={session.apiProviders}
      />
      <HistoryPanel open={historyOpen} refreshKey={session.historyVersion} />

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
            <p className="lq-hero__headline">丟進一張圖，照片和影片分開找出來。</p>
            <p className="lq-hero__support">
              完整流程：選圖 → API 視覺搜尋（Bing / SerpAPI / 本機圖庫）→ 勾選結果 → 下載並寫入路徑（含
              manifest）。
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
                    {session.phase === 'searching' && '正在搜尋相似的照片與影片…'}
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
                    {session.provider ? ` · provider ${session.provider}` : ''}
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
                              : (session.downloadProgress.done / session.downloadProgress.total) *
                                100
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
              (session.hits.length > 0 || session.videos.length > 0) && (
                <>
                  <section className="lq-result-section" aria-label="照片">
                    <div className="lq-result-section__head">
                      <h3>照片</h3>
                      <p>{session.hits.length} 張 · 勾選後可存到路徑</p>
                    </div>
                    {session.hits.length > 0 ? (
                      <>
                        <div className="lq-toolbar">
                          <div className="lq-toolbar__left">
                            <span className="lq-count">
                              已選 {session.selectedIds.size} / {session.hits.length}
                            </span>
                            <button
                              type="button"
                              className="lq-btn lq-btn--ghost"
                              onClick={session.selectAll}
                            >
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
                    ) : (
                      <div className="lq-banner">沒有達到相似度門檻的照片。</div>
                    )}
                  </section>

                  <section className="lq-result-section" aria-label="影片">
                    <div className="lq-result-section__head">
                      <h3>影片</h3>
                      <p>{session.videos.length} 部 · 點卡片播放，跟照片分開</p>
                    </div>
                    {session.videos.length > 0 ? (
                      <VideoResults hits={session.videos} />
                    ) : (
                      <div className="lq-banner">沒有達到相似度門檻的影片。</div>
                    )}
                  </section>
                </>
              )}

            {session.phase === 'preview' &&
              session.hits.length === 0 &&
              session.videos.length === 0 && (
              <div className="lq-banner">
                沒有達到相似度門檻的結果，試試調低設定中的最低分數。
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <footer className="lq-footer">
        LensQuest · API providers: Bing Visual Search / SerpAPI Google Lens / local perceptual corpus
      </footer>
    </div>
  );
}
