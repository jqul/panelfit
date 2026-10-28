import { describe, it, expect, vi, afterEach } from 'vitest'
// @ts-expect-error — función de Vercel en JavaScript, fuera de tsconfig
import handler, { construirIcs, escapar, plegar } from './calendario.js'

const TOKEN = 'a'.repeat(32)
const DATOS = {
  entrenador: 'Javi',
  citas: [{ id: 'c1', titulo: 'Sesión', inicio: '2026-10-29T16:00:00+00:00', fin: '2026-10-29T17:00:00+00:00' }],
  eventos: [{ id: 'e1', fecha: '2026-12-06', nombre: 'Media maratón, Valencia', prioridad: 'A' }],
  ausencias: [{ id: 'a1', desde: '2026-11-14', hasta: '2026-11-18', motivo: 'viaje' }],
  entreno: { dias: [0, 2], inicio: '2026-10-21', semanas: 4, programa: 'Fuerza; bloque 1' },
}

function llamar(url: string) {
  const res: any = { statusCode: 0, headers: {} as Record<string, string>, body: '',
    setHeader(k: string, v: string) { this.headers[k.toLowerCase()] = v }, end(b: string) { this.body = b } }
  return handler({ url, headers: {} }, res).then(() => res)
}

describe('formato iCal (RFC 5545)', () => {
  const ics = construirIcs(DATOS, new Date('2026-10-27T10:00:00Z'))
  const lineas = ics.split('\r\n')

  it('es un calendario con saltos de línea CRLF', () => {
    expect(lineas[0]).toBe('BEGIN:VCALENDAR')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n')
  })

  it('la sesión con el entrenador va con hora (UTC)', () => {
    expect(ics).toContain('DTSTART:20261029T160000Z')
    expect(ics).toContain('SUMMARY:Sesión con Javi')
  })

  it('fecha clave y ausencia son de día completo; la ausencia incluye su último día', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20261206')
    expect(ics).toContain('SUMMARY:🏁 Media maratón\\, Valencia')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261114')
    expect(ics).toContain('DTEND;VALUE=DATE:20261119')
    expect(ics).toContain('SUMMARY:Sin entrenar: Viaje')
  })

  it('los días de entreno se repiten cada semana hasta que acaba el plan', () => {
    // Plan del miércoles 21 oct, 4 semanas → hasta el martes 17 nov. Lunes: primero el 26; miércoles: el mismo 21.
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20261117')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261026')
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=WE;UNTIL=20261117')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261021')
    expect(ics).toContain('SUMMARY:Entreno · Fuerza\\; bloque 1')
  })

  it('sin plan ni días elegidos no inventa entrenos', () => {
    expect(construirIcs({ ...DATOS, entreno: null })).not.toContain('RRULE')
    expect(construirIcs({ ...DATOS, entreno: { ...DATOS.entreno, dias: [] } })).not.toContain('RRULE')
  })

  it('escapa y pliega líneas largas sin romper caracteres', () => {
    expect(escapar('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne')
    const larga = 'SUMMARY:' + 'ñ'.repeat(60)
    const plegada = plegar(larga)
    expect(plegada.split('\r\n ').every(p => new TextEncoder().encode(p).length <= 75)).toBe(true)
    expect(plegada.replace(/\r\n /g, '')).toBe(larga)
  })
})

describe('api/calendario', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  it('un token sin forma de token responde 400 sin consultar nada', async () => {
    const f = vi.fn(); vi.stubGlobal('fetch', f)
    for (const url of ['/api/calendario', '/api/calendario?t=abc', `/api/calendario?t=${'g'.repeat(32)}`, '/api/calendario?t=a%27or%201=1']) {
      expect((await llamar(url)).statusCode, url).toBe(400)
    }
    expect(f).not.toHaveBeenCalled()
  })

  it('sin configuración responde 503', async () => {
    vi.stubEnv('SUPABASE_URL', ''); vi.stubEnv('VITE_SUPABASE_URL', ''); vi.stubEnv('SUPABASE_ANON_KEY', ''); vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    expect((await llamar(`/api/calendario?t=${TOKEN}`)).statusCode).toBe(503)
  })

  it('pide los datos con la clave pública y devuelve el .ics; si el token no existe, 404', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon')
    const f = vi.fn(async () => ({ ok: true, json: async () => DATOS }))
    vi.stubGlobal('fetch', f)
    const r = await llamar(`/api/calendario?t=${TOKEN}`)
    expect(r.statusCode).toBe(200)
    expect(r.headers['content-type']).toContain('text/calendar')
    expect(r.headers['cache-control']).toContain('private')
    expect(r.body).toContain('BEGIN:VCALENDAR')
    const [url, opts] = f.mock.calls[0] as any
    expect(url).toBe('https://x.supabase.co/rest/v1/rpc/calendario_datos')
    expect(JSON.parse(opts.body)).toEqual({ p_token: TOKEN })

    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => null })))
    expect((await llamar(`/api/calendario?t=${TOKEN}`)).statusCode).toBe(404)
  })
})
