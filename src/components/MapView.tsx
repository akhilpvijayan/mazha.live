import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import { getPincodeData } from '../services/pincodeService';
import { getIntensityColor } from '../utils/kerala';
import {
  supabase,
  loadRainReports, insertRainReport, subscribeToReports,
  isSupabaseReady, currentAvgIntensity, isGhost, isExpired,
  decayFactor,
} from '../services/supabase';
import type { RainReport, RawReport, LiveEvent } from '../types';
import { useLang } from '../context/LangContext';
import { useTheme } from '../context/ThemeContext';
import { HeatmapLayer } from './HeatmapLayer';
import {
  IconCloudRain, IconMapPin, IconFire, IconActivity, IconBarChart, IconAlertTriangle, IconShare, IconSearch, IconInstall,
} from './Icons';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useKeyboardAvoid } from '../hooks/useKeyboardAvoid';
import { useSWAutoRefresh } from '../hooks/useSWAutoRefresh';
import { NotificationSettingsModal } from './NotificationSettings';
import { WalkthroughTour } from './Walkthroughtour';
import { AdBanner } from './ads/AdBanner';
import { AllReportsModal } from './map/modals/AllReportsModal';
import { PinStatusModal } from './map/modals/PinStatusModal';
import { MarkerTooltip } from './map/modals/MarkerTooltip';
import { DistrictShareModal } from './map/modals/DistrictShareModal';
import { LiveTab } from './map/tabs/LiveTab';
import { ActivityTab } from './map/tabs/ActivityTab';
import { InsightsTab } from './map/tabs/InsightsTab';
import { FloatingSidebar } from './map/panels/FloatingSidebar';
import { EngagementPanel } from './map/panels/EngagementPanel';
import { InfoFooter } from './map/panels/InfoFooter';
import { RainAnimation } from './map/modals/RainAnimation';
import { ReportModal, INTENSITY_OPTIONS } from '../components/map/modals/ReportModal';
import { PWAInstallModal } from './map/modals/PWAInstallModal';

/* ─── constants ───────────────────────────────────────────── */
const TICK_MS = 30_000;
const MM_TO_LEVEL: Record<number, Level> = {
  4: 'drizzle',
  14: 'light',
  35: 'moderate',
  65: 'heavy',
  100: 'extreme',
};

/* ─── helpers ─────────────────────────────────────────────── */
function MapRefSyncer({ onReady }: { onReady: (m: any) => void }) {
  const map = useMap();
  useEffect(() => { onReady(map); }, []);
  return null;
}

type Level = 'drizzle' | 'light' | 'moderate' | 'heavy' | 'extreme';

function getLevel(mm: number): Level {
  if (mm > 80) return 'extreme';
  if (mm > 50) return 'heavy';
  if (mm > 20) return 'moderate';
  if (mm > 8) return 'light';
  return 'drizzle';
}

function fmtTime(ts: number, t: any): string {
  const d = Date.now() - ts;
  if (d < 10000) return `2${t.sAgo}`;
  if (d < 60000) return `${Math.floor(d / 1000)}${t.sAgo}`;
  if (d < 3600000) return `${Math.floor(d / 60000)}${t.mAgo}`;
  return `${Math.floor(d / 3600000)}${t.hAgo}`;
}

function markerRadius(zoom: number, intensity: number, selected: boolean): number {
  const base = zoom <= 6 ? 4 : zoom === 7 ? 5 : zoom === 8 ? 6 : zoom === 9 ? 7
    : zoom === 10 ? 8 : zoom === 11 ? 9 : 10;
  const bonus = Math.min(3, intensity / 40);
  const r = base + bonus;
  return selected ? r + 2 : r;
}

const sbStyle: React.CSSProperties = { padding: '11px 10px', background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 11, color: 'var(--text2)', fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .2s' };

/* ─── TAB COMPONENTS ──────────────────────────────────────── */
type SbTab = 'live' | 'activity' | 'insights';

/* ─── MOBILE LIVE SHEET ───────────────────────────────────── */
function MobileLiveSheet({ reports, now, onClose, onDistrictShare, initialTab, liveEvents }: {
  reports: RainReport[]; now: number; onClose: () => void; onDistrictShare: () => void;
  initialTab?: SbTab; liveEvents: LiveEvent[];
}) {
  const { t } = useLang();
  const [tab, setTab] = useState<SbTab>(initialTab || 'live');
  useEffect(() => { if (initialTab) setTab(initialTab); }, [initialTab]);
  const TABS = [
    { id: 'live' as SbTab, Icon: IconCloudRain, label: 'Live' },
    { id: 'activity' as SbTab, Icon: IconActivity, label: t.activity },
    { id: 'insights' as SbTab, Icon: IconBarChart, label: t.insights },
  ];
  return (
    <div className="mobile-live-sheet">
      <div className="mobile-live-handle" onClick={onClose} style={{ cursor: 'pointer' }} />
      <div className="mobile-live-body">
        {tab === 'live' && <LiveTab liveEvents={liveEvents} selectedPin={null} onSelect={() => { }} />}
        {tab === 'activity' && <ActivityTab liveEvents={liveEvents} />}
        {tab === 'insights' && <InsightsTab reports={reports} now={now} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN MAP VIEW
   ═══════════════════════════════════════════════════════════ */
export default function MapView() {
  const { t } = useLang();
  const { theme } = useTheme();
  const { canInstall, install } = usePWAInstall();
  const [showTour, setShowTour] = useState(false);
  useKeyboardAvoid();
  useSWAutoRefresh(20_000);

  /* ── state ── */
  const [geo, setGeo] = useState<any>(null);
  const [keralaDistrictGeo, setKeralaDistrictGeo] = useState<any>(null);
  const [rainData, setRainData] = useState<Record<string, RainReport>>({});
  const [now, setNow] = useState(Date.now());
  const [zoom, setZoom] = useState(7);
  const [loading, setLoading] = useState(false);
  const [showHeat, setShowHeat] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAllModal, setShowAll] = useState(false);
  const [showPinStatus, setShowPin] = useState(false);   // ← was missing
  const [showDistShare, setShowDist] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showMobileSheet, setMobileSheet] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPWAModal, setShowPWAModal] = useState(false);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<'radar' | 'activity' | 'insights' | 'districts'>('radar');
  const [lastUpdated, setLastUpdated] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pwaDismissed, setPwaDismissed] = useState(false);
  const [reportCooldown, setReportCooldown] = useState(0);
  const [stormLevel, setStormLevel] = useState<Level | null>(null);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);

  const mapRef = useRef<any>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);  // ← moved inside

  /* ── derived ── */
  const reports = useMemo(() =>
    Object.values(rainData).filter(r => !isExpired(r.lastUpdated, now)),
    [rainData, now]
  );
  const heavyReport = reports.find(r => currentAvgIntensity(r, now) > 50);

  /* ── cooldown helper ── */
  const startCooldown = useCallback(() => {
    setReportCooldown(10);
    cooldownRef.current = setInterval(() => {
      setReportCooldown(p => {
        if (p <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return p - 1;
      });
    }, 1000);
  }, []);

  /* ── effects ── */
  useEffect(() => {
    if (!localStorage.getItem('mz_tour_seen')) return;
    if (localStorage.getItem('mz_onboarding_seen')) return;
    setTimeout(() => setShowOnboarding(true), 1200);
  }, []);

  // ── IP-based first visit → show tour ──
  useEffect(() => {
    if (localStorage.getItem('mz_tour_seen')) return;

    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(({ ip }) => {
        const key = `mz_tour_ip_${btoa(ip).slice(0, 12)}`;
        if (localStorage.getItem(key)) {
          // same IP, tour already done — check if onboarding needed
          // if (!localStorage.getItem('mz_onboarding_seen')) {
          //   setTimeout(() => setShowOnboarding(true), 1200);
          // }
          return;
        }
        // new visitor — mark IP and show tour only
        localStorage.setItem(key, '1');
        setShowOnboarding(false);
        setTimeout(() => setShowTour(true), 2200);
      })
      .catch(() => {
        // IP fetch failed — show tour as fallback, not both
        setTimeout(() => setShowTour(true), 2200);
      });
  }, []);
  // PWA dismiss persistence
  useEffect(() => {
    if (localStorage.getItem('mz_pwa_dismissed')) setPwaDismissed(true);
  }, []);

  // cleanup cooldown on unmount
  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  // load GeoJSON + reports
  useEffect(() => {
    fetch('/india_state.geojson').then(r => r.json()).then(setGeo);
    fetch('/kerala_districts.geojson').then(r => r.json()).then(setKeralaDistrictGeo).catch(() => {
      console.warn('kerala_districts.geojson not found in /public.');
    });

    const fetchReports = () => {
      if (isSupabaseReady()) {
        loadRainReports().then(data => {
          if (Object.keys(data).length) setRainData(data);
          setLastUpdated(0);
        });
        // Also fetch last 48h individual events for live feed (2h = active, 2-48h = faded)
        const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
        supabase?.from('rain_reports')
          .select('id, pin, place, district, intensity, reported_at')
          .gte('reported_at', since48h)
          .order('reported_at', { ascending: false })
          .limit(200)
          .then(({ data: rows }) => {
            if (rows) {
              const fetchNow = Date.now();
              setLiveEvents(rows.map((r: any) => ({
                id: r.id,
                pin: r.pin,
                place: r.place,
                district: r.district,
                intensity: parseFloat(r.intensity) || 0,
                ts: new Date(r.reported_at).getTime(),
                faded: (fetchNow - new Date(r.reported_at).getTime()) >= TWO_HOURS_MS,
              })));
            }
          });
      }
    };

    fetchReports();
    // Auto-reload data every 20 seconds (aligned with SW cache refresh)
    const interval = setInterval(fetchReports, 20_000);
    return () => clearInterval(interval);
  }, []);

  // realtime subscription
  useEffect(() => {
    if (!isSupabaseReady()) return;
    const channel = subscribeToReports((raw: RawReport) => {
      const ts = new Date(raw.reported_at).getTime();
      setRainData(prev => {
        const ex = prev[raw.pin];
        return ex
          ? { ...prev, [raw.pin]: { ...ex, total: ex.total + raw.intensity, count: ex.count + 1, lastUpdated: ts, lastIntensity: raw.intensity } }
          : { ...prev, [raw.pin]: { pin: raw.pin, place: raw.place, district: raw.district, lat: raw.lat, lng: raw.lng, total: raw.intensity, count: 1, lastUpdated: ts, firstReport: ts, lastIntensity: raw.intensity } };
      });
      // Append to individual live events list (keep last 200, new events are never faded)
      setLiveEvents(prev => [{ id: raw.id, pin: raw.pin, place: raw.place, district: raw.district, intensity: raw.intensity, ts, faded: false }, ...prev].slice(0, 200));
      setLastUpdated(0);
    });
    return () => { channel?.unsubscribe(); };
  }, []);

  // tick
  useEffect(() => {
    const id = setInterval(() => { setNow(Date.now()); }, TICK_MS);
    const counterId = setInterval(() => { setLastUpdated(p => p + 1); }, 1000);
    return () => {
      clearInterval(id);
      clearInterval(counterId);
    };
  }, []);

  // zoom listener
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onZoom = () => setZoom(map.getZoom());
    map.on('zoomend', onZoom);
    return () => map.off('zoomend', onZoom);
  }, [mapRef.current]);

  // fullscreen body class
  useEffect(() => {
    document.body.classList.toggle('map--fullscreen', isFullscreen);
    setTimeout(() => mapRef.current?.invalidateSize(), 100);
    return () => { document.body.classList.remove('map--fullscreen'); };
  }, [isFullscreen]);

  /* ── handlers ── */
  const handlePwaDismiss = () => {
    setPwaDismissed(true);
    localStorage.setItem('mz_pwa_dismissed', '1');
  };

  const handleAddRain = useCallback(async (pin: string, mm: number) => {
    setLoading(true);
    try {
      const data = await getPincodeData(pin);
      if (!data) throw new Error(t.pinNotFound);
      const ts = Date.now();
      setRainData(prev => {
        const ex = prev[pin];
        return ex
          ? { ...prev, [pin]: { ...ex, total: ex.total + mm, count: ex.count + 1, lastUpdated: ts, lastIntensity: mm } }
          : { ...prev, [pin]: { pin, lat: data.lat, lng: data.lng, place: data.area, district: data.district, total: mm, count: 1, lastUpdated: ts, firstReport: ts, lastIntensity: mm } };
      });
      if (isSupabaseReady()) insertRainReport(pin, data.area, data.district, data.lat, data.lng, mm);
      setSelectedPin(pin);
      setLastUpdated(0);
      mapRef.current?.flyTo([data.lat, data.lng], 11, { duration: 1.6 });
      startCooldown();
    } finally {
      setLoading(false);
      const level = MM_TO_LEVEL[mm] ?? 'moderate';
      setStormLevel(level);
      setTimeout(() => setStormLevel(null), 6000);
    }
  }, [t, startCooldown]);

  const handleSelect = useCallback((pin: string) => {
    setSelectedPin(p => p === pin ? null : pin);
    const r = rainData[pin];
    if (r) mapRef.current?.flyTo([r.lat, r.lng], 12, { duration: 1.2 });
  }, [rainData]);

  const openMobileTab = (tab: 'activity' | 'insights') => {
    setActiveNav(tab); setMobileSheet(true);
  };

  /* ── map styles ── */
  const geoStyle = useCallback((feature: any) => {
    const isK = (feature?.properties?.NAME_1 || '').toLowerCase().includes('kerala');
    return { color: isK ? '#00d4ff' : (theme === 'dark' ? '#1a2a3a' : '#90b0cc'), weight: isK ? 1.5 : 0.4, fillColor: 'transparent', fillOpacity: 0, opacity: isK ? 0.85 : 0.25 };
  }, [theme]);

  const districtStyle = useCallback(() => ({
    color: theme === 'dark' ? 'rgba(30,143,255,0.07)' : 'rgba(0,90,180,0.45)',
    weight: 1, fillOpacity: 0, opacity: 1,
  }), [theme]);

  const keralaDistrictStyle = useCallback(() => ({
    color: theme === 'dark' ? 'rgba(0,212,255,0.30)' : 'rgba(0,90,200,0.50)',
    weight: 1, fillColor: 'transparent', fillOpacity: 0, opacity: 1,
  }), [theme]);

  const onEachKeralaDistrict = useCallback((feature: any, layer: any) => {
    const name = feature?.properties?.district || feature?.properties?.DISTRICT
      || feature?.properties?.NAME_2 || feature?.properties?.dtname || feature?.properties?.name || '';
    if (name) layer.bindTooltip(name, { sticky: true, direction: 'top', className: 'district-name-tooltip', offset: [0, -4] });
    layer.on({
      mouseover(e: any) { e.target.setStyle({ fillColor: 'rgba(0,212,255,0.06)', fillOpacity: 1, weight: 1.5, color: theme === 'dark' ? 'rgba(0,212,255,0.55)' : 'rgba(0,90,200,0.75)' }); },
      mouseout(e: any) { e.target.setStyle(keralaDistrictStyle()); },
    });
  }, [theme, keralaDistrictStyle]);

  const darkTile = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const lightTile = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  /* ── render ── */
  return (
    <>
      <div className="map-shell">
        <MapContainer center={[10.8505, 76.2711]} zoom={7} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <MapRefSyncer onReady={m => { mapRef.current = m; setZoom(m.getZoom()); }} />
          <TileLayer key={theme} url={theme === 'dark' ? darkTile : lightTile} attribution="&copy; CARTO" />

          {geo && <GeoJSON key={`dist-${theme}`} data={geo} style={districtStyle} />}
          {keralaDistrictGeo && <GeoJSON key={`kerala-districts-${theme}`} data={keralaDistrictGeo} style={keralaDistrictStyle} onEachFeature={onEachKeralaDistrict} />}
          {geo && <GeoJSON key={`state-${theme}`} data={geo} style={geoStyle} />}

          {!showHeat && reports.map(item => {
            const ghost = isGhost(item, now);
            const effAvg = currentAvgIntensity(item, now);
            const displayMm = ghost ? 0 : effAvg;
            const color = ghost ? '#6b7a8d' : getIntensityColor(displayMm);
            const sel = selectedPin === item.pin;
            const r = markerRadius(zoom, displayMm, sel);
            const fillOpacity = ghost ? 0.28 : Math.max(0.4, 0.85 * decayFactor(item.lastUpdated, now) + 0.15);
            return (
              <CircleMarker key={`${item.pin}-${theme}`} center={[item.lat, item.lng]} radius={r}
                pathOptions={{ color: sel ? '#ffffff' : (ghost ? '#4a5568' : color), weight: sel ? 2 : ghost ? 0.8 : 1.2, fillColor: color, fillOpacity, dashArray: ghost ? '3 2' : undefined }}
                eventHandlers={{ click: () => handleSelect(item.pin) }}>
                <Tooltip className="mz-tt" direction="top" offset={[0, -r - 2]} sticky={false}>
                  <MarkerTooltip item={item} now={now} ghost={ghost} />
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* PWA banner */}
        {canInstall && !pwaDismissed && (
          <div className="pwa-banner-bar">
            <div className="pwa-banner-bar__icon">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M12 8v8M8 12l4 4 4-4" /></svg>
            </div>
            <div className="pwa-banner-bar__text">
              <div className="pwa-banner-bar__title">Install Mazha.Live</div>
              <div className="pwa-banner-bar__sub">Track rain from your home screen</div>
            </div>
            <button className="pwa-banner-bar__btn" onClick={() => setShowPWAModal(true)}>Add to Home</button>
            <button className="pwa-banner-bar__close" aria-label="Dismiss install banner" onClick={handlePwaDismiss}>
              <svg width={10} height={10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
              </svg>
            </button>
          </div>
        )}

        <HeatmapLayer reports={reports.filter(r => !isGhost(r, now))} mapRef={mapRef} visible={showHeat} />

        {heavyReport && (
          <div className="map-banner map-banner--intense">
            <span className="intense-pulse-dot" />
            <IconAlertTriangle size={13} color="#fff" />
            {t.intenseBanner} <span className="banner-highlight-red">{heavyReport.district}</span>
            &nbsp;·&nbsp;<span className="banner-count-red">{reports.length * 12} {t.reportsIn}</span>
            <span className="intense-bar-track"><span className="intense-bar-fill" /></span>
          </div>
        )}

        {/* Map tools */}
        <div className="map-tools">
          <button className="map-tool-btn" title="Refresh" onClick={() => window.location.reload()}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
          </button>
          <button className="map-tool-btn" title="Reset View" onClick={() => mapRef.current?.flyTo([10.8505, 76.2711], 7, { duration: 1 })}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" />
              <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          </button>

          <button className={`map-tool-btn${showHeat ? ' on' : ''}`} title="Heatmap" onClick={() => setShowHeat(p => !p)}>
            <IconFire size={16} />
          </button>
          {/* {canInstall && (
            <button className="map-tool-btn" title="Install App" onClick={() => setShowPWAModal(true)}>
              <IconInstall size={16} />
            </button>
          )} */}
          <button
            className="map-tool-btn map-fullscreen-btn"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            onClick={() => setIsFullscreen(p => !p)}
          >
            {isFullscreen
              ? <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="10" y1="14" x2="3" y2="21" /><line x1="21" y1="3" x2="14" y2="10" /></svg>
              : <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
            }
          </button>
        </div>

        {/* Report FAB with cooldown */}
        <button
          className="report-fab"
          onClick={() => { if (reportCooldown === 0) setShowModal(true); }}
          disabled={loading || reportCooldown > 0}
          style={reportCooldown > 0 ? { opacity: 0.75, cursor: 'not-allowed' } : {}}
        >
          {reportCooldown > 0 ? (
            <>
              <svg width={22} height={22} viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="var(--cyan-dark)" strokeWidth="3"
                  strokeDasharray={`${(reportCooldown / 10) * 94} 94`} strokeLinecap="round" />
              </svg>
              Wait {reportCooldown}s
            </>
          ) : (
            <>
              <IconCloudRain size={22} color="var(--cyan-dark)" />
              {loading ? t.locating : t.reportRain}
            </>
          )}
        </button>

        <div className="last-updated">
          <div className="upd-dot" />
          {t.lastUpdated}: {lastUpdated}S AGO
          {isSupabaseReady() && <span style={{ marginLeft: 6, fontSize: 8, color: 'var(--cyan)', fontWeight: 700, letterSpacing: .5 }}>● LIVE</span>}
        </div>

        <InfoFooter reports={reports} now={now} />

        <FloatingSidebar reports={reports} now={now} selectedPin={selectedPin} onSelect={handleSelect}
          liveEvents={liveEvents}
          onViewAll={() => setShowAll(true)} onDistrictShare={() => setShowDist(true)} onPinStatus={() => setShowPin(true)} />

        <EngagementPanel reports={reports} now={now} />

        {/* ── LEFT LIVE FEED PANEL ── */}
        <div className="live-feed-panel">
          <div className="lf-header">
            <div className="lf-title">
              <div className="lf-live-dot" />
              Live Reports
            </div>
            <div className="lf-count">
              {liveEvents.filter(e => !e.faded).length} active
              {liveEvents.filter(e => e.faded).length > 0 && (
                <span style={{ color: 'var(--text3)', marginLeft: 4 }}>· {liveEvents.filter(e => e.faded).length} faded</span>
              )}
            </div>
          </div>
          <div className="lf-body">
            {liveEvents.slice(0, 20).map((ev, idx) => {
              const level = getLevel(ev.intensity);
              const cssClass =
                ev.faded ? 'lf-active' :
                  level === 'extreme' ? 'lf-extreme' :
                    level === 'heavy' ? 'lf-heavy' :
                      level === 'moderate' ? 'lf-moderate' :
                        'lf-active';
              const label =
                level === 'extreme' ? 'Extreme' :
                  level === 'heavy' ? 'Heavy' :
                    level === 'moderate' ? 'Moderate' :
                      level === 'light' ? 'Light' : 'Drizzle';
              return (
                <div
                  key={`${ev.id}-${ev.ts}`}
                  className={`lf-item ${cssClass}`}
                  style={{ animationDelay: `${idx * 50}ms`, opacity: ev.faded ? 0.45 : 1 }}
                  onClick={() => handleSelect(ev.pin)}
                >
                  <div className="lf-status-dot" style={ev.faded ? { background: '#6b7a8d' } : {}} />
                  <span className="lf-status-label" style={ev.faded ? { color: '#6b7a8d' } : {}}>
                    {ev.faded ? 'Faded' : label}
                  </span>
                  <span className="lf-place">{ev.place}</span>
                  <span className="lf-sub">{ev.district} · {ev.pin}</span>
                  <span className="lf-time">{fmtTime(ev.ts, t)}</span>
                </div>
              );
            })}
            {liveEvents.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text3)', padding: '12px 8px', textAlign: 'center' }}>No reports yet</div>
            )}
          </div>
        </div>

        <div style={{
          position: 'absolute',
          bottom: 2,
          left: 0,
          right: 0,
          padding: '4px 12px',
          background: 'var(--card)',
          backdropFilter: 'blur(100px)',
          zIndex: 1900,
          pointerEvents: 'auto',
        }}>
          <div style={{ fontSize: 9, color: 'var(--text3)', textAlign: 'right', marginBottom: 2 }}>AD</div>
          <AdBanner slot="1122334455" style={{ maxHeight: 10, maxWidth: 10 }} />
        </div>

        {/* Mobile PIN search FAB */}
        <button className="mobile-pin-fab" onClick={() => setShowPin(true)} title="Search PIN">
          <IconSearch size={18} color="var(--cyan)" />
        </button>

        {/* Mobile nav buttons */}
        <div className="nav-btn-row">
          <button className={`nav-btn${showPinStatus ? ' nav-btn--active' : ''}`} title="Search PIN" onClick={() => setShowPin(true)}>
            <IconSearch size={18} />
          </button>
          <button className={`nav-btn${activeNav === 'activity' && showMobileSheet ? ' nav-btn--active' : ''}`} title="Activity"
            onClick={() => { if (activeNav === 'activity' && showMobileSheet) { setMobileSheet(false); setActiveNav('radar'); } else openMobileTab('activity'); }}>
            <IconActivity size={18} />
          </button>
          <button className={`nav-btn${activeNav === 'insights' && showMobileSheet ? ' nav-btn--active' : ''}`} title="Insights"
            onClick={() => { if (activeNav === 'insights' && showMobileSheet) { setMobileSheet(false); setActiveNav('radar'); } else openMobileTab('insights'); }}>
            <IconBarChart size={18} />
          </button>
          <button className={`nav-btn${showDistShare ? ' nav-btn--active' : ''}`} title="Districts" onClick={() => setShowDist(true)}>
            <IconMapPin size={18} />
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      {showMobileSheet && (activeNav === 'activity' || activeNav === 'insights') && (
        <MobileLiveSheet reports={reports} now={now} initialTab={activeNav as SbTab}
          liveEvents={liveEvents}
          onClose={() => { setMobileSheet(false); setActiveNav('radar'); }}
          onDistrictShare={() => setShowDist(true)} />
      )}

      {/* Modals */}
      {showModal && <ReportModal onClose={() => setShowModal(false)} onSubmit={handleAddRain} />}
      {showAllModal && <AllReportsModal reports={reports} now={now} onClose={() => setShowAll(false)} />}
      {showPinStatus && <PinStatusModal reports={reports} now={now} onClose={() => setShowPin(false)} />}
      {showDistShare && <DistrictShareModal reports={reports} now={now} onClose={() => setShowDist(false)} />}
      {showNotif && <NotificationSettingsModal onClose={() => setShowNotif(false)} />}
      {showPWAModal && <PWAInstallModal onClose={() => setShowPWAModal(false)} onInstall={async () => { const success = await install(); if (success !== false) setShowPWAModal(false); return success; }} />}

      {/* First-visit onboarding */}
      {showOnboarding && (
        <div className="modal-backdrop" style={{ alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setShowOnboarding(false); localStorage.setItem('mz_onboarding_seen', '1'); }}>
          <div className="modal-sheet"
            style={{ width: 340, borderRadius: 22, maxHeight: '90vh', animation: 'successIn .5s var(--spring)', padding: '0 0 28px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, rgba(26,111,255,0.18) 0%, rgba(168,85,247,0.12) 100%)', borderRadius: '22px 22px 0 0', padding: '32px 28px 24px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 52, marginBottom: 14, lineHeight: 1, filter: 'drop-shadow(0 4px 16px rgba(26,111,255,0.4))' }}>🌧️</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', marginBottom: 6 }}>മഴ ഉണ്ടോ? Report it!</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>Help your community know where it's raining in Kerala — right now, in real time.</div>
            </div>
            <div style={{ padding: '20px 24px 0' }}>
              {[
                { icon: '📍', title: 'Enter your PIN code', desc: 'Just your 6-digit postal code' },
                { icon: '💧', title: 'Select rain intensity', desc: 'Drizzle to extreme — you decide' },
                { icon: '🗺️', title: 'See it live on the map', desc: 'Your report appears instantly' },
              ].map(s => (
                <div key={s.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.4 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{s.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{s.desc}</div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => { setShowOnboarding(false); localStorage.setItem('mz_onboarding_seen', '1'); setTimeout(() => setShowModal(true), 300); }}
                style={{ width: '100%', marginTop: 20, padding: '15px', background: 'var(--cyan)', border: 'none', borderRadius: 13, color: 'var(--cyan-dark)', fontFamily: 'var(--ff)', fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 4px 24px var(--glow-cyan)' }}>
                <IconCloudRain size={18} color="var(--cyan-dark)" />
                Report Rain Near Me
              </button>
              <button
                onClick={() => { setShowOnboarding(false); localStorage.setItem('mz_onboarding_seen', '1'); }}
                style={{ width: '100%', marginTop: 10, padding: '12px', background: 'transparent', border: '1px solid var(--border2)', borderRadius: 13, color: 'var(--text3)', fontFamily: 'var(--ff)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── WALKTHROUGH TOUR ── */}
      {showTour && (
        <WalkthroughTour onDone={() => {
          setShowTour(false);
          localStorage.setItem('mz_tour_seen', '1');
        }} />
      )}

      {showModal && (
        <ReportModal
          onClose={() => setShowModal(false)}
          onSubmit={handleAddRain}
        />
      )}

      {stormLevel && (
        <RainAnimation
          level={stormLevel}
          onDismiss={() => setStormLevel(null)}
        />
      )}
    </>
  );
}

