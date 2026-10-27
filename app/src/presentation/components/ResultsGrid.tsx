import { motion } from 'framer-motion';
import type { SearchHit } from '../../domain/types';

interface ResultsGridProps {
  hits: SearchHit[];
  selectedIds: Set<string>;
  onToggle: (hitId: string) => void;
}

export function ResultsGrid({ hits, selectedIds, onToggle }: ResultsGridProps) {
  return (
    <div className="lq-results">
      {hits.map((hit, index) => {
        const selected = selectedIds.has(hit.id);
        return (
          <motion.button
            key={hit.id}
            type="button"
            className={`lq-hit${selected ? ' lq-hit--selected' : ''}`}
            onClick={() => onToggle(hit.id)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.35,
              delay: Math.min(index * 0.04, 0.4),
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <span className="lq-hit__check" aria-hidden>
              {selected ? '✓' : ''}
            </span>
            <img className="lq-hit__img" src={hit.thumbUrl} alt="" loading="lazy" />
            <span className="lq-hit__body">
              <span className="lq-hit__score">{Math.round(hit.score * 100)}% match</span>
              <span className="lq-hit__source">
                {hit.source} · {hit.license.replaceAll('_', ' ')}
              </span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
