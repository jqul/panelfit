import { WeekPlan, DayPlan, Exercise } from '../types'

// xlsx (SheetJS) se carga solo al importar de verdad — misma razón que en
// exportWorkout.ts: dependencia pesada, uso ocasional. Aquí además SÍ es
// contenido no confiable (un archivo que sube el propio usuario), así que
// solo se leen valores de celda — nunca se evalúan fórmulas ni macros.
async function loadXLSX() {
  return await import('xlsx')
}

// Alias de cabecera reconocidos, para aceptar tanto un archivo exportado por
// PanelFit como uno que un entrenador arme a mano en Excel desde cero.
const HEADER_ALIASES: Record<string, string[]> = {
  semana: ['semana', 'week'],
  dia: ['día', 'dia', 'day'],
  enfoque: ['enfoque', 'focus'],
  ejercicio: ['ejercicio', 'exercise', 'exercicio', 'nombre'],
  series: ['series x reps', 'series', 'sets', 'series/reps'],
  peso: ['peso', 'weight', 'carga'],
  principal: ['principal', 'main'],
  comentario: ['comentario', 'comment', 'comentarios', 'notas'],
  descansoSeries: ['descanso series (s)', 'descanso series', 'rest sets', 'descanso entre series'],
  descansoTras: ['descanso tras ejercicio (s)', 'descanso tras ejercicio', 'rest after'],
}

function normalizeKey(k: string): string {
  return k.toLowerCase().trim()
}

function buildHeaderMap(sampleRow: Record<string, unknown>): Partial<Record<keyof typeof HEADER_ALIASES, string>> {
  const keys = Object.keys(sampleRow)
  const map: Partial<Record<keyof typeof HEADER_ALIASES, string>> = {}
  for (const canon of Object.keys(HEADER_ALIASES) as (keyof typeof HEADER_ALIASES)[]) {
    const found = keys.find(k => HEADER_ALIASES[canon].includes(normalizeKey(k)))
    if (found) map[canon] = found
  }
  return map
}

export interface ParsedWorkout {
  name: string
  weeks: WeekPlan[]
}

// ── Formato alternativo: bloques de día + semanas en columnas ──────
// Muy habitual cuando se programa a mano: varios bloques de día en la misma
// hoja (cada uno con un título de una sola celda, p.ej. "LUNES — EMPUJE"),
// seguido de una cabecera "Ejercicio / Series x Reps / S1 @5 / S2 @6 / ...".
// Los mismos ejercicios se repiten en todas las semanas — lo que cambia por
// columna es el peso (se rellena semana a semana, puede venir vacío) y el
// RPE objetivo, que va pegado al número de semana en la propia cabecera.
const WEEK_COL_RE = /^(?:s|sem|semana|w|week)\s*0*(\d+)\b\s*(.*)$/i

interface RawDayBlock {
  title: string
  weekCols: { index: number; weekNum: number; label: string }[]
  exercises: { name: string; sets: string; weights: Record<number, string> }[]
}

function parseBlockFormat(rawRows: unknown[][]): Omit<ParsedWorkout, 'name'> | null {
  const grid = rawRows.map(r => (r || []).map(c => (c === undefined || c === null ? '' : String(c).trim())))
  const blocks: RawDayBlock[] = []
  let i = 0
  while (i < grid.length) {
    const row = grid[i]
    if (row.every(c => c === '')) { i++; continue }

    const col0 = (row[0] || '').toLowerCase()
    if (!['ejercicio', 'exercise', 'nombre'].includes(col0)) { i++; continue }

    const weekCols: RawDayBlock['weekCols'] = []
    for (let c = 1; c < row.length; c++) {
      const m = row[c].match(WEEK_COL_RE)
      if (m) weekCols.push({ index: c, weekNum: parseInt(m[1], 10), label: m[2].trim() })
    }
    if (weekCols.length === 0) { i++; continue } // cabecera de ejercicio "normal", no de este formato

    // El título del día es la fila de una sola celda justo antes de la cabecera
    let title = `Día ${blocks.length + 1}`
    for (let back = i - 1; back >= 0; back--) {
      const prev = grid[back].filter(c => c !== '')
      if (prev.length === 0) continue
      if (prev.length === 1) title = prev[0]
      break
    }

    i++
    const exercises: RawDayBlock['exercises'] = []
    while (i < grid.length && grid[i].some(c => c !== '') && grid[i][0] !== '') {
      const r = grid[i]
      const weights: Record<number, string> = {}
      weekCols.forEach(wc => { const v = r[wc.index] || ''; if (v) weights[wc.weekNum] = v })
      exercises.push({ name: r[0], sets: r[1] || '', weights })
      i++
    }
    if (exercises.length) blocks.push({ title, weekCols, exercises })
  }

  if (blocks.length === 0) return null
  const weekNums = Array.from(new Set(blocks.flatMap(b => b.weekCols.map(w => w.weekNum)))).sort((a, b) => a - b)
  if (weekNums.length === 0) return null

  const weeks: WeekPlan[] = weekNums.map((wn, idx) => {
    const rpe = blocks.flatMap(b => b.weekCols).find(w => w.weekNum === wn)?.label || ''
    const days: DayPlan[] = blocks.map(b => ({
      title: b.title,
      focus: '',
      exercises: b.exercises.map(ex => ({
        name: ex.name,
        sets: ex.sets,
        weight: ex.weights[wn] || '',
        isMain: false,
        comment: '',
        videoUrl: '',
      })),
    }))
    return { label: `Semana ${wn}`, rpe, isCurrent: idx === weekNums.length - 1, days }
  })

  return { weeks }
}

/**
 * Reconstruye semanas/días/ejercicios a partir de un .xlsx/.xls/.csv.
 * Reconoce dos formatos:
 *  1. Una fila por ejercicio y semana, agrupando por columnas "Semana" y
 *     "Día" — el que genera "Exportar a Excel" o uno hecho a mano siguiendo
 *     ese mismo esquema.
 *  2. Bloques de día con las semanas como columnas (ver parseBlockFormat) —
 *     el formato habitual al programar un bloque de olas a mano.
 */
export async function parseWorkoutExcel(file: File): Promise<ParsedWorkout> {
  const XLSX = await loadXLSX()
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })

  const sheetName = wb.SheetNames[0]
  if (!sheetName) throw new Error('El archivo no tiene ninguna hoja de cálculo')
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
  if (!rows.length) throw new Error('La hoja está vacía')

  const name = file.name.replace(/\.(xlsx|xls|csv)$/i, '').trim() || 'Workout importado'
  const headerMap = buildHeaderMap(rows[0])
  if (!headerMap.ejercicio) {
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
    const blockParsed = parseBlockFormat(raw)
    if (blockParsed) return { name, ...blockParsed }
    throw new Error('No se encontró una columna de ejercicio (ej. "Ejercicio") — revisa las cabeceras de la primera fila')
  }

  const get = (row: Record<string, unknown>, canon: keyof typeof HEADER_ALIASES): string => {
    const key = headerMap[canon]
    if (!key) return ''
    const v = row[key]
    return v === undefined || v === null ? '' : String(v).trim()
  }

  const weeksOrder: string[] = []
  const weeksData = new Map<string, { daysOrder: string[]; days: Map<string, { focus: string; exercises: Exercise[] }> }>()

  rows.forEach(row => {
    const exName = get(row, 'ejercicio')
    if (!exName || exName === '(sin ejercicios)') return

    const semanaLabel = get(row, 'semana') || 'Semana 1'
    const diaLabel = get(row, 'dia') || 'Día 1'

    if (!weeksData.has(semanaLabel)) { weeksOrder.push(semanaLabel); weeksData.set(semanaLabel, { daysOrder: [], days: new Map() }) }
    const week = weeksData.get(semanaLabel)!
    if (!week.days.has(diaLabel)) { week.daysOrder.push(diaLabel); week.days.set(diaLabel, { focus: get(row, 'enfoque'), exercises: [] }) }
    const day = week.days.get(diaLabel)!

    const principal = get(row, 'principal').toLowerCase()
    const restSets = parseInt(get(row, 'descansoSeries'), 10)
    const restAfter = parseInt(get(row, 'descansoTras'), 10)

    day.exercises.push({
      name: exName,
      sets: get(row, 'series'),
      weight: get(row, 'peso'),
      isMain: ['sí', 'si', 'true', 'x', 'yes'].includes(principal),
      comment: get(row, 'comentario'),
      videoUrl: '',
      ...(Number.isFinite(restSets) ? { restSets } : {}),
      ...(Number.isFinite(restAfter) ? { restAfter } : {}),
    })
  })

  if (weeksOrder.length === 0) throw new Error('No se encontró ningún ejercicio con nombre en la hoja')

  const weeks: WeekPlan[] = weeksOrder.map((label, i) => {
    const week = weeksData.get(label)!
    const days: DayPlan[] = week.daysOrder.map(dayLabel => {
      const day = week.days.get(dayLabel)!
      return { title: dayLabel, focus: day.focus, exercises: day.exercises }
    })
    return { label, rpe: '', isCurrent: i === weeksOrder.length - 1, days }
  })

  return { name, weeks }
}
