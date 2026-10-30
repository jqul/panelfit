import type { ProgramWeekLike } from './programPlan'
import type { Tarea, TipoTarea } from './tareas'
import { lunesDe, sumarDias } from './fechasPlan'

// Las tareas de un programa que no son entrenos (cardio, vídeo, documento, sesión, registrar evolución) llegan al cliente como
// tareas sueltas con fecha (tabla tareas_cliente): las ve en Hoy y las marca hechas. Antes solo quedaban como texto en
// el "foco" del día del plan. Los mensajes y formularios tienen su propio camino y no se convierten.
//
// Cada día del programa es un día de la semana (0 = lunes) de la semana w, que empieza el lunes de la semana de
// `fechaInicio` (como el plan). Lo anterior a la fecha de inicio no se crea. Se marcan con `origen` = programa:<id>
// para poder quitarlas si se cambia de programa.

export type TareaDePrograma = Omit<Tarea, 'id' | 'client_id'> & { origen: string }

export const origenPrograma = (programId: string) => `programa:${programId}`.slice(0, 80)

const https = (u: unknown) => typeof u === 'string' && /^https:\/\//i.test(u.trim()) && u.trim().length <= 500 ? u.trim() : ''
const recorta = (t: string, n: number) => t.replace(/\s+/g, ' ').trim().slice(0, n)

export function tareasDePrograma(weeks: ProgramWeekLike[] | undefined, fechaInicio: string, programId: string): TareaDePrograma[] {
  const lunes0 = lunesDe(fechaInicio)
  const origen = origenPrograma(programId)
  const out: TareaDePrograma[] = []
  ;(weeks || []).forEach((semana, w) => (semana.days || []).forEach((dia, d) => {
    const fecha = sumarDias(lunes0, w * 7 + d)
    if (fecha < fechaInicio) return
    for (const t of dia.tasks || []) {
      let tipo: TipoTarea | null = null
      let nota = ''
      let enlace = ''
      if (t.type === 'cardio') { tipo = 'cardio'; nota = String(t.data?.objective || '') }
      else if (t.type === 'video') { tipo = 'video'; enlace = https(t.data?.url) }
      else if (t.type === 'documento') { tipo = 'tarea'; enlace = https(t.data?.url) }
      else if (t.type === 'sesion') { tipo = 'tarea'; nota = /^\d{2}:\d{2}$/.test(String(t.data?.hora || '')) ? `A las ${t.data?.hora}` : ''; enlace = https(t.data?.url) }
      else if (t.type === 'evolucion') tipo = (t.data?.items as string[] | undefined)?.includes('fotos') ? 'foto' : 'tarea'
      if (!tipo) continue
      const titulo = recorta(t.title || '', 80)
      if (!titulo) continue
      out.push({ titulo, tipo, nota: recorta(nota, 500), enlace, fecha, repetir: 'una', dias: [], hasta: null, origen })
    }
  }))
  return out
}
