// PanelFit Service Worker — Offline support
const CACHE = 'panelfit-v1';

// Recursos que se cachean al instalar
const PRECACHE = [
  '/app.html',
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Instalar: precachear recursos clave
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(cache){
      // Solo cachear app.html — las fuentes y librerías pueden fallar sin CORS
      return cache.add('/app.html').catch(function(){});
    })
  );
  self.skipWaiting();
});

// Activar: limpiar caches antiguos
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

// Fetch: Network first, cache fallback
self.addEventListener('fetch', function(e){
  // Solo interceptar GET
  if(e.request.method !== 'GET') return;

  // No interceptar peticiones a Supabase (datos en tiempo real)
  if(e.request.url.includes('supabase.co')) return;

  e.respondWith(
    fetch(e.request)
      .then(function(response){
        // Cachear respuesta fresca si es válida
        if(response && response.status === 200 && response.type !== 'opaque'){
          var clone = response.clone();
          caches.open(CACHE).then(function(cache){
            cache.put(e.request, clone);
          });
        }
        return response;
      })
      .catch(function(){
        // Sin red — servir desde cache
        return caches.match(e.request).then(function(cached){
          if(cached) return cached;
          // Fallback: app.html para rutas de navegación
          if(e.request.mode === 'navigate'){
            return caches.match('/app.html');
          }
        });
      })
  );
});
