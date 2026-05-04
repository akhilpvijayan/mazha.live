// supabase/functions/send-push/index.ts
// Deploy: supabase functions deploy send-push
// This fires when a heavy rain report is inserted via a DB webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_EMAIL   = Deno.env.get('VAPID_EMAIL') || 'mailto:admin@mazha.live';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Minimal VAPID JWT signer for Deno
async function vapidJWT(audience: string): Promise<string> {
  const header  = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = btoa(JSON.stringify({
    aud: new URL(audience).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_EMAIL,
  }));
  const unsigned = `${header}.${payload}`;
  // Import VAPID private key
  const keyData = Uint8Array.from(atob(VAPID_PRIVATE), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', keyData, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
}

async function sendWebPush(sub: any, payload: string): Promise<boolean> {
  const jwt = await vapidJWT(sub.endpoint);
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
    },
    body: new TextEncoder().encode(payload),
  });
  return res.ok || res.status === 201;
}

serve(async (req) => {
  try {
    const body = await req.json();
    // Webhook payload from Supabase DB trigger
    const record = body.record;
    if (!record) return new Response('no record', { status: 400 });

    const { district, pin, place, intensity } = record;
    if (intensity < 50) return new Response('intensity too low', { status: 200 }); // only notify heavy+

    // Find subscribers for this district
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .contains('districts', [district]);

    if (!subs || subs.length === 0) return new Response('no subscribers', { status: 200 });

    const level = intensity > 80 ? 'Very Heavy' : intensity > 50 ? 'Heavy' : 'Moderate';
    const notifPayload = JSON.stringify({
      title: `⛈ ${level} Rain — ${district}`,
      body:  `${intensity}mm/hr reported in ${place} (${pin})`,
      icon:  '/icon-192.svg',
      badge: '/icon-192.svg',
      data:  { pin, district, url: `/?pin=${pin}` },
      vibrate: [200, 100, 200],
      actions: [
        { action: 'view', title: 'View Map' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    });

    let sent = 0;
    const deadEndpoints: string[] = [];

    await Promise.all(subs.map(async (sub) => {
      try {
        const ok = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          notifPayload
        );
        if (ok) sent++;
        else deadEndpoints.push(sub.endpoint);
      } catch {
        deadEndpoints.push(sub.endpoint);
      }
    }));

    // Prune dead subscriptions
    if (deadEndpoints.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', deadEndpoints);
    }

    // Log it
    await supabase.from('notifications_log').insert({ district, pin, intensity, sent_count: sent });

    return new Response(JSON.stringify({ sent, pruned: deadEndpoints.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
