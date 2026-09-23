// Cache only the public application shell. Never store API responses or images.
const VERSION='sale-watch-shell-v6';
const ASSETS=['/','/app.js','/style.css','/favicon.svg','/manifest.webmanifest','/icon-180.png','/icon-192.png','/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sale-watch-shell-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin||u.search||!ASSETS.includes(u.pathname))return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));});
