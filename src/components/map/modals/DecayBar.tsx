const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const TWO_DAYS_MS = 24 * 60 * 60 * 1000;

function fmtDuration(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m ago`;
  return `${m}m ago`;
}

export { TWO_HOURS_MS, TWO_DAYS_MS, fmtDuration };

export function DecayBar({ lastUpdated, now }: { lastUpdated: number; now: number }) {
  const age = now - lastUpdated;
  const pct = Math.max(0, Math.min(100, (1 - age / TWO_HOURS_MS) * 100));
  const col = pct > 60 ? '#00cc66' : pct > 30 ? '#ffaa00' : '#ff4444';
  const label = age >= TWO_HOURS_MS ? 'Faded' : `${Math.round(pct)}% active`;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Intensity Decay</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: col }}>{label}</span>
      </div>
      <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 99, transition: 'width 1s linear' }} />
      </div>
      <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 3 }}>
        {age < TWO_HOURS_MS
          ? `Fades in ${fmtDuration(TWO_HOURS_MS - age).replace(' ago', '')}`
          : `Ghost until ${fmtDuration(TWO_DAYS_MS - age).replace(' ago', '')} from now`}
      </div>
    </div>
  );
}