import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// El código fuente no lleva caracteres que no se ven. Las marcas de dirección de texto pueden hacer que una línea se lea distinta de como se ejecuta («Trojan Source»), y los de
// anchura cero o las marcas de orden de bytes dentro del fichero no se distinguen al revisar. Si hacen falta en una cadena o en una expresión regular, se escriben como escapes.
// Los códigos van como NÚMEROS a propósito (así esta prueba no contiene lo que busca).
const RANGOS: [number, number][] = [
  [0x00, 0x08], [0x0b, 0x0c], [0x0e, 0x1f], [0x7f, 0x7f], // controles (salvo tabulador y saltos de línea)
  [0xad, 0xad], [0x61c, 0x61c], [0x180e, 0x180e], // guion opcional y otras marcas sin dibujo
  [0x200b, 0x200f], [0x2028, 0x202e], [0x2060, 0x2064], [0x2066, 0x2069], // anchura cero, separadores y dirección de texto
  [0xfeff, 0xfeff], // marca de orden de bytes
]
const UNION_EMOJI = 0x200d // la «unión» de los emojis compuestos es normal junto a un emoji
const esInvisible = (cp: number) => RANGOS.some(([a, b]) => cp >= a && cp <= b)
const emoji = /\p{Extended_Pictographic}/u

/** Las líneas de un texto que llevan caracteres invisibles, con sus códigos. Se admite la marca de orden de bytes solo al principio del fichero. */
export function invisibles(texto: string): { linea: number; codigos: string[] }[] {
  return texto.split(/\r?\n/).flatMap((linea, i) => {
    const codigos = [...linea].map((c, k) => [c.codePointAt(0)!, k] as const)
      .filter(([cp, k]) => esInvisible(cp) && !(cp === 0xfeff && i === 0 && k === 0) && !(cp === UNION_EMOJI && emoji.test(linea)))
      .map(([cp]) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`)
    return codigos.length ? [{ linea: i + 1, codigos }] : []
  })
}

const CARPETAS = ['src', 'e2e', 'supabase', 'api', 'scripts', 'docs', 'public', '.github']
const EXTENSIONES = /\.(ts|tsx|js|jsx|cjs|mjs|sql|md|json|yml|yaml|html|css|toml)$/i
const SALTAR = new Set(['node_modules', 'dist', 'test-results', 'playwright-report', '.temp'])

function ficheros(dir: string): string[] {
  let nombres: string[]
  try { nombres = readdirSync(dir) } catch { return [] }
  return nombres.flatMap(n => {
    const ruta = join(dir, n)
    if (statSync(ruta).isDirectory()) return SALTAR.has(n) ? [] : ficheros(ruta)
    return EXTENSIONES.test(n) ? [ruta] : []
  })
}

describe('sin caracteres invisibles en el código', () => {
  const raiz = process.cwd()
  const todos = [...CARPETAS.flatMap(c => ficheros(join(raiz, c))), ...readdirSync(raiz).filter(n => EXTENSIONES.test(n) && n !== 'package-lock.json').map(n => join(raiz, n))]

  it('revisa de verdad el repositorio (no una carpeta vacía)', () => {
    expect(todos.length).toBeGreaterThan(500)
    for (const carpeta of ['src', 'e2e', 'supabase']) expect(todos.some(f => relative(raiz, f).startsWith(carpeta)), carpeta).toBe(true)
  })

  it('ningún fichero lleva marcas de dirección, anchura cero, controles ni marcas de orden de bytes escritos literalmente', () => {
    const hallados = todos.flatMap(f => invisibles(readFileSync(f, 'utf8')).map(h => `${relative(raiz, f)}:${h.linea} ${h.codigos.join(' ')}`))
    expect(hallados, 'escríbelos como escapes (barra invertida + u + código)').toEqual([])
  })

  it('el detector encuentra cada clase de carácter y deja pasar lo normal', () => {
    const con = (cp: number) => `a${String.fromCodePoint(cp)}b`
    for (const cp of [0x0001, 0x007f, 0x00ad, 0x200b, 0x200e, 0x200f, 0x2028, 0x202a, 0x202e, 0x2066, 0x2069, 0xfeff]) expect(invisibles(con(cp)), cp.toString(16)).toHaveLength(1)
    expect(invisibles(`${String.fromCodePoint(0xfeff)}primera línea`)).toEqual([]) // marca al principio del fichero
    expect(invisibles(`otra\n${String.fromCodePoint(0xfeff)}segunda`)).toHaveLength(1)
    expect(invisibles('tabulador\ty acentos: ñ á € … «»\r\nsegunda línea')).toEqual([])
    expect(invisibles(`entrenar ${String.fromCodePoint(0x1f3cb, 0xfe0f, 0x200d, 0x2642, 0xfe0f)}`)).toEqual([]) // emoji compuesto
    expect(invisibles(con(UNION_EMOJI))).toHaveLength(1) // la unión suelta, sin emoji, no
  })
})
