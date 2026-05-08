import { useEffect, useRef } from 'react';

const LEVELS = {
  drizzle:  { drops: 60,  speed: [2,4]   as [number,number], len: [8,14]   as [number,number], wind: 0.3, alpha: .45, lightning: 0,     fog: .08, sky: ['#1a2535','#1e2d45'], color: '#7eb8e8' },
  light:    { drops: 160, speed: [3,6]   as [number,number], len: [12,20]  as [number,number], wind: 0.8, alpha: .55, lightning: 0.004, fog: .13, sky: ['#111e2e','#182339'], color: '#60a5d4' },
  moderate: { drops: 320, speed: [5,10]  as [number,number], len: [16,28]  as [number,number], wind: 1.8, alpha: .65, lightning: 0.012, fog: .22, sky: ['#0c1622','#101c2e'], color: '#4a8fc2' },
  heavy:    { drops: 600, speed: [9,17]  as [number,number], len: [22,38]  as [number,number], wind: 3.5, alpha: .72, lightning: 0.028, fog: .34, sky: ['#07101a','#0b1525'], color: '#2e6ea0' },
  extreme:  { drops: 1000,speed: [14,26] as [number,number], len: [28,50]  as [number,number], wind: 6.5, alpha: .82, lightning: 0.055, fog: .50, sky: ['#040c13','#07121e'], color: '#1a4f78' },
};

type Level = keyof typeof LEVELS;

export function RainAnimation({ level, onDismiss }: { level: Level; onDismiss: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef  = useRef<HTMLDivElement>(null);
  const rafRef    = useRef<number>();
  const rainRef   = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const flash  = flashRef.current!;
    const ctx    = canvas.getContext('2d')!;
    const cfg    = LEVELS[level];

    // ── resize ──────────────────────────────────────────────────────────
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    // ── drops ───────────────────────────────────────────────────────────
    type Drop = { x: number; y: number; len: number; speed: number; opacity: number; thick: number };
    const newDrop = (scatter = false): Drop => {
      const spd = cfg.speed[0] + Math.random() * (cfg.speed[1] - cfg.speed[0]);
      const ln  = cfg.len[0]   + Math.random() * (cfg.len[1]   - cfg.len[0]);
      return {
        x: Math.random() * (canvas.width + 200) - 100,
        y: scatter ? Math.random() * canvas.height : -ln,
        len: ln, speed: spd,
        opacity: .3 + Math.random() * .5,
        thick:   .4 + Math.random() * .8,
      };
    };
    const drops: Drop[] = Array.from({ length: cfg.drops }, () => newDrop(true));

    // ── bolt ─────────────────────────────────────────────────────────────
    const drawSubBolt = (sx: number, sy: number, jagged: number) => {
      let x = sx, y = sy;
      ctx.save();
      ctx.strokeStyle = '#b8d8f8'; ctx.lineWidth = .8; ctx.globalAlpha = .45;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let i = 0; i < 3 + Math.floor(Math.random() * 4); i++) {
        x += (Math.random() - .35) * jagged;
        y += 30 + Math.random() * 30;
        ctx.lineTo(x, y);
      }
      ctx.stroke(); ctx.restore();
    };

    const drawBolt = (sx: number, sy: number, maxY: number) => {
      const segs   = 8 + Math.floor(Math.random() * 8);
      const jagged = cfg.drops >= 1000 ? 60 : cfg.drops >= 600 ? 40 : 25;
      const pts: { x: number; y: number }[] = [{ x: sx, y: sy }];
      for (let i = 1; i <= segs; i++) {
        pts.push({
          x: pts[i - 1].x + (Math.random() - .45) * jagged * 2,
          y: pts[i - 1].y + (maxY / segs) * (.7 + Math.random() * .6),
        });
      }
      // glow pass
      ctx.save();
      ctx.shadowColor = '#aad4ff'; ctx.shadowBlur = 18;
      ctx.strokeStyle = '#d0eaff'; ctx.lineWidth = 1.5; ctx.globalAlpha = .85;
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
      // core pass
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = .6; ctx.globalAlpha = .6;
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.restore();
      // branch
      if (Math.random() < .4) {
        const branch = pts[Math.floor(pts.length * .3 + Math.random() * pts.length * .4)];
        drawSubBolt(branch.x, branch.y, jagged);
      }
    };

    // ── thunder ──────────────────────────────────────────────────────────
    let actx: AudioContext | null = null;

    const playThunder = () => {
      if (!actx) return;
      const intensity = cfg.drops / 1000;
      const buf  = actx.createBuffer(1, actx.sampleRate * 3, actx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / actx.sampleRate;
        data[i] = (Math.random() * 2 - 1) * Math.exp(-t * (1.5 + Math.random() * .5)) * intensity;
      }
      const src = actx.createBufferSource();
      src.buffer = buf;
      const lpf = actx.createBiquadFilter();
      lpf.type = 'lowpass'; lpf.frequency.value = 300 + intensity * 200;
      const g = actx.createGain(); g.gain.value = .7 + intensity * .3;
      src.connect(lpf); lpf.connect(g); g.connect(actx.destination);
      src.start(actx.currentTime + .05 + Math.random() * .8);
    };

    // ── lightning + flash ────────────────────────────────────────────────
    const triggerLightning = () => {
      const W = canvas.width, H = canvas.height;
      const x = W * (.15 + Math.random() * .7);
      drawBolt(x, 0, H * (.6 + Math.random() * .3));

      let f = 0, flashes = 1 + Math.floor(Math.random() * 3);
      const doFlash = () => {
        if (f++ >= flashes) { flash.style.background = 'transparent'; return; }
        const a = Math.min((.3 + Math.random() * .5) * (cfg.drops >= 600 ? 1.4 : 1), .85);
        flash.style.background = `rgba(220,235,255,${a})`;
        setTimeout(() => { flash.style.background = 'transparent'; setTimeout(doFlash, 40 + Math.random() * 80); }, 30 + Math.random() * 60);
      };
      doFlash();
      playThunder();
    };

    // ── rain audio ───────────────────────────────────────────────────────
    const startRainAudio = () => {
      actx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const intensity = cfg.drops / 1000;
      const sr = actx.sampleRate, dur = 2;
      const buf = actx.createBuffer(2, sr * dur, sr);
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      const src = actx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const hpf = actx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 2000 + intensity * 3000;
      const lpf = actx.createBiquadFilter(); lpf.type = 'lowpass';  lpf.frequency.value = 8000;
      const gain = actx.createGain(); gain.gain.value = 0.04 + intensity * 0.18;
      src.connect(hpf); hpf.connect(lpf); lpf.connect(gain); gain.connect(actx.destination);
      src.start();
      rainRef.current = src;
      if (actx.state === 'suspended') {
        const resume = () => { actx!.resume(); window.removeEventListener('click', resume); };
        window.addEventListener('click', resume);
      }
    };

    // ── main loop ────────────────────────────────────────────────────────
    const frame = () => {
      const W = canvas.width, H = canvas.height;
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, cfg.sky[0]); grad.addColorStop(1, cfg.sky[1]);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

      if (cfg.fog > 0) {
        const fog = ctx.createLinearGradient(0, H * .6, 0, H);
        fog.addColorStop(0, 'rgba(180,200,220,0)');
        fog.addColorStop(1, `rgba(180,200,220,${cfg.fog})`);
        ctx.fillStyle = fog; ctx.fillRect(0, 0, W, H);
      }

      ctx.save();
      drops.forEach(d => {
        d.x += cfg.wind; d.y += d.speed;
        if (d.y > H + 50) Object.assign(d, newDrop());
        ctx.beginPath();
        ctx.strokeStyle = cfg.color;
        ctx.globalAlpha = d.opacity * cfg.alpha;
        ctx.lineWidth = d.thick;
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + cfg.wind * (d.len / d.speed) * .4, d.y + d.len);
        ctx.stroke();
      });
      ctx.restore(); ctx.globalAlpha = 1;

      if (cfg.lightning > 0 && Math.random() < cfg.lightning) triggerLightning();
      rafRef.current = requestAnimationFrame(frame);
    };

    frame();
    startRainAudio();

    // ── cleanup ──────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafRef.current!);
      window.removeEventListener('resize', resize);
      try { rainRef.current?.stop(); } catch (_) {}
      try { actx?.close(); } catch (_) {}
    };
  }, [level]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }} onClick={onDismiss}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <div ref={flashRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', transition: 'background 0.05s' }} />
    </div>
  );
}