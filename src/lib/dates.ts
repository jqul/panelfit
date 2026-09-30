// `new Date().toISOString().split('T')[0]` da la fecha en UTC, no en la zona
// horaria local del navegador — en España (UTC+1/+2), cualquier cosa hecha
// entre medianoche y la 1-2 de la madrugada local se registra con la fecha
// de AYER en vez de HOY, porque en UTC todavía no ha cruzado la medianoche.
// Esto desincroniza "qué día entrenó el cliente" (dateDone, escrito con este
// bug) frente a "qué día es hoy" en gráficas como Actividad semanal — un
// entreno de última hora se cuenta en el día equivocado.
//
// localDateKey() usa los componentes de fecha LOCALES (año/mes/día del
// propio Date), no la conversión a UTC — da el mismo formato YYYY-MM-DD,
// pero siempre coincide con el calendario del dispositivo del usuario.
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
