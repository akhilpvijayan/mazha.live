import type { RainReport } from '../../../types';
import { useLang } from '../../../context/LangContext';
import { currentAvgIntensity, isGhost } from '../../../services/supabase';
import { getIntensityLabel } from '../../../utils/kerala';
import { IconCloudRain, IconShield } from '../../Icons';
import { BADGE_COLORS, getLevel, fmtTime } from '../modals/MarkerTooltip';

type SbTab = 'live' | 'activity' | 'insights';

export function LiveTab({ reports, now, selectedPin, onSelect }: { reports: RainReport[]; now: number; selectedPin: string | null; onSelect: (p: string) => void }) {
  const { t } = useLang(); const sorted = [...reports].sort((a, b) => b.lastUpdated - a.lastUpdated);
  if (!sorted.length) return <div className="no-reports"><div className="no-reports-icon"><IconCloudRain size={32} color="var(--text3)" /></div><div className="no-reports-title">{t.noReports}</div><div className="no-reports-sub">{t.beFirst}</div></div>;
  return <div>{sorted.map((r, idx) => {
    const ghost = isGhost(r, now); const eff = currentAvgIntensity(r, now); const raw = r.total / r.count;
    const level = ghost ? 'drizzle' : getLevel(eff); const col = ghost ? '#7a8899' : BADGE_COLORS[level];
    return (<div key={r.pin} className={`report-card${selectedPin === r.pin ? ' selected' : ''}`}
      style={{ '--card-accent': col, animationDelay: `${idx * 45}ms`, opacity: ghost ? .75 : 1 } as any} onClick={() => onSelect(r.pin)}>
      <div className="rc-top">
        <div className="rc-place">{r.place} ({r.pin}){ghost && <span style={{ fontSize: 9, marginLeft: 5, background: 'rgba(120,130,150,0.15)', color: '#7a8899', padding: '1px 5px', borderRadius: 99, fontWeight: 700 }}>FADED</span>}</div>
        <div className="rc-time">{fmtTime(r.lastUpdated, t)}</div>
      </div>
      <div className={`rc-badge badge-${level}`}>{ghost ? `Peak ${raw.toFixed(0)}mm` : getIntensityLabel(eff).toUpperCase()}</div>
      <div className="rc-verify"><IconShield size={11} color="#00cc66" />{t.communityVerified}</div>
    </div>);
  })}</div>;
}