import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { SearchHit } from '../../domain/types';
import { proxyImageUrl } from '../../infrastructure/visualSearch/httpVisualSearchClient';

interface VideoResultsProps {
  hits: SearchHit[];
}

function isPlayableFile(url: string): boolean {
  return /\.(mp4|webm|ogv|ogg|mov|m4v)(\?|$)/i.test(url);
}

export function VideoResults({ hits }: VideoResultsProps) {
  const [active, setActive] = useState<SearchHit | null>(null);
  const [playbackError, setPlaybackError] = useState(false);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActive(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  return (
    <>
      <div className="lq-results">
        {hits.map((hit, index) => (
          <motion.button
            key={hit.id}
            type="button"
            className="lq-hit lq-hit--video"
            onClick={() => {
              setPlaybackError(false);
              setActive(hit);
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.35,
              delay: Math.min(index * 0.04, 0.4),
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <span className="lq-hit__play" aria-hidden>
              ▶
            </span>
            <img
              className="lq-hit__img"
              src={proxyImageUrl(hit.thumbUrl)}
              alt={hit.title ?? '影片預覽'}
              loading="lazy"
            />
            <span className="lq-hit__body">
              <span className="lq-hit__score">{hit.title ?? '影片'}</span>
              <span className="lq-hit__source">
                {Math.round(hit.score * 100)}% match · {hit.source}
              </span>
            </span>
          </motion.button>
        ))}
      </div>

      {active && (
        <div className="lq-player" role="dialog" aria-modal="true" aria-label={active.title ?? '影片'}>
          <button
            type="button"
            className="lq-player__backdrop"
            aria-label="關閉影片"
            onClick={() => setActive(null)}
          />
          <div className="lq-player__panel">
            {isPlayableFile(active.url) && !playbackError ? (
              <video
                key={active.url}
                className="lq-player__video"
                src={active.url}
                poster={proxyImageUrl(active.thumbUrl)}
                controls
                autoPlay
                playsInline
                onError={() => setPlaybackError(true)}
              />
            ) : (
              <img
                className="lq-player__video"
                src={proxyImageUrl(active.thumbUrl)}
                alt={active.title ?? ''}
              />
            )}
            <div className="lq-player__meta">
              <div>
                <strong>{active.title ?? '影片'}</strong>
                <p>
                  {Math.round(active.score * 100)}% match · {active.source}
                </p>
              </div>
              <div className="lq-player__actions">
                {isPlayableFile(active.url) && (
                  <a className="lq-btn lq-btn--ghost" href={active.url} target="_blank" rel="noreferrer">
                    新分頁開啟
                  </a>
                )}
                <button type="button" className="lq-btn" onClick={() => setActive(null)}>
                  關閉
                </button>
              </div>
            </div>
            {playbackError && <p className="lq-settings__hint">這個瀏覽器無法直接播放，請用新分頁開啟。</p>}
          </div>
        </div>
      )}
    </>
  );
}
