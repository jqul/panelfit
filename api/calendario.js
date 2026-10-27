// Calendario del cliente en formato iCal (RFC 5545) para suscribirse desde Google Calendar, Apple Calendario u
// Outlook: /api/calendario?t=<token>. El token es el de `calendario_enlaces` (lo activa el cliente en Más y lo puede
// cambiar o quitar); la función de base de datos `calendario_datos` solo devuelve lo que va al calendario.
//
// Es una función de Vercel: lee con la clave pública (anon), como la app; no guarda nada.

const TOKEN = /^[a-f0-9]{32,64}$/
const DIA_ICAL = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] // 0 = lunes, como `diasElegidos`
const MOTIVO = { viaje: 'Viaje', trabajo: 'Trabajo', enfermedad: 'Enfermedad', lesion: 'Lesión', otro: 'Ausencia' }

/** Escapa texto según RFC 5545 (\ , ; y saltos de línea). */
export function escapar(texto) {
  return String(texto ?? '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

/** Parte las líneas de más de 75 octetos (la continuación empieza con un espacio), sin cortar un carácter UTF-8. */
export function plegar(linea) {
  const enc = new TextEncoder()
  if (enc.encode(linea).length <= 75) return linea
  const partes = []
  let actual = ''
  for (const ch of linea) {
    const limite = partes.length === 0 ? 75 : 74
    if (enc.encode(actual + ch).length > limite) { partes.push(actual); actual = ch } else actual += ch
  }
  partes.push(actual)
  return partes.join('\r\n ')
}

const fecha = f => String(f).slice(0, 10).replace(/-/g, '')
const instante = iso => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
function sumarDias(f, n) {
  const d = new Date(String(f).slice(0, 10) + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
/** Primer día de la semana `dia` (0 = lunes) en o después de `desde`. */
function primerDia(desde, dia) {
  const d = new Date(String(desde).slice(0, 10) + 'T12:00:00Z')
  const hoy = (d.getUTCDay() + 6) % 7
  return sumarDias(desde, (dia - hoy + 7) % 7)
}

/** Construye el .ics a partir de lo que devuelve `calendario_datos`. Puro: se prueba sin red. */
export function construirIcs(datos, ahora = new Date()) {
  const stamp = instante(ahora.toISOString())
  const lineas = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PanelFit//Calendario del cliente//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:PanelFit', `X-WR-CALDESC:${escapar(`Tus entrenos, sesiones y fechas clave con ${datos.entrenador || 'tu entrenador'}`)}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H',
  ]
  const evento = campos => lineas.push('BEGIN:VEVENT', `DTSTAMP:${stamp}`, ...campos, 'END:VEVENT')

  for (const c of datos.citas || []) {
    evento([`UID:cita-${c.id}@panelfit`, `DTSTART:${instante(c.inicio)}`, `DTEND:${instante(c.fin)}`,
      `SUMMARY:${escapar(`${c.titulo || 'Sesión'} con ${datos.entrenador || 'tu entrenador'}`)}`])
  }
  for (const e of datos.eventos || []) {
    evento([`UID:evento-${e.id}@panelfit`, `DTSTART;VALUE=DATE:${fecha(e.fecha)}`, `DTEND;VALUE=DATE:${fecha(sumarDias(e.fecha, 1))}`,
      `SUMMARY:${escapar(`🏁 ${e.nombre}`)}`, `DESCRIPTION:${escapar(`Fecha clave (prioridad ${e.prioridad})`)}`, 'TRANSP:TRANSPARENT'])
  }
  for (const a of datos.ausencias || []) {
    evento([`UID:ausencia-${a.id}@panelfit`, `DTSTART;VALUE=DATE:${fecha(a.desde)}`, `DTEND;VALUE=DATE:${fecha(sumarDias(a.hasta, 1))}`,
      `SUMMARY:${escapar(`Sin entrenar: ${MOTIVO[a.motivo] || 'Ausencia'}`)}`, 'TRANSP:TRANSPARENT'])
  }
  // Días de entreno elegidos: un evento de día completo que se repite cada semana hasta que acaba el plan.
  const ent = datos.entreno
  if (ent && Array.isArray(ent.dias) && ent.dias.length && ent.inicio && ent.semanas > 0) {
    const fin = sumarDias(ent.inicio, ent.semanas * 7 - 1)
    for (const dia of ent.dias) {
      if (!(dia >= 0 && dia <= 6)) continue
      const primero = primerDia(ent.inicio, dia)
      if (primero > fin) continue
      evento([`UID:entreno-${fecha(ent.inicio)}-${dia}@panelfit`, `DTSTART;VALUE=DATE:${fecha(primero)}`, `DTEND;VALUE=DATE:${fecha(sumarDias(primero, 1))}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${DIA_ICAL[dia]};UNTIL=${fecha(fin)}`,
        `SUMMARY:${escapar(ent.programa ? `Entreno · ${ent.programa}` : 'Entreno')}`,
        `DESCRIPTION:${escapar('Ábrelo en PanelFit para ver los ejercicios de hoy.')}`, 'TRANSP:TRANSPARENT'])
    }
  }
  lineas.push('END:VCALENDAR')
  return lineas.map(plegar).join('\r\n') + '\r\n'
}

function responder(res, estado, cuerpo, tipo = 'text/plain; charset=utf-8') {
  res.statusCode = estado
  res.setHeader('Content-Type', tipo)
  res.end(cuerpo)
}

export default async function handler(req, res) {
  const token = new URL(req.url || '/', 'http://localhost').searchParams.get('t')
  if (!TOKEN.test(token || '')) return responder(res, 400, 'Enlace de calendario no válido')

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const clave = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !clave) return responder(res, 503, 'Calendario no disponible ahora mismo')

  let datos = null
  try {
    const r = await fetch(`${url}/rest/v1/rpc/calendario_datos`, {
      method: 'POST',
      headers: { apikey: clave, Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: token }),
    })
    if (!r.ok) return responder(res, 502, 'Calendario no disponible ahora mismo')
    datos = await r.json()
  } catch {
    return responder(res, 502, 'Calendario no disponible ahora mismo')
  }
  if (!datos) return responder(res, 404, 'Este calendario ya no existe: actívalo de nuevo desde PanelFit')

  // Privado (la dirección es secreta) y fresco unos minutos: las apps de calendario lo piden cada pocas horas.
  res.setHeader('Cache-Control', 'private, max-age=900')
  res.setHeader('Content-Disposition', 'inline; filename="panelfit.ics"')
  responder(res, 200, construirIcs(datos), 'text/calendar; charset=utf-8')
}
