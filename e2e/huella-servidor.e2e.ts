import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { huellaAdmision } from './support/huellaServidor'

// No abre el navegador: comprueba que la copia en TypeScript de la huella SHA-256 (la del simulador de las pruebas e2e) da exactamente lo mismo que la función SQL de la base
// de datos (migración 20261122000020), con los MISMOS vectores que comprueba el runner PGlite contra la función real. Si alguna de las dos normalizaciones cambia, falla una de las dos.
type Resp = unknown
const vectores = JSON.parse(readFileSync(new URL('../supabase/hardening/tests/huella_vectores.json', import.meta.url), 'utf8')) as {
  fijos: { nombre: string; respuestas: Resp; huella: string | null }[]
  equivalentes: { nombre: string; casos: Resp[] }[]
  distintos: { nombre: string; base: Resp; otros: Resp[] }[]
}

test.describe('huella SHA-256 de las fichas (copia del simulador = función SQL)', () => {
  for (const f of vectores.fijos) {
    test(`fijo: ${f.nombre}`, () => {
      expect(f.huella, 'el vector debe tener su huella fijada (node supabase/hardening/tests/run-pglite-parq-revisado.mjs --fijar)').not.toBeNull()
      expect(huellaAdmision(f.respuestas)).toBe(f.huella)
    })
  }
  for (const g of vectores.equivalentes) {
    test(`equivalentes: ${g.nombre}`, () => {
      const hs = g.casos.map(huellaAdmision)
      expect(new Set(hs).size).toBe(1)
      expect(hs[0]).toMatch(/^[0-9a-f]{64}$/)
    })
  }
  for (const g of vectores.distintos) {
    test(`distintos: ${g.nombre}`, () => {
      const hs = [g.base, ...g.otros].map(huellaAdmision)
      expect(new Set(hs).size).toBe(hs.length)
    })
  }
  test('es determinista: la misma ficha da siempre la misma huella', () => {
    const r = [{ pregunta: 'A', respuesta: 'Sí' }, { pregunta: 'B', respuesta: 'No' }]
    expect(huellaAdmision(r)).toBe(huellaAdmision(JSON.parse(JSON.stringify(r))))
  })
})
