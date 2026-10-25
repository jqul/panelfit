import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isPlausibleToken, tokenAtStart, rememberClientLink, recalledClientLink, forgetClientLink } from './clientLink'

const TOKEN = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'

// vitest corre sin navegador: un localStorage mínimo en memoria
function fakeStorage() {
  const m = new Map<string, string>()
  ;(globalThis as any).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, removeItem: (k: string) => { m.delete(k) } }
}

describe('acceso directo del cliente', () => {
  beforeEach(fakeStorage)

  it('solo acepta tokens con forma de token (nada raro puede colarse en una dirección)', () => {
    expect(isPlausibleToken(TOKEN)).toBe(true)
    expect(isPlausibleToken('demo-maria-001')).toBe(true)
    for (const mal of ['', 'corto', 'con espacios 1234567', '"><script>alert(1)</script>', '../../etc/passwd', 'a'.repeat(200), null, undefined, 42]) expect(isPlausibleToken(mal)).toBe(false)
  })

  it('recuerda el enlace, lo recupera y lo olvida; un token raro no se guarda', () => {
    expect(recalledClientLink()).toBeNull()
    rememberClientLink(TOKEN)
    expect(recalledClientLink()).toBe(TOKEN)
    rememberClientLink('mal token!!')
    expect(recalledClientLink()).toBe(TOKEN)
    forgetClientLink('otro-token-distinto-123')
    expect(recalledClientLink()).toBe(TOKEN) // no borra el de otro
    forgetClientLink(TOKEN)
    expect(recalledClientLink()).toBeNull()
    rememberClientLink(TOKEN); forgetClientLink()
    expect(recalledClientLink()).toBeNull()
  })

  it('un valor corrupto en el almacenamiento se ignora', () => {
    ;(globalThis as any).localStorage.setItem('pf_client_link', '<b>raro</b>')
    expect(recalledClientLink()).toBeNull()
  })

  it('el enlace de la dirección manda siempre', () => {
    expect(tokenAtStart({ pathname: '/', search: `?c=${TOKEN}`, standalone: false, recalled: null })).toBe(TOKEN)
    expect(tokenAtStart({ pathname: '/', search: `?c=${TOKEN}`, standalone: true, recalled: 'otro-token-guardado-1' })).toBe(TOKEN)
  })

  it('la app instalada que arranca en la raíz recupera el enlace recordado', () => {
    expect(tokenAtStart({ pathname: '/', search: '', standalone: true, recalled: TOKEN })).toBe(TOKEN)
  })

  it('en el navegador normal, en otra ruta o sin nada recordado no se hace nada', () => {
    expect(tokenAtStart({ pathname: '/', search: '', standalone: false, recalled: TOKEN })).toBeNull() // un entrenador en el móvil no queda atrapado
    expect(tokenAtStart({ pathname: '/blog', search: '', standalone: true, recalled: TOKEN })).toBeNull()
    expect(tokenAtStart({ pathname: '/', search: '', standalone: true, recalled: null })).toBeNull()
    expect(tokenAtStart({ pathname: '/', search: '', standalone: true, recalled: '<x>' })).toBeNull()
  })

  it('la regla de forma de token es la misma en la página, en la app y en la función del servidor', () => {
    const regla = "[A-Za-z0-9_-]{8,128}"
    const leer = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')
    for (const f of ['index.html', 'api/manifest.js', 'src/lib/clientLink.ts']) expect(leer(f), f).toContain(regla)
  })

  it('index.html pone el manifiesto del cliente desde el primer momento (iOS lo lee al cargar, no después)', () => {
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8')
    expect(html).toContain("'/api/manifest?c=' + c")
    expect(html).toContain("var href = '/manifest.json'")
    expect(html).not.toMatch(/<link rel="manifest"/) // ya no hay un enlace fijo que el navegador lea antes
  })
})
