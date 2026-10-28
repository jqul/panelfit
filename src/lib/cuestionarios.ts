// Tipos de pregunta de las encuestas/cuestionarios y lo que comparten el editor del entrenador, la app del
// cliente y la impresión: validar, convertir una respuesta en texto y montar la hoja para imprimir. Todo puro.

export type TipoPregunta = 'scale' | 'number' | 'yesno' | 'choice' | 'multi' | 'short' | 'text' | 'date'

export interface Pregunta {
  id: string
  type: TipoPregunta
  label: string
  options?: string[]
  required?: boolean
  /** Número: unidad que se enseña al lado ("kg", "h"). */
  unit?: string
}

export const TIPOS: { id: TipoPregunta; icono: string; nombre: string; nueva: string }[] = [
  { id: 'scale',  icono: '📊', nombre: 'Escala 1-10',       nueva: 'Nueva pregunta (1-10)' },
  { id: 'number', icono: '🔢', nombre: 'Número',            nueva: '¿Cuánto pesas hoy?' },
  { id: 'yesno',  icono: '✅', nombre: 'Sí / No',           nueva: 'Nueva pregunta (Sí/No)' },
  { id: 'choice', icono: '🔘', nombre: 'Una opción',        nueva: 'Nueva pregunta de opción' },
  { id: 'multi',  icono: '☑️', nombre: 'Varias opciones',   nueva: '¿Qué te ha costado más? (marca las que quieras)' },
  { id: 'short',  icono: '✏️', nombre: 'Respuesta corta',   nueva: 'Nueva pregunta corta' },
  { id: 'text',   icono: '✍️', nombre: 'Texto libre',       nueva: 'Nueva pregunta abierta' },
  { id: 'date',   icono: '📅', nombre: 'Fecha',             nueva: '¿Cuándo empezó la molestia?' },
]

export const TIPO = Object.fromEntries(TIPOS.map(t => [t.id, t])) as Record<TipoPregunta, (typeof TIPOS)[number]>

export const conOpciones = (t: TipoPregunta) => t === 'choice' || t === 'multi'

/** Pregunta nueva de ese tipo, lista para editar. */
export function nuevaPregunta(type: TipoPregunta, id = `q_${Date.now()}`): Pregunta {
  return { id, type, required: false, label: TIPO[type].nueva, ...(conOpciones(type) ? { options: ['Opción A', 'Opción B'] } : {}) }
}

/** ¿Hay respuesta? (0 y "No" cuentan; vacío, null y una lista vacía no). */
export function respondida(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return false
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'number') return !isNaN(v)
  return true
}

/** Las obligatorias que faltan, en el orden del cuestionario. */
export function faltan(preguntas: Pregunta[], respuestas: Record<string, unknown>): Pregunta[] {
  return preguntas.filter(q => q.required && !respondida(respuestas[q.id]))
}

/** La respuesta como texto, para la lista de respuestas, WhatsApp o la hoja impresa. */
export function textoRespuesta(q: Pregunta, v: unknown): string {
  if (!respondida(v)) return '—'
  switch (q.type) {
    case 'yesno': return v === true || v === 'true' || v === 'Sí' ? 'Sí' : 'No'
    case 'scale': return `${v} / 10`
    case 'number': return `${String(v).replace('.', ',')}${q.unit ? ` ${q.unit}` : ''}`
    case 'multi': return (Array.isArray(v) ? v : [v]).join(', ')
    case 'date': {
      const d = new Date(String(v) + 'T12:00:00')
      return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    }
    default: return String(v)
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/**
 * Hoja para imprimir (o guardar en PDF desde el diálogo de imprimir): una o varias respuestas a un cuestionario,
 * cada una con su cliente y fecha. Todo lo que viene del usuario va escapado.
 */
export function hojaImprimible(titulo: string, preguntas: Pregunta[], respuestas: { cliente: string; fecha: number; answers: Record<string, unknown> }[]): string {
  const bloques = respuestas.map(r => `
    <section>
      <h2>${esc(r.cliente)}</h2>
      <p class="fecha">${esc(new Date(r.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</p>
      <dl>${preguntas.map(q => `<dt>${esc(q.label)}</dt><dd>${esc(textoRespuesta(q, r.answers?.[q.id]))}</dd>`).join('')}</dl>
    </section>`).join('')
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>
    body{font:14px/1.5 system-ui,sans-serif;color:#1a1814;margin:32px;max-width:720px}
    h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:0}.fecha{color:#675f56;margin:2px 0 12px;text-transform:capitalize}
    section{border-top:1px solid #d8d4ca;padding:16px 0;break-inside:avoid}
    dt{font-size:12px;color:#675f56;margin-top:10px}dd{margin:2px 0 0;white-space:pre-wrap}
    @media print{body{margin:0}}
  </style></head><body><h1>${esc(titulo)}</h1>${bloques}</body></html>`
}

/** Abre la hoja en una ventana y lanza el diálogo de imprimir. */
export function imprimir(html: string) {
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.open(); w.document.write(html); w.document.close()
  w.focus(); w.print()
  return true
}
