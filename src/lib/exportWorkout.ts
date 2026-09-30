import { TrainingTemplate } from '../types'

// xlsx (SheetJS) se carga solo cuando se exporta de verdad — es una
// dependencia pesada para algo que se usa ocasionalmente, no tiene sentido
// meterla en el bundle inicial. Instalada desde el propio CDN de SheetJS
// (no del registro de npm): la copia publicada en npm tiene CVEs de
// prototype pollution y ReDoS sin parche; SheetJS deja de publicar ahí y
// mantiene los parches solo en su CDN — ver github.com/SheetJS/sheetjs#npm.
async function loadXLSX() {
  return await import('xlsx')
}

function sanitizeSheetName(name: string): string {
  // Los nombres de hoja de Excel no admiten : \ / ? * [ ] y tienen un máximo de 31 caracteres
  return name.replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Workout'
}

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, ' ').trim() || 'workout'
}

/** Una fila por ejercicio — separada de la escritura del archivo para poder
 * testear la forma de los datos sin pasar por la I/O de SheetJS. */
export function buildWorkoutRows(template: TrainingTemplate): Record<string, string | number>[] {
  const rows: Record<string, string | number>[] = []
  template.weeks.forEach((week, wi) => {
    week.days.forEach((day, di) => {
      const exercises = day.exercises || []
      if (exercises.length === 0) {
        rows.push({
          'Semana': week.label || `Semana ${wi + 1}`,
          'Día': day.title || `Día ${di + 1}`,
          'Enfoque': day.focus || '',
          'Ejercicio': '(sin ejercicios)',
        })
        return
      }
      exercises.forEach(ex => {
        rows.push({
          'Semana': week.label || `Semana ${wi + 1}`,
          'Día': day.title || `Día ${di + 1}`,
          'Enfoque': day.focus || '',
          'Ejercicio': ex.name,
          'Series x Reps': ex.sets || '',
          'Peso': ex.weight || '',
          'Principal': ex.isMain ? 'Sí' : '',
          'Comentario': ex.comment || '',
          'Descanso series (s)': ex.restSets ?? '',
          'Descanso tras ejercicio (s)': ex.restAfter ?? '',
        })
      })
    })
  })
  return rows
}

const COLUMN_WIDTHS = [
  { wch: 20 }, // Semana
  { wch: 22 }, // Día
  { wch: 22 }, // Enfoque
  { wch: 28 }, // Ejercicio
  { wch: 14 }, // Series x Reps
  { wch: 10 }, // Peso
  { wch: 10 }, // Principal
  { wch: 34 }, // Comentario
  { wch: 12 }, // Descanso series
  { wch: 14 }, // Descanso tras ejercicio
]

/**
 * Exporta un workout (plantilla reutilizable) a un .xlsx — una fila por
 * ejercicio, con la semana y el día como columnas para poder filtrar/ordenar
 * en la propia hoja. Pensado para imprimir en sala o compartir con alguien
 * que no usa PanelFit.
 */
export async function exportWorkoutToExcel(template: TrainingTemplate) {
  const XLSX = await loadXLSX()
  const ws = XLSX.utils.json_to_sheet(buildWorkoutRows(template))
  ws['!cols'] = COLUMN_WIDTHS

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(template.name))
  XLSX.writeFile(wb, `${sanitizeFileName(template.name)}.xlsx`)
}
