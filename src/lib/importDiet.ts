import { Meal } from '../components/shared/DietEditor'

// xlsx (SheetJS) se carga solo al importar de verdad — misma razón que en
// importWorkout.ts: dependencia pesada, uso ocasional, y contenido no
// confiable (un archivo que sube el propio usuario) — solo se leen valores
// de celda, nunca se evalúan fórmulas ni macros.
async function loadXLSX() {
  return await import('xlsx')
}

// Alias de cabecera reconocidos, para aceptar tanto un archivo exportado
// desde PanelFit como uno que el entrenador arme a mano en Excel desde cero.
const HEADER_ALIASES: Record<string, string[]> = {
  comida: ['comida', 'meal', 'nombre'],
  hora: ['hora', 'time'],
  kcal: ['kcal', 'calorias', 'calorías', 'calories'],
  alimento: ['alimento', 'item', 'ingrediente', 'food'],
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

export interface ParsedDiet {
  meals: Meal[]
}

/**
 * Reconstruye las comidas de un plan a partir de un .xlsx/.xls/.csv — una
 * fila por alimento, agrupando por "Comida"+"Hora" (mismas dos columnas =
 * mismo plato). El kcal de la comida se toma del primer valor no vacío que
 * aparezca en sus filas — no hace falta repetirlo en cada fila, basta con
 * ponerlo una vez.
 */
export async function parseDietExcel(file: File): Promise<ParsedDiet> {
  const XLSX = await loadXLSX()
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })

  const sheetName = wb.SheetNames[0]
  if (!sheetName) throw new Error('El archivo no tiene ninguna hoja de cálculo')
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
  if (!rows.length) throw new Error('La hoja está vacía')

  const headerMap = buildHeaderMap(rows[0])
  if (!headerMap.comida || !headerMap.alimento) {
    throw new Error('No se encontraron las columnas "Comida" y "Alimento" — revisa las cabeceras de la primera fila')
  }

  const get = (row: Record<string, unknown>, canon: keyof typeof HEADER_ALIASES): string => {
    const key = headerMap[canon]
    if (!key) return ''
    const v = row[key]
    return v === undefined || v === null ? '' : String(v).trim()
  }

  const order: string[] = []
  const byKey = new Map<string, { time: string; name: string; kcal: number; items: string[] }>()

  rows.forEach(row => {
    const alimento = get(row, 'alimento')
    const nombre = get(row, 'comida')
    if (!alimento || !nombre) return

    const hora = get(row, 'hora') || '08:00'
    const key = `${nombre}__${hora}`
    if (!byKey.has(key)) { order.push(key); byKey.set(key, { time: hora, name: nombre, kcal: 0, items: [] }) }
    const meal = byKey.get(key)!

    if (meal.kcal === 0) {
      const kcalStr = get(row, 'kcal')
      const kcal = parseInt(kcalStr, 10)
      if (Number.isFinite(kcal)) meal.kcal = kcal
    }
    meal.items.push(alimento)
  })

  if (order.length === 0) throw new Error('No se encontró ninguna fila con Comida y Alimento rellenos')

  const meals: Meal[] = order.map((key, i) => {
    const m = byKey.get(key)!
    return { id: `meal_import_${Date.now()}_${i}`, time: m.time, name: m.name, kcal: m.kcal, items: m.items }
  })

  return { meals }
}
