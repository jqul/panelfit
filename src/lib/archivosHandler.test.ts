import { describe, expect, it } from 'vitest'
import { manejar, type Deps, type Fila } from '../../supabase/functions/archivos-cliente/handler'
import { limpiar, igual, type Deps as DepsLimpieza } from '../../supabase/functions/archivos-limpieza/limpieza'

// Un «Supabase» en memoria: la tabla de archivos, el depósito (ruta → bytes) y quién puede gestionar a quién. Las funciones corren con la clave de servicio (se saltan RLS),
// así que lo que se prueba aquí es que cada acción comprueba por sí misma quién llama.
const enc = (s: string) => new TextEncoder().encode(s)
const PDF = enc('%PDF-1.4\n1 0 obj <<>> endobj\n%%EOF\n')
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...enc('IEND'), 0, 0, 0, 0])

const ANA = 'ccccccc1-0000-0000-0000-000000000001' // uid de la sesión de la clienta Ana
const BETO = 'ccccccc2-0000-0000-0000-000000000002'
const ENTRENADOR = 'aaaaaaa1-0000-0000-0000-000000000001'
const C_ANA = '11111111-0000-0000-0000-00000000000a', C_BETO = '11111111-0000-0000-0000-00000000000b'
const ID1 = 'a0000000-0000-0000-0000-000000000001', ID2 = 'a0000000-0000-0000-0000-000000000002', ID_BETO = 'b0000000-0000-0000-0000-000000000001'

function mundo(opciones: { fallaBorrar?: boolean } = {}) {
  const filas = new Map<string, Fila & { motivo?: string }>()
  const deposito = new Map<string, Uint8Array>()
  const llamadas: string[] = []
  const alta = (f: Partial<Fila> & { id: string; client_id: string }, bytes?: Uint8Array) => {
    const fila = { ruta: `${f.client_id}/${f.id}.pdf`, nombre: 'rutina.pdf', ext: 'pdf', tipo: 'application/pdf', tamano: 1000, estado: 'reservado', response_id: null, ...f }
    filas.set(fila.id, fila)
    if (bytes) deposito.set(fila.ruta, bytes)
    return fila
  }
  const deps: Deps = {
    usuario: async jwt => ({ 'jwt-ana': ANA, 'jwt-beto': BETO, 'jwt-entrenador': ENTRENADOR } as Record<string, string>)[jwt] ?? null,
    clienteDe: async uid => ({ [ANA]: C_ANA, [BETO]: C_BETO } as Record<string, string>)[uid] ?? null,
    puedeGestionar: async (jwt, clientId) => jwt === 'jwt-entrenador' && clientId === C_ANA,
    fila: async id => filas.get(id) ?? null,
    filasDeCliente: async clientId => [...filas.values()].filter(f => f.client_id === clientId).map(f => ({ ruta: f.ruta })),
    marcarVerificado: async (id, tamano, tipo) => { const f = filas.get(id); if (!f || f.estado !== 'reservado') return false; Object.assign(f, { estado: 'verificado', tamano, tipo }); return true },
    marcarRechazado: async (id, motivo) => { const f = filas.get(id); if (!f || f.estado !== 'reservado') return false; Object.assign(f, { estado: 'rechazado', motivo }); return true },
    marcarBorrando: async id => { const f = filas.get(id); if (!f || !['reservado', 'verificado', 'rechazado'].includes(f.estado) || f.response_id) return false; f.estado = 'borrando'; return true },
    borrarFila: async (id, estado) => { if (filas.get(id)?.estado === estado) filas.delete(id) },
    descargar: async ruta => deposito.get(ruta) ?? null,
    borrar: async rutas => { llamadas.push(`borrar:${rutas.join(',')}`); if (opciones.fallaBorrar) return false; rutas.forEach(r => deposito.delete(r)); return true },
    listarCarpeta: async clientId => [...deposito.keys()].filter(r => r.startsWith(`${clientId}/`)),
  }
  return { filas, deposito, llamadas, alta, deps }
}
const llama = (d: Deps, jwt: string, cuerpo: unknown, metodo = 'POST') => manejar({ metodo, jwt, cuerpo }, d)

describe('autenticación y petición', () => {
  it('sin sesión o con un token que no vale: 401 y no se toca nada', async () => {
    const m = mundo(); m.alta({ id: ID1, client_id: C_ANA }, PDF)
    for (const jwt of ['', 'token-falso']) expect((await llama(m.deps, jwt, { accion: 'verificar', id: ID1 })).status).toBe(401)
    expect(m.filas.get(ID1)!.estado).toBe('reservado')
  })
  it('solo POST, y una acción desconocida es un error', async () => {
    const m = mundo()
    expect((await llama(m.deps, 'jwt-ana', { accion: 'verificar', id: ID1 }, 'GET')).status).toBe(405)
    expect((await llama(m.deps, 'jwt-ana', { accion: 'otra' })).status).toBe(400)
    expect((await llama(m.deps, 'jwt-ana', null)).status).toBe(400)
  })
})

describe('verificar', () => {
  it('un PDF válido pasa a «verificado» con su tamaño real y su tipo', async () => {
    const m = mundo(); m.alta({ id: ID1, client_id: C_ANA, tamano: 5 }, PDF)
    const r = await llama(m.deps, 'jwt-ana', { accion: 'verificar', id: ID1 })
    expect(r).toMatchObject({ status: 200, cuerpo: { ok: true, archivo: { id: ID1, nombre: 'rutina.pdf', tamano: PDF.length, tipo: 'application/pdf' } } })
    expect(m.filas.get(ID1)).toMatchObject({ estado: 'verificado', tamano: PDF.length })
  })
  it('un archivo que no es lo que dice (una imagen con extensión pdf) se rechaza: se borra el objeto y la fila', async () => {
    const m = mundo(); m.alta({ id: ID1, client_id: C_ANA }, PNG)
    const r = await llama(m.deps, 'jwt-ana', { accion: 'verificar', id: ID1 })
    expect(r.status).toBe(200)
    expect(r.cuerpo).toMatchObject({ ok: false, codigo: 'contenido' })
    expect(String(r.cuerpo.motivo)).toContain('PDF')
    expect(m.deposito.size).toBe(0)
    expect(m.filas.has(ID1)).toBe(false)
  })
  it('la extensión que se mira es la que fijó el servidor, no el nombre que dé el cliente', async () => {
    const m = mundo(); m.alta({ id: ID1, client_id: C_ANA, nombre: 'foto.png', ext: 'pdf' }, PNG)
    expect((await llama(m.deps, 'jwt-ana', { accion: 'verificar', id: ID1 })).cuerpo).toMatchObject({ ok: false, codigo: 'contenido' })
  })
  it('si Storage falla al borrar lo rechazado, la fila queda «rechazada» (la limpieza diaria lo reintenta) y nunca «verificada»', async () => {
    const m = mundo({ fallaBorrar: true }); m.alta({ id: ID1, client_id: C_ANA }, PNG)
    const r = await llama(m.deps, 'jwt-ana', { accion: 'verificar', id: ID1 })
    expect(r.cuerpo.ok).toBe(false)
    expect(m.filas.get(ID1)!.estado).toBe('rechazado')
  })
  it('el archivo de OTRO cliente: 404 (no se revela que existe) y no se descarga ni se toca', async () => {
    const m = mundo(); m.alta({ id: ID_BETO, client_id: C_BETO }, PDF)
    const r = await llama(m.deps, 'jwt-ana', { accion: 'verificar', id: ID_BETO })
    expect(r.status).toBe(404)
    expect(m.filas.get(ID_BETO)!.estado).toBe('reservado')
    expect(m.llamadas).toEqual([])
  })
  it('un entrenador (que no es el cliente) no puede verificar los archivos de su cliente', async () => {
    const m = mundo(); m.alta({ id: ID1, client_id: C_ANA }, PDF)
    expect((await llama(m.deps, 'jwt-entrenador', { accion: 'verificar', id: ID1 })).status).toBe(404)
  })
  it('un id mal formado o que no existe: 404', async () => {
    const m = mundo()
    for (const id of ['no-es-uuid', '', null, 5, ID2]) expect((await llama(m.deps, 'jwt-ana', { accion: 'verificar', id })).status).toBe(404)
  })
  it('sin haber subido el objeto: 409 y la fila sigue reservada', async () => {
    const m = mundo(); m.alta({ id: ID1, client_id: C_ANA })
    expect(await llama(m.deps, 'jwt-ana', { accion: 'verificar', id: ID1 })).toMatchObject({ status: 409, cuerpo: { codigo: 'no_subido' } })
    expect(m.filas.get(ID1)!.estado).toBe('reservado')
  })
  it('ya verificado (un reintento tras un corte): responde bien sin volver a leer; ya enviado: 409', async () => {
    const m = mundo(); m.alta({ id: ID1, client_id: C_ANA, estado: 'verificado' }); m.alta({ id: ID2, client_id: C_ANA, estado: 'enviado', response_id: 'r1' })
    expect((await llama(m.deps, 'jwt-ana', { accion: 'verificar', id: ID1 })).cuerpo.ok).toBe(true)
    expect((await llama(m.deps, 'jwt-ana', { accion: 'verificar', id: ID2 })).status).toBe(409)
  })
  it('si otra petición cambió la fila entretanto, no se pisa: 409', async () => {
    const m = mundo(); m.alta({ id: ID1, client_id: C_ANA }, PDF)
    m.deps.marcarVerificado = async () => false
    expect((await llama(m.deps, 'jwt-ana', { accion: 'verificar', id: ID1 })).status).toBe(409)
  })
})

describe('descartar', () => {
  it('quita un archivo propio sin enviar: se borra el objeto y la fila', async () => {
    const m = mundo(); m.alta({ id: ID1, client_id: C_ANA, estado: 'verificado' }, PDF)
    expect(await llama(m.deps, 'jwt-ana', { accion: 'descartar', id: ID1 })).toMatchObject({ status: 200, cuerpo: { ok: true, borrado: true } })
    expect(m.filas.size).toBe(0); expect(m.deposito.size).toBe(0)
  })
  it('uno que aún no se había subido (reservado) también se puede quitar', async () => {
    const m = mundo(); m.alta({ id: ID1, client_id: C_ANA })
    expect((await llama(m.deps, 'jwt-ana', { accion: 'descartar', id: ID1 })).cuerpo.ok).toBe(true)
    expect(m.filas.size).toBe(0)
  })
  it('el de otro cliente: 404 y no se borra nada', async () => {
    const m = mundo(); m.alta({ id: ID_BETO, client_id: C_BETO, estado: 'verificado' }, PDF)
    expect((await llama(m.deps, 'jwt-ana', { accion: 'descartar', id: ID_BETO })).status).toBe(404)
    expect(m.deposito.size).toBe(1); expect(m.filas.get(ID_BETO)!.estado).toBe('verificado')
  })
  it('uno ya enviado (con respuesta) no se puede quitar desde aquí: 409', async () => {
    const m = mundo(); m.alta({ id: ID1, client_id: C_ANA, estado: 'enviado', response_id: 'r1' }, PDF)
    expect((await llama(m.deps, 'jwt-ana', { accion: 'descartar', id: ID1 })).status).toBe(409)
    expect(m.deposito.size).toBe(1)
  })
  it('doble defensa: aunque la base dejara pasar el cambio de estado, el manejador solo borra archivos sin enviar', async () => {
    const m = mundo(); m.alta({ id: ID1, client_id: C_ANA, estado: 'enviado', response_id: 'r1' }, PDF)
    m.deps.marcarBorrando = async () => true // una base de datos «generosa»
    expect((await llama(m.deps, 'jwt-ana', { accion: 'descartar', id: ID1 })).status).toBe(409)
    expect(m.deposito.size).toBe(1)
  })
  it('si Storage falla, la fila queda «borrando» (inutilizable) y se reintenta con la limpieza', async () => {
    const m = mundo({ fallaBorrar: true }); m.alta({ id: ID1, client_id: C_ANA, estado: 'verificado' }, PDF)
    expect((await llama(m.deps, 'jwt-ana', { accion: 'descartar', id: ID1 })).cuerpo).toMatchObject({ ok: true, borrado: false })
    expect(m.filas.get(ID1)!.estado).toBe('borrando')
  })
})

describe('borrar-cliente (RGPD)', () => {
  it('quien puede gestionar al cliente borra TODO lo de su carpeta: lo que tiene fila y lo que no', async () => {
    const m = mundo()
    m.alta({ id: ID1, client_id: C_ANA, estado: 'enviado', response_id: 'r1' }, PDF)
    m.deposito.set(`${C_ANA}/suelto-sin-fila.pdf`, PDF)
    m.alta({ id: ID_BETO, client_id: C_BETO }, PDF)
    const r = await llama(m.deps, 'jwt-entrenador', { accion: 'borrar-cliente', client_id: C_ANA })
    expect(r).toMatchObject({ status: 200, cuerpo: { ok: true, borrados: 2 } })
    expect([...m.deposito.keys()]).toEqual([`${C_BETO}/${ID_BETO}.pdf`]) // lo de Beto, intacto
  })
  it('quien no puede gestionarlo (otro entrenador o el propio cliente): 403 y no se borra nada', async () => {
    const m = mundo(); m.alta({ id: ID1, client_id: C_ANA, estado: 'enviado', response_id: 'r1' }, PDF)
    expect((await llama(m.deps, 'jwt-ana', { accion: 'borrar-cliente', client_id: C_ANA })).status).toBe(403)
    expect((await llama(m.deps, 'jwt-beto', { accion: 'borrar-cliente', client_id: C_ANA })).status).toBe(403)
    expect((await llama(m.deps, 'jwt-entrenador', { accion: 'borrar-cliente', client_id: C_BETO })).status).toBe(403)
    expect(m.deposito.size).toBe(1); expect(m.llamadas).toEqual([])
  })
  it('un id que no es un uuid: 400; un cliente sin archivos: ok con 0', async () => {
    const m = mundo()
    expect((await llama(m.deps, 'jwt-entrenador', { accion: 'borrar-cliente', client_id: 'x' })).status).toBe(400)
    expect(await llama(m.deps, 'jwt-entrenador', { accion: 'borrar-cliente', client_id: C_ANA })).toMatchObject({ status: 200, cuerpo: { borrados: 0 } })
  })
  it('si Storage falla: 500 (quien llama NO debe seguir con el borrado de datos)', async () => {
    const m = mundo({ fallaBorrar: true }); m.alta({ id: ID1, client_id: C_ANA, estado: 'enviado', response_id: 'r1' }, PDF)
    expect((await llama(m.deps, 'jwt-entrenador', { accion: 'borrar-cliente', client_id: C_ANA })).status).toBe(500)
  })
})

// ── Limpieza programada ──
function limpieza(opciones: { reclamadas?: { id: string; ruta: string }[]; huerfanos?: string[]; fallaAvisar?: boolean; fallaBorrarSiContiene?: string } = {}) {
  const log: string[] = []
  const deps: DepsLimpieza = {
    avisar: async () => { if (opciones.fallaAvisar) throw new Error('boom'); log.push('avisar'); return 2 },
    reclamar: async () => opciones.reclamadas ?? [],
    finalizar: async ids => { log.push(`finalizar:${ids.length}`); return ids.length },
    huerfanos: async () => opciones.huerfanos ?? [],
    borrar: async rutas => { log.push(`borrar:${rutas.length}`); return !(opciones.fallaBorrarSiContiene && rutas.some(r => r.includes(opciones.fallaBorrarSiContiene!))) },
  }
  return { deps, log }
}
const filasN = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `id${i}`, ruta: `c/f${i}.pdf` }))

describe('limpieza programada', () => {
  it('avisa, borra los objetos y SOLO ENTONCES cierra las filas', async () => {
    const l = limpieza({ reclamadas: filasN(3), huerfanos: ['c/h1.pdf'] })
    expect(await limpiar(l.deps)).toMatchObject({ avisados: 2, reclamados: 3, borrados: 3, pendientes: 0, huerfanos: 1, huerfanosBorrados: 1, errores: [] })
    expect(l.log).toEqual(['avisar', 'borrar:3', 'finalizar:3', 'borrar:1'])
  })
  it('si Storage falla, las filas NO se cierran (se reintentan mañana)', async () => {
    const l = limpieza({ reclamadas: filasN(3), fallaBorrarSiContiene: 'c/f' })
    expect(await limpiar(l.deps)).toMatchObject({ reclamados: 3, borrados: 0, pendientes: 3 })
    expect(l.log).not.toContain('finalizar:3')
  })
  it('va por trozos de 100 y un trozo que falla no impide los demás', async () => {
    const l = limpieza({ reclamadas: filasN(250), fallaBorrarSiContiene: 'c/f150.pdf' })
    const r = await limpiar(l.deps)
    expect(r.reclamados).toBe(250)
    expect(r.borrados).toBe(150) // el trozo 100-199 falló
    expect(r.pendientes).toBe(100)
  })
  it('que falle el aviso no impide borrar, y queda anotado', async () => {
    const l = limpieza({ reclamadas: filasN(2), fallaAvisar: true })
    const r = await limpiar(l.deps)
    expect(r.borrados).toBe(2)
    expect(r.errores).toEqual(['avisar: boom'])
  })
  it('sin nada que hacer, no llama a Storage', async () => {
    const l = limpieza()
    await limpiar(l.deps)
    expect(l.log).toEqual(['avisar'])
  })
  it('el secreto se compara en tiempo constante: igual solo si es idéntico', () => {
    expect(igual('abc123', 'abc123')).toBe(true)
    expect(igual('abc123', 'abc124')).toBe(false)
    expect(igual('abc', 'abc123')).toBe(false)
    expect(igual('', '')).toBe(true)
  })
})
