import type { RainReport } from '../../../types';
import { useLang } from '../../../context/LangContext';
import { currentAvgIntensity, isGhost } from '../../../services/supabase';
import { getIntensityLabel } from '../../../utils/kerala';
import { IconActivity, IconCloudRain, IconMapPin } from '../../Icons';
import { BADGE_COLORS, getLevel, fmtTime } from '../modals/MarkerTooltip';
import { INTENSITY_OPTIONS } from '../modals/ReportModal';

export function ActivityTab({ reports, now }: { reports: RainReport[]; now: number }) {
  const { t } = useLang(); const sorted = [...reports].sort((a, b) => b.lastUpdated - a.lastUpdated);
  if (!sorted.length) return <div className="no-reports"><div className="no-reports-icon"><IconActivity size={32} color="var(--text3)" /></div><div className="no-reports-title">{t.noReports}</div><div className="no-reports-sub">{t.beFirst}</div></div>;
  return <div className="activity-list">{sorted.map((r, idx) => {
    const ghost = isGhost(r, now); const eff = currentAvgIntensity(r, now); const raw = r.total / r.count;
    const level = ghost ? 'drizzle' : getLevel(eff); const col = ghost ? '#7a8899' : BADGE_COLORS[level];
    const LvlIcon = INTENSITY_OPTIONS.find(o => o.level === level)?.Icon || IconCloudRain;
    return (<div key={r.pin} className="activity-item" style={{ animationDelay: `${idx * 35}ms`, opacity: ghost ? .7 : 1 }}>
      <div className="act-icon" style={{ background: `${col}18` }}><LvlIcon size={17} color={col} /></div>
      <div className="act-body">
        <div className="act-title">{ghost ? `Previous rain` : `${getIntensityLabel(eff)} rain`} — {r.place}</div>
        <div className="act-meta"><span className="act-pin"><IconMapPin size={9} /> {r.district} · {r.pin}</span><span className="act-time">{fmtTime(r.lastUpdated, t)}</span></div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 800, color: col }}>{ghost ? raw.toFixed(0) : eff.toFixed(0)}</div>
        <div style={{ fontSize: 9, color: 'var(--text3)' }}>{ghost ? 'peak' : 'now'}</div>
      </div>
    </div>);
  })}</div>;
}