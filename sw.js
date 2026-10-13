// EIP Plan - funcionamiento sin conexión.
// Guarda la app y las librerías (Firebase, jsPDF) la primera vez que abre con internet.
// Después abre sin internet; los datos los guarda Firestore en el teléfono y se sincronizan al volver la señal.
const CACHE = 'eip-plan-v3';
const PRECACHE = [
  './', './index.html', './manifest.json', './icon-192.png',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>Promise.all(PRECACHE.map(u=>
    c.add(new Request(u, u.startsWith('http')?{mode:'no-cors'}:{})).catch(()=>{})
  ))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e=>{
  const req = e.request, url = new URL(req.url);
  if(req.method!=='GET') return;
  // Datos y login de Firebase: los maneja Firebase, no el caché.
  if(/firestore\.googleapis|identitytoolkit|securetoken|googleapis\.com\/(?!ajax)|firebaseapp\.com\/__/.test(req.url)) return;
  // La página: primero red (para recibir actualizaciones), si no hay internet usa la guardada.
  if(req.mode==='navigate'){
    e.respondWith(fetch(req).then(r=>{ const cp=r.clone(); caches.open(CACHE).then(c=>c.put('./index.html',cp)); return r; })
      .catch(()=>caches.match('./index.html').then(r=>r||caches.match('./'))));
    return;
  }
  // Resto (librerías, íconos): del caché y se actualiza de fondo.
  e.respondWith(caches.match(req).then(hit=>{
    const net = fetch(req).then(r=>{ if(r && (r.ok||r.type==='opaque')){ const cp=r.clone(); caches.open(CACHE).then(c=>c.put(req,cp)); } return r; }).catch(()=>hit);
    return hit || net;
  }));
});
