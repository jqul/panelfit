import { describe, it, expect } from 'vitest'
import { TrainingTemplate } from '../types'
import { buildWorkoutRows } from './exportWorkout'
import { parseWorkoutExcel } from './importWorkout'

// exportWorkoutToExcel en sí llama a XLSX.writeFile, que decide cómo guardar
// según el entorno (navegador real vs Node) — probado a mano en el navegador,
// sin errores. Aquí se prueba lo que sí es lógica propia y necesita
// verificación real: que buildWorkoutRows + parseWorkoutExcel hacen un
// roundtrip fiel, construyendo el .xlsx en memoria con las mismas utilidades
// de SheetJS que usa el export real (json_to_sheet + write), sin pasar por
// disco.
async function buildFile(rows: Record<string, unknown>[], filename = 'test.xlsx'): Promise<File> {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Hoja1')
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return new File([buffer], filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

// Para el formato de bloques de día + semanas en columnas hace falta una
// hoja con filas "sueltas" (título de día, fila en blanco...) que no encajan
// en json_to_sheet (pensado para una fila = un objeto con las mismas claves).
async function buildFileFromRows(rows: unknown[][], filename = 'test.xlsx'): Promise<File> {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Hoja1')
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return new File([buffer], filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

function sampleTemplate(): TrainingTemplate {
  return {
    id: 'tmpl_test', trainerId: 'trainer_test',
    name: 'Workout de prueba', type: 'Fuerza', description: '',
    createdAt: 0, updatedAt: 0,
    weeks: [
      {
        label: 'Semana 1', rpe: '@8', isCurrent: false,
        days: [
          {
            title: 'Día A — Pierna', focus: 'Cuádriceps',
            exercises: [
              { name: 'Sentadilla barra', sets: '4×8', weight: '100kg', isMain: true, comment: 'Profundidad completa', restSets: 180, restAfter: 120 },
              { name: 'Prensa 45°', sets: '3×12', weight: '160kg', isMain: false, comment: '' },
            ],
          },
        ],
      },
      {
        label: 'Semana 2', rpe: '@9', isCurrent: true,
        days: [
          {
            title: 'Día A — Pierna', focus: 'Cuádriceps +2.5kg',
            exercises: [
              { name: 'Sentadilla barra', sets: '4×8', weight: '102.5kg', isMain: true, comment: 'Profundidad completa', restSets: 180, restAfter: 120 },
            ],
          },
        ],
      },
    ],
  }
}

describe('buildWorkoutRows → parseWorkoutExcel (roundtrip real, mismas utilidades de SheetJS)', () => {
  it('reconstruye semanas, días y ejercicios idénticos a los exportados', async () => {
    const original = sampleTemplate()
    const rows = buildWorkoutRows(original)
    const file = await buildFile(rows, `${original.name}.xlsx`)

    const parsed = await parseWorkoutExcel(file)

    expect(parsed.name).toBe('Workout de prueba')
    expect(parsed.weeks).toHaveLength(2)
    expect(parsed.weeks[0].label).toBe('Semana 1')
    expect(parsed.weeks[1].label).toBe('Semana 2')
    // la última semana del archivo se marca como la actual al reimportar
    expect(parsed.weeks[1].isCurrent).toBe(true)

    const week1Day = parsed.weeks[0].days[0]
    expect(week1Day.title).toBe('Día A — Pierna')
    expect(week1Day.focus).toBe('Cuádriceps')
    expect(week1Day.exercises).toHaveLength(2)

    const squat = week1Day.exercises[0]
    expect(squat.name).toBe('Sentadilla barra')
    expect(squat.sets).toBe('4×8')
    expect(squat.weight).toBe('100kg')
    expect(squat.isMain).toBe(true)
    expect(squat.comment).toBe('Profundidad completa')
    expect(squat.restSets).toBe(180)
    expect(squat.restAfter).toBe(120)

    const press = week1Day.exercises[1]
    expect(press.name).toBe('Prensa 45°')
    expect(press.isMain).toBe(false)

    // Semana 2 refleja la progresión de peso real, no un valor pegado
    expect(parsed.weeks[1].days[0].exercises[0].weight).toBe('102.5kg')
  })

  it('rechaza un archivo sin columna de ejercicio reconocible', async () => {
    const file = await buildFile([{ Foo: 'bar', Baz: 1 }], 'sin-columna.xlsx')
    await expect(parseWorkoutExcel(file)).rejects.toThrow(/columna de ejercicio/)
  })

  it('acepta cabeceras alternativas (ej. hecho a mano, en inglés)', async () => {
    const file = await buildFile([
      { Week: 'W1', Day: 'Push', Exercise: 'Bench press', Sets: '5x5', Weight: '80kg' },
    ], 'manual.xlsx')
    const parsed = await parseWorkoutExcel(file)
    expect(parsed.weeks[0].label).toBe('W1')
    expect(parsed.weeks[0].days[0].title).toBe('Push')
    expect(parsed.weeks[0].days[0].exercises[0].name).toBe('Bench press')
  })

  it('reconoce el formato de bloques de día con semanas en columnas', async () => {
    // Reproduce la estructura real de un bloque de olas hecho a mano: varios
    // días en la misma hoja, cada uno con su título, una cabecera
    // "Ejercicio / Series x Reps / S1 @5 / S2 @6 / ..." y los mismos
    // ejercicios repetidos con el peso de cada semana en su columna.
    const rows: unknown[][] = [
      ['LUNES — EMPUJE'],
      ['Ejercicio', 'Series x Reps', 'S1 @5', 'S2 @6'],
      ['Sentadilla pesada', '4x5', '', ''],
      ['Press banca pesado', '4x5', '100kg', '102.5kg'],
      [],
      ['MARTES — TIRÓN'],
      ['Ejercicio', 'Series x Reps', 'S1 @5', 'S2 @6'],
      ['Peso muerto', '4x5', '', ''],
    ]
    const file = await buildFileFromRows(rows, 'Power_Otono_26.xlsx')
    const parsed = await parseWorkoutExcel(file)

    expect(parsed.name).toBe('Power_Otono_26')
    expect(parsed.weeks).toHaveLength(2)
    expect(parsed.weeks[0].label).toBe('Semana 1')
    expect(parsed.weeks[0].rpe).toBe('@5')
    expect(parsed.weeks[1].rpe).toBe('@6')
    expect(parsed.weeks[1].isCurrent).toBe(true)

    expect(parsed.weeks[0].days).toHaveLength(2)
    expect(parsed.weeks[0].days[0].title).toBe('LUNES — EMPUJE')
    expect(parsed.weeks[0].days[0].exercises).toHaveLength(2)
    expect(parsed.weeks[0].days[1].title).toBe('MARTES — TIRÓN')

    // El mismo ejercicio en las dos semanas, con el peso de su propia columna
    expect(parsed.weeks[0].days[0].exercises[1].weight).toBe('100kg')
    expect(parsed.weeks[1].days[0].exercises[1].weight).toBe('102.5kg')
    // Semana sin peso apuntado todavía -> vacío, no un valor inventado
    expect(parsed.weeks[0].days[0].exercises[0].weight).toBe('')
  })
})
