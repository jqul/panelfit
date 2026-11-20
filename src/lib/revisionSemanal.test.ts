import { describe, it, expect } from 'vitest'
import { filaRevision, revisionSemanal, resumenRevision, claveSemana, type EntradaRevision } from './revisionSemanal'

const base: EntradaRevision = {
  id: 'c1', nombrePila: 'María', nombreCompleto: 'María García', tienePlan: true, sesionesHechas: 3, sesionesPrevistas: 3, diaSemana: 5, diasSinEntrenar: 1, ausente: false,
  records: [], molestias: [], checkinBajo: false, calibracionPorRevisar: 0, decisionesPorRevisar: 0, progresionesListas: [],
}
const e = (extra: Partial<EntradaRevision>): EntradaRevision => ({ ...base, ...extra })

describe('filaRevision', () => {
  it('todo en orden: nivel «bien», «3/3 sesiones», sin señales y sin mensaje', () => {
    expect(filaRevision(base)).toEqual({ id: 'c1', nombre: 'María García', nivel: 'bien', sesiones: '3/3 sesiones', senales: [], mensaje: null })
  })

  it('molestia fuerte: atender y mensaje con su nombre de pila; moderada: revisar; leve o agujetas: nada', () => {
    const fuerte = filaRevision(e({ molestias: [{ zona: 'Rodilla', intensidad: 8 }, { zona: 'Codo', intensidad: 4 }] }))
    expect(fuerte.nivel).toBe('atender')
    expect(fuerte.senales[0]).toMatchObject({ id: 'molestia', texto: 'Molestia en Rodilla (8/10)' })
    expect(fuerte.mensaje).toMatchObject({ motivo: 'Molestia' })
    expect(fuerte.mensaje!.texto).toBe('Hola María, ¿cómo va la molestia de rodilla? Cuéntame cómo la notas al entrenar.')
    expect(filaRevision(e({ molestias: [{ zona: 'Hombro', intensidad: 5 }] })).nivel).toBe('revisar')
    expect(filaRevision(e({ molestias: [{ zona: 'Codo', intensidad: 2 }] })).senales).toEqual([])
  })

  it('check-in bajo, calibración y decisiones por revisar piden revisar, con su singular y plural', () => {
    const f = filaRevision(e({ checkinBajo: true, calibracionPorRevisar: 1, decisionesPorRevisar: 3 }))
    expect(f.nivel).toBe('revisar')
    expect(f.senales.map(s => s.texto)).toEqual(['Check-in bajo esta semana', 'Primera semana: revisar las cargas de 1 ejercicio', '3 decisiones por revisar'])
    expect(filaRevision(e({ decisionesPorRevisar: 1 })).senales[0].texto).toBe('1 decisión por revisar')
  })

  it('las sesiones: un 0/3 un lunes es normal; desde el jueves con menos de la mitad, se avisa con un mensaje para recordar el plan', () => {
    expect(filaRevision(e({ sesionesHechas: 0, diaSemana: 1 })).senales).toEqual([])
    const jueves = filaRevision(e({ sesionesHechas: 1, diaSemana: 4 }))
    expect(jueves.senales[0]).toMatchObject({ id: 'sesiones', texto: 'Va 1 de 3 sesiones', nivel: 'revisar' })
    expect(jueves.mensaje).toMatchObject({ motivo: 'Recordar el plan' })
    expect(jueves.mensaje!.texto).toContain('llevas 1 de 3 sesiones')
    expect(filaRevision(e({ sesionesHechas: 2, diaSemana: 6 })).senales).toEqual([]) // más de la mitad: bien
  })

  it('7 días o más sin entrenar: revisar; de viaje, no se regaña; sin plan, se dice', () => {
    expect(filaRevision(e({ sesionesHechas: 0, diasSinEntrenar: 9 })).senales[0]).toMatchObject({ id: 'inactivo', texto: 'Lleva 9 días sin entrenar' })
    expect(filaRevision(e({ sesionesHechas: 0, diasSinEntrenar: 9, ausente: true })).senales).toEqual([])
    const sinPlan = filaRevision(e({ tienePlan: false, sesionesPrevistas: 0, sesionesHechas: 0 }))
    expect(sinPlan).toMatchObject({ sesiones: 'Sin plan', nivel: 'revisar' })
    expect(sinPlan.senales[0].id).toBe('sin-plan')
  })

  it('un récord o una progresión lista son buenas noticias (nivel bien), y el récord propone felicitar', () => {
    const f = filaRevision(e({ records: ['Press banca'], progresionesListas: ['Sentadilla', 'Remo', 'Curl'] }))
    expect(f.nivel).toBe('bien')
    expect(f.senales.map(s => s.id).sort()).toEqual(['progresion', 'record'])
    expect(f.senales.find(s => s.id === 'progresion')!.texto).toBe('Listo para subir (orientación): Sentadilla, Remo y 1 más')
    expect(f.mensaje).toMatchObject({ motivo: 'Felicitar' })
    expect(f.mensaje!.texto).toContain('Récord esta semana en press banca')
  })

  it('el mensaje sale de la razón más importante: una molestia gana a recordar el plan y a felicitar', () => {
    const f = filaRevision(e({ molestias: [{ zona: 'Lumbar', intensidad: 6 }], sesionesHechas: 0, diaSemana: 5, records: ['Peso muerto'] }))
    expect(f.mensaje!.motivo).toBe('Molestia')
  })

  it('el mensaje no lleva nunca el nombre y apellidos: solo el nombre de pila', () => {
    const f = filaRevision(e({ nombrePila: 'Pedro', nombreCompleto: 'Pedro Ruiz Gómez', sesionesHechas: 0, diasSinEntrenar: 10 }))
    expect(f.mensaje!.texto).toContain('Hola Pedro,')
    expect(f.mensaje!.texto).not.toContain('Ruiz')
  })
})

describe('revisionSemanal', () => {
  it('ordena de lo que más urge a lo que va bien, y dentro de cada nivel, por más señales y por nombre', () => {
    const filas = revisionSemanal([
      e({ id: 'bien', nombreCompleto: 'Ana Bien' }),
      e({ id: 'rev', nombreCompleto: 'Beto Revisar', checkinBajo: true }),
      e({ id: 'aten', nombreCompleto: 'Carla Atender', molestias: [{ zona: 'Rodilla', intensidad: 9 }] }),
      e({ id: 'rev2', nombreCompleto: 'Dani Revisar', checkinBajo: true, decisionesPorRevisar: 1 }),
      e({ id: 'rev3', nombreCompleto: 'Alba Revisar', checkinBajo: true }),
    ])
    expect(filas.map(f => f.id)).toEqual(['aten', 'rev2', 'rev3', 'rev', 'bien'])
  })

  it('el resumen cuenta clientes por nivel', () => {
    const filas = revisionSemanal([e({ id: 'a' }), e({ id: 'b', checkinBajo: true }), e({ id: 'c', molestias: [{ zona: 'X', intensidad: 8 }] })])
    expect(resumenRevision(filas)).toEqual({ atender: 1, revisar: 1, bien: 1 })
  })
})

describe('claveSemana', () => {
  it('es el lunes de esa semana (de lunes a domingo)', () => {
    expect(claveSemana('2026-11-20')).toBe('2026-11-16') // viernes
    expect(claveSemana('2026-11-22')).toBe('2026-11-16') // domingo
    expect(claveSemana('2026-11-23')).toBe('2026-11-23') // lunes siguiente
  })
})
