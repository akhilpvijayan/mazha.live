import { useState } from 'react';
import type { RainReport } from '../../../types';
import { currentAvgIntensity, isGhost } from '../../../services/supabase';
import { getIntensityLabel } from '../../../utils/kerala';
import { IconCloudRain, IconCopy, IconMapPin, IconShare, IconWhatsApp, IconX } from '../../Icons';
import { ShareSheet, buildDistrictShareText, waShare, copyText } from '../modals/ShareSheet';
import { BADGE_COLORS, getLevel } from '../modals/MarkerTooltip';
import { INTENSITY_OPTIONS } from './ReportModal';


export function DistrictShareModal({ reports, now, onClose }: { reports: RainReport[]; now: number; onClose: () => void }) {
  const [shareData, setShareData] = useState<{ title: string; text: string } | null>(null);
  const activeReports = reports.filter(r => !isGhost(r, now));
  const dm: Record<string, RainReport[]> = {};
  activeReports.forEach(r => { if (!dm[r.district]) dm[r.district] = []; dm[r.district].push(r); });
  const districts = Object.entries(dm).map(([name, rpts]) => {
    const validAvgs = rpts.filter(r => currentAvgIntensity(r, now) > 4).map(r => currentAvgIntensity(r, now));
    const allAvgs = rpts.map(r => currentAvgIntensity(r, now));
    const avg = validAvgs.length ? validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length : 0;
    return { name, reports: rpts, avg, max: allAvgs.length ? Math.max(...allAvgs) : 0 };
  }).sort((a, b) => b.avg - a.avg);
  return (<>
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet district-modal">
        <div className="modal-handle" />
        <div className="modal-header"><div className="modal-title">District Reports</div><button className="modal-close" onClick={onClose}><IconX size={14} /></button></div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px' }}>
          {districts.length === 0
            ? <div className="no-reports"><div className="no-reports-icon"><IconMapPin size={32} color="var(--text3)" /></div><div className="no-reports-title">No district data yet</div></div>
            : districts.map((d, idx) => {
              const level = getLevel(d.avg); const col = d.avg > 0 ? BADGE_COLORS[level] : '#7a8899';
              const LvlIcon = INTENSITY_OPTIONS.find(o => o.level === level)?.Icon || IconCloudRain;
              return (<div key={d.name} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px', marginBottom: 10, animation: 'cardSlide .3s var(--spring) backwards', animationDelay: `${idx * 35}ms` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${col}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><LvlIcon size={19} color={col} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{d.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>{d.reports.length} location{d.reports.length !== 1 ? 's' : ''} · {d.reports.reduce((s, r) => s + r.count, 0)} reports</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 17, fontWeight: 800, color: col }}>{d.avg.toFixed(1)}</div>
                    <div style={{ fontSize: 9, color: 'var(--text3)' }}>mm/hr avg</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div className={`rc-badge badge-${level}`}>{getIntensityLabel(d.avg).toUpperCase()}</div>
                  <div style={{ flex: 1, height: 3, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: col, width: `${Math.min(100, (d.avg / 100) * 100)}%`, borderRadius: 99 }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap' }}>Peak {d.max.toFixed(0)}</div>
                </div>
                <div style={{ display: 'flex', gap: 7 }}>
                  <button onClick={() => waShare(buildDistrictShareText(d.name, d.reports))} style={{ flex: 1, padding: '8px 6px', background: 'rgba(37,211,102,0.07)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 8, color: '#25d366', fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><IconWhatsApp size={13} color="#25d366" />WhatsApp</button>
                  <button onClick={() => setShareData({ title: d.name, text: buildDistrictShareText(d.name, d.reports) })} style={{ flex: 1, padding: '8px 6px', background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, color: 'var(--cyan)', fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><IconShare size={13} color="var(--cyan)" />Share</button>
                  <button onClick={() => copyText(buildDistrictShareText(d.name, d.reports))} style={{ width: 34, height: 34, background: 'var(--card2)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconCopy size={13} /></button>
                </div>
              </div>);
            })
          }
        </div>
      </div>
    </div>
    {shareData && <ShareSheet title={shareData.title} text={shareData.text} onClose={() => setShareData(null)} />}
  </>);
}