import { useEffect, useRef, useState } from 'react';
import type { LiveEvent } from '../../../types';
import { useLang } from '../../../context/LangContext';
import { getIntensityLabel } from '../../../utils/kerala';
import { IconCloudRain, IconShield } from '../../Icons';
import { BADGE_COLORS, getLevel, fmtTime } from '../modals/MarkerTooltip';

const PAGE = 20;

export function LiveTab({ liveEvents, selectedPin, onSelect }: {
  liveEvents: LiveEvent[];
  selectedPin: string | null;
  onSelect: (p: string) => void;
}) {
  const { t } = useLang();
  const [count, setCount] = useState(PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCount(PAGE);
  }, [liveEvents.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && count < liveEvents.length) {
        setCount(c => Math.min(c + PAGE, liveEvents.length));
      }
    }, { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, [count, liveEvents.length]);

  if (!liveEvents.length) return (
    <div className="no-reports">
      <div className="no-reports-icon"><IconCloudRain size={32} color="var(--text3)" /></div>
      <div className="no-reports-title">{t.noReports}</div>
      <div className="no-reports-sub">{t.beFirst}</div>
    </div>
  );

  const visible = liveEvents.slice(0, count);

  return <div>{visible.map((ev, idx) => {
    const level = getLevel(ev.intensity);
    const col = ev.faded ? '#6b7a8d' : BADGE_COLORS[level];
    return (
      <div
        key={`${ev.id}-${ev.ts}`}
        className={`report-card${selectedPin === ev.pin ? ' selected' : ''}`}
        style={{ '--card-accent': col, animationDelay: `${idx * 45}ms`, opacity: ev.faded ? 0.45 : 1 } as any}
        onClick={() => onSelect(ev.pin)}
      >
        <div className="rc-top">
          <div className="rc-place">{ev.place} ({ev.pin})</div>
          <div className="rc-time">{fmtTime(ev.ts, t)}</div>
        </div>
        {ev.faded
          ? <div className={`rc-badge badge-drizzle`} style={{ background: 'rgba(107,122,141,0.15)', color: '#6b7a8d', border: '1px solid rgba(107,122,141,0.3)' }}>{t.fadedBadge}</div>
          : <div className={`rc-badge badge-${level}`}>{getIntensityLabel(ev.intensity).toUpperCase()}</div>
        }
        <div className="rc-verify"><IconShield size={11} color="#00cc66" />{t.communityVerified}</div>
      </div>
    );
  })}
  {count < liveEvents.length && <div ref={sentinelRef} className="scroll-sentinel"><span className="scroll-sentinel-dot" /> Loading more…</div>}
  </div>;
}
