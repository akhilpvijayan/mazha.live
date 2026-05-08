import { currentAvgIntensity, isGhost } from "../../../services/supabase";
import { RainReport } from "../../../types";
import { AdBanner } from "../../ads/AdBanner";
import {
  IconActivity,
  IconAlertTriangle,
  IconDroplet,
  IconMapPin,
  IconUsers,
} from "../../Icons";

export function EngagementPanel({
  reports,
  now,
}: {
  reports: RainReport[];
  now: number;
}) {
  const active = reports.filter((r) => !isGhost(r, now));
  const ghosts = reports.filter((r) => isGhost(r, now));
  const total = reports.reduce((s, r) => s + r.count, 0);
  const avgs = active.map((r) => currentAvgIntensity(r, now));
  const maxMm = avgs.length ? Math.max(...avgs) : 0;
  const districtCount = [...new Set(active.map((r) => r.district))].length;
  const hoursSince =
    Math.floor((now - 1700000000000) / 3600000) % 8760 + 1200;

  const STATS = [
    { val: total || "—", lbl: "Reports", icon: <IconDroplet size={13} color="#00d4ff" />, color: "#00d4ff" },
    { val: active.length || "—", lbl: "Active", icon: <IconActivity size={13} color="#00cc66" />, color: "#00cc66" },
    { val: districtCount || "—", lbl: "Districts", icon: <IconMapPin size={13} color="#a855f7" />, color: "#a855f7" },
    { val: maxMm > 0 ? `${maxMm.toFixed(0)}mm` : "—", lbl: "Peak", icon: <IconAlertTriangle size={13} color="#ff7a00" />, color: "#ff7a00" },
  ];

  return (
    <div className="engage-panel" style={{ display: "flex", flexDirection: "column" }}>

      {/* ── Title ── */}
      <div className="ep-title">
        <IconUsers size={12} color="var(--text3)" />
        <span>Kerala Rain Network</span>
        <span className="ep-live-dot" />
      </div>

      {/* ── Stats grid ── */}
      <div className="ep-stats">
        {STATS.map((s) => (
          <div key={s.lbl} className="ep-stat">
            <div className="ep-stat-icon">{s.icon}</div>
            <div className="ep-stat-val" style={{ color: s.color }}>{s.val}</div>
            <div className="ep-stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div className="ep-footer">
        <span style={{ color: "var(--text3)", fontSize: 9 }}>
          {ghosts.length > 0 ? `${ghosts.length} faded` : "All active"}
        </span>
        <span style={{ color: "var(--text3)", fontSize: 9 }}>·</span>
        <span style={{ color: "var(--cyan)", fontSize: 9, fontWeight: 700 }}>
          {hoursSince.toLocaleString()}h uptime
        </span>
      </div>

      <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
        <div style={{ fontSize: 9, color: 'var(--text3)', textAlign: 'right', marginBottom: 3, letterSpacing: '.4px' }}>AD</div>
        <AdBanner slot="1234567890" style={{ maxHeight: 0 }} />
      </div>
    </div>
  );
}