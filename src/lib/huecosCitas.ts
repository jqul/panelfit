// Huecos libres para reservar cita: a partir del horario del entrenador (franjas por día de la semana, duración,
// margen entre citas y antelación mínima) y de lo ya ocupado. Todo puro, para probarlo. La base de datos vuelve a
// comprobarlo al reservar (reservar_cita), así que esto solo decide qué se enseña.
//
// Las horas se leen en la hora local del dispositivo (el horario se escribe en hora de Madrid; para un cliente en
// España es la misma).

export interface Franja { dia: number; desde: string; hasta: string } // dia: 0 = lunes … 6 = domingo; "09:00"
export interface HorarioCitas {
  franjas: Franja[]
  duracion_min: number
  margen_min: number
  antelacion_horas: number
  autoconfirmar?: boolean
}
export interface Ocupado { inicio: string; fin: string } // ISO

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/
export const aMinutos = (h: string): number | null => { const m = HORA.exec(h); return m ? +m[1] * 60 + +m[2] : null }
const aHora = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/** Franjas válidas (horas bien escritas, desde < hasta), ordenadas por día y hora. */
export function limpiarFranjas(raw: unknown): Franja[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((f): f is Franja => !!f && typeof f === 'object' && Number.isInteger((f as Franja).dia) && (f as Franja).dia >= 0 && (f as Franja).dia <= 6)
    .map(f => ({ dia: f.dia, desde: f.desde, hasta: f.hasta }))
    .filter(f => { const a = aMinutos(f.desde), b = aMinutos(f.hasta); return a !== null && b !== null && a < b })
    .sort((a, b) => a.dia - b.dia || a.desde.localeCompare(b.desde))
}

function fechaLocal(fecha: string, minutos: number): Date {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d, Math.floor(minutos / 60), minutos % 60)
}
function sumarDias(fecha: string, n: number): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const x = new Date(y, m - 1, d + n, 12)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}
const diaSemana = (fecha: string) => (fechaLocal(fecha, 12 * 60).getDay() + 6) % 7

export interface Hueco { fecha: string; hora: string; inicio: Date }

/**
 * Huecos de `dias` días desde `desde`: en cada franja, uno cada duración + margen desde su inicio, si cabe entero
 * dentro de la franja, respeta la antelación y no choca (con el margen) con nada ocupado.
 */
export function huecosLibres(horario: HorarioCitas, ocupado: Ocupado[], desde: string, dias: number, ahora = new Date()): Hueco[] {
  const dur = horario.duracion_min, margen = horario.margen_min
  const minimo = ahora.getTime() + horario.antelacion_horas * 3600_000
  const tramos = ocupado.map(o => [new Date(o.inicio).getTime() - margen * 60_000, new Date(o.fin).getTime() + margen * 60_000])
  const franjas = limpiarFranjas(horario.franjas)
  const out: Hueco[] = []
  for (let i = 0; i < dias; i++) {
    const fecha = sumarDias(desde, i)
    const dia = diaSemana(fecha)
    for (const f of franjas.filter(x => x.dia === dia)) {
      const fin = aMinutos(f.hasta)!
      for (let t = aMinutos(f.desde)!; t + dur <= fin; t += dur + margen) {
        const inicio = fechaLocal(fecha, t)
        const a = inicio.getTime(), b = a + dur * 60_000
        if (a < minimo) continue
        if (tramos.some(([x, y]) => x < b && y > a)) continue
        out.push({ fecha, hora: aHora(t), inicio })
      }
    }
  }
  return out
}
