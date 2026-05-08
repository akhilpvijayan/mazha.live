import { IconShare, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { IconCheck, IconCopy, IconLink, IconWhatsApp } from '../../Icons';
import { RainReport } from '../../../types';
import { currentAvgIntensity } from '../../../services/supabase';

const sbStyle: React.CSSProperties = {
  padding: '11px 10px', background: 'var(--card)', border: '1px solid var(--border2)',
  borderRadius: 11, color: 'var(--text2)', fontFamily: 'var(--ff)', fontSize: 13,
  fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center',
  justifyContent: 'center', gap: 8, transition: 'all .2s',
};

async function copyText(t: string) {
  try { await navigator.clipboard.writeText(t); return true; } catch { return false; }
}
function waShare(t: string) { window.open(`https://wa.me/?text=${encodeURIComponent(t)}`, '_blank'); }
function xShare(text: string) { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank'); }
function tgShare(text: string) { window.open(`https://t.me/share/url?url=https://mazha.live&text=${encodeURIComponent(text)}`, '_blank'); }
function nativeShare(text: string, title: string) {
  if (navigator.share) navigator.share({ title, text, url: 'https://mazha.live' }).catch(() => {});
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

export const getIntensityLabel = (mm: number): string => {
    if (mm > 80) return 'Very Heavy';
    if (mm > 50) return 'Heavy';
    if (mm > 20) return 'Moderate';
    if (mm > 8)  return 'Light';
    return 'Drizzle';
  };
export { sbStyle, waShare, xShare, tgShare, nativeShare, copyText, buildShareText, buildDistrictShareText };

export function ShareSheet({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const doCopy = async () => {
    const ok = await copyText(text);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };
  const doCopyLink = async () => {
    const ok = await copyText(`https://mazha.live?pin=${title}`);
    if (ok) { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }
  };
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
              <svg width={17} height={17} viewBox="0 0 24 24" fill="#2ca5e0"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              Telegram
            </button>
            <button onClick={() => xShare(text)} style={{ ...sbStyle, background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(150,150,150,0.25)', color: 'var(--text)' }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
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