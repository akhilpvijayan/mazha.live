import { useMemo, useRef, useEffect, useState } from 'react';
import type { RainReport } from '../../../types';
import { currentAvgIntensity } from '../../../services/supabase';
import { useLang } from '../../../context/LangContext';
import { getIntensityColor } from '../../../utils/kerala';
import { IconTrophy } from '../../Icons';

const ALL_DISTRICTS = [
  'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod',
  'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad',
  'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad',
];

const MEDALS = ['🥇', '🥈', '🥉'];

export function LeaderboardTab({ reports, now }: { reports: RainReport[]; now: number }) {
  const { t } = useLang();
  const [animKey, setAnimKey] = useState(0);
  const prevRanks = useRef<Record<string, number>>({});
  const rankDirs = useRef<Record<string, 'up' | 'down' | 'same'>>({});

  const districts = useMemo(() => {
    const map = new Map<string, { pins: Set<string>; reports: number; totalMm: number }>();
    ALL_DISTRICTS.forEach(name => map.set(name, { pins: new Set(), reports: 0, totalMm: 0 }));
    reports.forEach(r => {
      const entry = map.get(r.district);
      if (entry) {
        entry.pins.add(r.pin);
        entry.reports += r.count;
        entry.totalMm += currentAvgIntensity(r, now);
      }
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, pins: data.pins.size, reports: data.reports, avgMm: data.totalMm / Math.max(1, data.pins.size) }))
      .sort((a, b) => b.reports - a.reports || b.pins - a.pins);
  }, [reports, now]);

  useEffect(() => {
    const current: Record<string, number> = {};
    const dirs: Record<string, 'up' | 'down' | 'same'> = {};
    districts.forEach((d, i) => {
      current[d.name] = i + 1;
      const prev = prevRanks.current[d.name];
      if (prev === undefined) dirs[d.name] = 'same';
      else if (prev > i + 1) dirs[d.name] = 'up';
      else if (prev < i + 1) dirs[d.name] = 'down';
      else dirs[d.name] = 'same';
    });
    rankDirs.current = dirs;
    prevRanks.current = current;
    setAnimKey(k => k + 1);
  }, [districts]);

  const maxReports = Math.max(1, districts[0]?.reports || 1);

  return (
    <div style={{ padding: '2px 0' }} key={animKey}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 6px 10px', marginBottom: 4,
        borderBottom: '1px solid var(--border)',
      }}>
        <IconTrophy size={16} color="var(--cyan)" />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>District Leaderboard</span>
        <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>
          {districts.filter(d => d.reports > 0).length} active
        </span>
      </div>

      {/* Rows */}
      {districts.map((d, i) => {
        const rank = i + 1;
        const hasReports = d.reports > 0;
        const pct = d.reports / maxReports;
        const color = hasReports && rank > 3 ? getIntensityColor(d.avgMm) : undefined;
        const dir = rankDirs.current[d.name] || 'same';

        return (
          <div key={d.name} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 6px',
            borderBottom: '1px solid var(--border)',
            opacity: hasReports ? 1 : 0.45,
            background: rank === 1 ? 'rgba(255,215,0,0.04)' : rank === 2 ? 'rgba(192,192,192,0.03)' : rank === 3 ? 'rgba(205,127,50,0.03)' : 'transparent',
          }}>
            {/* Rank */}
            <div style={{
              width: 22, textAlign: 'center', flexShrink: 0,
              fontSize: rank <= 3 ? 15 : 10, fontWeight: 700,
              color: rank <= 3 ? undefined : 'var(--text3)',
              animation: dir === 'up' ? 'rankUp 0.4s ease' : dir === 'down' ? 'rankDown 0.4s ease' : 'none',
            }}>
              {rank <= 3 ? MEDALS[rank - 1] : `#${rank}`}
            </div>

            {/* Direction arrow */}
            <div style={{
              width: 12, flexShrink: 0, textAlign: 'center',
              fontSize: 10, lineHeight: 1,
              color: dir === 'up' ? '#00cc66' : dir === 'down' ? '#ff6b6b' : 'transparent',
              animation: dir !== 'same' ? 'rankArrow 0.4s ease' : 'none',
            }}>
              {dir === 'up' ? '▲' : dir === 'down' ? '▼' : ''}
            </div>

            {/* District name + pins */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 600,
                color: hasReports ? 'var(--text)' : 'var(--text3)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {d.name}
              </div>
              {hasReports && (
                <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>
                  {d.pins} pin{d.pins !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Report count or dash */}
            <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 28 }}>
              {hasReports ? (
                <>
                  <div style={{
                    fontSize: 14, fontWeight: 800,
                    color: rank <= 3 ? ['#ffd700','#c0c0c0','#cd7f32'][rank-1] : 'var(--text)',
                    fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.2,
                  }}>
                    {d.reports}
                  </div>
                  <div style={{ fontSize: 7, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.3px' }}>
                    rpts
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: "'JetBrains Mono', monospace" }}>—</div>
              )}
            </div>

            {/* Mini bar */}
            <div style={{
              width: 36, height: 4,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 2, overflow: 'hidden', flexShrink: 0,
            }}>
              <div style={{
                height: '100%',
                width: hasReports ? `${pct * 100}%` : '0%',
                borderRadius: 2,
                background: rank <= 3
                  ? ['linear-gradient(90deg,#ffd700,#ffed4a)','linear-gradient(90deg,#c0c0c0,#d8d8d8)','linear-gradient(90deg,#cd7f32,#e8a85a)'][rank-1]
                  : `linear-gradient(90deg, ${color}, ${color}88)`,
                transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
                animation: hasReports ? `barGrow 0.6s cubic-bezier(0.34,1.56,0.64,1)` : 'none',
              }} />
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div style={{
        fontSize: 10, color: 'var(--text3)', textAlign: 'center',
        padding: '10px 6px 4px', lineHeight: 1.5,
      }}>
        Which district will take the lead?<br />
        Report rain in your area to move your district up!
      </div>

      <style>{`
        @keyframes rankUp {
          0% { transform: translateY(8px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes rankDown {
          0% { transform: translateY(-8px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes rankArrow {
          0% { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes barGrow {
          0% { width: 0 !important; }
        }
      `}</style>
    </div>
  );
}

