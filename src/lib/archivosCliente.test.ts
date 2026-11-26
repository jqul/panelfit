import { beforeEach, describe, expect, it, vi } from 'vitest'

// Un «supabase» de pega: lo que contesta cada llamada lo decide cada prueba. Lo que se comprueba es el ORDEN y las consecuencias (qué se llama, qué se limpia si algo falla),
// porque ahí está la seguridad del flujo: reservar → subir → comprobar, y quitar lo que se queda a medias.
const m = vi.hoisted(() => ({
  rpc: vi.fn(), upload: vi.fn(), invoke: vi.fn(), createSignedUrl: vi.fn(),
  consulta: { resultado: { data: [] as unknown[], error: null as unknown, count: null as number | null }, llamadas: [] as string[] },
}))
vi.mock('./supabase', () => {
  const cadena = () => {
    const c: Record<string, unknown> = {}
    for (const metodo of ['select', 'eq', 'is', 'in', 'order']) c[metodo] = (...a: unknown[]) => { m.consulta.llamadas.push(`${metodo}:${a.map(String).join('/')}`); return c }
    c.then = (ok: (v: unknown) => unknown) => Promise.resolve(m.consulta.resultado).then(ok)
    return c
  }
  return { supabase: { rpc: m.rpc, from: () => cadena(), functions: { invoke: m.invoke }, storage: { from: () => ({ upload: m.upload, createSignedUrl: m.createSignedUrl }) } } }
})
vi.mock('./errors', () => ({ logError: vi.fn() }))

import { subirArchivo, descartarArchivo, archivosPendientes, archivosPorIds, urlDescarga, borrarArchivosDelCliente } from './archivosCliente'

const CTX = { templateId: 'tplA', questionId: 'rutina' }
const archivo = (nombre = 'rutina.pdf', size = 1000) => ({ name: nombre, size }) as File
const RESERVA = { ok: true, id: 'a0000000-0000-0000-0000-000000000001', ruta: 'c/a0000000-0000-0000-0000-000000000001.pdf', tipo: 'application/pdf', nombre: 'rutina.pdf' }
const REF = { id: RESERVA.id, nombre: 'rutina.pdf', tamano: 1000, tipo: 'application/pdf' }

beforeEach(() => {
  vi.clearAllMocks()
  m.consulta.resultado = { data: [], error: null, count: null }; m.consulta.llamadas = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
const acciones = () => m.invoke.mock.calls.map(c => (c[1] as { body: { accion: string } }).body.accion)

describe('subirArchivo', () => {
  it('camino feliz: reserva, sube con el tipo que fijó el servidor y comprueba (en ese orden)', async () => {
    m.rpc.mockResolvedValue({ data: RESERVA, error: null })
    m.upload.mockResolvedValue({ error: null })
    m.invoke.mockResolvedValue({ data: { ok: true, archivo: REF }, error: null })
    const fases: string[] = []
    const r = await subirArchivo(CTX, archivo(), f => fases.push(f))
    expect(r).toEqual({ ok: true, archivo: REF })
    expect(m.rpc).toHaveBeenCalledWith('archivo_reservar', { p_template_id: 'tplA', p_question_id: 'rutina', p_nombre: 'rutina.pdf', p_tamano: 1000 })
    expect(m.upload).toHaveBeenCalledWith(RESERVA.ruta, expect.any(Blob), { contentType: 'application/pdf', upsert: false })
    expect(acciones()).toEqual(['verificar'])
    expect(fases).toEqual(['preparando', 'subiendo', 'comprobando'])
  })
  it('el depósito recibe el tipo que fijó el servidor, no el que diga el navegador (un .heic sin tipo, un .csv como ms-excel)', async () => {
    m.rpc.mockResolvedValue({ data: { ...RESERVA, ruta: 'c/x.heic', tipo: 'image/heic' }, error: null })
    m.upload.mockResolvedValue({ error: null })
    m.invoke.mockResolvedValue({ data: { ok: true, archivo: REF }, error: null })
    const heic = new File([new Uint8Array(10)], 'foto.heic', { type: '' })
    expect(heic.type).toBe('')
    await subirArchivo(CTX, heic)
    expect((m.upload.mock.calls[0][1] as Blob).type).toBe('image/heic')
    expect(m.upload.mock.calls[0][2]).toMatchObject({ contentType: 'image/heic' })
  })
  it('un tipo que no se admite ni siquiera llega al servidor', async () => {
    const r = await subirArchivo(CTX, archivo('virus.exe'))
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/no se admite/) })
    expect(m.rpc).not.toHaveBeenCalled(); expect(m.upload).not.toHaveBeenCalled()
  })
  it.each([['limite_pregunta', /5 archivos/], ['limite_cliente', /demasiados/], ['archivado', /archivada/], ['pregunta', /No se pudo preparar/]])('si el servidor no reserva (%s): mensaje claro y no se sube nada', async (codigo, esperado) => {
    m.rpc.mockResolvedValue({ data: { ok: false, codigo }, error: null })
    const r = await subirArchivo(CTX, archivo())
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(esperado) })
    expect(m.upload).not.toHaveBeenCalled(); expect(m.invoke).not.toHaveBeenCalled()
  })
  it('si falla la subida, se quita la reserva (no se queda nada a medias)', async () => {
    m.rpc.mockResolvedValue({ data: RESERVA, error: null })
    m.upload.mockResolvedValue({ error: { message: 'red caída' } })
    m.invoke.mockResolvedValue({ data: { ok: true }, error: null })
    const r = await subirArchivo(CTX, archivo())
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/conexión/) })
    expect(acciones()).toEqual(['descartar'])
    expect(m.invoke.mock.calls[0][1]).toEqual({ body: { accion: 'descartar', id: RESERVA.id } })
  })
  it('si el servidor dice que el archivo no vale, enseña su motivo y NO intenta quitarlo (la función ya lo borró)', async () => {
    m.rpc.mockResolvedValue({ data: RESERVA, error: null })
    m.upload.mockResolvedValue({ error: null })
    m.invoke.mockResolvedValue({ data: { ok: false, codigo: 'contenido', motivo: 'El archivo no es realmente un PDF' }, error: null })
    const r = await subirArchivo(CTX, archivo())
    expect(r).toEqual({ ok: false, error: 'El archivo no es realmente un PDF' })
    expect(acciones()).toEqual(['verificar'])
  })
  it('si la comprobación falla por otra causa (red, función caída), se quita lo subido y se avisa', async () => {
    m.rpc.mockResolvedValue({ data: RESERVA, error: null })
    m.upload.mockResolvedValue({ error: null })
    m.invoke.mockResolvedValueOnce({ data: null, error: { message: 'boom' } }).mockResolvedValueOnce({ data: { ok: true }, error: null })
    const r = await subirArchivo(CTX, archivo())
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/No se pudo comprobar/) })
    expect(acciones()).toEqual(['verificar', 'descartar'])
  })
  it('un error de red al reservar: mensaje genérico y nada más', async () => {
    m.rpc.mockResolvedValue({ data: null, error: { message: 'x', code: '500' } })
    expect(await subirArchivo(CTX, archivo())).toMatchObject({ ok: false, error: expect.stringMatching(/No se pudo preparar/) })
    expect(m.upload).not.toHaveBeenCalled()
  })
})

describe('descartar y pendientes', () => {
  it('descartarArchivo llama a la función y devuelve si salió bien', async () => {
    m.invoke.mockResolvedValue({ data: { ok: true, borrado: true }, error: null })
    expect(await descartarArchivo(RESERVA.id)).toBe(true)
    m.invoke.mockResolvedValue({ data: null, error: { message: 'x' } })
    expect(await descartarArchivo(RESERVA.id)).toBe(false)
  })
  it('archivosPendientes pide solo los verificados y sin enviar de esa pregunta; null si no se pudo', async () => {
    m.consulta.resultado = { data: [REF], error: null, count: null }
    expect(await archivosPendientes(CTX)).toEqual([REF])
    expect(m.consulta.llamadas).toEqual(expect.arrayContaining(['eq:template_id/tplA', 'eq:question_id/rutina', 'eq:estado/verificado', 'is:response_id/null']))
    m.consulta.resultado = { data: [], error: { message: 'x' }, count: null }
    expect(await archivosPendientes(CTX)).toBeNull()
  })
})

describe('lado del entrenador', () => {
  it('archivosPorIds: sin ids no consulta; con ids devuelve las filas; ante un error, nada', async () => {
    expect(await archivosPorIds([])).toEqual([]); expect(m.consulta.llamadas).toEqual([])
    m.consulta.resultado = { data: [{ ...REF, ruta: 'c/x.pdf', estado: 'enviado' }], error: null, count: null }
    expect(await archivosPorIds([REF.id])).toHaveLength(1)
    m.consulta.resultado = { data: [], error: { message: 'x' }, count: null }
    expect(await archivosPorIds([REF.id])).toEqual([])
  })
  it('urlDescarga: enlace de 5 minutos que fuerza la descarga con el nombre original; null si falla', async () => {
    m.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://x/firmada' }, error: null })
    expect(await urlDescarga('c/x.pdf', 'rutina.pdf')).toBe('https://x/firmada')
    expect(m.createSignedUrl).toHaveBeenCalledWith('c/x.pdf', 300, { download: 'rutina.pdf' })
    m.createSignedUrl.mockResolvedValue({ data: null, error: { message: 'no' } })
    expect(await urlDescarga('c/x.pdf', 'rutina.pdf')).toBeNull()
  })
})

describe('borrarArchivosDelCliente (RGPD)', () => {
  it('un cliente sin archivos: no depende de la función de borde', async () => {
    m.consulta.resultado = { data: [], error: null, count: 0 }
    expect(await borrarArchivosDelCliente('c1')).toEqual({ ok: true, borrados: 0 })
    expect(m.invoke).not.toHaveBeenCalled()
  })
  it('con archivos: los borra la función de borde', async () => {
    m.consulta.resultado = { data: [], error: null, count: 3 }
    m.invoke.mockResolvedValue({ data: { ok: true, borrados: 3 }, error: null })
    expect(await borrarArchivosDelCliente('c1')).toEqual({ ok: true, borrados: 3 })
    expect(m.invoke.mock.calls[0][1]).toEqual({ body: { accion: 'borrar-cliente', client_id: 'c1' } })
  })
  it('si la función falla, error: quien llama NO debe seguir con el borrado de datos', async () => {
    m.consulta.resultado = { data: [], error: null, count: 3 }
    m.invoke.mockResolvedValue({ data: null, error: { message: 'x' } })
    expect(await borrarArchivosDelCliente('c1')).toMatchObject({ ok: false, error: expect.stringMatching(/archivos de sus cuestionarios/) })
  })
  it('si no se pudo saber cuántos hay (error de consulta), por precaución llama a la función', async () => {
    m.consulta.resultado = { data: [], error: { message: 'x', code: '500' }, count: null }
    m.invoke.mockResolvedValue({ data: { ok: true, borrados: 0 }, error: null })
    expect((await borrarArchivosDelCliente('c1')).ok).toBe(true)
    expect(m.invoke).toHaveBeenCalledTimes(1)
  })
  it('si la tabla aún no existe (app desplegada antes que la migración), el borrado de clientes no se bloquea', async () => {
    for (const code of ['42P01', 'PGRST205']) {
      m.invoke.mockClear()
      m.consulta.resultado = { data: [], error: { message: 'no existe', code }, count: null }
      expect(await borrarArchivosDelCliente('c1')).toEqual({ ok: true, borrados: 0 })
      expect(m.invoke).not.toHaveBeenCalled()
    }
  })
})
