const CACHE = 'mazha-v2';
const STATIC = ['/', '/index.html', '/manifest.json', '/icon-192.svg', '/icon-512.svg', '/favicon.svg', '/india_state.geojson'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const ext = url.hostname.includes('postalpincode')||url.hostname.includes('nominatim')||url.hostname.includes('carto')||url.hostname.includes('supabase');
  e.respondWith(ext
    ? fetch(e.request).catch(()=>new Response('',{status:503}))
    : caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{
        if(res.ok){const clone=res.clone();caches.open(CACHE).then(c=>c.put(e.request,clone));}
        return res;
      }))
  );
});

// PUSH HANDLER
self.addEventListener('push', e => {
  if(!e.data)return;
  let data;try{data=e.data.json();}catch{data={title:'Mazha.Live',body:e.data.text()};}
  const opts={
    body:data.body||'Heavy rain reported nearby',
    icon:data.icon||'/icon-192.svg',
    badge:data.badge||'/icon-192.svg',
    tag:data.tag||'mazha-rain',
    renotify:true,requireInteraction:false,
    vibrate:[200,100,200],
    data:data.data||{},
    actions:[{action:'view',title:'View on Map'},{action:'dismiss',title:'Dismiss'}],
  };
  e.waitUntil(self.registration.showNotification(data.title||'Mazha.Live Alert',opts));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if(e.action==='dismiss')return;
  const pin=e.notification.data?.pin;
  const url=pin?`/?pin=${pin}`:'/';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    const ex=list.find(c=>c.url.startsWith(self.location.origin));
    if(ex){ex.focus();ex.postMessage({type:'OPEN_PIN',pin});}else clients.openWindow(url);
  }));
});
