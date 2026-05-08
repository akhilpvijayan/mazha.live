import { currentAvgIntensity } from '../../../services/supabase';
import { RainReport } from '../../../types';
import { getIntensityLabel } from '../../../utils/kerala';
import { IconMapPin, IconShield } from '../../Icons';
import { DecayBar, fmtDuration } from '../modals/DecayBar';

type Level = 'drizzle' | 'light' | 'moderate' | 'heavy' | 'extreme';

const BADGE_COLORS: Record<Level, string> = {
  drizzle: '#4d9fff', light: '#60b4ff', moderate: '#a855f7',
  heavy: '#f59e0b', extreme: '#ef4444',
};

function getLevel(mm: number): Level {
  if (mm > 80) return 'extreme';
  if (mm > 50) return 'heavy';
  if (mm > 20) return 'moderate';
  if (mm > 8) return 'light';
  return 'drizzle';
}

function fmtTime(ts: number, t: any): string {
  const d = Date.now() - ts;
  if (d < 10000) return `2${t.sAgo}`;
  if (d < 60000) return `${Math.floor(d / 1000)}${t.sAgo}`;
  if (d < 3600000) return `${Math.floor(d / 60000)}${t.mAgo}`;
  return `${Math.floor(d / 3600000)}${t.hAgo}`;
}

export { BADGE_COLORS, getLevel, fmtTime };

export function MarkerTooltip({ item, now, ghost }: { item: RainReport; now: number; ghost: boolean }) {
  const rawAvg = item.total / item.count;
  const effAvg = currentAvgIntensity(item, now);
  const level = ghost ? 'drizzle' : getLevel(effAvg);
  const color = ghost ? '#555e70' : BADGE_COLORS[level];
  return (
    <div className="tt-wrap">
      <div className="tt-top">
        <div className="tt-place">{item.place}</div>
        {ghost
          ? <div style={{ padding: '3px 8px', borderRadius: 4, background: 'rgba(100,110,130,0.15)', color: '#7a8899', fontSize: 9, fontWeight: 800, letterSpacing: .8 }}>FADED</div>
          : <div className={`tt-badge badge-${level}`}>{getIntensityLabel(effAvg).toUpperCase()}</div>}
      </div>
      <div className="tt-sub"><IconMapPin size={10} color="currentColor" />{item.district} · PIN {item.pin}</div>
      <div className="tt-divider" />
      {ghost ? (
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10, lineHeight: 1.6 }}>
          Rain was reported here <strong style={{ color: 'var(--text2)' }}>{fmtDuration(now - item.lastUpdated)}</strong>.<br />
          Peak intensity was <strong style={{ color }}>{rawAvg.toFixed(1)} mm/hr</strong>.
        </div>
      ) : (
        <div className="tt-stats" style={{ marginBottom: 10 }}>
          <div className="tt-stat"><div className="tt-stat-val" style={{ color }}>{effAvg.toFixed(1)}</div><div className="tt-stat-key">mm/hr now</div></div>
          <div className="tt-stat"><div className="tt-stat-val" style={{ color: 'var(--text2)' }}>{rawAvg.toFixed(1)}</div><div className="tt-stat-key">peak</div></div>
          <div className="tt-stat"><div className="tt-stat-val">{item.count}</div><div className="tt-stat-key">reports</div></div>
        </div>
      )}
      <DecayBar lastUpdated={item.lastUpdated} now={now} />
      <div className="tt-footer">
        <IconShield size={11} color="#00cc66" />
        Community Verified · {fmtTime(item.lastUpdated, { sAgo: 's ago', mAgo: 'm ago', hAgo: 'h ago' })}
      </div>
    </div>
  );
}