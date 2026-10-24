import { describe, it, expect } from 'vitest'
// El service worker real (public/sw.js), cargado como texto y ejecutado contra un
// entorno falso: así se prueba el fichero que se despliega, no una copia.
import swSource from '../../public/sw.js?raw'

const ORIGIN = 'https://app.test'
const abs = (k: string | { url: string }) => new URL(typeof k === 'string' ? k : k.url, ORIGIN).href

class FakeCache {
  store = new Map<string, Response>()
  async put(k: string | { url: string }, res: Response) { this.store.set(abs(k), res) }
  async match(k: string | { url: string }) { return this.store.get(abs(k))?.clone() }
  async add(k: string) {
    const res = await (globalThis as any).__fetch(abs(k))
    if (!res.ok) throw new Error('no ok')
    this.store.set(abs(k), res)
  }
  async keys() { return [...this.store.keys()].map(url => ({ url })) }
  async delete(k: string | { url: string }) { return this.store.delete(abs(k)) }
}

function setup(routes: Record<string, () => Response>, online = true) {
  const listeners: Record<string, (e: any) => void> = {}
  const caches = new Map<string, FakeCache>()
  const cacheStorage = {
    open: async (n: string) => { if (!caches.has(n)) caches.set(n, new FakeCache()); return caches.get(n)! },
    keys: async () => [...caches.keys()],
    delete: async (n: string) => caches.delete(n),
  }
  const calls: string[] = []
  let isOnline = online
  const fakeFetch = async (r: string | { url: string }) => {
    const url = abs(r); calls.push(url)
    if (!isOnline) throw new TypeError('offline')
    const key = new URL(url).pathname
    const handler = routes[key]
    const res = handler ? handler() : new Response('no encontrado', { status: 404 })
    // Una respuesta real del mismo origen es de tipo "basic" (un Response construido a mano no lo es).
    Object.defineProperty(res, 'type', { value: 'basic' })
    return res
  }
  ;(globalThis as any).__fetch = fakeFetch
  const self = { location: new URL(ORIGIN), addEventListener: (t: string, f: any) => { listeners[t] = f }, skipWaiting: async () => {}, clients: { claim: async () => {} } }
  new Function('self', 'caches', 'fetch', 'Response', 'URL', swSource)(self, cacheStorage, fakeFetch, Response, URL)

  const fetchEvent = async (request: { url: string; method?: string; mode?: string }) => {
    const waits: Promise<unknown>[] = []
    const out: { p: Promise<Response> | null } = { p: null }
    listeners.fetch({
      // El navegador entrega siempre la URL absoluta.
      request: { method: 'GET', mode: 'same-origin', ...request, url: abs(request.url) },
      respondWith: (p: Promise<Response>) => { out.p = Promise.resolve(p) },
      waitUntil: (p: Promise<unknown>) => { waits.push(p) },
    })
    const response = out.p ? await out.p : null
    await Promise.all(waits)
    return { handled: out.p !== null, response }
  }
  const lifecycle = async (type: 'install' | 'activate') => {
    const waits: Promise<unknown>[] = []
    listeners[type]({ waitUntil: (p: Promise<unknown>) => waits.push(p) })
    await Promise.all(waits)
  }
  return { fetchEvent, lifecycle, caches, calls, setOnline: (v: boolean) => { isOnline = v } }
}

const html = (body = '<script type="module" src="/assets/index-abc123.js"></script><link href="/assets/index-def456.css">') =>
  () => new Response(`<html>${body}</html>`, { status: 200, headers: { 'content-type': 'text/html' } })
const js = () => new Response('console.log(1)', { status: 200, headers: { 'content-type': 'text/javascript' } })

const todasLasClaves = (caches: Map<string, FakeCache>) => [...caches.values()].flatMap(c => [...c.store.keys()])

describe('service worker', () => {
  it('una navegación con el token del cliente no deja el token en ninguna caché', async () => {
    const sw = setup({ '/': html() })
    const r = await sw.fetchEvent({ url: '/?c=SECRETO123', mode: 'navigate' })
    expect(r.handled).toBe(true)
    expect(r.response!.ok).toBe(true)
    const claves = todasLasClaves(sw.caches)
    expect(claves).toEqual([`${ORIGIN}/index.html`])
    expect(claves.join(' ')).not.toContain('SECRETO123')
  })

  it('las rutas de la página pública con referencia tampoco guardan la URL', async () => {
    const sw = setup({ '/p/mi-slug': html() })
    await sw.fetchEvent({ url: '/p/mi-slug?ref=abc', mode: 'navigate' })
    expect(todasLasClaves(sw.caches).join(' ')).not.toMatch(/mi-slug|ref=/)
  })

  it('sin conexión, cualquier navegación recibe el esqueleto guardado', async () => {
    const sw = setup({ '/': html('<p>esqueleto</p>') })
    await sw.fetchEvent({ url: '/', mode: 'navigate' })
    sw.setOnline(false)
    const r = await sw.fetchEvent({ url: '/?c=OTRO', mode: 'navigate' })
    expect(await r.response!.text()).toContain('esqueleto')
  })

  it('no guarda como esqueleto una respuesta que no es HTML ni una que falla', async () => {
    const sw = setup({ '/sitemap.xml': () => new Response('<xml/>', { headers: { 'content-type': 'text/xml' } }), '/roto': () => new Response('x', { status: 500, headers: { 'content-type': 'text/html' } }) })
    await sw.fetchEvent({ url: '/sitemap.xml', mode: 'navigate' })
    await sw.fetchEvent({ url: '/roto', mode: 'navigate' })
    expect(todasLasClaves(sw.caches)).toEqual([])
  })

  it('los ficheros con hash se sirven de la caché la segunda vez', async () => {
    const sw = setup({ '/assets/Chart-abc.js': js })
    await sw.fetchEvent({ url: '/assets/Chart-abc.js' })
    const antes = sw.calls.length
    const r = await sw.fetchEvent({ url: '/assets/Chart-abc.js' })
    expect(r.handled).toBe(true)
    expect(await r.response!.text()).toBe('console.log(1)')
    expect(sw.calls.length).toBe(antes) // no volvió a la red
  })

  it('las tipografías del propio dominio se guardan y se sirven de la caché', async () => {
    const sw = setup({ '/fonts/outfit-latin-variable.woff2': () => new Response('fuente', { headers: { 'content-type': 'font/woff2' } }) })
    await sw.fetchEvent({ url: '/fonts/outfit-latin-variable.woff2' })
    const antes = sw.calls.length
    const r = await sw.fetchEvent({ url: '/fonts/outfit-latin-variable.woff2' })
    expect(await r.response!.text()).toBe('fuente')
    expect(sw.calls.length).toBe(antes)
  })

  it('un fichero con hash que da 404 no se guarda', async () => {
    const sw = setup({})
    const r = await sw.fetchEvent({ url: '/assets/viejo-xyz.js' })
    expect(r.response!.status).toBe(404)
    expect(todasLasClaves(sw.caches)).toEqual([])
  })

  it('el resto de rutas del mismo origen, otros orígenes y lo que no es GET pasan sin tocarse', async () => {
    const sw = setup({ '/api/datos': js, '/_vercel/insights/script.js': js })
    for (const req of [
      { url: '/api/datos' }, { url: '/_vercel/insights/script.js' }, { url: '/sitemap.xml' },
      { url: 'https://thurxdxazqqxuzbupghv.supabase.co/rest/v1/registros?select=*' },
      { url: '/assets/x-1.js', method: 'POST' },
    ]) {
      const r = await sw.fetchEvent(req)
      expect(r.handled, req.url).toBe(false)
    }
    expect(todasLasClaves(sw.caches)).toEqual([])
  })

  it('los ficheros estáticos conocidos se guardan y sirven sin conexión', async () => {
    const sw = setup({ '/exercise-descriptions.json': () => new Response('{"a":1}', { headers: { 'content-type': 'application/json' } }) })
    await sw.fetchEvent({ url: '/exercise-descriptions.json' })
    sw.setOnline(false)
    const r = await sw.fetchEvent({ url: '/exercise-descriptions.json' })
    expect(await r.response!.text()).toBe('{"a":1}')
  })

  it('al instalar guarda el esqueleto y los ficheros con hash que usa', async () => {
    const sw = setup({ '/index.html': html(), '/assets/index-abc123.js': js, '/assets/index-def456.css': () => new Response('a{}', { headers: { 'content-type': 'text/css' } }) })
    await sw.lifecycle('install')
    expect(todasLasClaves(sw.caches).sort()).toEqual([`${ORIGIN}/assets/index-abc123.js`, `${ORIGIN}/assets/index-def456.css`, `${ORIGIN}/index.html`])
  })

  it('al activar borra las cachés de la versión anterior (la v3 guardaba URLs con token)', async () => {
    const sw = setup({})
    const v3 = new FakeCache(); v3.store.set(`${ORIGIN}/?c=SECRETO`, new Response('x'))
    sw.caches.set('panelfit-v3', v3)
    await sw.lifecycle('activate')
    expect([...sw.caches.keys()]).not.toContain('panelfit-v3')
  })

  it('limita la caché de ficheros con hash: borra los más antiguos', async () => {
    const rutas: Record<string, () => Response> = {}
    for (let i = 0; i < 160; i++) rutas[`/assets/f${i}-h.js`] = js
    const sw = setup(rutas)
    for (let i = 0; i < 160; i++) await sw.fetchEvent({ url: `/assets/f${i}-h.js` })
    const claves = todasLasClaves(sw.caches)
    expect(claves.length).toBe(150)
    expect(claves).not.toContain(`${ORIGIN}/assets/f0-h.js`)
    expect(claves).toContain(`${ORIGIN}/assets/f159-h.js`)
  })
})
