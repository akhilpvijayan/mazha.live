import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import type { RainReport, RawReport } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = SUPABASE_URL ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
export const isSupabaseReady = (): boolean => !!(SUPABASE_URL && SUPABASE_KEY && supabase);

/* ─── Time-decay helpers ──────────────────────────────────── */
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const TWO_DAYS_MS  = 48 * 60 * 60 * 1000;

/**
 * Returns 0–1 decay multiplier.
 * 1.0 at report time → 0.0 at +2h → stays 0 after that.
 */
export function decayFactor(reportedAt: number, now = Date.now()): number {
  const age = now - reportedAt;
  if (age >= TWO_HOURS_MS) return 0;
  return Math.max(0, 1 - age / TWO_HOURS_MS);
}

/** Effective intensity after time decay */
export function effectiveIntensity(raw: number, reportedAt: number, now = Date.now()): number {
  return raw * decayFactor(reportedAt, now);
}

/** Is report too old to show at all? */
export function isExpired(reportedAt: number, now = Date.now()): boolean {
  return now - reportedAt > TWO_DAYS_MS;
}

/** Is report in "ghost" state? (> 2h but < 48h) */
export function isGhost(report: RainReport, now = Date.now()): boolean {
  const age = now - report.lastUpdated;
  return age >= TWO_HOURS_MS && age < TWO_DAYS_MS;
}

/** Current effective avg intensity for a report */
export function currentAvgIntensity(report: RainReport, now = Date.now()): number {
  const age = now - report.lastUpdated;
  if (age >= TWO_HOURS_MS) return 0;
  // total/count is now always computed from non-faded reports only (last 2h).
  const raw = report.total / report.count;
  return raw * decayFactor(report.lastUpdated, now);
}

/* ─── Load reports: 48h for display, 2h only for intensity calculation ── */
export async function loadRainReports(): Promise<Record<string, RainReport>> {
  if (!supabase) return {};

  const now  = Date.now();
  const since48h = new Date(now - TWO_DAYS_MS).toISOString();

  const { data, error } = await supabase
    .from('rain_reports')
    .select('pin, place, district, lat, lng, intensity, reported_at')
    .gte('reported_at', since48h)
    .order('reported_at', { ascending: true });

  if (error || !data) { console.error('loadRainReports:', error); return {}; }

  // Two-pass aggregation per PIN:
  //  • activeTotal/activeCount → only reports < 2h old (used for intensity)
  //  • lastUpdated            → most recent report timestamp (any age, for ghost state)
  //  • firstReport            → earliest report in the 48h window
  //  • peakIntensity          → highest single-report value in 48h (for ghost tooltip)
  const agg: Record<string, {
    pin: string; place: string; district: string; lat: number; lng: number;
    activeTotal: number; activeCount: number;
    lastUpdated: number; firstReport: number; peakIntensity: number;
  }> = {};

  data.forEach((row: any) => {
    const ts        = new Date(row.reported_at).getTime();
    const intensity = parseFloat(row.intensity) || 0;
    const isActive  = (now - ts) < TWO_HOURS_MS;

    const ex = agg[row.pin];
    if (ex) {
      if (isActive) { ex.activeTotal += intensity; ex.activeCount += 1; }
      ex.lastUpdated   = Math.max(ex.lastUpdated, ts);
      ex.firstReport   = Math.min(ex.firstReport, ts);
      ex.peakIntensity = Math.max(ex.peakIntensity, intensity);
    } else {
      agg[row.pin] = {
        pin: row.pin, place: row.place, district: row.district,
        lat: row.lat, lng: row.lng,
        activeTotal: isActive ? intensity : 0,
        activeCount: isActive ? 1 : 0,
        lastUpdated: ts, firstReport: ts,
        peakIntensity: intensity,
      };
    }
  });

  // Map to RainReport: total/count = active only; ghost state preserved via lastUpdated
  const result: Record<string, RainReport> = {};
  Object.values(agg).forEach(r => {
    const hasActive = r.activeCount > 0;
    result[r.pin] = {
      pin:           r.pin,
      place:         r.place,
      district:      r.district,
      lat:           r.lat,
      lng:           r.lng,
      // Use active-only totals for calculations; fall back to peak for ghost display
      total:         hasActive ? r.activeTotal : r.peakIntensity,
      count:         hasActive ? r.activeCount : 1,
      lastUpdated:   r.lastUpdated,
      firstReport:   r.firstReport,
      lastIntensity: hasActive ? (r.activeTotal / r.activeCount) : r.peakIntensity,
    };
  });
  return result;
}

/* ─── Insert a single rain report ─────────────────────────── */
export async function insertRainReport(
  pin: string, place: string, district: string,
  lat: number, lng: number, intensity: number
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('rain_reports').insert({
    pin, place, district, lat, lng, intensity: Math.round(intensity),
  });
  if (error) console.error('insertRainReport:', error);
  return !error;
}

/* ─── Real-time subscription ──────────────────────────────── */
export function subscribeToReports(onInsert: (r: RawReport) => void): RealtimeChannel | null {
  if (!supabase) return null;
  return supabase
    .channel('rain_live')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rain_reports' },
      (payload) => onInsert(payload.new as RawReport))
    .subscribe();
}

/* ─── Push subscription CRUD ──────────────────────────────── */
export async function savePushSubscription(sub: PushSubscription, districts: string[]): Promise<boolean> {
  if (!supabase) return false;
  const key  = sub.getKey('p256dh');
  const auth = sub.getKey('auth');
  if (!key || !auth) return false;
  const { error } = await supabase.from('push_subscriptions').upsert({
    endpoint:   sub.endpoint,
    p256dh:     btoa(String.fromCharCode(...new Uint8Array(key))),
    auth:       btoa(String.fromCharCode(...new Uint8Array(auth))),
    districts,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' });
  return !error;
}

export async function updateSubscriptionDistricts(endpoint: string, districts: string[]): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('push_subscriptions')
    .update({ districts, updated_at: new Date().toISOString() }).eq('endpoint', endpoint);
  return !error;
}

export async function deletePushSubscription(endpoint: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  return !error;
}
