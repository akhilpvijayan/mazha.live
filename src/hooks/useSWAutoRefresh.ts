/**
 * useSWAutoRefresh
 *
 * Polls the service worker registration every `intervalMs` (default 20 s).
 * On each tick:
 *  1. Calls registration.update() — this makes the browser re-fetch sw.js
 *     from the network and compare it against the installed version.
 *  2. If a new SW is already waiting, sends it SKIP_WAITING so it activates
 *     immediately (no page reload required for most users).
 *
 * This keeps the app code cache fresh without users ever having to reload.
 */
import { useEffect } from 'react';

export function useSWAutoRefresh(intervalMs = 20_000) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const activateWaiting = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting) {
        reg.waiting.postMessage('SKIP_WAITING');
      }
    };

    const tick = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/');
        if (!reg) return;

        // Ask browser to re-check sw.js for updates
        await reg.update();

        // If a new worker is already waiting, activate it now
        activateWaiting(reg);

        // Also listen for a new worker arriving during this tick
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') activateWaiting(reg);
          });
        });
      } catch {
        // Silently ignore — offline or SW not registered
      }
    };

    // Run first check after a short delay (let SW register first)
    const firstCheck = setTimeout(tick, 3000);
    const id = setInterval(tick, intervalMs);

    return () => {
      clearTimeout(firstCheck);
      clearInterval(id);
    };
  }, [intervalMs]);
}
