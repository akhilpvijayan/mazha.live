import { useEffect, useRef, useCallback } from 'react';
import type { RainReport } from '../types';
import { getHeatColor } from '../utils/kerala';

interface Props {
  reports: RainReport[];
  mapRef: React.MutableRefObject<any>;
  visible: boolean;
}

export function HeatmapLayer({ reports, mapRef, visible }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const redraw = useCallback(() => {
    const map    = mapRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !map) return;

    try { map.getCenter(); } catch { return; }

    const container = map.getContainer() as HTMLElement;
    const rect      = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    canvas.width  = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!visible || reports.length === 0) return;

    const zoom = map.getZoom?.() ?? 7;
    const zoomScale = Math.max(0.25, Math.min(1.6, (zoom - 5) / 7));

    reports.forEach(r => {
      const avg = r.total / r.count;
      let pt: { x: number; y: number };
      try { pt = map.latLngToContainerPoint([r.lat, r.lng]); } catch { return; }

      const [red, g, b, a] = getHeatColor(avg);
      const baseRadius = Math.max(20, Math.min(60, 20 + avg * 0.45));
      const radius = baseRadius * zoomScale;

      const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);
      grad.addColorStop(0,    `rgba(${red},${g},${b},${a / 255})`);
      grad.addColorStop(0.5,  `rgba(${red},${g},${b},${(a * 0.4) / 255})`);
      grad.addColorStop(1,    `rgba(${red},${g},${b},0)`);

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    });
  }, [reports, visible, mapRef]);

  useEffect(() => {
    const t = setTimeout(redraw, 120);
    return () => clearTimeout(t);
  }, [redraw]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.on('move zoom moveend zoomend resize', redraw);
    return () => map.off('move zoom moveend zoomend resize', redraw);
  });

  return (
    <canvas
      ref={canvasRef}
      className={`heat-canvas${visible ? ' on' : ''}`}
    />
  );
}
