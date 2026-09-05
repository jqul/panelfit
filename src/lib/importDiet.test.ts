import { describe, it, expect } from 'vitest'
import { parseDietExcel } from './importDiet'

async function buildFile(rows: Record<string, unknown>[], filename = 'dieta.xlsx'): Promise<File> {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Hoja1')
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return new File([buffer], filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

describe('parseDietExcel', () => {
  it('groups consecutive rows with the same Comida+Hora into one meal, in order', async () => {
    const file = await buildFile([
      { Comida: 'Desayuno', Hora: '08:00', Kcal: 700, Alimento: 'Avena 60g' },
      { Comida: 'Desayuno', Hora: '08:00', Kcal: '', Alimento: 'Leche 250ml' },
      { Comida: 'Comida', Hora: '14:00', Kcal: 900, Alimento: 'Arroz 150g' },
      { Comida: 'Comida', Hora: '14:00', Kcal: '', Alimento: 'Pollo 200g' },
    ])
    const { meals } = await parseDietExcel(file)
    expect(meals).toHaveLength(2)
    expect(meals[0]).toMatchObject({ name: 'Desayuno', time: '08:00', kcal: 700, items: ['Avena 60g', 'Leche 250ml'] })
    expect(meals[1]).toMatchObject({ name: 'Comida', time: '14:00', kcal: 900, items: ['Arroz 150g', 'Pollo 200g'] })
  })

  it('accepts header aliases in English and different casing', async () => {
    const file = await buildFile([
      { meal: 'Snack', time: '11:00', calories: 300, food: 'Yogur griego 200g' },
    ])
    const { meals } = await parseDietExcel(file)
    expect(meals).toEqual([{ id: expect.any(String), name: 'Snack', time: '11:00', kcal: 300, items: ['Yogur griego 200g'] }])
  })

  it('defaults the time to 08:00 when the Hora column is missing or blank', async () => {
    const file = await buildFile([{ Comida: 'Cena', Alimento: 'Salmón 180g' }])
    const { meals } = await parseDietExcel(file)
    expect(meals[0].time).toBe('08:00')
  })

  it('skips rows missing Comida or Alimento instead of creating an empty meal', async () => {
    const file = await buildFile([
      { Comida: 'Desayuno', Hora: '08:00', Kcal: 700, Alimento: 'Avena 60g' },
      { Comida: '', Hora: '10:00', Kcal: 200, Alimento: 'Fruta' },
      { Comida: 'Comida', Hora: '14:00', Kcal: 900, Alimento: '' },
    ])
    const { meals } = await parseDietExcel(file)
    expect(meals).toHaveLength(1)
    expect(meals[0].name).toBe('Desayuno')
  })

  it('throws a clear error when the Comida/Alimento columns are missing', async () => {
    const file = await buildFile([{ Nombre: 'Algo', Valor: 1 }])
    await expect(parseDietExcel(file)).rejects.toThrow(/Comida.*Alimento/)
  })

  it('throws a clear error for an empty sheet', async () => {
    const file = await buildFile([])
    await expect(parseDietExcel(file)).rejects.toThrow(/vacía/)
  })
})
