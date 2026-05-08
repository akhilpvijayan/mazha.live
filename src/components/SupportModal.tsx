import {
    IconCoffee,
    IconCookie,
    IconMeat,
    IconSparkles,
    IconHelicopter,
    IconX,
    IconQrcode,
    IconLock,
    IconHeart,
    IconUsers,
  } from '@tabler/icons-react';
  import { useMemo, useState, useEffect, useRef } from 'react';
  import { createPortal } from 'react-dom';
  import type { Icon as TablerIcon } from '@tabler/icons-react';
  
  type SupportTier = {
    name: string;
    desc: string;
    funny: string;
    amount: number;
    icon: TablerIcon;
    hot?: boolean;
  };
  
  const SUPPORT_TIERS: SupportTier[] = [
    { icon: IconCoffee,    name: 'Pazham',        amount: 5,   desc: 'Tiny banana for server survival',          funny: 'The server is literally hungry 🍌' },
    { icon: IconCookie,    name: 'Pazhampori',     amount: 15,  desc: 'Crispy fuel for debugging sessions',       funny: 'Dev codes 40% better after snacks, proven fact', hot: true },
    { icon: IconMeat,      name: 'Porotta + Beef', amount: 40,  desc: 'Proper developer meal, proper code',       funny: 'This pays for ~3hrs of focused monsoon-tracking 💪' },
    { icon: IconSparkles,  name: 'Sadya Plate',    amount: 100, desc: 'Full Kerala energy, full feature sprint',  funny: "You're basically a co-founder at this point ✨" },
    { icon: IconHelicopter,name: 'Chopper Mode',   amount: 500, desc: 'Extreme weather, extreme funding',         funny: 'Actual helicopter sound effects unlocked 🚁' },
  ];
  
  const FUEL_WORDS = ['caffeine ☕', 'prayers 🙏', 'sheer madness 💀', 'vibes only ✨', 'Kerala spirit 🌧'];
  
  function GPay(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg {...props} viewBox="0 0 82 34" xmlns="http://www.w3.org/2000/svg" aria-label="Google Pay">
        <path d="M39.1 15.7v9.3h-3V3.6h7.9c2 0 3.7.7 5 2s2 3 2 4.9c0 2-.7 3.6-2 4.9-1.3 1.3-3 2-5 2h-4.9zm0-9.3v6.5h5c1.2 0 2.2-.4 3-1.2.8-.8 1.2-1.8 1.2-3s-.4-2.2-1.2-3c-.8-.8-1.8-1.2-3-1.2l-5-.1zm19 3.4c2.1 0 3.8.6 5.1 1.7 1.2 1.1 1.9 2.7 1.9 4.7V25h-2.9v-2.1h-.1c-1.2 1.7-2.9 2.6-4.9 2.6-1.7 0-3.2-.5-4.4-1.5-1.2-1-1.7-2.4-1.7-4 0-1.7.6-3 1.9-4 1.3-1 3-1.5 5.1-1.5 1.8 0 3.3.3 4.5.9v-.7c0-1-.4-1.9-1.2-2.6-.8-.7-1.8-1-2.9-1-1.7 0-3 .7-3.9 2.1l-2.7-1.7c1.3-1.9 3.3-2.8 5.9-2.8h.3zm-3.7 11.3c0 .8.3 1.4 1 1.9.6.5 1.4.7 2.2.7 1.2 0 2.3-.5 3.2-1.4.9-.9 1.4-2 1.4-3.2-1.1-.8-2.5-1.2-4.4-1.2-1.4 0-2.5.3-3.3.9-.8.7-1.1 1.4-1.1 2.3zM78.4 9.9L68.1 33.7h-3.1l3.8-8.2-6.7-15.6h3.3l4.8 11.7h.1l4.7-11.7 3.4.1z" fill="currentColor"/>
        <path d="M28.7 13.1c0-.9-.1-1.8-.2-2.7H16.2v5.1h7c-.3 1.6-1.2 3-2.6 3.9v3.2h4.2c2.5-2.3 3.9-5.7 3.9-9.5z" fill="#4285F4"/>
        <path d="M16.2 25.8c3.5 0 6.5-1.2 8.6-3.2l-4.2-3.2c-1.2.8-2.7 1.2-4.4 1.2-3.4 0-6.2-2.3-7.3-5.3H4.6v3.3c2.1 4.2 6.4 7.2 11.6 7.2z" fill="#34A853"/>
        <path d="M8.9 15.3c-.3-.8-.4-1.6-.4-2.5s.1-1.7.4-2.5V7H4.6C3.6 9 3 11.3 3 13.8s.6 4.8 1.6 6.8l4.3-5.3z" fill="#FBBC05"/>
        <path d="M16.2 5.5c1.9 0 3.6.7 4.9 1.9l3.7-3.7C22.7 1.7 19.7.6 16.2.6 11 .6 6.7 3.6 4.6 7.9l4.3 3.3c1.1-3 3.9-5.7 7.3-5.7z" fill="#EA4335"/>
      </svg>
    );
  }
  
  function RainCanvas() {
    const ref = useRef<HTMLCanvasElement | null>(null);
    useEffect(() => {
      const canvas = ref.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      type Drop = { x: number; y: number; len: number; speed: number; opacity: number };
      let drops: Drop[] = [];
      let raf = 0;
      const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        drops = Array.from({ length: 90 }, () => ({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          len: 8 + Math.random() * 14,
          speed: 2.5 + Math.random() * 4,
          opacity: 0.08 + Math.random() * 0.25,
        }));
      };
      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const d of drops) {
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - 1, d.y + d.len);
          ctx.strokeStyle = `rgba(41,182,246,${d.opacity})`;
          ctx.lineWidth = 1;
          ctx.stroke();
          d.y += d.speed;
          if (d.y > canvas.height) { d.y = -d.len; d.x = Math.random() * canvas.width; }
        }
        raf = requestAnimationFrame(draw);
      };
      resize();
      window.addEventListener('resize', resize);
      raf = requestAnimationFrame(draw);
      return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    }, []);
    return (
      <canvas ref={ref} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10000, opacity: 0.35 }} />
    );
  }
  
  function spawnConfetti(containerRef: React.RefObject<HTMLDivElement>) {
    const el = containerRef.current;
    if (!el) return;
    const colors = ['#29b6f6', '#1565c0', '#4ade80', '#f59e0b', '#f472b6', '#a78bfa'];
    for (let i = 0; i < 18; i++) {
      const dot = document.createElement('div');
      const tx = (Math.random() - 0.5) * 100;
      const ty = -50 - Math.random() * 70;
      dot.style.cssText = `
        position:absolute;
        width:${4 + Math.random() * 4}px;
        height:${4 + Math.random() * 4}px;
        left:${20 + Math.random() * 60}%;
        top:${25 + Math.random() * 40}%;
        background:${colors[Math.floor(Math.random() * colors.length)]};
        border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
        pointer-events:none;
        z-index:10002;
        animation:confettiFly 0.9s ease forwards;
        animation-delay:${Math.random() * 0.25}s;
        --tx:${tx}px;
        --ty:${ty}px;
      `;
      el.appendChild(dot);
      setTimeout(() => dot.remove(), 1400);
    }
  }
  
  export default function SupportModal({ onClose }: { onClose: () => void }) {
    const [selected, setSelected] = useState(1);
    const [customAmount, setCustomAmount] = useState('');
    const [isCustom, setIsCustom] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [fuelIdx, setFuelIdx] = useState(0);
    const [fuelVisible, setFuelVisible] = useState(true);
    const [reporterCount] = useState(() => Math.floor(Math.random() * 120) + 43);
    const modalRef = useRef<HTMLDivElement>(null);
  
    const upi = import.meta.env.VITE_UPI_ID ?? '';
  
    // Lock body scroll while open
    useEffect(() => {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }, []);
  
    // Rotating fuel words
    useEffect(() => {
      const id = setInterval(() => {
        setFuelVisible(false);
        setTimeout(() => { setFuelIdx((p) => (p + 1) % FUEL_WORDS.length); setFuelVisible(true); }, 300);
      }, 2200);
      return () => clearInterval(id);
    }, []);
  
    // Close on Escape
    useEffect(() => {
      const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }, [onClose]);
  
    const finalAmount = useMemo(() => {
      if (isCustom) {
        const n = Number(customAmount);
        return Number.isFinite(n) && n > 0 ? n : SUPPORT_TIERS[selected].amount;
      }
      return SUPPORT_TIERS[selected].amount;
    }, [customAmount, isCustom, selected]);
  
    const upiLink = useMemo(
      () => `upi://pay?pa=${encodeURIComponent(upi)}&pn=MazhaLive&am=${finalAmount}&cu=INR&tn=${encodeURIComponent('Support Mazha.Live')}`,
      [upi, finalAmount]
    );
  
    const qrUrl = useMemo(
      () => `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`,
      [upiLink]
    );
  
    const handlePay = () => {
      spawnConfetti(modalRef);
      setTimeout(() => { window.location.href = upiLink; }, 200);
    };
  
    const handleSelectTier = (i: number) => {
      setSelected(i);
      setIsCustom(false);
      setCustomAmount('');
      spawnConfetti(modalRef);
    };
  
    const S = {
      backdrop: {
        position: 'fixed' as const,
        inset: 0,
        zIndex: 10001,          // above rain-loader-overlay (9999) + rain canvas (10000)
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'radial-gradient(ellipse at center, rgba(7,14,26,0.6) 0%, rgba(7,14,26,0.95) 100%)',
        backdropFilter: 'blur(6px)',
      },
      modal: {
        position: 'relative' as const,
        zIndex: 10002,
        width: '100%',
        maxWidth: 420,
        maxHeight: '90dvh',
        display: 'flex',
        flexDirection: 'column' as const,
        background: 'linear-gradient(160deg, #0d1f38 0%, #081528 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 0 0 1px rgba(41,182,246,0.08), 0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(41,182,246,0.07)',
        animation: 'mzSupportModalIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
        fontFamily: "'Outfit', sans-serif",
      },
    };
  
    const modal = (
      <>
        <style>{`
          @keyframes mzSupportModalIn {
            from { opacity:0; transform:scale(0.88) translateY(24px); }
            to   { opacity:1; transform:scale(1) translateY(0); }
          }
          @keyframes mzSupportShimmer {
            to { background-position: -200% 0; }
          }
          @keyframes mzSupportBlink {
            0%,100% { opacity:1; } 50% { opacity:0.35; }
          }
          @keyframes confettiFly {
            0%   { transform: translate(0,0) rotate(0deg); opacity:1; }
            100% { transform: translate(var(--tx),var(--ty)) rotate(720deg); opacity:0; }
          }
        `}</style>
  
        <RainCanvas />
  
        {/* Backdrop — click outside to close */}
        <div style={S.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
  
          {/* Modal */}
          <div ref={modalRef} style={S.modal}>
  
            {/* Shimmer strip */}
            <div style={{
              flexShrink: 0, height: 3,
              background: 'linear-gradient(90deg, transparent, #29b6f6, #1976d2, #29b6f6, transparent)',
              backgroundSize: '200% 100%',
              animation: 'mzSupportShimmer 2s linear infinite',
            }} />
  
            {/* Header */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem 0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 15, color: '#e2eaf6', letterSpacing: -0.3 }}>
                <IconHeart size={18} style={{ color: '#29b6f6' }} />
                Support mazha.live
              </div>
              <button
                onClick={onClose}
                style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.05)', color: 'rgba(180,200,230,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { const b = e.currentTarget; b.style.background = 'rgba(255,100,100,0.15)'; b.style.color = '#ff6b6b'; b.style.transform = 'rotate(90deg)'; }}
                onMouseLeave={(e) => { const b = e.currentTarget; b.style.background = 'rgba(255,255,255,0.05)'; b.style.color = 'rgba(180,200,230,0.5)'; b.style.transform = 'none'; }}
              >
                <IconX size={15} />
              </button>
            </div>
  
            {/* Hero */}
            <div style={{ flexShrink: 0, margin: '0 1.25rem 1rem', padding: '1rem 1.1rem', background: 'linear-gradient(135deg, rgba(41,182,246,0.08), rgba(21,101,192,0.04))', border: '1px solid rgba(41,182,246,0.12)', borderRadius: 12, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at top right, rgba(41,182,246,0.1), transparent 60%)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#e2eaf6', lineHeight: 1.25, marginBottom: 4 }}>One dev. Zero salary. Endless rain alerts.</div>
                <div style={{ fontSize: 12.5, color: 'rgba(180,200,230,0.5)', lineHeight: 1.5 }}>
                  Running on{' '}
                  <span style={{ color: '#29b6f6', fontWeight: 600, opacity: fuelVisible ? 1 : 0, transition: 'opacity 0.3s', display: 'inline-block' }}>
                    {FUEL_WORDS[fuelIdx]}
                  </span>{' '}
                  and the fear of Kerala going offline during peak monsoon.
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: 'rgba(180,200,230,0.5)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', animation: 'mzSupportBlink 1.5s ease infinite' }} />
                    Live right now
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: 'rgba(180,200,230,0.5)' }}>
                    <IconUsers size={11} style={{ color: '#29b6f6', flexShrink: 0 }} />
                    {reporterCount} reporters today
                  </div>
                </div>
              </div>
            </div>
  
            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' as any }}>
  
              {/* Tier label */}
              <div style={{ padding: '0 1.25rem', fontSize: 10.5, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' as const, color: 'rgba(180,200,230,0.4)', marginBottom: 8 }}>
                Pick your weapon
              </div>
  
              {/* Tiers */}
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, padding: '0 1.25rem' }}>
                {SUPPORT_TIERS.map((t, i) => {
                  const Icon = t.icon;
                  const active = i === selected && !isCustom;
                  return (
                    <button
                      key={t.name}
                      onClick={() => handleSelectTier(i)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 11px', borderRadius: 10, textAlign: 'left' as const,
                        border: `1px solid ${active ? 'rgba(41,182,246,0.5)' : 'rgba(255,255,255,0.07)'}`,
                        background: active ? 'linear-gradient(135deg, rgba(41,182,246,0.1), rgba(21,101,192,0.06))' : 'rgba(255,255,255,0.02)',
                        cursor: 'pointer', color: 'inherit',
                        transform: active ? 'translateX(3px)' : 'translateX(0)',
                        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                        position: 'relative' as const, overflow: 'hidden',
                      }}
                    >
                      {active && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: '0 2px 2px 0', background: '#29b6f6' }} />}
                      {t.hot && (
                        <div style={{ position: 'absolute', top: 6, right: 48, background: 'linear-gradient(90deg,#f59e0b,#f97316)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8, letterSpacing: '.04em' }}>
                          POPULAR
                        </div>
                      )}
                      <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(41,182,246,0.15)' : 'rgba(255,255,255,0.05)', color: '#29b6f6', boxShadow: active ? '0 0 12px rgba(41,182,246,0.3)' : 'none', transition: 'all 0.2s' }}>
                        <Icon size={17} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#e2eaf6', lineHeight: 1.2 }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: 'rgba(180,200,230,0.45)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {active ? t.funny : t.desc}
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#29b6f6', flexShrink: 0 }}>₹{t.amount}</div>
                    </button>
                  );
                })}
              </div>
  
              {/* Custom amount */}
              <div style={{ padding: '0.75rem 1.25rem 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${isCustom ? 'rgba(41,182,246,0.5)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', boxShadow: isCustom ? '0 0 0 3px rgba(41,182,246,0.08)' : 'none', transition: 'all 0.2s' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#29b6f6' }}>₹</span>
                  <input
                    type="number" placeholder="Feeling generous? Enter amount" value={customAmount} min={1}
                    onFocus={() => setIsCustom(true)}
                    onChange={(e) => { setCustomAmount(e.target.value); setIsCustom(true); }}
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: "'Outfit', sans-serif", fontSize: 14, color: '#e2eaf6' }}
                  />
                </div>
              </div>
  
              {/* Pay button */}
              <div style={{ padding: '0.85rem 1.25rem 0' }}>
                <button
                  onClick={handlePay}
                  style={{ width: '100%', padding: '13px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)', color: '#fff', fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', letterSpacing: -0.2, boxShadow: '0 4px 20px rgba(21,101,192,0.4)', transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)', position: 'relative' as const, overflow: 'hidden' }}
                  onMouseEnter={(e) => { const b = e.currentTarget; b.style.transform = 'translateY(-2px) scale(1.01)'; b.style.boxShadow = '0 8px 30px rgba(21,101,192,0.55)'; }}
                  onMouseLeave={(e) => { const b = e.currentTarget; b.style.transform = 'none'; b.style.boxShadow = '0 4px 20px rgba(21,101,192,0.4)'; }}
                  onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)'; }}
                  onMouseUp={(e)   => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px) scale(1.01)'; }}
                >
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(255,255,255,0.12),transparent)', pointerEvents: 'none' }} />
                  <GPay style={{ height: 18, width: 'auto', flexShrink: 0, filter: 'brightness(0) invert(1)' }} />
                  <span>Pay</span>
                  <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 6, padding: '2px 8px', fontSize: 14 }}>₹{finalAmount}</span>
                </button>
              </div>
  
              {/* Pay note */}
              <div style={{ padding: '0.4rem 1.25rem 0', fontSize: 10.5, color: 'rgba(180,200,230,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <IconLock size={11} style={{ color: '#29b6f6', opacity: 0.6 }} />
                Secure UPI · Your money goes directly to server bills
              </div>
  
              {/* QR toggle */}
              <button
                onClick={() => setShowQR((p) => !p)}
                style={{ width: 'calc(100% - 2.5rem)', margin: '0.6rem 1.25rem 0', padding: '8px 14px', borderRadius: 8, border: `1px dashed ${showQR ? 'rgba(41,182,246,0.4)' : 'rgba(255,255,255,0.07)'}`, background: 'transparent', color: showQR ? '#29b6f6' : 'rgba(180,200,230,0.4)', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontSize: 12.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'all 0.2s' }}
              >
                <IconQrcode size={14} />
                {showQR ? 'Hide QR — you actually clicked it 😎' : 'Show QR — for the button-averse 😌'}
              </button>
  
              {/* QR box */}
              {showQR && (
                <div style={{ margin: '0.7rem 1.25rem 0', padding: '1rem', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 8 }}>
                  <img src={qrUrl} alt="UPI QR Code" style={{ width: 140, height: 140, borderRadius: 8, background: '#fff', padding: 4 }} />
                  <p style={{ fontSize: 11, color: 'rgba(180,200,230,0.4)', textAlign: 'center' as const }}>
                    Scan with any UPI app · Works when buttons feel like too much effort 💀
                  </p>
                </div>
              )}
  
              {/* Footer */}
              <div style={{ padding: '0.85rem 1.25rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, color: 'rgba(180,200,230,0.35)' }}>
                <IconHeart size={12} style={{ color: '#29b6f6', opacity: 0.6 }} />
                Built with love for Kerala · mazha.live
              </div>
  
            </div>{/* end scrollable body */}
          </div>{/* end modal */}
        </div>{/* end backdrop */}
      </>
    );
  
    // ← THE KEY FIX: render directly on document.body,
    //   bypassing ALL parent stacking contexts
    return createPortal(modal, document.body);
  }