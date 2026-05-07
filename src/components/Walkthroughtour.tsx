import { useEffect, useState, useCallback } from 'react';

interface Step {
  id: string;
  target: string | null;
  title: string;
  desc: string;
  emoji: string;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    target: null,
    title: "Welcome to Mazha.Live 🌧️",
    desc: "Kerala's live crowdsourced rain map — built by locals, for locals. Quick 30-second tour?",
    emoji: '🗺️',
  },
  {
    id: 'fab',
    target: '.report-fab',
    title: "Report Rain 💧",
    desc: "Tap here to report rain near you. Just your PIN code + intensity — appears on the map instantly.",
    emoji: '💧',
  },
  {
    id: 'live-feed',
    target: '.live-feed-panel',
    title: "Live Feed 📡",
    desc: "Real-time reports stream here. Newest at the bottom. Tap any row to fly to that location.",
    emoji: '📡',
    desktopOnly: true,
  },
  {
    id: 'sidebar',
    target: '.float-sidebar',
    title: "Reports Panel 📋",
    desc: "Browse all active reports, activity history, and district insights. Reports fade after 2 hours.",
    emoji: '📋',
    desktopOnly: true,
  },
  {
    id: 'map-tools',
    target: '.map-tools',
    title: "Map Tools 🔧",
    desc: "Refresh, reset view, toggle heatmap, or go fullscreen.",
    emoji: '🔧',
  },
  {
    id: 'engage',
    target: '.engage-panel',
    title: "Network Stats 📊",
    desc: "Live counts — reports, active pins, districts, peak intensity. Updates every 30 seconds.",
    emoji: '📊',
    desktopOnly: true,
  },
  {
    id: 'mobile-nav',
    target: '.nav-btn-row',
    title: "Navigation 🧭",
    desc: "Search a PIN, view activity, check insights, or browse district rain data.",
    emoji: '🧭',
    mobileOnly: true,
  },
  {
    id: 'mobile-feed',
    target: '.live-feed-panel',
    title: "Live Feed 📡",
    desc: "Latest reports show here — transparent so you can still see the map behind.",
    emoji: '📡',
    mobileOnly: true,
  },
  {
    id: 'done',
    target: null,
    title: "You're all set! 🎉",
    desc: "Every report helps Kerala stay safe. Share with family and friends!",
    emoji: '🙌',
  },
];

function isMobile() { return window.innerWidth <= 768; }

export function WalkthroughTour({ onDone }: { onDone: () => void }) {
  const mobile = isMobile();

  const steps = STEPS.filter(s => {
    if (s.mobileOnly && !mobile) return false;
    if (s.desktopOnly && mobile) return false;
    return true;
  });

  const [idx, setIdx] = useState(0);
  const [hl, setHl] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const step = steps[idx];
  const isFirst = idx === 0;
  const isLast = idx === steps.length - 1;

  const PAD = mobile ? 8 : 10;

  const updateHl = useCallback(() => {
    if (!step?.target) { setHl(null); return; }
    const el = document.querySelector(step.target);
    if (!el) { setHl(null); return; }
    const r = el.getBoundingClientRect();
    setHl({
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    });
  }, [step, PAD]);

  useEffect(() => {
    updateHl();
    window.addEventListener('resize', updateHl);
    return () => window.removeEventListener('resize', updateHl);
  }, [updateHl]);

  const next = () => isLast ? onDone() : setIdx(p => p + 1);
  const prev = () => { if (!isFirst) setIdx(p => p - 1); };
  const skip = () => onDone();

  /* ── card position ── */
  const cardPos = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed',
      zIndex: 99999,
      fontFamily: 'system-ui, sans-serif',
    };

    // MOBILE: always a bottom sheet
    if (mobile) {
      return {
        ...base,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: '20px 20px 0 0',
        // if highlight is in the bottom half, push card to top instead
        ...(hl && hl.top > window.innerHeight * 0.45
          ? { bottom: undefined, top: 0, borderRadius: '0 0 20px 20px' }
          : {}),
      };
    }

    // DESKTOP: smart positioning near target
    const W = 340;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const MGAP = 18;

    if (!hl) {
      return { ...base, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: W };
    }

    // right of target
    if (hl.left + hl.width + MGAP + W < vw) {
      return {
        ...base, width: W,
        left: hl.left + hl.width + MGAP,
        top: Math.max(16, Math.min(vh - 440, hl.top + hl.height / 2 - 180)),
      };
    }
    // left of target
    if (hl.left - MGAP - W > 0) {
      return {
        ...base, width: W,
        left: hl.left - MGAP - W,
        top: Math.max(16, Math.min(vh - 440, hl.top + hl.height / 2 - 180)),
      };
    }
    // below target
    if (hl.top + hl.height + MGAP + 320 < vh) {
      return {
        ...base, width: W,
        top: hl.top + hl.height + MGAP,
        left: Math.max(16, Math.min(vw - W - 16, hl.left + hl.width / 2 - W / 2)),
      };
    }
    // above target
    return {
      ...base, width: W,
      bottom: vh - hl.top + MGAP,
      left: Math.max(16, Math.min(vw - W - 16, hl.left + hl.width / 2 - W / 2)),
    };
  };

  return (
    <>
      <style>{`
        @keyframes tourCardIn {
          from { opacity:0; transform: translateY(24px) scale(0.96); }
          to   { opacity:1; transform: translateY(0) scale(1); }
        }
        @keyframes tourCardInDesktop {
          from { opacity:0; transform: scale(0.92) translateY(10px); }
          to   { opacity:1; transform: scale(1) translateY(0); }
        }
        @keyframes hlPulse {
          0%,100% { box-shadow: 0 0 0 3px rgba(26,111,255,0.5); }
          50%      { box-shadow: 0 0 0 6px rgba(26,111,255,0.15); }
        }
      `}</style>

      {/* ── Overlay panels ── */}
      {!hl ? (
        // no target: full dark overlay
        <div onClick={skip} style={{
          position: 'fixed', inset: 0, zIndex: 99990,
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
        }} />
      ) : (
        // target: four panels leave a clear window
        <>
          {/* top */}
          <div onClick={skip} style={{ position:'fixed', zIndex:99990, top:0, left:0, right:0, height: Math.max(0, hl.top), background:'rgba(0,0,0,0.72)' }} />
          {/* bottom */}
          <div onClick={skip} style={{ position:'fixed', zIndex:99990, top: hl.top + hl.height, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.72)' }} />
          {/* left */}
          <div onClick={skip} style={{ position:'fixed', zIndex:99990, top: hl.top, left:0, width: Math.max(0, hl.left), height: hl.height, background:'rgba(0,0,0,0.72)' }} />
          {/* right */}
          <div onClick={skip} style={{ position:'fixed', zIndex:99990, top: hl.top, left: hl.left + hl.width, right:0, height: hl.height, background:'rgba(0,0,0,0.72)' }} />
        </>
      )}

      {/* ── Highlight ring ── */}
      {hl && (
        <div style={{
          position: 'fixed',
          zIndex: 99992,
          pointerEvents: 'none',
          borderRadius: 14,
          top: hl.top, left: hl.left,
          width: hl.width, height: hl.height,
          border: '2.5px solid rgba(26,111,255,0.95)',
          animation: 'hlPulse 2s ease-in-out infinite',
          transition: 'top .35s ease, left .35s ease, width .35s ease, height .35s ease',
        }} />
      )}

      {/* ── Tooltip card ── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          ...cardPos(),
          background: '#0a1020',
          border: '1px solid rgba(26,111,255,0.35)',
          overflow: 'hidden',
          boxShadow: mobile
            ? '0 -8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(26,111,255,0.1)'
            : '0 24px 64px rgba(0,0,0,0.85), 0 0 0 1px rgba(26,111,255,0.12)',
          animation: mobile ? 'tourCardIn .38s cubic-bezier(0.34,1.2,0.64,1)' : 'tourCardInDesktop .35s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* mobile handle */}
        {mobile && (
          <div style={{ display:'flex', justifyContent:'center', paddingTop:10, paddingBottom:4 }}>
            <div style={{ width:36, height:4, borderRadius:99, background:'rgba(255,255,255,0.15)' }} />
          </div>
        )}

        {/* progress bar */}
        <div style={{ height:3, background:'rgba(255,255,255,0.06)', margin: mobile ? '0 16px' : 0, borderRadius: mobile ? 99 : 0 }}>
          <div style={{
            height: '100%',
            width: `${((idx + 1) / steps.length) * 100}%`,
            background: 'linear-gradient(90deg,#1a6fff,#a855f7)',
            borderRadius: 99,
            transition: 'width .4s ease',
          }} />
        </div>

        {/* body */}
        <div style={{
          padding: mobile ? '16px 20px 12px' : '20px 20px 16px',
          background: 'linear-gradient(135deg,rgba(26,111,255,0.09),rgba(168,85,247,0.05))',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
            <div style={{
              width: mobile ? 44 : 50, height: mobile ? 44 : 50,
              borderRadius: 12, flexShrink: 0,
              background: 'rgba(26,111,255,0.14)',
              border: '1px solid rgba(26,111,255,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: mobile ? 22 : 24,
            }}>
              {step.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: mobile ? 14 : 15, fontWeight: 800, color: '#eef3ff', lineHeight: 1.3, marginBottom: 2 }}>
                {step.title}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', fontWeight: 600, letterSpacing: '.7px', textTransform: 'uppercase' }}>
                {idx + 1} / {steps.length}
              </div>
            </div>
            <button onClick={skip} style={{
              width: 28, height: 28, borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>✕</button>
          </div>

          <p style={{
            fontSize: mobile ? 13 : 13.5,
            color: 'rgba(255,255,255,0.76)',
            lineHeight: 1.7,
            margin: 0,
          }}>
            {step.desc}
          </p>
        </div>

        {/* footer */}
        <div style={{ padding: mobile ? '12px 20px 20px' : '14px 18px' }}>
          {/* step dots */}
          <div style={{ display:'flex', gap:5, justifyContent:'center', marginBottom:12 }}>
            {steps.map((_, i) => (
              <div
                key={i}
                onClick={() => setIdx(i)}
                style={{
                  width: i === idx ? 20 : 6, height: 6, borderRadius: 99,
                  background: i === idx ? '#1a6fff' : i < idx ? 'rgba(26,111,255,0.4)' : 'rgba(255,255,255,0.12)',
                  transition: 'all .3s', cursor: 'pointer',
                }}
              />
            ))}
          </div>

          {/* buttons */}
          <div style={{ display:'flex', gap:8 }}>
            {!isFirst && (
              <button onClick={prev} style={{
                flex: 1, padding: mobile ? '13px' : '11px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: mobile ? 14 : 13, fontWeight: 600, cursor: 'pointer',
              }}>← Back</button>
            )}
            <button onClick={next} style={{
              flex: isFirst ? 1 : 2,
              padding: mobile ? '13px 18px' : '11px 18px',
              borderRadius: 12, border: 'none',
              background: isLast
                ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                : 'linear-gradient(135deg,#1a6fff,#4d9fff)',
              color: '#fff',
              fontSize: mobile ? 14 : 13, fontWeight: 800, cursor: 'pointer',
              boxShadow: isLast
                ? '0 4px 18px rgba(34,197,94,0.45)'
                : '0 4px 18px rgba(26,111,255,0.45)',
            }}>
              {isLast ? '🎉 Get Started!' : isFirst ? 'Start Tour →' : 'Next →'}
            </button>
          </div>

          {isFirst && (
            <button onClick={skip} style={{
              width: '100%', marginTop: 10,
              padding: mobile ? '10px' : '8px',
              background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.22)',
              fontSize: mobile ? 13 : 12, cursor: 'pointer',
            }}>Skip tour</button>
          )}
        </div>
      </div>
    </>
  );
}