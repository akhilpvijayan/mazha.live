import { useEffect, useRef } from 'react';

const LEVELS = {
  drizzle:  { drops: 60,   speed: [2,4]   as [number,number], len: [8,14]   as [number,number], wind: 0.3, alpha: .40, lightning: 0,     color: '#7eb8e8' },
  light:    { drops: 140,  speed: [3,6]   as [number,number], len: [12,20]  as [number,number], wind: 0.8, alpha: .50, lightning: 0.004, color: '#60a5d4' },
  moderate: { drops: 280,  speed: [5,10]  as [number,number], len: [16,28]  as [number,number], wind: 1.8, alpha: .60, lightning: 0.012, color: '#4a8fc2' },
  heavy:    { drops: 520,  speed: [9,17]  as [number,number], len: [22,38]  as [number,number], wind: 3.5, alpha: .68, lightning: 0.028, color: '#2e6ea0' },
  extreme:  { drops: 900,  speed: [14,26] as [number,number], len: [28,50]  as [number,number], wind: 6.5, alpha: .78, lightning: 0.055, color: '#1a4f78' },
};

type Level = keyof typeof LEVELS;

export function RainAnimation({
  level,
  onDismiss,
  containerRef,
}: {
  level: Level;
  onDismiss: () => void;
  containerRef?: React.RefObject<HTMLElement>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef  = useRef<HTMLDivElement>(null);
  const rafRef    = useRef<number>();
  const rainRef   = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const flash  = flashRef.current!;
    const ctx    = canvas.getContext('2d')!;
    const cfg    = LEVELS[level];

    const getSize = () => {
      const el = containerRef?.current;
      if (el) { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height }; }
      return { w: window.innerWidth, h: window.innerHeight };
    };

    const resize = () => { const { w, h } = getSize(); canvas.width = w; canvas.height = h; };
    resize();
    window.addEventListener('resize', resize);

    type Drop = { x: number; y: number; len: number; speed: number; opacity: number; thick: number };
    const newDrop = (scatter = false): Drop => {
      const { w, h } = getSize();
      const spd = cfg.speed[0] + Math.random() * (cfg.speed[1] - cfg.speed[0]);
      const ln  = cfg.len[0]   + Math.random() * (cfg.len[1]   - cfg.len[0]);
      return { x: Math.random() * (w + 200) - 100, y: scatter ? Math.random() * h : -ln, len: ln, speed: spd, opacity: .3 + Math.random() * .5, thick: .4 + Math.random() * .8 };
    };
    const drops: Drop[] = Array.from({ length: cfg.drops }, () => newDrop(true));

    const drawSubBolt = (sx: number, sy: number, jagged: number) => {
      let x = sx, y = sy;
      ctx.save(); ctx.strokeStyle = '#b8d8f8'; ctx.lineWidth = .8; ctx.globalAlpha = .45;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let i = 0; i < 3 + Math.floor(Math.random() * 4); i++) { x += (Math.random() - .35) * jagged; y += 30 + Math.random() * 30; ctx.lineTo(x, y); }
      ctx.stroke(); ctx.restore();
    };

    const drawBolt = (sx: number, sy: number, maxY: number) => {
      const segs = 8 + Math.floor(Math.random() * 8);
      const jagged = cfg.drops >= 900 ? 60 : cfg.drops >= 520 ? 40 : 25;
      const pts: { x: number; y: number }[] = [{ x: sx, y: sy }];
      for (let i = 1; i <= segs; i++) pts.push({ x: pts[i-1].x + (Math.random() - .45) * jagged * 2, y: pts[i-1].y + (maxY / segs) * (.7 + Math.random() * .6) });
      ctx.save();
      ctx.shadowColor = '#aad4ff'; ctx.shadowBlur = 18; ctx.strokeStyle = '#d0eaff'; ctx.lineWidth = 1.5; ctx.globalAlpha = .85;
      ctx.beginPath(); pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = .6; ctx.globalAlpha = .6;
      ctx.beginPath(); pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)); ctx.stroke();
      ctx.restore();
      if (Math.random() < .4) { const b = pts[Math.floor(pts.length * .3 + Math.random() * pts.length * .4)]; drawSubBolt(b.x, b.y, jagged); }
    };

    let actx: AudioContext | null = null;

    const playThunder = () => {
      if (!actx) return;
      const intensity = cfg.drops / 900;
      const buf = actx.createBuffer(1, actx.sampleRate * 3, actx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) { const t = i / actx.sampleRate; data[i] = (Math.random() * 2 - 1) * Math.exp(-t * (1.5 + Math.random() * .5)) * intensity; }
      const src = actx.createBufferSource(); src.buffer = buf;
      const lpf = actx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 300 + intensity * 200;
      const g = actx.createGain(); g.gain.value = .7 + intensity * .3;
      src.connect(lpf); lpf.connect(g); g.connect(actx.destination);
      src.start(actx.currentTime + .05 + Math.random() * .8);
    };

    const triggerLightning = () => {
      const W = canvas.width, H = canvas.height;
      drawBolt(W * (.15 + Math.random() * .7), 0, H * (.6 + Math.random() * .3));
      let f = 0, flashes = 1 + Math.floor(Math.random() * 3);
      const doFlash = () => {
        if (f++ >= flashes) { flash.style.opacity = '0'; return; }
        const a = Math.min((.25 + Math.random() * .45) * (cfg.drops >= 520 ? 1.4 : 1), .75);
        flash.style.opacity = String(a);
        setTimeout(() => { flash.style.opacity = '0'; setTimeout(doFlash, 40 + Math.random() * 80); }, 30 + Math.random() * 60);
      };
      doFlash(); playThunder();
    };

    const startRainAudio = () => {
      actx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const intensity = cfg.drops / 900;
      const sr = actx.sampleRate, dur = 2;
      const buf = actx.createBuffer(2, sr * dur, sr);
      for (let ch = 0; ch < 2; ch++) { const data = buf.getChannelData(ch); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1; }
      const src = actx.createBufferSource(); src.buffer = buf; src.loop = true;
      const hpf = actx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 2000 + intensity * 3000;
      const lpf = actx.createBiquadFilter(); lpf.type = 'lowpass';  lpf.frequency.value = 8000;
      const gain = actx.createGain(); gain.gain.value = 0.04 + intensity * 0.18;
      src.connect(hpf); hpf.connect(lpf); lpf.connect(gain); gain.connect(actx.destination);
      src.start(); rainRef.current = src;
      if (actx.state === 'suspended') { const r = () => { actx!.resume(); window.removeEventListener('click', r); }; window.addEventListener('click', r); }
    };

    const frame = () => {
      const W = canvas.width, H = canvas.height;
      // ← KEY CHANGE: clearRect instead of fillRect — fully transparent, no background
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      drops.forEach(d => {
        d.x += cfg.wind; d.y += d.speed;
        if (d.y > H + 50) Object.assign(d, newDrop());
        ctx.beginPath(); ctx.strokeStyle = cfg.color; ctx.globalAlpha = d.opacity * cfg.alpha; ctx.lineWidth = d.thick;
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + cfg.wind * (d.len / d.speed) * .4, d.y + d.len); ctx.stroke();
      });
      ctx.restore(); ctx.globalAlpha = 1;
      if (cfg.lightning > 0 && Math.random() < cfg.lightning) triggerLightning();
      rafRef.current = requestAnimationFrame(frame);
    };

    frame();
    startRainAudio();

    return () => {
      cancelAnimationFrame(rafRef.current!);
      window.removeEventListener('resize', resize);
      try { rainRef.current?.stop(); } catch (_) {}
      try { actx?.close(); } catch (_) {}
    };
  }, [level]);

  return (
    // position:absolute — overlays the PARENT element, not the viewport
    <div style={{ position: 'absolute', inset: 0, zIndex: 9999, borderRadius: 'inherit', pointerEvents: 'auto' }} onClick={onDismiss}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 'inherit', background: 'transparent' }}
      />
      <div
        ref={flashRef}
        style={{ position: 'absolute', inset: 0, background: 'rgba(220,235,255,1)', opacity: 0, pointerEvents: 'none', borderRadius: 'inherit', transition: 'opacity 0.04s' }}
      />
    </div>
  );
}