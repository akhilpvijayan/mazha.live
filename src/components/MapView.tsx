import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import { getPincodeData } from '../services/pincodeService';
import { getIntensityColor, getIntensityLabel } from '../utils/kerala';
import {
  loadRainReports, insertRainReport, subscribeToReports,
  isSupabaseReady, currentAvgIntensity, isGhost, isExpired,
  decayFactor,
} from '../services/supabase';
import type { RainReport, RawReport } from '../types';
import { useLang } from '../context/LangContext';
import { useTheme } from '../context/ThemeContext';
import { HeatmapLayer } from './HeatmapLayer';
import {
  IconCloudRain, IconCloudDrizzle, IconCloudLightning, IconWaves, IconCloud,
  IconMapPin, IconShield, IconMap, IconFire, IconCrosshair, IconSend,
  IconCheck, IconActivity, IconBarChart, IconAlertTriangle, IconX,
  IconDroplet, IconTrendUp, IconShare, IconSearch,
  IconCopy, IconWhatsApp, IconInstall, IconLink, IconUsers,
} from './Icons';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { NotificationSettingsModal } from './NotificationSettings';
import { WalkthroughTour } from './Walkthroughtour';
import {
  IconHeartHandshake,
  IconCoffee,
  IconCurrencyRupee,
  IconMoodSmile,
  IconBolt,
  IconQrcode,
  IconSparkles,
} from '@tabler/icons-react';
import SupportModal from './SupportModal';

/* ─── constants ───────────────────────────────────────────── */
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const TWO_DAYS_MS = 24 * 60 * 60 * 1000;
const TICK_MS = 30_000;

/* ─── helpers ─────────────────────────────────────────────── */
function MapRefSyncer({ onReady }: { onReady: (m: any) => void }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, []);
  return null;
}

type Level = 'drizzle' | 'light' | 'moderate' | 'heavy' | 'extreme';

function getLevel(mm: number): Level {
  if (mm > 80) return 'extreme';
  if (mm > 50) return 'heavy';
  if (mm > 20) return 'moderate';
  if (mm > 8) return 'light';
  return 'drizzle';
}

const BADGE_COLORS: Record<Level, string> = {
  drizzle: '#4d9fff',
  light: '#60b4ff',
  moderate: '#a855f7',
  heavy: '#f59e0b',
  extreme: '#ef4444',
};

const INTENSITY_OPTIONS: { Icon: any; mm: number; level: Level }[] = [
  { Icon: IconCloudDrizzle, mm: 4, level: 'drizzle' },
  { Icon: IconCloud, mm: 14, level: 'light' },
  { Icon: IconCloudRain, mm: 35, level: 'moderate' },
  { Icon: IconCloudLightning, mm: 65, level: 'heavy' },
  { Icon: IconWaves, mm: 100, level: 'extreme' },
];

function fmtTime(ts: number, t: any): string {
  const d = Date.now() - ts;
  if (d < 10000) return `2${t.sAgo}`;
  if (d < 60000) return `${Math.floor(d / 1000)}${t.sAgo}`;
  if (d < 3600000) return `${Math.floor(d / 60000)}${t.mAgo}`;
  return `${Math.floor(d / 3600000)}${t.hAgo}`;
}

function fmtDuration(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m ago`;
  return `${m}m ago`;
}

function markerRadius(zoom: number, intensity: number, selected: boolean): number {
  const base = zoom <= 6 ? 4 : zoom === 7 ? 5 : zoom === 8 ? 6 : zoom === 9 ? 7
    : zoom === 10 ? 8 : zoom === 11 ? 9 : 10;
  const bonus = Math.min(3, intensity / 40);
  const r = base + bonus;
  return selected ? r + 2 : r;
}

/* ─── share helpers ───────────────────────────────────────── */
function buildShareText(pin: string, place: string, district: string, avg: number, count: number) {
  const label = getIntensityLabel(avg);
  return `🌧️ *Mazha.Live — Rain Alert!*\n\n📍 *${place}* (PIN: ${pin})\n🗺️ District: ${district}\n💧 Intensity: *${avg.toFixed(1)} mm/hr* — ${label}\n👥 Community reports: ${count}\n⏱️ Live & crowdsourced data\n\n🔗 Check live rain map → https://mazha.live`;
}
function buildDistrictShareText(district: string, rpts: RainReport[]) {
  const avgs = rpts.map(r => currentAvgIntensity(r));
  const max = Math.max(...avgs);
  const avg = avgs.reduce((a, b) => a + b, 0) / avgs.length;
  const lines = rpts.slice(0, 3).map(r => `  • ${r.place}: ${currentAvgIntensity(r).toFixed(0)} mm/hr`).join('\n');
  return `🌧️ *Mazha.Live — ${district} District Rain*\n\n📊 ${rpts.length} active location${rpts.length !== 1 ? 's' : ''}\n💧 Peak: *${max.toFixed(1)} mm/hr* | Avg: ${avg.toFixed(1)} mm/hr\n📌 Hotspots:\n${lines}\n\n🔗 Live rain map → https://mazha.live`;
}
async function copyText(t: string) { try { await navigator.clipboard.writeText(t); return true; } catch { return false; } }
function waShare(t: string) { window.open(`https://wa.me/?text=${encodeURIComponent(t)}`, '_blank'); }
function nativeShare(text: string, title: string) {
  if (navigator.share) navigator.share({ title, text, url: 'https://mazha.live' }).catch(() => { });
}
function xShare(text: string) { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank'); }
function tgShare(text: string) { window.open(`https://t.me/share/url?url=https://mazha.live&text=${encodeURIComponent(text)}`, '_blank'); }

/* ─── SHARE SHEET ─────────────────────────────────────────── */
function ShareSheet({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const doCopy = async () => { const ok = await copyText(text); if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); } };
  const doCopyLink = async () => { const ok = await copyText(`https://mazha.live?pin=${title}`); if (ok) { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); } };
  const hasNativeShare = typeof navigator.share === 'function';
  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet" style={{ maxHeight: '72vh' }}>
        <div className="modal-handle" />
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,212,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconShare size={16} color="var(--cyan)" />
            </div>
            <div className="modal-title">Share Rain Alert</div>
          </div>
          <button className="modal-close" onClick={onClose}><IconX size={14} /></button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 14, padding: '14px 16px', marginBottom: 18, fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.75, whiteSpace: 'pre-wrap', fontFamily: 'var(--ff)', position: 'relative' }}>
            {text}
            <div style={{ position: 'absolute', top: 10, right: 10, opacity: .4, fontSize: 10, color: 'var(--text3)' }}>preview</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 10 }}>
            <button onClick={() => waShare(text)} style={{ ...sbStyle, background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.25)', color: '#25d366' }}>
              <IconWhatsApp size={18} color="#25d366" /> WhatsApp
            </button>
            <button onClick={() => tgShare(text)} style={{ ...sbStyle, background: 'rgba(0,136,204,0.08)', border: '1px solid rgba(0,136,204,0.25)', color: '#2ca5e0' }}>
              <svg width={17} height={17} viewBox="0 0 24 24" fill="#2ca5e0"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
              Telegram
            </button>
            <button onClick={() => xShare(text)} style={{ ...sbStyle, background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(150,150,150,0.25)', color: 'var(--text)' }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              Post on X
            </button>
            {hasNativeShare
              ? <button onClick={() => nativeShare(text, title)} style={{ ...sbStyle, background: 'rgba(0,212,255,0.07)', border: '1px solid var(--border3)', color: 'var(--cyan)' }}>
                <IconShare size={17} color="var(--cyan)" /> More…
              </button>
              : <button onClick={doCopyLink} style={{ ...sbStyle, background: 'rgba(0,212,255,0.07)', border: '1px solid var(--border3)', color: linkCopied ? '#00cc66' : 'var(--cyan)' }}>
                {linkCopied ? <><IconCheck size={17} color="#00cc66" />Link Copied!</> : <><IconLink size={17} color="var(--cyan)" />Copy Link</>}
              </button>
            }
          </div>
          <button onClick={doCopy} style={{ ...sbStyle, width: '100%', background: copied ? 'rgba(0,204,102,0.08)' : 'var(--card)', border: `1px solid ${copied ? 'rgba(0,204,102,0.3)' : 'var(--border2)'}`, color: copied ? '#00cc66' : 'var(--text2)', transition: 'all .25s' }}>
            {copied ? <><IconCheck size={17} color="#00cc66" />Copied to clipboard!</> : <><IconCopy size={17} />Copy Full Message</>}
          </button>
        </div>
      </div>
    </div>
  );
}
const sbStyle: React.CSSProperties = { padding: '11px 10px', background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 11, color: 'var(--text2)', fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .2s' };

/* ─── Decay progress bar ──────────────────────────────────── */
function DecayBar({ lastUpdated, now }: { lastUpdated: number; now: number }) {
  const age = now - lastUpdated;
  const pct = Math.max(0, Math.min(100, (1 - age / TWO_HOURS_MS) * 100));
  const col = pct > 60 ? '#00cc66' : pct > 30 ? '#ffaa00' : '#ff4444';
  const label = age >= TWO_HOURS_MS ? 'Faded' : `${Math.round(pct)}% active`;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Intensity Decay</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: col }}>{label}</span>
      </div>
      <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 99, transition: 'width 1s linear' }} />
      </div>
      <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 3 }}>
        {age < TWO_HOURS_MS
          ? `Fades in ${fmtDuration(TWO_HOURS_MS - age).replace(' ago', '')}`
          : `Ghost until ${fmtDuration(TWO_DAYS_MS - age).replace(' ago', '')} from now`}
      </div>
    </div>
  );
}

/* ─── MARKER TOOLTIP ──────────────────────────────────────── */
function MarkerTooltip({ item, now, ghost }: { item: RainReport; now: number; ghost: boolean }) {
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
      <div className="tt-footer"><IconShield size={11} color="#00cc66" />Community Verified · {fmtTime(item.lastUpdated, { sAgo: 's ago', mAgo: 'm ago', hAgo: 'h ago' })}</div>
    </div>
  );
}

/* ─── REPORT MODAL ────────────────────────────────────────── */
function ReportModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (pin: string, mm: number) => Promise<void> }) {
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
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,212,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconCloudRain size={16} color="var(--cyan)" /></div>
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
          ) : (<>
            <div className="step-label">{t.step1}</div>
            <div className="pin-row">
              <input className={`pin-input${pinErr ? ' err' : pin.length === 6 && pinPreview ? ' ok' : ''}`} placeholder="_ _ _ _ _ _" value={pin} onChange={e => handlePin(e.target.value)} inputMode="numeric" maxLength={6} autoFocus />
              <button className="pin-locate-btn" disabled={pinLooking}>
                {pinLooking ? <span className="submit-spinner" style={{ width: 16, height: 16, borderTopColor: 'var(--cyan)' }} /> : <IconCrosshair size={20} />}
              </button>
            </div>
            <div className="pin-dots">{Array.from({ length: 6 }).map((_, i) => <div key={i} className={`pin-dot${i < pin.length ? ' on' : ''}`} />)}</div>
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
                return (<div key={opt.level} className={`intensity-card${active ? ' active' : ''}`}
                  style={active ? { borderColor: col, background: `${col}14`, '--ic-glow': `${col}44` } as any : {}} onClick={() => setSel(i)}>
                  <div className="ic-icon-wrap" style={active ? { background: `${col}18` } : {}}><opt.Icon size={22} color={active ? col : 'var(--text3)'} /></div>
                  <span className="ic-label" style={{ color: active ? col : 'var(--text3)' }}>{(t as any)[opt.level]}</span>
                </div>);
              })}
            </div>
            <button className="modal-submit" onClick={submit} disabled={loading || pinLooking}>
              {loading ? <><span className="submit-spinner" />{t.locating}</> : <><IconSend size={16} color="var(--cyan-dark)" />{t.submitReport}</>}
            </button>
          </>)}
        </div>
      </div>
    </div>
  );
}

/* ─── ALL REPORTS MODAL ───────────────────────────────────── */
function AllReportsModal({ reports, now, onClose }: { reports: RainReport[]; now: number; onClose: () => void }) {
  const { t } = useLang();
  const [filter, setFilter] = useState<Level | 'all' | 'ghost'>('all');
  const [shareData, setShareData] = useState<{ title: string; text: string } | null>(null);
  const sorted = [...reports].sort((a, b) => b.lastUpdated - a.lastUpdated);
  const filtered = filter === 'all' ? sorted : filter === 'ghost' ? sorted.filter(r => isGhost(r, now)) : sorted.filter(r => getLevel(currentAvgIntensity(r, now)) === filter && !isGhost(r, now));
  const CHIPS = [{ id: 'all', label: 'All' }, { id: 'ghost', label: 'Ghost' }, { id: 'extreme', label: 'Extreme' }, { id: 'heavy', label: 'Heavy' }, { id: 'moderate', label: 'Moderate' }, { id: 'light', label: 'Light' }, { id: 'drizzle', label: 'Drizzle' }];
  return (<>
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet" style={{ maxHeight: '88vh' }}>
        <div className="modal-handle" />
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="modal-title">{t.viewAll}</div>
            <span style={{ padding: '2px 9px', background: 'var(--card2)', borderRadius: 99, fontSize: 11, color: 'var(--text3)', fontWeight: 700 }}>{reports.length}</span>
          </div>
          <button className="modal-close" onClick={onClose}><IconX size={14} /></button>
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '10px 16px', overflowX: 'auto', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {CHIPS.map(c => {
            const col = c.id === 'ghost' ? '#7a8899' : c.id !== 'all' ? BADGE_COLORS[c.id as Level] : 'var(--text2)'; const active = filter === c.id;
            return <button key={c.id} onClick={() => setFilter(c.id as any)} style={{ padding: '5px 12px', borderRadius: 99, whiteSpace: 'nowrap', border: `1px solid ${active ? col : 'var(--border2)'}`, background: active ? `${col}18` : 'transparent', color: active ? col : 'var(--text3)', fontFamily: 'var(--ff)', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all .2s' }}>{c.label}</button>;
          })}
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: 14 }}>
          {filtered.length === 0
            ? <div className="no-reports"><div className="no-reports-icon"><IconCloudRain size={32} color="var(--text3)" /></div><div className="no-reports-title">{t.noReports}</div></div>
            : filtered.map((r, idx) => {
              const ghost = isGhost(r, now); const effAvg = currentAvgIntensity(r, now);
              const rawAvg = r.total / r.count; const level = ghost ? 'drizzle' : getLevel(effAvg); const col = ghost ? '#7a8899' : BADGE_COLORS[level];
              const LvlIcon = INTENSITY_OPTIONS.find(o => o.level === level)?.Icon || IconCloudRain;
              return (<div key={r.pin} className="report-card" style={{ '--card-accent': col, animationDelay: `${idx * 25}ms`, opacity: ghost ? .7 : 1 } as any}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: `${col}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <LvlIcon size={18} color={col} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 1 }}>{r.place}{ghost && <span style={{ fontSize: 9, background: 'rgba(120,130,150,0.15)', color: '#7a8899', padding: '1px 6px', borderRadius: 99, marginLeft: 6, fontWeight: 700 }}>FADED</span>}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 5 }}><IconMapPin size={9} color="currentColor" />{r.district} · {r.pin}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 800, color: col }}>{ghost ? rawAvg.toFixed(1) : effAvg.toFixed(1)}</div>
                    <div style={{ fontSize: 9, color: 'var(--text3)' }}>{ghost ? 'peak' : 'now'} mm/hr</div>
                  </div>
                  <button onClick={() => setShareData({ title: r.pin, text: buildShareText(r.pin, r.place, r.district, rawAvg, r.count) })}
                    style={{ width: 32, height: 32, background: 'var(--card2)', border: '1px solid var(--border2)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text2)' }}>
                    <IconShare size={14} />
                  </button>
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

/* ─── PIN STATUS MODAL ────────────────────────────────────── */
function PinStatusModal({ reports, now, onClose }: { reports: RainReport[]; now: number; onClose: () => void }) {
  const { t } = useLang();
  const [pin, setPin] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<RainReport | null | 'notfound'>(null);
  const [pinInfo, setPinInfo] = useState<{ area: string; district: string } | null>(null);
  const [shareData, setShareData] = useState<{ title: string; text: string } | null>(null);
  const search = async () => {
    if (pin.length !== 6) return; setSearching(true); setPinInfo(null);
    await new Promise(r => setTimeout(r, 350));
    const found = reports.find(r => r.pin === pin);
    if (found) { setPinInfo({ area: found.place, district: found.district }); }
    else { try { const data = await getPincodeData(pin); if (data) setPinInfo({ area: data.area, district: data.district }); } catch { } }
    setResult(found || 'notfound'); setSearching(false);
  };
  return (<>
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet" style={{ maxHeight: '88vh' }}>
        <div className="modal-handle" />
        <div className="modal-header"><div className="modal-title">PIN Status Check</div><button className="modal-close" onClick={onClose}><IconX size={14} /></button></div>
        <div className="modal-body">
          <div className="step-label">Enter Pincode</div>
          <div className="pin-row" style={{ marginBottom: pinInfo ? 8 : 14 }}>
            <input className={`pin-input${pin.length === 6 ? ' ok' : ''}`} placeholder="_ _ _ _ _ _" value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setResult(null); }}
              inputMode="numeric" maxLength={6} autoFocus onKeyDown={e => e.key === 'Enter' && search()} />
            <button className="pin-locate-btn" onClick={search} disabled={pin.length !== 6 || searching}
              style={pin.length === 6 ? { background: 'rgba(0,212,255,0.12)', borderColor: 'var(--border3)' } : {}}>
              {searching ? <span className="submit-spinner" style={{ borderTopColor: 'var(--cyan)' }} /> : <IconSearch size={20} />}
            </button>
          </div>
          {result === 'notfound' && <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text3)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, opacity: .3 }}><IconCloudDrizzle size={44} color="var(--text3)" /></div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 5 }}>No data for PIN {pin}</div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>No rain reports yet for this pincode.</div>
          </div>}
          {result && result !== 'notfound' && (() => {
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

/* ─── DISTRICT SHARE ──────────────────────────────────────── */
function DistrictShareModal({ reports, now, onClose }: { reports: RainReport[]; now: number; onClose: () => void }) {
  const [shareData, setShareData] = useState<{ title: string; text: string } | null>(null);
  const dm: Record<string, RainReport[]> = {};
  reports.forEach(r => { if (!dm[r.district]) dm[r.district] = []; dm[r.district].push(r); });
  const districts = Object.entries(dm).map(([name, rpts]) => {
    const avgs = rpts.map(r => currentAvgIntensity(r, now));
    return { name, reports: rpts, avg: avgs.reduce((a, b) => a + b, 0) / avgs.length, max: Math.max(...avgs) };
  }).sort((a, b) => b.avg - a.avg);
  return (<>
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet" style={{ maxHeight: '88vh' }}>
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

/* ─── TAB COMPONENTS ──────────────────────────────────────── */
type SbTab = 'live' | 'activity' | 'insights';

function LiveTab({ reports, now, selectedPin, onSelect }: { reports: RainReport[]; now: number; selectedPin: string | null; onSelect: (p: string) => void }) {
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

function ActivityTab({ reports, now }: { reports: RainReport[]; now: number }) {
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

function InsightsTab({ reports, now }: { reports: RainReport[]; now: number }) {
  const { t } = useLang();
  if (!reports.length) return <div className="no-reports"><div className="no-reports-icon"><IconBarChart size={32} color="var(--text3)" /></div><div className="no-reports-title">{t.noReports}</div><div className="no-reports-sub">{t.beFirst}</div></div>;
  const active = reports.filter(r => !isGhost(r, now)); const ghosts = reports.filter(r => isGhost(r, now));
  const totalRpts = reports.reduce((s, r) => s + r.count, 0);
  const avgs = active.map(r => currentAvgIntensity(r, now));
  const maxMm = avgs.length ? Math.max(...avgs) : 0; const avgMm = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : 0;
  const heavyCnt = active.filter(r => currentAvgIntensity(r, now) > 50).length;
  const dm: Record<string, { total: number; count: number }> = {};
  active.forEach(r => { if (!dm[r.district]) dm[r.district] = { total: 0, count: 0 }; dm[r.district].total += currentAvgIntensity(r, now); dm[r.district].count += 1; });
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

/* ─── ENGAGEMENT PANEL ────────────────────────────────────── */
function EngagementPanel({ reports, now }: { reports: RainReport[]; now: number }) {
  const active = reports.filter(r => !isGhost(r, now));
  const ghosts = reports.filter(r => isGhost(r, now));
  const total = reports.reduce((s, r) => s + r.count, 0);
  const avgs = active.map(r => currentAvgIntensity(r, now));
  const maxMm = avgs.length ? Math.max(...avgs) : 0;
  const districtCount = [...new Set(active.map(r => r.district))].length;
  const hoursSince = Math.floor((now - 1700000000000) / 3600000) % 8760 + 1200;
  const STATS = [
    { val: total || '—', lbl: 'Reports', icon: <IconDroplet size={13} color="#00d4ff" />, color: '#00d4ff' },
    { val: active.length || '—', lbl: 'Active', icon: <IconActivity size={13} color="#00cc66" />, color: '#00cc66' },
    { val: districtCount || '—', lbl: 'Districts', icon: <IconMapPin size={13} color="#a855f7" />, color: '#a855f7' },
    { val: maxMm > 0 ? `${maxMm.toFixed(0)}mm` : '—', lbl: 'Peak', icon: <IconAlertTriangle size={13} color="#ff7a00" />, color: '#ff7a00' },
  ];
  return (
    <div className="engage-panel">
      <div className="ep-title">
        <IconUsers size={12} color="var(--text3)" />
        <span>Kerala Rain Network</span>
        <span className="ep-live-dot" />
      </div>
      <div className="ep-stats">
        {STATS.map(s => (
          <div key={s.lbl} className="ep-stat">
            <div className="ep-stat-icon">{s.icon}</div>
            <div className="ep-stat-val" style={{ color: s.color }}>{s.val}</div>
            <div className="ep-stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>
      <div className="ep-footer">
        <span style={{ color: 'var(--text3)', fontSize: 9 }}>{ghosts.length > 0 ? `${ghosts.length} faded` : 'All active'}</span>
        <span style={{ color: 'var(--text3)', fontSize: 9 }}>·</span>
        <span style={{ color: 'var(--cyan)', fontSize: 9, fontWeight: 700 }}>{hoursSince.toLocaleString()}h uptime</span>
      </div>
    </div>
  );
}

/* ─── INFO FOOTER ─────────────────────────────────────────── */
function InfoFooter({ reports, now }: { reports: RainReport[]; now: number }) {
  const [showSupport, setShowSupport] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const total = reports.reduce((s, r) => s + r.count, 0);
  return (
    <>
      <div className="info-footer">
        <div className="info-footer-left">
          <span className="info-tag">
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            Made by Akhil · Kerala
          </span>
          <span className="info-sep">·</span>
          <button className="info-link" onClick={() => setShowDisclaimer(true)}>
            <IconAlertTriangle size={9} color="currentColor" /> Disclaimer
          </button>
          <span className="info-sep">·</span>
          <a className="info-link" href="https://mazha.live/terms" target="_blank" rel="noopener noreferrer">
            <IconShield size={9} color="currentColor" /> Terms
          </a>
        </div>
        <button className="info-support-btn" onClick={() => setShowSupport(true)}><span>☕</span> Support</button>
      </div>
      <div className="info-disclaimer-chip">
        <IconShield size={9} color="var(--text3)" />
        Crowdsourced · {total} community reports · Not official meteorology
      </div>
      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
      {showDisclaimer && (
        <div className="modal-backdrop" onClick={() => setShowDisclaimer(false)}>
          <div className="modal-sheet" style={{ maxHeight: '70vh' }}>
            <div className="modal-handle" />
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <IconAlertTriangle size={18} color="#ffaa00" />
                <div className="modal-title">Disclaimer</div>
              </div>
              <button className="modal-close" onClick={() => setShowDisclaimer(false)}><IconX size={14} /></button>
            </div>
            <div className="modal-body">
              {[
                { icon: '🌧️', title: 'Crowdsourced Data', body: 'All rain reports are submitted by the community. We do not verify accuracy. Do not use this for emergency decisions.' },
                { icon: '🚫', title: 'Not Official', body: 'Mazha.Live is NOT affiliated with IMD, Kerala State Disaster Management Authority, or any government body.' },
                { icon: '⏱️', title: 'Delayed & Decayed', body: 'Reports auto-expire after 2 hours. Historical data shown as "ghost" markers may be stale.' },
                { icon: '💡', title: 'Use Wisely', body: 'For emergencies, always consult official sources. This is a community tool built for awareness.' },
              ].map(d => (
                <div key={d.title} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{d.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{d.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{d.body}</div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: '12px', background: 'rgba(0,212,255,0.06)', border: '1px solid var(--border3)', borderRadius: 10, fontSize: 11, color: 'var(--text2)', lineHeight: 1.6, textAlign: 'center' }}>
                Made with ❤️ and too much chai in Kerala · <strong style={{ color: 'var(--cyan)' }}>mazha.live</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── FLOATING SIDEBAR ────────────────────────────────────── */
function FloatingSidebar({ reports, now, selectedPin, onSelect, onViewAll, onDistrictShare, onPinStatus }: {
  reports: RainReport[]; now: number; selectedPin: string | null; onSelect: (p: string) => void;
  onViewAll: () => void; onDistrictShare: () => void; onPinStatus: () => void;
}) {
  const { t } = useLang(); const [tab, setTab] = useState<SbTab>('live');
  const TABS = [
    { id: 'live' as SbTab, Icon: IconCloudRain, label: 'Live' },
    { id: 'activity' as SbTab, Icon: IconActivity, label: t.activity },
    { id: 'insights' as SbTab, Icon: IconBarChart, label: t.insights },
  ];
  return (
    <div className="float-sidebar">
      <div className="fsb-header">
        <div className="fsb-title-row">
          <div className="fsb-title">Live Rain</div>
          <div className="fsb-live-badge"><div className="fsb-live-dot" />LIVE</div>
        </div>
        <div className="fsb-search-row">
          <button className="fsb-search-btn" onClick={onPinStatus}><IconSearch size={13} /> Search PIN Area</button>
        </div>
        <div className="fsb-tabs">
          {TABS.map(tb => <button key={tb.id} className={"fsb-tab" + (tab === tb.id ? ' active' : '')} onClick={() => setTab(tb.id)}><tb.Icon size={12} />{tb.label}</button>)}
        </div>
      </div>
      <div className="fsb-body">
        {tab === 'live' && <LiveTab reports={reports} now={now} selectedPin={selectedPin} onSelect={onSelect} />}
        {tab === 'activity' && <ActivityTab reports={reports} now={now} />}
        {tab === 'insights' && <InsightsTab reports={reports} now={now} />}
      </div>
      <div className="fsb-footer">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          <button className="fsb-action-btn" onClick={onViewAll}><IconDroplet size={13} />All</button>
          <button className="fsb-action-btn" onClick={onDistrictShare}><IconShare size={13} />Districts</button>
          <button className="fsb-action-btn" onClick={onPinStatus}><IconSearch size={13} />Search</button>
        </div>
      </div>
    </div>
  );
}

/* ─── MOBILE LIVE SHEET ───────────────────────────────────── */
function MobileLiveSheet({ reports, now, onClose, onDistrictShare, initialTab }: {
  reports: RainReport[]; now: number; onClose: () => void; onDistrictShare: () => void; initialTab?: SbTab;
}) {
  const { t } = useLang();
  const [tab, setTab] = useState<SbTab>(initialTab || 'live');
  useEffect(() => { if (initialTab) setTab(initialTab); }, [initialTab]);
  const TABS = [
    { id: 'live' as SbTab, Icon: IconCloudRain, label: 'Live' },
    { id: 'activity' as SbTab, Icon: IconActivity, label: t.activity },
    { id: 'insights' as SbTab, Icon: IconBarChart, label: t.insights },
  ];
  return (
    <div className="mobile-live-sheet">
      <div className="mobile-live-handle" onClick={onClose} style={{ cursor: 'pointer' }} />
      <div className="mobile-live-tabs">
        {TABS.map(tb => <button key={tb.id} className={"mobile-live-tab" + (tab === tb.id ? ' active' : '')} onClick={() => setTab(tb.id)}><tb.Icon size={12} />{tb.label}</button>)}
        <button className="mobile-live-tab" onClick={onDistrictShare}><IconShare size={12} />Districts</button>
      </div>
      <div className="mobile-live-body">
        {tab === 'live' && <LiveTab reports={reports} now={now} selectedPin={null} onSelect={() => { }} />}
        {tab === 'activity' && <ActivityTab reports={reports} now={now} />}
        {tab === 'insights' && <InsightsTab reports={reports} now={now} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN MAP VIEW
   ═══════════════════════════════════════════════════════════ */
export default function MapView() {
  const { t } = useLang();
  const { theme } = useTheme();
  const { canInstall, install } = usePWAInstall();
  const [showTour, setShowTour] = useState(false);

  /* ── state ── */
  const [geo, setGeo] = useState<any>(null);
  const [keralaDistrictGeo, setKeralaDistrictGeo] = useState<any>(null);
  const [rainData, setRainData] = useState<Record<string, RainReport>>({});
  const [now, setNow] = useState(Date.now());
  const [zoom, setZoom] = useState(7);
  const [loading, setLoading] = useState(false);
  const [showHeat, setShowHeat] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAllModal, setShowAll] = useState(false);
  const [showPinStatus, setShowPin] = useState(false);   // ← was missing
  const [showDistShare, setShowDist] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showMobileSheet, setMobileSheet] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);   // ← moved inside
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<'radar' | 'activity' | 'insights' | 'districts'>('radar');
  const [lastUpdated, setLastUpdated] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pwaDismissed, setPwaDismissed] = useState(false);
  const [reportCooldown, setReportCooldown] = useState(0);       // ← moved inside

  const mapRef = useRef<any>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);  // ← moved inside

  /* ── derived ── */
  const reports = useMemo(() =>
    Object.values(rainData).filter(r => !isExpired(r.lastUpdated, now)),
    [rainData, now]
  );
  const heavyReport = reports.find(r => currentAvgIntensity(r, now) > 50);

  /* ── cooldown helper ── */
  const startCooldown = useCallback(() => {
    setReportCooldown(10);
    cooldownRef.current = setInterval(() => {
      setReportCooldown(p => {
        if (p <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return p - 1;
      });
    }, 1000);
  }, []);

  /* ── effects ── */
  useEffect(() => {
    if (!localStorage.getItem('mz_tour_seen')) return;
    if (localStorage.getItem('mz_onboarding_seen')) return;
    setTimeout(() => setShowOnboarding(true), 1200);
  }, []);

  // ── IP-based first visit → show tour ──
  useEffect(() => {
    if (localStorage.getItem('mz_tour_seen')) return;

    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(({ ip }) => {
        const key = `mz_tour_ip_${btoa(ip).slice(0, 12)}`;
        if (localStorage.getItem(key)) {
          // same IP, tour already done — check if onboarding needed
          // if (!localStorage.getItem('mz_onboarding_seen')) {
          //   setTimeout(() => setShowOnboarding(true), 1200);
          // }
          return;
        }
        // new visitor — mark IP and show tour only
        localStorage.setItem(key, '1');
        setShowOnboarding(false);
        setTimeout(() => setShowTour(true), 2200);
      })
      .catch(() => {
        // IP fetch failed — show tour as fallback, not both
        setTimeout(() => setShowTour(true), 2200);
      });
  }, []);
  // PWA dismiss persistence
  useEffect(() => {
    if (localStorage.getItem('mz_pwa_dismissed')) setPwaDismissed(true);
  }, []);

  // cleanup cooldown on unmount
  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  // load GeoJSON + reports
  useEffect(() => {
    fetch('/india_state.geojson').then(r => r.json()).then(setGeo);
    fetch('/kerala_districts.geojson').then(r => r.json()).then(setKeralaDistrictGeo).catch(() => {
      console.warn('kerala_districts.geojson not found in /public.');
    });
    if (isSupabaseReady()) {
      loadRainReports().then(data => { if (Object.keys(data).length) setRainData(data); });
    }
  }, []);

  // realtime subscription
  useEffect(() => {
    if (!isSupabaseReady()) return;
    const channel = subscribeToReports((raw: RawReport) => {
      const ts = new Date(raw.reported_at).getTime();
      setRainData(prev => {
        const ex = prev[raw.pin];
        return ex
          ? { ...prev, [raw.pin]: { ...ex, total: ex.total + raw.intensity, count: ex.count + 1, lastUpdated: ts } }
          : { ...prev, [raw.pin]: { pin: raw.pin, place: raw.place, district: raw.district, lat: raw.lat, lng: raw.lng, total: raw.intensity, count: 1, lastUpdated: ts, firstReport: ts } };
      });
    });
    return () => { channel?.unsubscribe(); };
  }, []);

  // tick
  useEffect(() => {
    const id = setInterval(() => { setNow(Date.now()); setLastUpdated(p => p + 30); }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  // zoom listener
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onZoom = () => setZoom(map.getZoom());
    map.on('zoomend', onZoom);
    return () => map.off('zoomend', onZoom);
  }, [mapRef.current]);

  // fullscreen body class
  useEffect(() => {
    document.body.classList.toggle('map--fullscreen', isFullscreen);
    setTimeout(() => mapRef.current?.invalidateSize(), 100);
    return () => { document.body.classList.remove('map--fullscreen'); };
  }, [isFullscreen]);

  /* ── handlers ── */
  const handlePwaDismiss = () => {
    setPwaDismissed(true);
    localStorage.setItem('mz_pwa_dismissed', '1');
  };

  const handleAddRain = useCallback(async (pin: string, mm: number) => {
    setLoading(true);
    try {
      const data = await getPincodeData(pin);
      if (!data) throw new Error(t.pinNotFound);
      const ts = Date.now();
      setRainData(prev => {
        const ex = prev[pin];
        return ex
          ? { ...prev, [pin]: { ...ex, total: ex.total + mm, count: ex.count + 1, lastUpdated: ts } }
          : { ...prev, [pin]: { pin, lat: data.lat, lng: data.lng, place: data.area, district: data.district, total: mm, count: 1, lastUpdated: ts, firstReport: ts } };
      });
      if (isSupabaseReady()) insertRainReport(pin, data.area, data.district, data.lat, data.lng, mm);
      setSelectedPin(pin);
      setLastUpdated(0);
      mapRef.current?.flyTo([data.lat, data.lng], 11, { duration: 1.6 });
      startCooldown();
    } finally { setLoading(false); }
  }, [t, startCooldown]);

  const handleSelect = useCallback((pin: string) => {
    setSelectedPin(p => p === pin ? null : pin);
    const r = rainData[pin];
    if (r) mapRef.current?.flyTo([r.lat, r.lng], 12, { duration: 1.2 });
  }, [rainData]);

  const openMobileTab = (tab: 'activity' | 'insights') => {
    setActiveNav(tab); setMobileSheet(true);
  };

  /* ── map styles ── */
  const geoStyle = useCallback((feature: any) => {
    const isK = (feature?.properties?.NAME_1 || '').toLowerCase().includes('kerala');
    return { color: isK ? '#00d4ff' : (theme === 'dark' ? '#1a2a3a' : '#90b0cc'), weight: isK ? 1.5 : 0.4, fillColor: 'transparent', fillOpacity: 0, opacity: isK ? 0.85 : 0.25 };
  }, [theme]);

  const districtStyle = useCallback(() => ({
    color: theme === 'dark' ? 'rgba(30,143,255,0.07)' : 'rgba(0,90,180,0.45)',
    weight: 1, fillOpacity: 0, opacity: 1,
  }), [theme]);

  const keralaDistrictStyle = useCallback(() => ({
    color: theme === 'dark' ? 'rgba(0,212,255,0.30)' : 'rgba(0,90,200,0.50)',
    weight: 1, fillColor: 'transparent', fillOpacity: 0, opacity: 1,
  }), [theme]);

  const onEachKeralaDistrict = useCallback((feature: any, layer: any) => {
    const name = feature?.properties?.district || feature?.properties?.DISTRICT
      || feature?.properties?.NAME_2 || feature?.properties?.dtname || feature?.properties?.name || '';
    if (name) layer.bindTooltip(name, { sticky: true, direction: 'top', className: 'district-name-tooltip', offset: [0, -4] });
    layer.on({
      mouseover(e: any) { e.target.setStyle({ fillColor: 'rgba(0,212,255,0.06)', fillOpacity: 1, weight: 1.5, color: theme === 'dark' ? 'rgba(0,212,255,0.55)' : 'rgba(0,90,200,0.75)' }); },
      mouseout(e: any) { e.target.setStyle(keralaDistrictStyle()); },
    });
  }, [theme, keralaDistrictStyle]);

  const darkTile = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const lightTile = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  /* ── render ── */
  return (
    <>
      <div className="map-shell">
        <MapContainer center={[10.8505, 76.2711]} zoom={7} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <MapRefSyncer onReady={m => { mapRef.current = m; setZoom(m.getZoom()); }} />
          <TileLayer key={theme} url={theme === 'dark' ? darkTile : lightTile} attribution="&copy; CARTO" />

          {geo && <GeoJSON key={`dist-${theme}`} data={geo} style={districtStyle} />}
          {keralaDistrictGeo && <GeoJSON key={`kerala-districts-${theme}`} data={keralaDistrictGeo} style={keralaDistrictStyle} onEachFeature={onEachKeralaDistrict} />}
          {geo && <GeoJSON key={`state-${theme}`} data={geo} style={geoStyle} />}

          {!showHeat && reports.map(item => {
            const ghost = isGhost(item, now);
            const effAvg = currentAvgIntensity(item, now);
            const displayMm = ghost ? 0 : effAvg;
            const color = ghost ? '#6b7a8d' : getIntensityColor(displayMm);
            const sel = selectedPin === item.pin;
            const r = markerRadius(zoom, displayMm, sel);
            const fillOpacity = ghost ? 0.28 : Math.max(0.4, 0.85 * decayFactor(item.lastUpdated, now) + 0.15);
            return (
              <CircleMarker key={item.pin} center={[item.lat, item.lng]} radius={r}
                pathOptions={{ color: sel ? '#ffffff' : (ghost ? '#4a5568' : color), weight: sel ? 2 : ghost ? 0.8 : 1.2, fillColor: color, fillOpacity, dashArray: ghost ? '3 2' : undefined }}
                eventHandlers={{ click: () => handleSelect(item.pin) }}>
                <Tooltip key={`tt-${item.pin}-${theme}`} className="mz-tt" direction="top" offset={[0, -r - 2]} sticky={false}>
                  <MarkerTooltip item={item} now={now} ghost={ghost} />
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* PWA banner */}
        {canInstall && !pwaDismissed && (
          <div className="pwa-banner-bar">
            <div className="pwa-banner-bar__icon">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M12 8v8M8 12l4 4 4-4" /></svg>
            </div>
            <div className="pwa-banner-bar__text">
              <div className="pwa-banner-bar__title">Install Mazha.Live</div>
              <div className="pwa-banner-bar__sub">Track rain from your home screen</div>
            </div>
            <button className="pwa-banner-bar__btn" onClick={install}>Add to Home</button>
            <button className="pwa-banner-bar__close" aria-label="Dismiss install banner" onClick={handlePwaDismiss}>
              <svg width={10} height={10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
              </svg>
            </button>
          </div>
        )}

        <HeatmapLayer reports={reports.filter(r => !isGhost(r, now))} mapRef={mapRef} visible={showHeat} />

        {heavyReport && (
          <div className="map-banner map-banner--intense">
            <span className="intense-pulse-dot" />
            <IconAlertTriangle size={13} color="#fff" />
            {t.intenseBanner} <span className="banner-highlight-red">{heavyReport.district}</span>
            &nbsp;·&nbsp;<span className="banner-count-red">{reports.length * 12} {t.reportsIn}</span>
            <span className="intense-bar-track"><span className="intense-bar-fill" /></span>
          </div>
        )}

        {/* Map tools */}
        <div className="map-tools">
          <button className="map-tool-btn" title="Refresh" onClick={() => window.location.reload()}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
          </button>
          <button className="map-tool-btn" title="Reset View" onClick={() => mapRef.current?.flyTo([10.8505, 76.2711], 7, { duration: 1 })}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
              <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          </button>

          <button className={`map-tool-btn${showHeat ? ' on' : ''}`} title="Heatmap" onClick={() => setShowHeat(p => !p)}>
            <IconFire size={16} />
          </button>
          <button
            className="map-tool-btn map-fullscreen-btn"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            onClick={() => setIsFullscreen(p => !p)}
          >
            {isFullscreen
              ? <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="10" y1="14" x2="3" y2="21" /><line x1="21" y1="3" x2="14" y2="10" /></svg>
              : <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
            }
          </button>
        </div>

        {/* Report FAB with cooldown */}
        <button
          className="report-fab"
          onClick={() => { if (reportCooldown === 0) setShowModal(true); }}
          disabled={loading || reportCooldown > 0}
          style={reportCooldown > 0 ? { opacity: 0.75, cursor: 'not-allowed' } : {}}
        >
          {reportCooldown > 0 ? (
            <>
              <svg width={22} height={22} viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="var(--cyan-dark)" strokeWidth="3"
                  strokeDasharray={`${(reportCooldown / 10) * 94} 94`} strokeLinecap="round" />
              </svg>
              Wait {reportCooldown}s
            </>
          ) : (
            <>
              <IconCloudRain size={22} color="var(--cyan-dark)" />
              {loading ? t.locating : t.reportRain}
            </>
          )}
        </button>

        <div className="last-updated">
          <div className="upd-dot" />
          {t.lastUpdated}: {lastUpdated}S AGO
          {isSupabaseReady() && <span style={{ marginLeft: 6, fontSize: 8, color: 'var(--cyan)', fontWeight: 700, letterSpacing: .5 }}>● LIVE</span>}
        </div>

        <InfoFooter reports={reports} now={now} />

        <FloatingSidebar reports={reports} now={now} selectedPin={selectedPin} onSelect={handleSelect}
          onViewAll={() => setShowAll(true)} onDistrictShare={() => setShowDist(true)} onPinStatus={() => setShowPin(true)} />

        <EngagementPanel reports={reports} now={now} />

        {/* ── LEFT LIVE FEED PANEL ── */}
        <div className="live-feed-panel">
          <div className="lf-header">
            <div className="lf-title">
              <div className="lf-live-dot" />
              Live Reports
            </div>
            <div className="lf-count">{reports.length} active</div>
          </div>
          <div className="lf-body">
            {[...reports]
              .sort((a, b) => b.lastUpdated - a.lastUpdated)
              .slice(0, 10)
              .map((r, idx) => {
                const ghost = isGhost(r, now);
                const eff = currentAvgIntensity(r, now);
                const level = ghost ? 'faded' : getLevel(eff);
                const cssClass =
                  ghost ? 'lf-faded' :
                    level === 'extreme' ? 'lf-extreme' :
                      level === 'heavy' ? 'lf-heavy' :
                        level === 'moderate' ? 'lf-moderate' :
                          'lf-active';
                const label =
                  ghost ? 'Faded' :
                    level === 'extreme' ? 'Extreme' :
                      level === 'heavy' ? 'Heavy' :
                        level === 'moderate' ? 'Moderate' :
                          level === 'light' ? 'Light' :
                            'Drizzle';
                return (
                  <div
                    key={r.pin}
                    className={`lf-item ${cssClass}`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                    onClick={() => handleSelect(r.pin)}
                  >
                    <div className="lf-status-dot" />
                    <span className="lf-status-label">{label}</span>
                    <span className="lf-place">{r.place}</span>
                    <span className="lf-sub">{r.district} · {r.pin}</span>
                    <span className="lf-time">{fmtTime(r.lastUpdated, t)}</span>
                  </div>
                );
              })}
          </div>
        </div>


        {/* Mobile PIN search FAB */}
        <button className="mobile-pin-fab" onClick={() => setShowPin(true)} title="Search PIN">
          <IconSearch size={18} color="var(--cyan)" />
        </button>

        {/* Mobile nav buttons */}
        <div className="nav-btn-row">
          <button className={`nav-btn${showPinStatus ? ' nav-btn--active' : ''}`} title="Search PIN" onClick={() => setShowPin(true)}>
            <IconSearch size={18} />
          </button>
          <button className={`nav-btn${activeNav === 'activity' && showMobileSheet ? ' nav-btn--active' : ''}`} title="Activity"
            onClick={() => { if (activeNav === 'activity' && showMobileSheet) { setMobileSheet(false); setActiveNav('radar'); } else openMobileTab('activity'); }}>
            <IconActivity size={18} />
          </button>
          <button className={`nav-btn${activeNav === 'insights' && showMobileSheet ? ' nav-btn--active' : ''}`} title="Insights"
            onClick={() => { if (activeNav === 'insights' && showMobileSheet) { setMobileSheet(false); setActiveNav('radar'); } else openMobileTab('insights'); }}>
            <IconBarChart size={18} />
          </button>
          <button className={`nav-btn${showDistShare ? ' nav-btn--active' : ''}`} title="Districts" onClick={() => setShowDist(true)}>
            <IconMapPin size={18} />
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      {showMobileSheet && (activeNav === 'activity' || activeNav === 'insights') && (
        <MobileLiveSheet reports={reports} now={now} initialTab={activeNav as SbTab}
          onClose={() => { setMobileSheet(false); setActiveNav('radar'); }}
          onDistrictShare={() => setShowDist(true)} />
      )}

      {/* Modals */}
      {showModal && <ReportModal onClose={() => setShowModal(false)} onSubmit={handleAddRain} />}
      {showAllModal && <AllReportsModal reports={reports} now={now} onClose={() => setShowAll(false)} />}
      {showPinStatus && <PinStatusModal reports={reports} now={now} onClose={() => setShowPin(false)} />}
      {showDistShare && <DistrictShareModal reports={reports} now={now} onClose={() => setShowDist(false)} />}
      {showNotif && <NotificationSettingsModal onClose={() => setShowNotif(false)} />}

      {/* First-visit onboarding */}
      {showOnboarding && (
        <div className="modal-backdrop" style={{ alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setShowOnboarding(false); localStorage.setItem('mz_onboarding_seen', '1'); }}>
          <div className="modal-sheet"
            style={{ width: 340, borderRadius: 22, maxHeight: '90vh', animation: 'successIn .5s var(--spring)', padding: '0 0 28px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, rgba(26,111,255,0.18) 0%, rgba(168,85,247,0.12) 100%)', borderRadius: '22px 22px 0 0', padding: '32px 28px 24px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 52, marginBottom: 14, lineHeight: 1, filter: 'drop-shadow(0 4px 16px rgba(26,111,255,0.4))' }}>🌧️</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', marginBottom: 6 }}>മഴ ഉണ്ടോ? Report it!</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>Help your community know where it's raining in Kerala — right now, in real time.</div>
            </div>
            <div style={{ padding: '20px 24px 0' }}>
              {[
                { icon: '📍', title: 'Enter your PIN code', desc: 'Just your 6-digit postal code' },
                { icon: '💧', title: 'Select rain intensity', desc: 'Drizzle to extreme — you decide' },
                { icon: '🗺️', title: 'See it live on the map', desc: 'Your report appears instantly' },
              ].map(s => (
                <div key={s.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.4 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{s.desc}</div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => { setShowOnboarding(false); localStorage.setItem('mz_onboarding_seen', '1'); setTimeout(() => setShowModal(true), 300); }}
                style={{ width: '100%', marginTop: 20, padding: '15px', background: 'var(--cyan)', border: 'none', borderRadius: 13, color: 'var(--cyan-dark)', fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 4px 24px var(--glow-cyan)' }}>
                <IconCloudRain size={18} color="var(--cyan-dark)" />
                Report Rain Near Me
              </button>
              <button
                onClick={() => { setShowOnboarding(false); localStorage.setItem('mz_onboarding_seen', '1'); }}
                style={{ width: '100%', marginTop: 10, padding: '12px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: 13, color: 'var(--text3)', fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── WALKTHROUGH TOUR ── */}
      {showTour && (
        <WalkthroughTour onDone={() => {
          setShowTour(false);
          localStorage.setItem('mz_tour_seen', '1');
        }} />
      )}
    </>
  );
}

