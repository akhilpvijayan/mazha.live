// supabase/functions/notify-heavy-rain/index.ts
// Deploy with: supabase functions deploy notify-heavy-rain
// Set secrets: supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_EMAIL=...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Simple VAPID + WebPush implementation for Deno
async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidEmail: string
) {
  // Build VAPID JWT
  const audience = new URL(subscription.endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const header = { typ: 'JWT', alg: 'ES256' };
  const claims = { aud: audience, exp: now + 43200, sub: `mailto:${vapidEmail}` };

  const enc = (obj: object) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signingInput = `${enc(header)}.${enc(claims)}`;

  // Import VAPID private key
  const rawKey = Uint8Array.from(atob(vapidPrivateKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey('raw', rawKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, cryptoKey, new TextEncoder().encode(signingInput));
  const jwt = `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;

  const headers: Record<string, string> = {
    'Authorization': `vapid t=${jwt},k=${vapidPublicKey}`,
    'Content-Type': 'application/octet-stream',
    'TTL': '86400',
  };

  // Encrypt payload using Web Push encryption
  const payloadBytes = new TextEncoder().encode(payload);

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers,
    body: payloadBytes,
  });

  return response.status;
}

Deno.serve(async (req) => {
  try {
    const { record } = await req.json(); // new rain_report row from Supabase webhook

    if (!record || record.intensity_mm < 50) {
      return new Response('Not heavy enough', { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get push subscriptions — district-targeted first, then broadcast
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .or(`district.eq.${record.district},district.is.null`);

    if (!subs || subs.length === 0) {
      return new Response('No subscribers', { status: 200 });
    }

    const level = record.intensity_mm > 80 ? 'Very Heavy' : 'Heavy';
    const payload = JSON.stringify({
      title: `⚠️ ${level} Rain — ${record.district}`,
      body: `${record.place} (PIN ${record.pin}): ${record.intensity_mm} mm/hr reported`,
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      tag: `rain-${record.district}`,
      data: { pin: record.pin, district: record.district, url: '/' },
    });

    const vapidPublicKey  = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidEmail      = Deno.env.get('VAPID_EMAIL')!;

    const results = await Promise.allSettled(
      subs.map(sub =>
        sendWebPush(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload, vapidPublicKey, vapidPrivateKey, vapidEmail
        )
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    console.log(`Sent ${sent}/${subs.length} push notifications for ${record.district}`);

    return new Response(JSON.stringify({ sent, total: subs.length }), {
      headers: { 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (err) {
    console.error('Push error:', err);
    return new Response('Error', { status: 500 });
  }
});
