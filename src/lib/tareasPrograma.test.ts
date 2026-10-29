import { describe, it, expect } from 'vitest'
import { tareasDePrograma } from './tareasPrograma'

const t = (type: string, title: string, data: Record<string, unknown> = {}) => ({ type, title, data })
const semana = (dias: Record<number, ReturnType<typeof t>[]>) => ({ label: 'S', days: Array.from({ length: 7 }, (_, i) => ({ tasks: dias[i] || [] })) })

describe('tareasDePrograma', () => {
  it('cada tarea va a su día de la semana, desde el lunes de la semana de inicio', () => {
    const weeks = [semana({ 1: [t('cardio', 'Correr', { objective: '30 min suave' })] }), semana({ 4: [t('video', 'Movilidad de cadera', { url: 'https://youtu.be/x' })] })]
    expect(tareasDePrograma(weeks, '2026-11-02', 'p1')).toEqual([
      { titulo: 'Correr', tipo: 'cardio', nota: '30 min suave', enlace: '', fecha: '2026-11-03', repetir: 'una', dias: [], hasta: null, origen: 'programa:p1' },
      { titulo: 'Movilidad de cadera', tipo: 'video', nota: '', enlace: 'https://youtu.be/x', fecha: '2026-11-13', repetir: 'una', dias: [], hasta: null, origen: 'programa:p1' },
    ])
  })

  it('lo anterior a la fecha de inicio no se crea (plan que empieza a mitad de semana)', () => {
    const weeks = [semana({ 0: [t('cardio', 'Lunes')], 3: [t('cardio', 'Jueves')] })]
    expect(tareasDePrograma(weeks, '2026-11-04', 'p1').map(x => x.titulo)).toEqual(['Jueves'])
  })

  it('documento y evolución; los entrenos, mensajes y formularios no se convierten', () => {
    const weeks = [semana({ 0: [
      t('documento', 'Guía', { url: 'https://drive.google.com/x' }),
      t('evolucion', 'Registrar: fotos', { items: ['peso', 'fotos'] }),
      t('evolucion', 'Registrar: peso', { items: ['peso'] }),
      t('workout', 'Fuerza', { templateId: 'w' }), t('mensaje', 'Ánimo'), t('formulario', 'Check-in'),
    ] })]
    expect(tareasDePrograma(weeks, '2026-11-02', 'p1').map(x => [x.titulo, x.tipo, x.enlace])).toEqual([
      ['Guía', 'tarea', 'https://drive.google.com/x'], ['Registrar: fotos', 'foto', ''], ['Registrar: peso', 'tarea', ''],
    ])
  })

  it('un enlace que no es https no se guarda', () => {
    expect(tareasDePrograma([semana({ 0: [t('video', 'V', { url: 'http://x' })] })], '2026-11-02', 'p1')[0].enlace).toBe('')
  })
})
