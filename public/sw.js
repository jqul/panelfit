// Service worker de PanelFit: sirve para abrir la app sin conexión (entrenar en un
// sótano de gimnasio) y para las notificaciones push. Es deliberadamente pequeño.
//
// Qué se guarda en el dispositivo:
//   - el esqueleto de la app (index.html), con UNA sola clave, nunca la URL visitada
//   - los ficheros con hash de Vite (/assets/*): son inmutables, así que se sirven de la caché
//   - unos pocos ficheros estáticos conocidos (iconos, manifest, descripciones de ejercicios)
// Qué NO se guarda nunca: cualquier otra ruta del mismo origen, ni peticiones a Supabase
// (otro origen), ni nada que no sea GET. Antes se guardaba cualquier GET del mismo origen y
// la clave de la caché era la URL completa, así que los enlaces de cliente (/?c=<token>)
// quedaban guardados en el dispositivo y no se borraban al cerrar sesión. Los datos de salud
// offline viven en localStorage (lib/deviceStorage.ts), que sí caduca y se borra al salir.
const SHELL = 'panelfit-shell-v4'
const ASSETS = 'panelfit-assets-v4'
const STATIC = 'panelfit-static-v4'
const KEEP = [SHELL, ASSETS, STATIC]
const SHELL_KEY = '/index.html'
const MAX_ASSETS = 150
const STATIC_FILES = ['/exercise-descriptions.json', '/manifest.json']

const isStaticFile = path => STATIC_FILES.includes(path) || /^\/(icon-[\w-]+|apple-touch-icon)\.png$/.test(path)
const isHtml = res => res.ok && res.type !== 'opaque' && (res.headers.get('content-type') || '').includes('text/html')
const isCacheable = res => res.ok && res.type === 'basic'

function classify(request, url) {
  if (request.method !== 'GET' || url.origin !== self.location.origin) return 'bypass'
  if (request.mode === 'navigate') return 'shell'
  if (url.pathname.startsWith('/assets/')) return 'asset'
  if (isStaticFile(url.pathname)) return 'static'
  return 'bypass'
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    try {
      // Esqueleto + los ficheros con hash que usa, para que la primera visita ya funcione sin conexión.
      const res = await fetch(SHELL_KEY, { cache: 'reload' })
      if (isHtml(res)) {
        const html = await res.clone().text()
        await (await caches.open(SHELL)).put(SHELL_KEY, res)
        const assets = await caches.open(ASSETS)
        const urls = [...new Set(html.match(/\/assets\/[^"'\s)<>]+/g) || [])]
        await Promise.all(urls.map(u => assets.add(u).catch(() => {})))
      }
    } catch {
      // Sin conexión al instalar: se rellena sola con el uso.
    }
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', e => {
  // Borra las cachés de versiones anteriores (la v3 guardaba URLs con el token del cliente).
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => !KEEP.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

async function pruneAssets(cache) {
  const keys = await cache.keys()
  if (keys.length > MAX_ASSETS) await Promise.all(keys.slice(0, keys.length - MAX_ASSETS).map(k => cache.delete(k)))
}

// Navegación: red primero; sin red, el esqueleto guardado (la app decide qué pintar por la URL).
async function shell(e) {
  try {
    const res = await fetch(e.request)
    if (isHtml(res)) e.waitUntil(caches.open(SHELL).then(c => c.put(SHELL_KEY, res.clone())).catch(() => {}))
    return res
  } catch {
    return (await (await caches.open(SHELL)).match(SHELL_KEY)) || Response.error()
  }
}

// Ficheros con hash: caché primero. Solo se guardan respuestas correctas (un 404 de un chunk
// antiguo tras un despliegue no debe quedarse guardado).
async function asset(e) {
  const cache = await caches.open(ASSETS)
  const hit = await cache.match(e.request)
  if (hit) return hit
  const res = await fetch(e.request)
  if (isCacheable(res)) e.waitUntil(cache.put(e.request, res.clone()).then(() => pruneAssets(cache)).catch(() => {}))
  return res
}

async function staticFile(e) {
  const cache = await caches.open(STATIC)
  try {
    const res = await fetch(e.request)
    if (isCacheable(res)) e.waitUntil(cache.put(e.request, res.clone()).catch(() => {}))
    return res
  } catch {
    return (await cache.match(e.request)) || Response.error()
  }
}

self.addEventListener('fetch', e => {
  const kind = classify(e.request, new URL(e.request.url))
  if (kind === 'bypass') return // sin respondWith: el navegador la trata como si no hubiera service worker
  e.respondWith(kind === 'shell' ? shell(e) : kind === 'asset' ? asset(e) : staticFile(e))
})

self.addEventListener('push', e => {
  let data = {}
  try { data = e.data ? e.data.json() : {} } catch {}
  const title = data.title || 'PanelFit'
  const options = {
    body: data.body || '',
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    data: { url: data.url || '/' },
  }
  e.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  // Solo rutas internas relativas — nunca abrir una URL externa aunque la
  // notificación la lleve (segunda capa; send-push ya la restringe también).
  const raw = e.notification.data?.url
  const url = (typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//')) ? raw : '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clientsArr => {
      const existing = clientsArr.find(c => c.url.includes(url))
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    })
  )
})
