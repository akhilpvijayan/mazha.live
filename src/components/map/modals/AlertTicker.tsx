import { ReactNode, useRef, useEffect, useCallback, useState } from "react";
import { RainReport } from "../../../types";
import { IconAlertTriangle } from "../../Icons";

export function AlertTicker({ heavyReport, spillwayDams, reports }: {
  heavyReport: RainReport | undefined;
  spillwayDams: any[];
  reports: RainReport[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const chunkRef = useRef<HTMLSpanElement>(null);
  const xRef = useRef(0);
  const rafRef = useRef<number>(0);
  const [cloneCount, setCloneCount] = useState(4);

  const items: ReactNode[] = [];

  if (heavyReport) {
    items.push(
      <span key="rain" className="alert-ticker-item">
        <span className="alert-ticker-icon">
          <IconAlertTriangle size={10} color="#ff3b3b" />
        </span>
        <span className="alert-ticker-label">HEAVY RAIN</span>
        <span className="alert-ticker-value">{heavyReport.district}</span>
        <span className="alert-ticker-meta">{reports.length} reports</span>
      </span>
    );
  }

  spillwayDams.forEach(d => {
    items.push(
      <span key={`s-${d.id || d.name}`} className="alert-ticker-item alert-ticker-item--critical">
        <span className="alert-ticker-icon alert-ticker-icon--pulse">▲</span>
        <span className="alert-ticker-label">SPILLWAY RELEASE</span>
        <span className="alert-ticker-value">{d.name}</span>
      </span>
    );
  });

  const hasAlerts = items.length > 0;
  const isSpillway = hasAlerts && spillwayDams.length > 0;

  const content = hasAlerts
    ? items
    : [
        <span key="none" className="alert-ticker-item alert-ticker-item--idle">
          <span className="alert-ticker-icon">◉</span>
          <span className="alert-ticker-label">LIVE</span>
          <span className="alert-ticker-value">Kerala Rain Monitor</span>
        </span>,
      ];

  useEffect(() => {
    const measure = () => {
      const chunk = chunkRef.current;
      if (!chunk) return;
      const chunkW = chunk.offsetWidth;
      if (chunkW === 0) return;
      const needed = Math.ceil((window.innerWidth * 2) / chunkW) + 2;
      setCloneCount(Math.max(needed, 4));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [hasAlerts, spillwayDams.length, reports.length]);

  const tick = useCallback(() => {
    const track = trackRef.current;
    const chunk = chunkRef.current;
    if (!track || !chunk) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const chunkW = chunk.offsetWidth;
    if (chunkW === 0) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    xRef.current -= 1.9;
    if (xRef.current <= -chunkW) {
      xRef.current += chunkW;
    }
    track.style.transform = `translateX(${xRef.current}px)`;
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  const badgeClass = isSpillway
    ? "alert-ticker-badge alert-ticker-badge--critical"
    : hasAlerts
    ? "alert-ticker-badge alert-ticker-badge--active"
    : "alert-ticker-badge alert-ticker-badge--idle";

  const barClass = isSpillway
    ? "alert-ticker-bar alert-ticker-bar--critical"
    : hasAlerts
    ? "alert-ticker-bar alert-ticker-bar--active"
    : "alert-ticker-bar alert-ticker-bar--idle";

  const renderChunk = (prefix: string, ref?: React.Ref<HTMLSpanElement>) => (
    <span key={prefix} className="alert-ticker-chunk" ref={ref}>
      {content.flatMap((item, i) => [
        item,
        <span key={`${prefix}-s-${i}`} className="alert-ticker-sep">
          <span className="alert-ticker-sep-line" />
        </span>,
      ])}
    </span>
  );

  return (
    <div className={barClass}>
      <div className={badgeClass}>
        {isSpillway ? (
          <>
            <span className="badge-dot badge-dot--pulse" />
            <span className="badge-label">ALERT</span>
          </>
        ) : hasAlerts ? (
          <>
            <span className="badge-dot badge-dot--pulse" />
            <span className="badge-label">WARN</span>
          </>
        ) : (
          <>
            <span className="badge-dot" />
            <span className="badge-label">LIVE</span>
          </>
        )}
      </div>

      <div className="alert-ticker-track" ref={trackRef}>
        {renderChunk("0", chunkRef)}
        {Array.from({ length: cloneCount - 1 }, (_, i) =>
          renderChunk(String(i + 1))
        )}
      </div>

      <div className="alert-ticker-fade" />
    </div>
  );
}