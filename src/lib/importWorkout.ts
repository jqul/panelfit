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

/**
 * Reconstruye semanas/días/ejercicios a partir de un .xlsx/.xls/.csv — una
 * fila por ejercicio, agrupando por columna "Semana" y "Día" en el orden en
 * que aparecen. Acepta tanto el formato exacto que genera "Exportar a
 * Excel" como uno hecho a mano, mientras tenga al menos una columna de
 * nombre de ejercicio reconocible.
 */
export async function parseWorkoutExcel(file: File): Promise<ParsedWorkout> {
  const XLSX = await loadXLSX()
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })

  const sheetName = wb.SheetNames[0]
  if (!sheetName) throw new Error('El archivo no tiene ninguna hoja de cálculo')
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: '' })
  if (!rows.length) throw new Error('La hoja está vacía')

  const headerMap = buildHeaderMap(rows[0])
  if (!headerMap.ejercicio) {
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

  const name = file.name.replace(/\.(xlsx|xls|csv)$/i, '').trim() || 'Workout importado'
  return { name, weeks }
}
