import { useState } from 'react';
import { useLang } from '../../../context/LangContext';
import { getPincodeData } from '../../../services/pincodeService';
import { IconCloudRain, IconCrosshair, IconSend, IconCheck, IconAlertTriangle, IconX, IconMapPin,
  IconCloudDrizzle, IconCloud, IconCloudLightning, IconWaves } from '../../Icons';
import { BADGE_COLORS } from '../modals/MarkerTooltip';

type Level = 'drizzle' | 'light' | 'moderate' | 'heavy' | 'extreme';
const INTENSITY_OPTIONS: { Icon: any; mm: number; level: Level }[] = [
  { Icon: IconCloudDrizzle, mm: 4, level: 'drizzle' },
  { Icon: IconCloud, mm: 14, level: 'light' },
  { Icon: IconCloudRain, mm: 35, level: 'moderate' },
  { Icon: IconCloudLightning, mm: 65, level: 'heavy' },
  { Icon: IconWaves, mm: 100, level: 'extreme' },
];
export { INTENSITY_OPTIONS };

export function ReportModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (pin: string, mm: number) => Promise<void>;
}) {
  const { t } = useLang();
  const [pin, setPin] = useState('');
  const [sel, setSel] = useState(2);
  const [loading, setLoading] = useState(false);
  const [pinErr, setPinErr] = useState('');
  const [done, setDone] = useState(false);
  const [pinPreview, setPinPreview] = useState<{ area: string; district: string } | null>(null);
  const [pinLooking, setPinLooking] = useState(false);

  const handlePin = async (v: string) => {
    const clean = v.replace(/\D/g, '').slice(0, 6);
    setPin(clean); setPinErr(''); setPinPreview(null);
    if (clean.length === 6) {
      setPinLooking(true);
      try {
        const data = await getPincodeData(clean);
        if (data) setPinPreview({ area: data.area, district: data.district });
        else setPinErr(t.pinNotFound);
      } catch { } finally { setPinLooking(false); }
    }
  };

  const submit = async () => {
    if (pin.length !== 6) { setPinErr(t.pinError); return; }
    setLoading(true);
    try { await onSubmit(pin, INTENSITY_OPTIONS[sel].mm); setDone(true); setTimeout(onClose, 2800); }
    catch (e: any) { setPinErr(e.message || t.pinNotFound); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,212,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconCloudRain size={16} color="var(--cyan)" />
            </div>
            <div className="modal-title">{t.reportTitle}</div>
          </div>
          <button className="modal-close" onClick={onClose}><IconX size={14} /></button>
        </div>
        <div className="modal-body">
          {done ? (
            <div className="success-card">
              <div className="success-icon-wrap"><IconCheck size={28} color="var(--cyan)" /></div>
              <div className="success-title">{t.submittedTitle}</div>
              <div className="success-msg">{t.submittedMsg}</div>
            </div>
          ) : (
            <>
              <div className="step-label">{t.step1}</div>
              <div className="pin-row">
                <input className={`pin-input${pinErr ? ' err' : pin.length === 6 && pinPreview ? ' ok' : ''}`}
                  placeholder="_ _ _ _ _ _" value={pin} onChange={e => handlePin(e.target.value)}
                  inputMode="numeric" maxLength={6} autoFocus />
                {/* <button className="pin-locate-btn" disabled={pinLooking}>
                  {pinLooking ? <span className="submit-spinner" style={{ width: 16, height: 16, borderTopColor: 'var(--cyan)' }} /> : <IconCrosshair size={20} />}
                </button> */}
              </div>
              <div className="pin-dots">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className={`pin-dot${i < pin.length ? ' on' : ''}`} />)}
              </div>
              {pinPreview && (
                <div className="pin-preview">
                  <IconMapPin size={12} color="var(--cyan)" />
                  <div>
                    <div className="pin-preview-place">{pinPreview.area}</div>
                    <div className="pin-preview-dist">{pinPreview.district} District · PIN {pin}</div>
                  </div>
                  <IconCheck size={14} color="#00cc66" />
                </div>
              )}
              {pinErr && <div className="pin-err" style={{ marginTop: 8 }}><IconAlertTriangle size={13} color="#ff6666" />{pinErr}</div>}
              <div className="step-label" style={{ marginTop: 22 }}>{t.step2}</div>
              <div className="intensity-grid">
                {INTENSITY_OPTIONS.map((opt, i) => {
                  const col = BADGE_COLORS[opt.level]; const active = sel === i;
                  return (
                    <div key={opt.level} className={`intensity-card${active ? ' active' : ''}`}
                      style={active ? { borderColor: col, background: `${col}14`, '--ic-glow': `${col}44` } as any : {}}
                      onClick={() => setSel(i)}>
                      <div className="ic-icon-wrap" style={active ? { background: `${col}18` } : {}}>
                        <opt.Icon size={22} color={active ? col : 'var(--text3)'} />
                      </div>
                      <span className="ic-label" style={{ color: active ? col : 'var(--text3)' }}>{(t as any)[opt.level]}</span>
                    </div>
                  );
                })}
              </div>
              <button className="modal-submit" onClick={submit} disabled={loading || pinLooking}>
                {loading ? <><span className="submit-spinner" />{t.locating}</> : <><IconSend size={16} color="var(--cyan-dark)" />{t.submitReport}</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}