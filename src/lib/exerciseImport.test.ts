import { describe, it, expect } from 'vitest'
import { parseImportText, MAX_IMPORT_ROWS, readImportFile } from './exerciseImport'

const names = (p: ReturnType<typeof parseImportText>) => p.nuevos.map(n => n.name)

describe('importar ejercicios', () => {
  it('una lista pegada, un nombre por línea, quita viñetas y números', () => {
    const p = parseImportText('Sentadilla goblet\n- Peso muerto rumano\n2. Remo con mancuerna\n\n  Face pull  ', [])
    expect(names(p)).toEqual(['Sentadilla goblet', 'Peso muerto rumano', 'Remo con mancuerna', 'Face pull'])
  })

  it('una coma dentro del nombre no parte la línea si no hay cabecera', () => {
    expect(names(parseImportText('Press banca, agarre cerrado', []))).toEqual(['Press banca, agarre cerrado'])
  })

  it('CSV con cabecera: nombre, grupo y material en cualquier orden, con coma, punto y coma o tabulador', () => {
    const csv = 'Grupo;Material;Nombre\nPierna;Barra;Sentadilla trasera\nEspalda;polea;Jalón al pecho\n'
    expect(parseImportText(csv, []).nuevos).toEqual([
      { name: 'Sentadilla trasera', category: 'Pierna', material: 'Barra' },
      { name: 'Jalón al pecho', category: 'Espalda', material: 'Polea' },
    ])
    expect(parseImportText('nombre,grupo\nCurl,Bíceps', []).nuevos).toEqual([{ name: 'Curl', category: 'Bíceps', material: undefined }])
    expect(parseImportText('ejercicio\tmaterial\nDominadas\tpeso corporal', []).nuevos[0]).toMatchObject({ name: 'Dominadas', material: 'Peso corporal' })
  })

  it('un material que no se reconoce no descarta la fila', () => {
    expect(parseImportText('nombre,material\nCosa rara,inventado', []).nuevos).toEqual([{ name: 'Cosa rara', category: undefined, material: undefined }])
  })

  it('sin cabecera y con ; las columnas son nombre ; grupo ; material', () => {
    expect(parseImportText('Hip thrust;Glúteos;Barra', []).nuevos).toEqual([{ name: 'Hip thrust', category: 'Glúteos', material: 'Barra' }])
  })

  it('omite los que ya existen y los repetidos, sin distinguir tildes ni mayúsculas', () => {
    const p = parseImportText('Jalón al pecho\njalon AL pecho\nRemo\nRemo', ['Jalón al Pecho'])
    expect(names(p)).toEqual(['Remo'])
    expect(p.duplicados).toEqual(['Jalón al pecho', 'jalon AL pecho', 'Remo'])
  })

  it('descarta nombres absurdamente largos y limita el total', () => {
    const largo = 'x'.repeat(200)
    const p = parseImportText(`${largo}\nBueno`, [])
    expect(names(p)).toEqual(['Bueno'])
    expect(p.descartados[0]).toMatch(/demasiado largo/)
    const muchos = parseImportText(Array.from({ length: MAX_IMPORT_ROWS + 20 }, (_, i) => `Ejercicio ${i}`).join('\n'), [])
    expect(muchos.nuevos).toHaveLength(MAX_IMPORT_ROWS)
    expect(muchos.truncado).toBe(true)
  })

  it('tolera BOM, saltos de Windows y texto vacío', () => {
    expect(names(parseImportText('﻿nombre\r\nA\r\nB\r\n', []))).toEqual(['A', 'B'])
    expect(parseImportText('   \n\n', []).nuevos).toEqual([])
  })

  it('el archivo se valida antes de leerlo', async () => {
    const f = (name: string, content: string) => new File([content], name)
    await expect(readImportFile(f('lista.csv', 'nombre\nA'))).resolves.toContain('A')
    await expect(readImportFile(f('lista.txt', 'A'))).resolves.toBe('A')
    await expect(readImportFile(f('lista.xlsx', 'x'))).rejects.toThrow(/\.csv o \.txt/)
    await expect(readImportFile(f('lista.exe', 'x'))).rejects.toThrow(/Formato no soportado/)
    await expect(readImportFile(f('vacio.csv', ''))).rejects.toThrow(/vacío/)
  })
})
