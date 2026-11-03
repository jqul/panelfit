import { localDateKey } from './dates'

// Las citas de hoy (desde ahora, incluida la que está en curso) y de mañana, para la tarjeta de Hoy del entrenador.
// Fuera las canceladas y las ya completadas. Las semanales ya vienen guardadas una fila por semana (CalendarTab).

export interface CitaLite { id: string; client_id: string | null; title: string; start_at: string; end_at: string; status: string }
export interface CitaProxima extends CitaLite { dia: 'hoy' | 'manana'; hora: string }

export function citasProximas(citas: CitaLite[], ahora: Date = new Date()): CitaProxima[] {
  const hoy = localDateKey(ahora)
  const m = new Date(ahora); m.setDate(m.getDate() + 1)
  const manana = localDateKey(m)
  return citas
    .filter(c => c.status === 'confirmada' || c.status === 'pendiente')
    .filter(c => new Date(c.end_at) > ahora)
    .map(c => {
      const ini = new Date(c.start_at)
      const dia = localDateKey(ini)
      return { c, ini, dia }
    })
    .filter(x => x.dia === hoy || x.dia === manana)
    .sort((a, b) => a.ini.getTime() - b.ini.getTime())
    .map(({ c, ini, dia }) => ({
      ...c,
      dia: dia === hoy ? 'hoy' as const : 'manana' as const,
      hora: ini.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    }))
}
