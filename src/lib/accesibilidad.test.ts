import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Un botón que solo contiene un icono (<X />) no tiene nombre para un lector de pantalla ni para quien
// navega con teclado y voz: necesita aria-label (o title). Esta prueba lo comprueba en todo src/.

const raíz = join(process.cwd(), 'src')

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap(n => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? archivos(p) : p.endsWith('.tsx') ? [p] : []
  })
}

// Pendientes de etiquetar: están en archivos que otras ramas estaban reescribiendo cuando se hizo esta prueba.
// Quitar de aquí cuando se arreglen; la prueba falla si una excepción ya no hace falta.
const PENDIENTES = new Set([
  'components/trainer/ProgramasTab.tsx',
])

function soloIcono(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const f of archivos(raíz)) {
    const src = readFileSync(f, 'utf8')
    // <button ...> <Icono className="..." /> </button>, sin texto ni más hijos
    for (const m of src.matchAll(/<button\b([^>]*)>\s*<[A-Z][A-Za-z0-9]*(?:\s[^>]*)?\/>\s*<\/button>/g)) {
      if (/aria-label|aria-labelledby|\btitle=/.test(m[1])) continue
      const rel = f.slice(raíz.length + 1).replace(/\\/g, '/')
      out[rel] = (out[rel] ?? 0) + 1
    }
  }
  return out
}

describe('accesibilidad: botones de solo icono', () => {
  const sin = soloIcono()

  it('todos tienen nombre accesible (salvo los pendientes conocidos)', () => {
    const nuevos = Object.entries(sin).filter(([f]) => !PENDIENTES.has(f))
    expect(nuevos, `Faltan aria-label en: ${nuevos.map(([f, n]) => `${f} (${n})`).join(', ')}`).toEqual([])
  })

  it('la lista de pendientes no tiene entradas que ya estén arregladas', () => {
    const arregladas = [...PENDIENTES].filter(f => !(f in sin))
    expect(arregladas, `Quita de PENDIENTES: ${arregladas.join(', ')}`).toEqual([])
  })
})
