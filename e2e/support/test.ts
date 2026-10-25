import { test as base, expect } from '@playwright/test'
import { FakeSupabase } from './fakeSupabase'

// `fake` es el Supabase simulado de esa prueba. Al terminar, la prueba falla si la app hizo alguna
// petición que el simulador no entiende o si la página lanzó un error de JavaScript sin capturar.
// `erroresEsperados`: patrones de errores de página que ESA prueba provoca a propósito (p. ej. una
// descarga que se bloquea); se declaran en la prueba, no se toleran en general.
export const test = base.extend<{ fake: FakeSupabase; erroresEsperados: RegExp[] }>({
  erroresEsperados: async ({}, use) => { await use([]) },
  fake: async ({ context, page, erroresEsperados }, use) => {
    const fake = new FakeSupabase()
    await fake.attach(context)
    const pageErrors: string[] = []
    page.on('pageerror', e => pageErrors.push(e.message))
    await use(fake)
    expect(fake.unhandled, 'peticiones que el Supabase simulado no entiende').toEqual([])
    expect(fake.publicReads, 'lecturas de ficheros por URL pública (los buckets de fotos y vídeos son privados)').toEqual([])
    expect(pageErrors.filter(m => !erroresEsperados.some(re => re.test(m))), 'errores de JavaScript en la página').toEqual([])
  },
})
export { expect }
