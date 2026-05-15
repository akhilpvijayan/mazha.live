import { useEffect, useRef, useState } from 'react';
import type { LiveEvent } from '../../../types';
import { useLang } from '../../../context/LangContext';
import { getIntensityLabel } from '../../../utils/kerala';
import { IconActivity, IconCloudRain, IconMapPin } from '../../Icons';
import { BADGE_COLORS, getLevel, fmtTime } from '../modals/MarkerTooltip';
import { INTENSITY_OPTIONS } from '../modals/ReportModal';

const PAGE = 20;

export function ActivityTab({ liveEvents }: { liveEvents: LiveEvent[] }) {
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
      <div className="no-reports-icon"><IconActivity size={32} color="var(--text3)" /></div>
      <div className="no-reports-title">{t.noReports}</div>
      <div className="no-reports-sub">{t.beFirst}</div>
    </div>
  );

  const visible = liveEvents.slice(0, count);

  return <div className="activity-list">{visible.map((ev, idx) => {
    const level = getLevel(ev.intensity);
    const col = ev.faded ? '#6b7a8d' : BADGE_COLORS[level];
    const LvlIcon = INTENSITY_OPTIONS.find(o => o.level === level)?.Icon || IconCloudRain;
    return (
      <div key={`${ev.id}-${ev.ts}`} className="activity-item" style={{ animationDelay: `${idx * 35}ms`, opacity: ev.faded ? 0.45 : 1 }}>
        <div className="act-icon" style={{ background: `${col}18` }}><LvlIcon size={17} color={col} /></div>
        <div className="act-body">
          <div className="act-title">
            {ev.faded ? 'Faded' : getIntensityLabel(ev.intensity)} rain — {ev.place}
          </div>
          <div className="act-meta">
            <span className="act-pin"><IconMapPin size={9} /> {ev.district} · {ev.pin}</span>
            <span className="act-time">{fmtTime(ev.ts, t)}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {ev.faded
            ? <div style={{ fontSize: 9, color: '#6b7a8d', fontWeight: 700, padding: '2px 6px', background: 'rgba(107,122,141,0.1)', borderRadius: 5 }}>FADED</div>
            : <>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 800, color: col }}>{ev.intensity.toFixed(0)}</div>
                <div style={{ fontSize: 9, color: 'var(--text3)' }}>mm/hr</div>
              </>
          }
        </div>
      </div>
    );
  })}
  {count < liveEvents.length && <div ref={sentinelRef} className="scroll-sentinel"><span className="scroll-sentinel-dot" /> Loading more…</div>}
  </div>;
}
