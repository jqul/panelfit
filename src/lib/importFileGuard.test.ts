import { describe, it, expect } from 'vitest'
import { assertImportFileIsSafe } from './importFileGuard'

function makeFile(name: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], name)
}

describe('assertImportFileIsSafe', () => {
  it('acepta .xlsx, .xls y .csv dentro del límite de tamaño', () => {
    expect(() => assertImportFileIsSafe(makeFile('rutina.xlsx', 1024))).not.toThrow()
    expect(() => assertImportFileIsSafe(makeFile('rutina.xls', 1024))).not.toThrow()
    expect(() => assertImportFileIsSafe(makeFile('rutina.csv', 1024))).not.toThrow()
  })

  it('rechaza extensiones no soportadas', () => {
    expect(() => assertImportFileIsSafe(makeFile('rutina.exe', 1024))).toThrow(/Formato no soportado/)
    expect(() => assertImportFileIsSafe(makeFile('rutina.xlsm', 1024))).toThrow(/Formato no soportado/)
  })

  it('rechaza archivos por encima de 5MB', () => {
    expect(() => assertImportFileIsSafe(makeFile('rutina.xlsx', 6 * 1024 * 1024))).toThrow(/pesa demasiado/)
  })

  it('rechaza archivos vacíos', () => {
    expect(() => assertImportFileIsSafe(makeFile('rutina.xlsx', 0))).toThrow(/vacío/)
  })
})
