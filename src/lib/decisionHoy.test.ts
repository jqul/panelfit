import { describe, it, expect } from 'vitest'
import { decisionHoy, tareasDeCliente, tareasDeSolicitud, POLITICA_DECISION_HOY, type EntradaClienteHoy, type EntradaSolicitud } from './decisionHoy'
import type { EvidenciaDescarga, SemanaEvidencia } from './evidenciaDescarga'

const semana = (sesiones: number, previstas = 3, extra: Partial<SemanaEvidencia> = {}): SemanaEvidencia => ({ lunes: '2026-11-02', sesiones, previstas, enCurso: false, descarga: false, diasAusencia: 0, ...extra })
const evidencia = (o: Partial<EvidenciaDescarga> = {}, contexto: Partial<EvidenciaDescarga['contexto']> = {}): EvidenciaDescarga => ({
  politicaVersion: 'x', confianza: 'media', resumen: '', semanas: [semana(2), semana(2), semana(2)], datosInsuficientes: [], senales: [], evidencia: [], contextoAtipico: [],
  contexto: { adherenciaPct: 100, adherenciaBaja: false, semanasAdherencia: 2, ausenteReciente: 0, calibrando: false, ...contexto },
  falta: [], decisionesPrevias: [], ...o,
})
const cliente = (o: Partial<EntradaClienteHoy> = {}): EntradaClienteHoy => ({
  id: 'c1', nombre: 'María García', ausente: false, molestias: [], checkinBajo: null, calibracionPorRevisar: 0, decisionesPorRevisar: 0, progresionesListas: [], records: [], descarga: null, ...o,
})
const cats = (c: EntradaClienteHoy) => tareasDeCliente(c).map(t => t.categoria)

describe('Decisión de hoy: una fila por cosa, con quién, qué, por qué y la acción segura', () => {
  it('un cliente sin nada que mirar no genera filas', () => {
    expect(tareasDeCliente(cliente())).toEqual([])
    expect(tareasDeCliente(cliente({ descarga: evidencia() }))).toEqual([])
  })

  it('cada fila trae quién, qué necesita, por qué ahora y una acción que abre una pantalla', () => {
    const t = tareasDeCliente(cliente({ molestias: [{ zona: 'Rodilla', intensidad: 8 }] }))[0]
    expect(t).toMatchObject({ categoria: 'molestia-fuerte', nivel: 'atender', quien: 'María García', clienteId: 'c1' })
    expect(t.necesita).toBe('Mirar la molestia de rodilla')
    expect(t.porque).toContain('8/10')
    expect(t.accion).toBe('Abrir su registro de dolor')
    expect(t.destino).toEqual({ tipo: 'ficha', clienteId: 'c1', destino: { tab: 'progreso', seccion: 'dolor' } })
  })

  it('molestias: la fuerte va primero y por debajo del mínimo no se avisa', () => {
    expect(cats(cliente({ molestias: [{ zona: 'Codo', intensidad: 3 }] }))).toEqual([])
    expect(cats(cliente({ molestias: [{ zona: 'Codo', intensidad: 5 }] }))).toEqual(['molestia'])
    expect(cats(cliente({ molestias: [{ zona: 'Codo', intensidad: 5 }, { zona: 'Hombro', intensidad: 7 }] }))).toEqual(['molestia-fuerte'])
  })

  it('check-in bajo, decisiones vencidas y calibración llevan a la pantalla donde se resuelven', () => {
    const t = tareasDeCliente(cliente({ checkinBajo: 'sueño 2/5', decisionesPorRevisar: 2, calibracionPorRevisar: 3 }))
    const destino = (c: string) => (t.find(x => x.categoria === c)!.destino as { destino: unknown }).destino
    expect(destino('checkin')).toEqual({ tab: 'progreso', seccion: 'fatiga' })
    expect(destino('decision')).toEqual({ tab: 'progreso', seccion: 'estancamiento' })
    expect(destino('calibracion')).toEqual({ tab: 'perfil', seccion: 'calibracion' })
    expect(t.find(x => x.categoria === 'decision')!.necesita).toBe('Revisar 2 decisiones anotadas')
  })

  it('evidencia de descarga: solo con señales, contexto normal y confianza suficiente; nunca dice «toca descarga»', () => {
    const senal = [{ id: 's', texto: '4 semanas seguidas de carga.' }]
    const t = tareasDeCliente(cliente({ descarga: evidencia({ senales: senal }) }))
    expect(t.map(x => x.categoria)).toEqual(['descarga'])
    expect(t[0].porque).toBe('4 semanas seguidas de carga · confianza media')
    expect(tareasDeCliente(cliente({ descarga: evidencia({ senales: [...senal, { id: 'r', texto: 'RIR más justo.' }] }) }))[0].porque).toBe('4 semanas seguidas de carga (y 1 señal más) · confianza media')
    expect(t[0].accion).toContain('no es un veredicto')
    expect(JSON.stringify(t)).not.toMatch(/toca descarga|sobreentren|baja(r)? la carga|deber[ií]as/i)
    expect(cats(cliente({ descarga: evidencia({ senales: senal, confianza: 'baja' }) }))).toEqual([])
    expect(cats(cliente({ descarga: evidencia({ senales: senal }, { calibrando: true }) }))).toEqual([])
    expect(cats(cliente({ descarga: evidencia({ senales: senal }, { ausenteReciente: 4 }) }))).toEqual([])
    expect(cats(cliente({ ausente: true, descarga: evidencia({ senales: senal }) }))).toEqual([])
  })

  it('con adherencia baja no se habla de cansancio: se pregunta, y la descarga calla', () => {
    const d = evidencia({ senales: [{ id: 's', texto: 'x' }] }, { adherenciaBaja: true, adherenciaPct: 40, semanasAdherencia: 2 })
    const t = tareasDeCliente(cliente({ descarga: d }))
    expect(t.map(x => x.categoria)).toEqual(['adherencia'])
    expect(t[0].necesita).toBe('Preguntarle cómo va con las sesiones')
    expect(t[0].porque).toContain('40 %')
    expect(t[0].porque).toContain('no solo cansancio')
  })

  it('una ausencia declarada o la calibración no cuentan como mala adherencia', () => {
    const d = (c: Partial<EvidenciaDescarga['contexto']>) => evidencia({}, { adherenciaBaja: true, adherenciaPct: 30, ...c })
    expect(cats(cliente({ ausente: true, descarga: d({}) }))).toEqual([])
    expect(cats(cliente({ descarga: d({ calibrando: true }) }))).toEqual([])
  })

  it('felicitar: récord de la semana, o tres semanas completas al 90 % o más sin ausencias', () => {
    expect(tareasDeCliente(cliente({ records: ['Sentadilla'] }))[0]).toMatchObject({ categoria: 'felicitar', nivel: 'bien' })
    expect(cats(cliente({ descarga: evidencia() }))).toEqual([])
    const buena = evidencia({ semanas: [semana(3), semana(3), semana(3)] })
    expect(tareasDeCliente(cliente({ descarga: buena }))[0]).toMatchObject({ categoria: 'felicitar', porque: 'Ha hecho todas las sesiones previstas 3 semanas seguidas' })
    expect(cats(cliente({ descarga: evidencia({ semanas: [semana(3), semana(3), semana(3, 3, { diasAusencia: 2 })] }) }))).toEqual([])
    expect(cats(cliente({ descarga: evidencia({ semanas: [semana(3), semana(2)] }) }))).toEqual([])
  })

  it('no se felicita la constancia de quien está de baja ni la de quien tiene una molestia', () => {
    const buena = evidencia({ semanas: [semana(3), semana(3), semana(3)] })
    expect(cats(cliente({ ausente: true, descarga: buena }))).toEqual([])
    expect(cats(cliente({ molestias: [{ zona: 'Codo', intensidad: 5 }], descarga: buena }))).toEqual(['molestia'])
  })

  it('la progresión orientativa se presenta como algo que decide el entrenador', () => {
    const t = tareasDeCliente(cliente({ progresionesListas: ['Press banca', 'Sentadilla', 'Remo'] }))[0]
    expect(t.categoria).toBe('progresion')
    expect(t.porque).toContain('la decides tú')
    expect(t.porque).toContain('y 1 más')
  })
})

describe('solicitudes por enlace', () => {
  const sol = (o: Partial<EntradaSolicitud> = {}): EntradaSolicitud => ({ id: 'l1', nombre: 'Lucas', revisionPersonal: false, diasEsperando: 0, esSolicitud: true, ...o })
  it('la que necesita revisión personal es lo más urgente y lo dice sin entrar en la salud', () => {
    const t = tareasDeSolicitud(sol({ revisionPersonal: true, diasEsperando: 2 }))[0]
    expect(t).toMatchObject({ categoria: 'solicitud-revision', nivel: 'atender', clienteId: null, destino: { tipo: 'contactos' } })
    expect(t.necesita).toContain('Revisar tú la solicitud')
    expect(t.porque).toContain('Lleva 2 días sin contestar')
    expect(t.porque).not.toMatch(/lesi|enfermedad|card[ií]ac|diagn/i)
  })
  it('una solicitud normal espera menos que una a revisar', () => {
    expect(tareasDeSolicitud(sol())[0].porque).toBe('Acaba de llegar')
    expect(tareasDeSolicitud(sol({ diasEsperando: 1 }))[0].porque).toBe('Lleva 1 día sin contestar')
  })
})

describe('decisionHoy: el orden y el corte', () => {
  it('ordena por urgencia: revisión personal, molestia fuerte, resto, y al final lo que va bien', () => {
    const r = decisionHoy([
      cliente({ id: 'a', nombre: 'Ana', records: ['Dominadas'] }),
      cliente({ id: 'b', nombre: 'Bea', checkinBajo: 'sueño 1/5' }),
      cliente({ id: 'c', nombre: 'Carlos', molestias: [{ zona: 'Lumbar', intensidad: 9 }] }),
    ], [{ id: 'l', nombre: 'Lucas', revisionPersonal: true, diasEsperando: 0, esSolicitud: true }])
    expect(r.tareas.map(t => t.categoria)).toEqual(['solicitud-revision', 'molestia-fuerte', 'checkin', 'felicitar'])
    expect(r.resumen).toEqual({ atender: 2, revisar: 1, bien: 1 })
  })
  it('entre molestias, la más fuerte primero aunque el nombre vaya después', () => {
    const r = decisionHoy([cliente({ id: 'a', nombre: 'Ana', molestias: [{ zona: 'Codo', intensidad: 4 }] }), cliente({ id: 'z', nombre: 'Zoe', molestias: [{ zona: 'Codo', intensidad: 6 }] })], [])
    expect(r.tareas.map(t => t.quien)).toEqual(['Zoe', 'Ana'])
  })
  it('a igual prioridad, por nombre', () => {
    const r = decisionHoy([cliente({ id: 'z', nombre: 'Zoe', checkinBajo: 'x' }), cliente({ id: 'a', nombre: 'Álvaro', checkinBajo: 'x' })], [])
    expect(r.tareas.map(t => t.quien)).toEqual(['Álvaro', 'Zoe'])
  })
  it('enseña solo las primeras y cuenta las que quedan', () => {
    const muchos = Array.from({ length: 12 }, (_, i) => cliente({ id: `c${i}`, nombre: `Cliente ${String(i).padStart(2, '0')}`, checkinBajo: 'x' }))
    const r = decisionHoy(muchos, [])
    expect(r.visibles).toHaveLength(POLITICA_DECISION_HOY.visibles)
    expect(r.restantes).toBe(12 - POLITICA_DECISION_HOY.visibles)
  })
  it('es parametrizable: la política manda', () => {
    const r = decisionHoy([cliente({ checkinBajo: 'x' }), cliente({ id: 'c2', nombre: 'Zoe', checkinBajo: 'x' })], [], { ...POLITICA_DECISION_HOY, visibles: 1, version: 'prueba' })
    expect(r.politicaVersion).toBe('prueba')
    expect(r.visibles).toHaveLength(1)
    expect(r.restantes).toBe(1)
  })
  it('nada que mirar: lista vacía', () => {
    expect(decisionHoy([cliente()], []).tareas).toEqual([])
  })
})
