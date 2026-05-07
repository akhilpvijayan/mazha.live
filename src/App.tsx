import { ThemeProvider, useTheme } from './context/ThemeContext';
import { LangProvider, useLang } from './context/LangContext';
import MapView from './components/MapView';
import { NotificationSettingsModal } from './components/NotificationSettings';
import { IconSun, IconMoon } from './components/Icons';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useEffect, useRef, useState } from 'react';

function BellIcon({ subscribed }: { subscribed: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      {subscribed && <circle cx="18" cy="5" r="4" fill="#00d4ff" stroke="none"/>}
    </svg>
  );
}

/** Raindrop + cloud SVG logo — animated drops */
function AnimatedLogo({
  size = 28,
  dark = false,
}: {
  size?: number;
  dark?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = ref.current;

    if (!cv) return;

    const ctx = cv.getContext("2d")!;

    if (!ctx) return;

    const W = size;
    const H = size * 1.45;
    const s = size / 28;

    cv.width = W;
    cv.height = H;

    const CYCLE = 210;

    let t = 0;
    let raf = 0;

    const boltPts = (
      bx: number,
      by: number
    ): [number, number][] => [
      [bx + s * 4, by],
      [bx - s * 6, by + s * 13],
      [bx + s * 1, by + s * 13],
      [bx - s * 4.5, by + s * 27],
      [bx + s * 7, by + s * 13],
      [bx + s * 1.5, by + s * 13],
    ];

    function drawBolt(
      flash: boolean,
      alpha: number
    ) {
      const bx = W * 0.5;
      const by = H * 0.04;

      const pts = boltPts(bx, by);

      ctx.save();

      ctx.globalAlpha = alpha;

      if (flash) {
        ctx.fillStyle = "#ffffff";
      } else {
        const g = ctx.createLinearGradient(
          bx - s * 6,
          by,
          bx + s * 7,
          by + s * 27
        );

        g.addColorStop(
          0,
          dark ? "#40c4ff" : "#29b6f6"
        );

        g.addColorStop(
          0.5,
          dark ? "#1976d2" : "#1565c0"
        );

        g.addColorStop(
          1,
          dark ? "#283593" : "#1a237e"
        );

        ctx.fillStyle = g;
      }

      ctx.beginPath();

      pts.forEach(([x, y], i) => {
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.closePath();
      ctx.fill();

      if (!flash) {
        ctx.fillStyle = dark
          ? "rgba(10,20,70,0.28)"
          : "rgba(10,20,80,0.22)";

        const bx2 = bx;
        const by2 = by;

        ctx.beginPath();

        ctx.moveTo(
          bx2 + s * 1,
          by2 + s * 4
        );

        ctx.lineTo(
          bx2 - s * 2,
          by2 + s * 13
        );

        ctx.lineTo(
          bx2 + s * 1,
          by2 + s * 13
        );

        ctx.lineTo(
          bx2 - s * 1.5,
          by2 + s * 24
        );

        ctx.lineTo(
          bx2 + s * 3.5,
          by2 + s * 14
        );

        ctx.lineTo(
          bx2 + s * 0.5,
          by2 + s * 14
        );

        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    const drops = [
      { xf: 0.22, phase: 0, len: 2.4 },
      { xf: 0.4, phase: 0.28, len: 2.0 },
      { xf: 0.58, phase: 0.55, len: 2.5 },
      { xf: 0.76, phase: 0.82, len: 2.2 },
    ];

    function drawRain(
      time: number,
      flash: boolean
    ) {
      drops.forEach((d) => {
        const prog =
          ((time / 48 + d.phase) % 1);

        const y =
          H * 0.04 + prog * H * 0.9;

        const a =
          prog < 0.7
            ? 0.85
            : 0.85 *
              (1 - (prog - 0.7) / 0.3);

        ctx.save();

        ctx.globalAlpha = a;

        ctx.fillStyle = flash
          ? dark
            ? "rgba(200,240,255,0.9)"
            : "rgba(160,220,255,0.7)"
          : dark
          ? "#5ab4e0"
          : "#4a9fd4";

        ctx.beginPath();

        ctx.ellipse(
          W * d.xf,
          y,
          s * 1.0,
          s * d.len,
          0,
          0,
          Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
      });
    }

    function frame() {
      t++;

      ctx.clearRect(0, 0, W, H);

      const cf = t % CYCLE;

      let flash = false;
      let alpha = 1;

      if (cf >= 130 && cf < 133) {
        flash = true;
        alpha = 0.04;
      } else if (cf >= 133 && cf < 137) {
        flash = true;
        alpha = 1;
      } else if (cf >= 137 && cf < 139) {
        flash = true;
        alpha = 0.04;
      } else if (cf >= 139 && cf < 142) {
        flash = false;
        alpha = 0.65;
      } else if (cf >= 142 && cf < 144) {
        flash = false;
        alpha = 0.08;
      }

      drawBolt(flash, alpha);

      drawRain(t, flash);

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
    };
  }, [size, dark]);

  return <canvas ref={ref} />;
}

/** Rain particle background FX */
function RainFX() {
  const ref = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  useEffect(() => {
    if (theme !== 'dark') return;
    const el = ref.current; if (!el) return;
    const drops: HTMLDivElement[] = [];
    for (let i = 0; i < 30; i++) {
      const d = document.createElement('div'); d.className = 'rdrop';
      d.style.cssText = `left:${Math.random()*100}%;height:${8+Math.random()*16}px;opacity:${0.1+Math.random()*0.22};animation-duration:${1.4+Math.random()*2.2}s;animation-delay:-${Math.random()*5}s`;
      el.appendChild(d); drops.push(d);
    }
    return () => drops.forEach(d => d.remove());
  }, [theme]);
  return (
    <div className="bg-fx">
      {theme === 'dark' && <><div className="orb orb1"/><div className="orb orb2"/></>}
      <div ref={ref} style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}/>
    </div>
  );
}

/** Rain + thunder animated loader overlay */
export function RainLoader() {
  return (
    <div className="rain-loader-overlay">
      <div className="rain-loader-box">
        <AnimatedLogo size={52}/>
        <div className="rain-loader-brand">
          <span className="rl-mazha">mazha</span><span className="rl-dot">.</span><span className="rl-live">live</span>
        </div>
        <div className="rain-loader-sub">🌧 Loading real-time Kerala rain data…</div>
        <div className="rl-drops">
          {[0,1,2,3,4,5].map(i=>(
            <div key={i} className="rl-drop" style={{animationDelay:`${i*0.18}s`,left:`${10+i*14}%`}}/>
          ))}
        </div>
        <div className="rl-bar"><div className="rl-bar-fill"/></div>
      </div>
    </div>
  );
}

function AppShell() {
  const { lang, toggle: toggleLang, t } = useLang();
  const { theme, toggle: toggleTheme }  = useTheme();
  const { subscribed } = usePushNotifications();
  const [showNotifModal, setShowNotifModal] = useState(false);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', position:'relative', zIndex:1 }}>
      <header className="header">
        <div className="header-brand">
          <AnimatedLogo size={28}/>
          <span className="brand-text">
            <span className="brand-mazha">mazha</span><span className="brand-dot">.</span><span className="brand-live">live</span>
          </span>
        </div>
        <div className="header-lang">
          <button className={`lang-btn${lang==='en'?' active':''}`} onClick={()=>lang!=='en'&&toggleLang()}>{t.english}</button>
          <div className="lang-divider"/>
          <button className={`lang-btn${lang==='ml'?' active':''}`} onClick={()=>lang!=='ml'&&toggleLang()}>{t.malayalam}</button>
        </div>
        <div className="header-actions">
          <button
            className={`hdr-icon-btn${subscribed?' active':''}`}
            onClick={() => setShowNotifModal(true)}
            title="Rain Alerts"
            style={{ position:'relative' }}
          >
            <BellIcon subscribed={subscribed}/>
          </button>
          <button className="hdr-icon-btn" onClick={toggleTheme} title={theme==='dark'?'Light mode':'Dark mode'}>
            {theme==='dark' ? <IconSun size={17}/> : <IconMoon size={17}/>}
          </button>
        </div>
      </header>

      <MapView/>

      {showNotifModal && <NotificationSettingsModal onClose={() => setShowNotifModal(false)}/>}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <AppShell/>
      </LangProvider>
    </ThemeProvider>
  );
}
