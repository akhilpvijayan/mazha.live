import { useState, useEffect, useCallback } from 'react';
import { savePushSubscription, updateSubscriptionDistricts, deletePushSubscription, isSupabaseReady } from '../services/supabase';

// ─── Replace with your actual VAPID public key ────────────────
// Generate at: https://vapidkeys.com  OR  via:
//   npx web-push generate-vapid-keys
// Then add to Supabase Edge Function env vars too
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
// ─────────────────────────────────────────────────────────────

export type NotifPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export interface PushState {
  permission:   NotifPermission;
  subscribed:   boolean;
  loading:      boolean;
  subscription: PushSubscription | null;
  districts:    string[];
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64     = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(b64);
  const buf     = new ArrayBuffer(raw.length);
  const view    = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return view;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>({
    permission:   'default',
    subscribed:   false,
    loading:      false,
    subscription: null,
    districts:    [],
  });

  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  // Check existing permission + subscription on mount
  useEffect(() => {
    if (!isSupported) {
      setState(s => ({ ...s, permission: 'unsupported' }));
      return;
    }
    setState(s => ({ ...s, permission: Notification.permission as NotifPermission }));
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        if (sub) setState(s => ({ ...s, subscribed: true, subscription: sub }));
      });
    });
  }, []);

  const subscribe = useCallback(async (selectedDistricts: string[]): Promise<boolean> => {
    if (!isSupported) return false;
    // If no VAPID key, still request permission so the UI responds
    if (!VAPID_PUBLIC_KEY) {
      const perm = await Notification.requestPermission();
      setState(s => ({ ...s, permission: perm as any }));
      if (perm === 'granted') {
        setState(s => ({ ...s, subscribed: true, districts: selectedDistricts }));
        return true;
      }
      return false;
    }
    setState(s => ({ ...s, loading: true }));
    try {
      const permission = await Notification.requestPermission();
      setState(s => ({ ...s, permission: permission as NotifPermission }));
      if (permission !== 'granted') return false;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      if (isSupabaseReady()) {
        await savePushSubscription(sub, selectedDistricts);
      }

      setState(s => ({ ...s, subscribed: true, subscription: sub, districts: selectedDistricts }));
      return true;
    } catch {
      return false;
    } finally {
      setState(s => ({ ...s, loading: false }));
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<void> => {
    const sub = state.subscription;
    if (!sub) return;
    setState(s => ({ ...s, loading: true }));
    try {
      if (isSupabaseReady()) await deletePushSubscription(sub.endpoint);
      await sub.unsubscribe();
      setState(s => ({ ...s, subscribed: false, subscription: null, districts: [] }));
    } finally {
      setState(s => ({ ...s, loading: false }));
    }
  }, [state.subscription]);

  const updateDistricts = useCallback(async (districts: string[]): Promise<void> => {
    const sub = state.subscription;
    if (!sub) return;
    if (isSupabaseReady()) await updateSubscriptionDistricts(sub.endpoint, districts);
    setState(s => ({ ...s, districts }));
  }, [state.subscription]);

  return { ...state, isSupported, subscribe, unsubscribe, updateDistricts };
}
