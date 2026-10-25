// Importar ejercicios para crear la biblioteca inicial: una lista de nombres pegada (uno por línea) o un CSV con
// columnas nombre / grupo / material. Todo puro: la pantalla enseña la vista previa y el hook inserta.

import { norm } from './globalSearch'
import { assertImportFileIsSafe } from './importFileGuard'
import { MATERIALES } from './exerciseLibrary'

export const MAX_IMPORT_ROWS = 500
export const MAX_NAME_LENGTH = 80

export interface ImportRow { name: string; category?: string; material?: string }
export interface ImportPreview {
  nuevos: ImportRow[]
  /** Ya estaban en la biblioteca (o repetidos en la propia lista): se omiten. */
  duplicados: string[]
  /** Líneas descartadas y por qué ("Nombre demasiado largo: ..."). */
  descartados: string[]
  /** Había más de MAX_IMPORT_ROWS filas: solo se importan las primeras. */
  truncado: boolean
}

const HEADER_NAME = ['nombre', 'ejercicio', 'name', 'exercise']
const HEADER_GROUP = ['grupo', 'grupo muscular', 'categoria', 'musculo', 'category', 'group']
const HEADER_MATERIAL = ['material', 'equipo', 'equipment']

/** Parte una línea por ; , o tabulador (lo que haya), respetando "comillas". */
function splitLine(line: string, sep: string): string[] {
  const out: string[] = []
  let cur = '', quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { if (quoted && line[i + 1] === '"') { cur += '"'; i++ } else quoted = !quoted }
    else if (ch === sep && !quoted) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out.map(s => s.trim())
}

/** El separador de la cabecera: el que más aparece en ella (Excel en español guarda con ;). */
function detectSeparator(lines: string[]): string {
  const head = lines[0]
  const n = (ch: string) => head.split(ch).length - 1
  const best = [';', '\t', ','].sort((a, b) => n(b) - n(a))[0]
  return n(best) > 0 ? best : ','
}

/** Normaliza el material escrito a uno de la lista ("barra olimpica" → Barra); si no se reconoce, se descarta el dato, no la fila. */
function parseMaterial(raw?: string): string | undefined {
  const n = norm(raw ?? '')
  if (!n) return undefined
  return MATERIALES.find(m => norm(m) === n || n.startsWith(norm(m).slice(0, 5)))
}

export function parseImportText(text: string, existingNames: Iterable<string>): ImportPreview {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const seen = new Set([...existingNames].map(norm))
  const preview: ImportPreview = { nuevos: [], duplicados: [], descartados: [], truncado: false }
  if (!lines.length) return preview

  // Con cabecera ("nombre,grupo,material") las columnas se buscan por su título. Sin cabecera solo separan columnas
  // ; o tabulador: una coma suelta forma parte del nombre ("Press banca, agarre cerrado"), y una línea sin
  // separador es un nombre entero.
  const sep = detectSeparator(lines)
  const first = splitLine(lines[0], sep).map(norm)
  const iName = first.findIndex(h => HEADER_NAME.includes(h))
  const hasHeader = iName >= 0
  const sepSinCabecera = lines.some(l => l.includes(';')) ? ';' : lines.some(l => l.includes('\t')) ? '\t' : null
  const col = hasHeader
    ? { name: iName, group: first.findIndex(h => HEADER_GROUP.includes(h)), material: first.findIndex(h => HEADER_MATERIAL.includes(h)) }
    : { name: 0, group: sepSinCabecera ? 1 : -1, material: sepSinCabecera ? 2 : -1 }

  for (const line of hasHeader ? lines.slice(1) : lines) {
    if (preview.nuevos.length >= MAX_IMPORT_ROWS) { preview.truncado = true; break }
    const cells = hasHeader ? splitLine(line, sep) : sepSinCabecera ? splitLine(line, sepSinCabecera) : [line]
    const name = (cells[col.name] ?? '').replace(/^[-•*\d.)\s]+(?=[A-Za-zÁÉÍÓÚÑáéíóúñ])/, '').trim()
    if (!name) continue
    if (name.length > MAX_NAME_LENGTH) { preview.descartados.push(`Nombre demasiado largo: ${name.slice(0, 30)}…`); continue }
    const key = norm(name)
    if (seen.has(key)) { preview.duplicados.push(name); continue }
    seen.add(key)
    preview.nuevos.push({
      name,
      category: (col.group >= 0 ? cells[col.group] : '') || undefined,
      material: parseMaterial(col.material >= 0 ? cells[col.material] : undefined),
    })
  }
  return preview
}

/** Lee un .csv (o .txt) subido; comprueba tamaño y extensión con las mismas reglas que las demás importaciones. */
export async function readImportFile(file: File): Promise<string> {
  if (file.name.toLowerCase().endsWith('.txt')) {
    if (file.size === 0) throw new Error('El archivo está vacío')
    if (file.size > 1024 * 1024) throw new Error('El archivo pesa demasiado (máx. 1MB)')
  } else {
    assertImportFileIsSafe(file)
    if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('Aquí solo se admite .csv o .txt (o pega la lista)')
  }
  return file.text()
}
