/* FlashFlood Lab — offline service worker (WeatherNext family convention).
   CACHE_VERSION format: flashflood-lab-20260705111316<YYYYMMDDhhmm> */
const CACHE_VERSION = "flashflood-lab-20260705111316";
const CORE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./xlsx.full.min.js",
  "./html2canvas.min.js",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png",
  "./favicon-32.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", e=>{
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_VERSION).then(c=>Promise.allSettled(CORE.map(u=>c.add(u))))
  );
});

self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE_VERSION).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch", e=>{
  const req=e.request;
  if(req.method!=="GET") return;
  const url=new URL(req.url);
  // Never cache the live Open-Meteo forecast — always go to network, fail soft.
  if(url.hostname.endsWith("open-meteo.com")){
    e.respondWith(fetch(req).catch(()=>new Response(JSON.stringify({error:true,offline:true}),{headers:{"Content-Type":"application/json"}})));
    return;
  }
  // App shell: cache-first, fall back to network, then to cached index for navigations.
  e.respondWith(
    caches.match(req).then(hit=>hit || fetch(req).then(res=>{
      if(res && res.status===200 && url.origin===self.location.origin){
        const copy=res.clone();
        caches.open(CACHE_VERSION).then(c=>c.put(req,copy));
      }
      return res;
    }).catch(()=>{
      if(req.mode==="navigate") return caches.match("./index.html");
      return new Response("",{status:504});
    }))
  );
});
