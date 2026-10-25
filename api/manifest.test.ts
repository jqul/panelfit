import { describe, it, expect } from 'vitest'
// @ts-expect-error — función de Vercel en JavaScript, fuera de tsconfig
import handler, { buildManifest } from './manifest.js'

const TOKEN = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'

function llamar(url: string, headers: Record<string, string> = { host: 'panelfit.app' }) {
  const res: any = { statusCode: 0, headers: {} as Record<string, string>, body: '',
    setHeader(k: string, v: string) { this.headers[k.toLowerCase()] = v }, end(b: string) { this.body = b } }
  handler({ url, headers }, res)
  return res
}

describe('manifiesto de la app instalada del cliente (api/manifest)', () => {
  it('arranca en el enlace del cliente y lleva todo con dirección absoluta del mismo sitio', () => {
    const r = llamar(`/api/manifest?c=${TOKEN}`)
    expect(r.statusCode).toBe(200)
    expect(r.headers['content-type']).toContain('application/manifest+json')
    const m = JSON.parse(r.body)
    expect(m.start_url).toBe(`https://panelfit.app/?c=${TOKEN}`)
    expect(m.scope).toBe('https://panelfit.app/')
    expect(m.display).toBe('standalone')
    expect(m.icons.every((i: { src: string }) => i.src.startsWith('https://panelfit.app/'))).toBe(true)
  })

  it('usa el sitio por el que llega la petición (vista previa de Vercel, dominio propio...)', () => {
    const m = JSON.parse(llamar(`/api/manifest?c=${TOKEN}`, { 'x-forwarded-host': 'panelfit-git-rama.vercel.app', 'x-forwarded-proto': 'https', host: 'interno' }).body)
    expect(m.start_url).toBe(`https://panelfit-git-rama.vercel.app/?c=${TOKEN}`)
  })

  it('sin token válido responde 400 y no refleja nada', () => {
    for (const url of ['/api/manifest', '/api/manifest?c=', '/api/manifest?c=corto', '/api/manifest?c="><script>', `/api/manifest?c=${'a'.repeat(200)}`, '/api/manifest?c=../../x1234567']) {
      const r = llamar(url)
      expect(r.statusCode, url).toBe(400)
      expect(r.body).toBe('Enlace no válido')
    }
  })

  it('no acepta un esquema raro ni una petición sin sitio', () => {
    expect(llamar(`/api/manifest?c=${TOKEN}`, { host: 'panelfit.app', 'x-forwarded-proto': 'javascript' }).statusCode).toBe(400)
    expect(llamar(`/api/manifest?c=${TOKEN}`, {}).statusCode).toBe(400)
  })

  it('buildManifest es el mismo que ve el cliente al instalar', () => {
    expect(buildManifest('https://x.app', TOKEN).start_url).toBe(`https://x.app/?c=${TOKEN}`)
  })
})
