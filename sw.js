// PanelFit Service Worker — Offline support
const CACHE = 'panelfit-v2';

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(cache){
      return cache.add('/app.html').catch(function(){});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  var url = e.request.url;
  if(e.request.method !== 'GET') return;
  if(!url.startsWith('http')) return;
  if(url.includes('supabase.co')) return;
  if(url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) return;

  e.respondWith(
    fetch(e.request)
      .then(function(response){
        if(response && response.status === 200 && response.type !== 'opaque'){
          var clone = response.clone();
          caches.open(CACHE).then(function(cache){ cache.put(e.request, clone); });
        }
        return response;
      })
      .catch(function(){
        return caches.match(e.request).then(function(cached){
          if(cached) return cached;
          if(e.request.mode === 'navigate') return caches.match('/app.html');
        });
      })
  );
});
