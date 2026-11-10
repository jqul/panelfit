// Entrenos del reloj importados desde archivo: .gpx, .tcx (texto XML) y .fit (binario, el de Garmin, Coros, Polar,
// Suunto, Wahoo…). De cada archivo se saca un resumen: deporte, inicio, duración, distancia, desnivel, pulso medio y
// máximo y calorías. GPX y TCX se leen aquí (puro, para probarlo); el FIT con fit-file-parser, que se descarga solo al
// importar uno. Se guarda en la tabla `actividades` (supabase/migrations/20261110000003_actividades.sql).

export type Deporte = 'correr' | 'bici' | 'caminar' | 'nadar' | 'remo' | 'fuerza' | 'otro'

export interface ActividadReloj {
  deporte: Deporte
  nombre: string
  inicio: string | null      // ISO
  duracionS: number          // tiempo en movimiento (o total si no hay otro)
  distanciaM: number | null
  desnivelM: number | null
  fcMedia: number | null
  fcMax: number | null
  kcal: number | null
}

export const DEPORTES: Record<Deporte, { icono: string; nombre: string }> = {
  correr: { icono: '🏃', nombre: 'Carrera' }, bici: { icono: '🚴', nombre: 'Bici' }, caminar: { icono: '🚶', nombre: 'Caminata' },
  nadar: { icono: '🏊', nombre: 'Natación' }, remo: { icono: '🚣', nombre: 'Remo' }, fuerza: { icono: '🏋️', nombre: 'Fuerza' },
  otro: { icono: '⌚', nombre: 'Actividad' },
}

/** Deporte a partir del nombre que pone cada marca ("Running", "cycling", "Biking", "walking", "lap_swimming"…). */
export function deporteDe(raw: string | null | undefined): Deporte {
  const s = (raw || '').toLowerCase()
  if (/run|carrera|correr|trail|treadmill/.test(s)) return 'correr'
  if (/bik|cycl|bici|ride/.test(s)) return 'bici'
  if (/walk|hik|camin|senderismo/.test(s)) return 'caminar'
  if (/swim|nata|nadar/.test(s)) return 'nadar'
  if (/row|remo/.test(s)) return 'remo'
  if (/strength|training|fuerza|weight/.test(s)) return 'fuerza'
  return 'otro'
}

const num = (s: string | undefined | null) => { const n = s == null ? NaN : parseFloat(s); return Number.isFinite(n) ? n : null }
const todas = (xml: string, re: RegExp) => [...xml.matchAll(re)].map(m => m[1])

/** Distancia en metros entre dos puntos (haversine). */
export function distancia(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000, rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const media = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null)

/** GPX: puntos con hora, altura y pulso (extensión TrackPointExtension); la distancia se suma punto a punto. */
export function parsearGPX(xml: string): ActividadReloj | null {
  const puntos = [...xml.matchAll(/<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/g)].map(m => {
    const lat = num(m[1].match(/lat="([^"]+)"/)?.[1]), lon = num(m[1].match(/lon="([^"]+)"/)?.[1])
    return {
      lat, lon,
      t: m[2].match(/<time>([^<]+)<\/time>/)?.[1] ?? null,
      ele: num(m[2].match(/<ele>([^<]+)<\/ele>/)?.[1]),
      hr: num(m[2].match(/<(?:\w+:)?hr>([^<]+)<\/(?:\w+:)?hr>/)?.[1]),
    }
  }).filter(p => p.lat !== null && p.lon !== null) as { lat: number; lon: number; t: string | null; ele: number | null; hr: number | null }[]
  if (puntos.length < 2) return null
  let dist = 0, subida = 0
  for (let i = 1; i < puntos.length; i++) {
    dist += distancia(puntos[i - 1], puntos[i])
    const de = (puntos[i].ele ?? 0) - (puntos[i - 1].ele ?? 0)
    if (puntos[i].ele !== null && puntos[i - 1].ele !== null && de > 0) subida += de
  }
  const tiempos = puntos.map(p => p.t).filter(Boolean) as string[]
  const ini = tiempos[0] ? Date.parse(tiempos[0]) : NaN, fin = tiempos.length ? Date.parse(tiempos[tiempos.length - 1]) : NaN
  const hrs = puntos.map(p => p.hr).filter((h): h is number => h !== null && h > 0)
  return {
    deporte: deporteDe(xml.match(/<type>([^<]+)<\/type>/)?.[1] ?? xml.match(/<name>([^<]+)<\/name>/)?.[1]),
    nombre: (xml.match(/<trk>[\s\S]*?<name>([^<]+)<\/name>/)?.[1] ?? '').trim(),
    inicio: Number.isFinite(ini) ? new Date(ini).toISOString() : null,
    duracionS: Number.isFinite(ini) && Number.isFinite(fin) ? Math.max(0, Math.round((fin - ini) / 1000)) : 0,
    distanciaM: Math.round(dist),
    desnivelM: puntos.some(p => p.ele !== null) ? Math.round(subida) : null,
    fcMedia: media(hrs), fcMax: hrs.length ? Math.max(...hrs) : null, kcal: null,
  }
}

/** TCX: resumen por vueltas (tiempo, distancia, calorías, pulso medio ponderado por tiempo y máximo). */
export function parsearTCX(xml: string): ActividadReloj | null {
  const vueltas = [...xml.matchAll(/<Lap\b[^>]*>([\s\S]*?)<\/Lap>/g)].map(m => m[1])
  if (!vueltas.length) return null
  let dur = 0, dist = 0, kcal = 0, hrPond = 0, hrTiempo = 0, hrMax = 0, hayDist = false, hayKcal = false
  for (const v of vueltas) {
    const t = num(v.match(/<TotalTimeSeconds>([^<]+)</)?.[1]) ?? 0
    const d = num(v.match(/<DistanceMeters>([^<]+)</)?.[1])
    const k = num(v.match(/<Calories>([^<]+)</)?.[1])
    const hm = num(v.match(/<AverageHeartRateBpm>\s*<Value>([^<]+)</)?.[1])
    const hx = num(v.match(/<MaximumHeartRateBpm>\s*<Value>([^<]+)</)?.[1])
    dur += t
    if (d !== null) { dist += d; hayDist = true }
    if (k !== null) { kcal += k; hayKcal = true }
    if (hm) { hrPond += hm * t; hrTiempo += t }
    if (hx) hrMax = Math.max(hrMax, hx)
  }
  const alturas = todas(xml, /<AltitudeMeters>([^<]+)</g).map(Number).filter(Number.isFinite)
  let subida = 0
  for (let i = 1; i < alturas.length; i++) if (alturas[i] > alturas[i - 1]) subida += alturas[i] - alturas[i - 1]
  return {
    deporte: deporteDe(xml.match(/<Activity\b[^>]*Sport="([^"]+)"/)?.[1]),
    nombre: (xml.match(/<Notes>([^<]+)<\/Notes>/)?.[1] ?? '').trim(),
    inicio: xml.match(/<Id>([^<]+)<\/Id>/)?.[1] ?? null,
    duracionS: Math.round(dur),
    distanciaM: hayDist ? Math.round(dist) : null,
    desnivelM: alturas.length ? Math.round(subida) : null,
    fcMedia: hrTiempo ? Math.round(hrPond / hrTiempo) : null,
    fcMax: hrMax || null,
    kcal: hayKcal ? Math.round(kcal) : null,
  }
}

/** FIT: el resumen de la sesión que guarda el propio reloj. */
export async function parsearFIT(buf: ArrayBuffer): Promise<ActividadReloj | null> {
  const { default: FitParser } = await import('fit-file-parser')
  const parser = new FitParser({ force: true, speedUnit: 'm/s', lengthUnit: 'm', mode: 'list' })
  const datos = await new Promise<any>((res, rej) => parser.parse(buf, (err: unknown, d: unknown) => (err ? rej(err) : res(d))))
  const s = datos?.sessions?.[0]
  if (!s) return null
  const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : null)
  const dur = n(s.total_timer_time) ?? n(s.total_elapsed_time) ?? 0
  return {
    deporte: deporteDe(String(s.sport ?? '') + ' ' + String(s.sub_sport ?? '')),
    nombre: '',
    inicio: s.start_time ? new Date(s.start_time).toISOString() : null,
    duracionS: Math.round(dur),
    distanciaM: n(s.total_distance) !== null ? Math.round(s.total_distance) : null,
    desnivelM: n(s.total_ascent) !== null ? Math.round(s.total_ascent) : null,
    fcMedia: n(s.avg_heart_rate), fcMax: n(s.max_heart_rate),
    kcal: n(s.total_calories),
  }
}

/** Lee un archivo del reloj según su extensión. Lanza un error con un texto para el usuario si no se puede. */
export async function leerArchivoReloj(nombre: string, contenido: { texto: () => Promise<string>; binario: () => Promise<ArrayBuffer> }): Promise<ActividadReloj> {
  const ext = nombre.toLowerCase().split('.').pop()
  let a: ActividadReloj | null = null
  if (ext === 'gpx') a = parsearGPX(await contenido.texto())
  else if (ext === 'tcx') a = parsearTCX(await contenido.texto())
  else if (ext === 'fit') a = await parsearFIT(await contenido.binario())
  else throw new Error('Usa un archivo .fit, .gpx o .tcx exportado de tu reloj o de su app')
  if (!a || a.duracionS <= 0) throw new Error('No hemos encontrado ningún entreno en ese archivo')
  return a
}

/** "45:12" o "1 h 05 min". */
export function formatoDuracion(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), seg = s % 60
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m}:${String(seg).padStart(2, '0')}`
}

/** Ritmo por km ("5:12 /km") para carrera y caminata; velocidad ("24,3 km/h") para bici. */
export function ritmoOVelocidad(a: Pick<ActividadReloj, 'deporte' | 'duracionS' | 'distanciaM'>): string | null {
  if (!a.distanciaM || !a.duracionS) return null
  if (a.deporte === 'bici') return `${(a.distanciaM / 1000 / (a.duracionS / 3600)).toLocaleString('es-ES', { maximumFractionDigits: 1 })} km/h`
  if (a.deporte === 'correr' || a.deporte === 'caminar') {
    const sPorKm = Math.round(a.duracionS / (a.distanciaM / 1000)) // redondeo antes de partir: nunca "4:60"
    return `${Math.floor(sPorKm / 60)}:${String(sPorKm % 60).padStart(2, '0')} /km`
  }
  return null
}

/** Resumen corto: "🏃 Carrera · 10,2 km · 52:30 · 5:09 /km · ♥ 152". */
export function resumenActividad(a: ActividadReloj): string {
  const d = DEPORTES[a.deporte]
  return [
    `${d.icono} ${a.nombre || d.nombre}`,
    a.distanciaM ? `${(a.distanciaM / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} km` : null,
    formatoDuracion(a.duracionS),
    ritmoOVelocidad(a),
    a.fcMedia ? `♥ ${a.fcMedia}` : null,
  ].filter(Boolean).join(' · ')
}
