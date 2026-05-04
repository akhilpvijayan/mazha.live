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
function AnimatedLogo({ size = 28 }: { size?: number }) {
  return (
    <svg className="header-logo-svg" width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cloudGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00d4ff"/>
          <stop offset="100%" stopColor="#0077bb"/>
        </linearGradient>
        <linearGradient id="dropGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#005599" stopOpacity="0.5"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.2" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Cloud body */}
      <path d="M28 14.5a6 6 0 00-5.5-6A9 9 0 004 13a5.5 5.5 0 00.5 11H28a5.5 5.5 0 000-9.5z" fill="url(#cloudGrad)" filter="url(#glow)" opacity="0.95"/>
      {/* Rain drops */}
      <ellipse cx="12" cy="29" rx="1.4" ry="2.4" fill="url(#dropGrad)">
        <animateTransform attributeName="transform" type="translate" values="0,0;0,5;0,0" dur="1.2s" repeatCount="indefinite" begin="0s"/>
        <animate attributeName="opacity" values="1;0.1;1" dur="1.2s" repeatCount="indefinite" begin="0s"/>
      </ellipse>
      <ellipse cx="18" cy="30" rx="1.4" ry="2.4" fill="url(#dropGrad)">
        <animateTransform attributeName="transform" type="translate" values="0,0;0,5;0,0" dur="1.2s" repeatCount="indefinite" begin="0.35s"/>
        <animate attributeName="opacity" values="1;0.1;1" dur="1.2s" repeatCount="indefinite" begin="0.35s"/>
      </ellipse>
      <ellipse cx="24" cy="29" rx="1.4" ry="2.4" fill="url(#dropGrad)">
        <animateTransform attributeName="transform" type="translate" values="0,0;0,5;0,0" dur="1.2s" repeatCount="indefinite" begin="0.7s"/>
        <animate attributeName="opacity" values="1;0.1;1" dur="1.2s" repeatCount="indefinite" begin="0.7s"/>
      </ellipse>
    </svg>
  );
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
      <RainFX/>
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
