// PinStatusModal.tsx imports
import { useState, useCallback, useEffect } from 'react';
import type { RainReport } from '../../../types';
import { useLang } from '../../../context/LangContext';
import { getPincodeData } from '../../../services/pincodeService';
import { currentAvgIntensity, isGhost } from '../../../services/supabase';
import { getIntensityLabel } from '../../../utils/kerala';
import { IconCloudDrizzle, IconMapPin, IconSearch, IconShare, IconWhatsApp, IconX, IconCloudRain } from '../../Icons';
import { ShareSheet, buildShareText, waShare, sbStyle } from '../modals/ShareSheet';
import { BADGE_COLORS, getLevel, fmtTime } from '../modals/MarkerTooltip';
import { DecayBar } from '../modals/DecayBar';
import { INTENSITY_OPTIONS } from './ReportModal';

type Result = RainReport | 'invalid' | 'nodata' | null;

/* ─── PIN STATUS MODAL ────────────────────────────────────── */
export function PinStatusModal({ reports, now, onClose }: { reports: RainReport[]; now: number; onClose: () => void }) {
  const { t } = useLang();
  const [pin, setPin] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [pinInfo, setPinInfo] = useState<{ area: string; district: string } | null>(null);
  const [shareData, setShareData] = useState<{ title: string; text: string } | null>(null);

  const search = useCallback(async (p: string) => {
    if (p.length !== 6) return;
    setSearching(true); setPinInfo(null); setResult(null);
    await new Promise(r => setTimeout(r, 350));
    const found = reports.find(r => r.pin === p);
    if (found) {
      setPinInfo({ area: found.place, district: found.district });
      setResult(found);
    } else {
      try {
        const data = await getPincodeData(p);
        if (data) {
          setPinInfo({ area: data.area, district: data.district });
          setResult('nodata');
        } else {
          setResult('invalid');
        }
      } catch {
        setResult('invalid');
      }
    }
    setSearching(false);
  }, [reports]);

  useEffect(() => {
    if (pin.length === 6) search(pin);
    else { setResult(null); setPinInfo(null); }
  }, [pin]);

  const handleChange = (v: string) => {
    setPin(v.replace(/\D/g, '').slice(0, 6));
  };
  return (<>
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet" style={{ maxHeight: '88vh' }}>
        <div className="modal-handle" />
        <div className="modal-header"><div className="modal-title">PIN Status Check</div><button className="modal-close" onClick={onClose}><IconX size={14} /></button></div>
        <div className="modal-body">
          <div className="step-label">Enter Pincode</div>
          <div className="pin-row" style={{ marginBottom: pinInfo ? 8 : 14 }}>
            <input className={`pin-input${pin.length === 6 ? (result === 'invalid' ? ' err' : result ? ' ok' : '') : ''}`} placeholder="_ _ _ _ _ _" value={pin}
              onChange={e => handleChange(e.target.value)}
              inputMode="numeric" maxLength={6} autoFocus />
            <button className="pin-locate-btn" onClick={() => search(pin)} disabled={pin.length !== 6 || searching}
              style={pin.length === 6 ? { background: 'rgba(0,212,255,0.12)', borderColor: 'var(--border3)' } : {}}>
              {searching ? <span className="submit-spinner" style={{ borderTopColor: 'var(--cyan)' }} /> : <IconSearch size={20} />}
            </button>
          </div>
          {result === 'invalid' && <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text3)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, opacity: .3 }}><IconMapPin size={44} color="var(--text3)" /></div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#ff6b6b', marginBottom: 5 }}>Invalid Pincode</div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>{pin} is not a valid Indian pincode.</div>
          </div>}

          {result === 'nodata' && pinInfo && <div style={{ animation: 'successIn .4s var(--spring)' }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 16, padding: '18px', marginBottom: 14, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,212,255,0.08)', border: '2px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <IconMapPin size={26} color="var(--cyan)" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{pinInfo.area}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>{pinInfo.district} · PIN {pin}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', padding: '8px 12px', background: 'var(--card2)', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <IconCloudDrizzle size={14} color="var(--text3)" /> No rain reports yet for this area.
              </div>
            </div>
          </div>}

          {result && result !== 'invalid' && result !== 'nodata' && (() => {
            const r = result; const ghost = isGhost(r, now); const effAvg = currentAvgIntensity(r, now);
            const rawAvg = r.total / r.count; const level = ghost ? 'drizzle' : getLevel(effAvg); const col = ghost ? '#7a8899' : BADGE_COLORS[level];
            const LvlIcon = INTENSITY_OPTIONS.find(o => o.level === level)?.Icon || IconCloudRain;
            return (<div style={{ animation: 'successIn .4s var(--spring)' }}>
              <div style={{ background: `${col}10`, border: `1px solid ${col}28`, borderRadius: 16, padding: '18px', marginBottom: 14, textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${col}18`, border: `2px solid ${col}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}><LvlIcon size={26} color={col} /></div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 800, color: col, marginBottom: 4 }}>{ghost ? rawAvg.toFixed(1) : effAvg.toFixed(1)} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text3)' }}>mm/hr</span></div>
                {ghost ? <div style={{ fontSize: 11, color: '#7a8899', marginBottom: 6 }}>FADED · Peak was {rawAvg.toFixed(1)} mm/hr</div> : <div className={`rc-badge badge-${level}`} style={{ display: 'inline-flex', marginBottom: 8 }}>{getIntensityLabel(effAvg).toUpperCase()}</div>}
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.place}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{r.district} · PIN {r.pin}</div>
              </div>
              <DecayBar lastUpdated={r.lastUpdated} now={now} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, marginBottom: 14 }}>
                {[
                  { val: ghost ? rawAvg.toFixed(1) : effAvg.toFixed(1), lbl: ghost ? 'Peak mm/hr' : 'Now mm/hr', col },
                  { val: r.count, lbl: 'Reports', col: 'var(--accent)' },
                  { val: fmtTime(r.lastUpdated, { sAgo: 's', mAgo: 'm', hAgo: 'h' }), lbl: 'Last Report', col: 'var(--text2)' },
                ].map(s => <div key={s.lbl} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 6px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 800, color: s.col, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{s.lbl}</div>
                </div>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={() => waShare(buildShareText(r.pin, r.place, r.district, rawAvg, r.count))} style={{ ...sbStyle, background: 'rgba(37,211,102,0.07)', border: '1px solid rgba(37,211,102,0.2)', color: '#25d366' }}>
                  <IconWhatsApp size={16} color="#25d366" />WhatsApp
                </button>
                <button onClick={() => setShareData({ title: r.pin, text: buildShareText(r.pin, r.place, r.district, rawAvg, r.count) })} style={{ ...sbStyle, background: 'rgba(0,212,255,0.07)', border: '1px solid var(--border3)', color: 'var(--cyan)' }}>
                  <IconShare size={16} color="var(--cyan)" />Share
                </button>
              </div>
            </div>);
          })()}
        </div>
      </div>
    </div>
    {shareData && <ShareSheet title={shareData.title} text={shareData.text} onClose={() => setShareData(null)} />}
  </>);
}