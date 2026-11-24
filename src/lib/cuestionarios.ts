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
  /**
   * Pregunta de seguimiento: solo se enseña (y solo cuenta) cuando OTRA pregunta Sí/No de este mismo cuestionario tiene esa respuesta
   * («¿Tienes alguna molestia?» → si Sí, «¿dónde y desde cuándo?»). Sin este campo, la pregunta se enseña siempre, como siempre.
   */
  mostrarSi?: { id: string; es: boolean }
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

/** La respuesta de una pregunta Sí/No como booleano, o null si no está contestada (o no es un Sí/No). Acepta lo que ya se guarda: true/false, 'true'/'false' y 'Sí'/'No'. */
const siNo = (v: unknown): boolean | null => v === true || v === 'true' || v === 'Sí' ? true : v === false || v === 'false' || v === 'No' ? false : null

/**
 * Las preguntas que hay que enseñar con estas respuestas, en su orden. Una pregunta con `mostrarSi` aparece solo si la pregunta de la que depende está visible Y contestada con
 * esa respuesta: con «No» (o sin contestar) no aparece, y si esa a su vez depende de otra, se encadena. Si la pregunta de la que depende no existe en el cuestionario (el entrenador
 * la borró) o no es de Sí/No, la condición no se aplica y la pregunta se enseña: nunca se esconde algo por una referencia rota. Lo mismo si las condiciones se citan entre sí en
 * círculo (cada una exigiría que la otra estuviera contestada y ninguna podría aparecer jamás).
 */
export function visibles(preguntas: Pregunta[], respuestas: Record<string, unknown>): Pregunta[] {
  const porId = new Map(preguntas.map(q => [q.id, q]))
  // ¿Siguiendo las condiciones de esta pregunta se vuelve a pasar por una que ya se ha visto? (también si depende de sí misma)
  const enCirculo = (q: Pregunta): boolean => {
    const vistas = new Set<string>()
    for (let p: Pregunta | undefined = q; p?.mostrarSi; p = porId.get(p.mostrarSi.id)) {
      if (vistas.has(p.id)) return true
      vistas.add(p.id)
    }
    return false
  }
  const memo = new Map<string, boolean>()
  const visible = (q: Pregunta): boolean => {
    const c = q.mostrarSi
    if (!c) return true
    const base = porId.get(c.id)
    if (!base || base.type !== 'yesno' || enCirculo(q)) return true
    const antes = memo.get(q.id)
    if (antes !== undefined) return antes
    const r = visible(base) && siNo(respuestas[base.id]) === c.es
    memo.set(q.id, r)
    return r
  }
  return preguntas.filter(visible)
}

/** Las obligatorias que faltan, en el orden del cuestionario. Una pregunta escondida por su condición no se exige. */
export function faltan(preguntas: Pregunta[], respuestas: Record<string, unknown>): Pregunta[] {
  return visibles(preguntas, respuestas).filter(q => q.required && !respondida(respuestas[q.id]))
}

/**
 * Lo que se envía de verdad: las respuestas contestadas de las preguntas que se enseñan. Lo que se escribió en una pregunta de seguimiento que luego se escondió (de «Sí» a «No»)
 * NO cuenta ni se guarda. Lo que no corresponde a ninguna pregunta del cuestionario se conserva como hasta ahora.
 */
export function respuestasActivas(preguntas: Pregunta[], respuestas: Record<string, unknown>): Record<string, unknown> {
  const escondidas = new Set(preguntas.map(q => q.id))
  for (const q of visibles(preguntas, respuestas)) escondidas.delete(q.id)
  return Object.fromEntries(Object.entries(respuestas).filter(([id, v]) => !escondidas.has(id) && respondida(v)))
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
