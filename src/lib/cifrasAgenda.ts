// Cifras de la agenda de un mes: cuántas citas y plazas de clase hubo, cuántos vinieron, cuántos no vinieron sin avisar,
// cuántas se cancelaron y la ocupación de las clases. Salen de pasar lista (migración 20261105000003): una cita
// 'completada' es que vino y 'ausente' que no; en una plaza de clase, asistio true / false (null = sin pasar lista).

export interface CitaCifras { start_at: string; status: string; client_id: string | null }
export interface ClaseCifras { start_at: string; aforo: number; cancelada?: boolean; plazas: { estado: string; asistio?: boolean | null }[] }

export interface CifrasMes {
  citas: { total: number; vinieron: number; noVinieron: number; canceladas: number; sinMarcar: number }
  clases: { total: number; plazas: number; vinieron: number; noVinieron: number; sinMarcar: number; ocupacion: number | null }
  /** % de asistencia de todo lo que tiene lista pasada (citas y plazas); null si aún no hay nada marcado. */
  asistencia: number | null
}

const enMes = (iso: string, año: number, mes: number) => { const d = new Date(iso); return d.getFullYear() === año && d.getMonth() === mes }
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null)

/** Cifras del mes de `ref` (por defecto, este). Solo cuentan las citas con cliente (no los bloqueos) y lo ya empezado para "sin marcar". */
export function cifrasMes(citas: CitaCifras[], clases: ClaseCifras[], ref: Date = new Date(), ahora: Date = new Date()): CifrasMes {
  const año = ref.getFullYear(), mes = ref.getMonth()
  const cm = citas.filter(c => c.client_id && enMes(c.start_at, año, mes))
  const pasada = (iso: string) => new Date(iso).getTime() <= ahora.getTime()
  const vinieron = cm.filter(c => c.status === 'completada').length
  const noVinieron = cm.filter(c => c.status === 'ausente').length
  const citasCifras = {
    total: cm.filter(c => c.status !== 'cancelada').length,
    vinieron, noVinieron,
    canceladas: cm.filter(c => c.status === 'cancelada').length,
    sinMarcar: cm.filter(c => c.status === 'confirmada' && pasada(c.start_at)).length,
  }

  const km = clases.filter(k => !k.cancelada && enMes(k.start_at, año, mes))
  const reservadas = km.flatMap(k => k.plazas.filter(p => p.estado === 'reservada').map(p => ({ ...p, pasada: pasada(k.start_at) })))
  const kv = reservadas.filter(p => p.asistio === true).length
  const kn = reservadas.filter(p => p.asistio === false).length
  const aforoTotal = km.reduce((s, k) => s + k.aforo, 0)
  const clasesCifras = {
    total: km.length, plazas: reservadas.length, vinieron: kv, noVinieron: kn,
    sinMarcar: reservadas.filter(p => p.pasada && (p.asistio === null || p.asistio === undefined)).length,
    ocupacion: pct(reservadas.length, aforoTotal),
  }

  return { citas: citasCifras, clases: clasesCifras, asistencia: pct(vinieron + kv, vinieron + noVinieron + kv + kn) }
}
