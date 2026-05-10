import type { RainReport } from '../../../types';
import { useLang } from '../../../context/LangContext';
import { currentAvgIntensity, isGhost } from '../../../services/supabase';
import { IconBarChart, IconTrendUp, IconDroplet, IconAlertTriangle } from '../../Icons';
import { getIntensityLabel } from '../../../utils/kerala';
import { BADGE_COLORS, getLevel } from '../modals/MarkerTooltip';

export function InsightsTab({ reports, now }: { reports: RainReport[]; now: number }) {
  const { t } = useLang();
  if (!reports.length) return <div className="no-reports"><div className="no-reports-icon"><IconBarChart size={32} color="var(--text3)" /></div><div className="no-reports-title">{t.noReports}</div><div className="no-reports-sub">{t.beFirst}</div></div>;
  const active = reports.filter(r => !isGhost(r, now)); const ghosts = reports.filter(r => isGhost(r, now));
  const totalRpts = reports.reduce((s, r) => s + r.count, 0);
  const avgs = active.map(r => currentAvgIntensity(r, now));
  const maxMm = avgs.length ? Math.max(...avgs) : 0; 
  const validAvgs = avgs.filter(mm => mm > 4);
  const avgMm = validAvgs.length ? validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length : 0;
  const heavyCnt = active.filter(r => currentAvgIntensity(r, now) > 50).length;
  const dm: Record<string, { total: number; count: number }> = {};
  active.forEach(r => { 
    const eff = currentAvgIntensity(r, now);
    if (eff > 4) {
      if (!dm[r.district]) dm[r.district] = { total: 0, count: 0 }; 
      dm[r.district].total += eff; 
      dm[r.district].count += 1; 
    }
  });
  const districts = Object.entries(dm).map(([name, d]) => ({ name, avg: d.total / d.count })).sort((a, b) => b.avg - a.avg).slice(0, 6);
  const maxDist = districts[0]?.avg || 1;
  return <div>
    <div className="insights-section">
      <div className="ins-label"><IconTrendUp size={11} />Live Overview</div>
      <div className="stats-grid">
        {[{ val: totalRpts, lbl: 'Total Reports', color: 'var(--cyan)' }, { val: active.length, lbl: 'Active Pins', color: 'var(--accent)' }, { val: avgMm.toFixed(1), lbl: 'Avg mm/hr', color: '#a855f7' }, { val: heavyCnt, lbl: 'Heavy+', color: '#ff7a00' }].map(s => (
          <div className="stat-card" key={s.lbl}><div className="stat-card-val" style={{ color: s.color }}>{s.val}</div><div className="stat-card-lbl">{s.lbl}</div></div>))}
      </div>
      {ghosts.length > 0 && <div style={{ fontSize: 11, color: 'var(--text3)', padding: '7px 10px', background: 'rgba(120,130,150,0.08)', border: '1px solid rgba(120,130,150,0.15)', borderRadius: 8, marginBottom: 8 }}>{ghosts.length} faded report{ghosts.length !== 1 ? 's' : ''} (intensity decayed, still visible on map)</div>}
    </div>
    {districts.length > 0 && <div className="insights-section">
      <div className="ins-label"><IconDroplet size={11} />By District · Peak {maxMm.toFixed(0)} mm/hr</div>
      {districts.map(d => {
        const col = d.avg > 80 ? '#ff3b3b' : d.avg > 50 ? '#ff7a00' : d.avg > 20 ? '#a855f7' : '#00d4ff'; return (
          <div key={d.name} className="district-row"><div className="district-name">{d.name}</div><div className="district-bar-wrap"><div className="district-bar" style={{ width: `${(d.avg / maxDist) * 100}%`, background: col }} /></div><div className="district-val" style={{ color: col }}>{d.avg.toFixed(0)}</div></div>);
      })}
    </div>}
    <div className="insights-section">
      <div className="ins-label"><IconAlertTriangle size={11} />Active Alerts</div>
      {active.filter(r => currentAvgIntensity(r, now) > 50).length === 0
        ? <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0' }}>No heavy rain alerts right now.</div>
        : active.filter(r => currentAvgIntensity(r, now) > 50).map(r => {
          const eff = currentAvgIntensity(r, now); const col = eff > 80 ? '#ff3b3b' : '#ff7a00'; return (
            <div key={r.pin} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', background: `${col}0d`, border: `1px solid ${col}28`, borderRadius: 9, marginBottom: 7 }}>
              <IconAlertTriangle size={14} color={col} />
              <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{r.place}</div><div style={{ fontSize: 10, color: 'var(--text3)' }}>{r.district} · {eff.toFixed(0)} mm/hr</div></div>
              <div style={{ fontSize: 10, fontWeight: 800, color: col, fontFamily: 'var(--mono)' }}>{getIntensityLabel(eff)}</div>
            </div>);
        })}
    </div>
  </div>;
}
