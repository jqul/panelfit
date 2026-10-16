import { describe, it, expect } from 'vitest'

// Guardia: el texto más pequeño de las pantallas de la app es 11 px. `text-[10px]` se
// convirtió en toda la app; esta prueba evita que vuelva a colarse.
// Excepciones con motivo: InformePDF (documento con maquetación propia para imprimir) y las
// pantallas públicas de captación/acceso (Landing*, Auth, PlanGate), que no se tocaron.
describe('tamaño mínimo de texto', () => {
  const PERMITIDOS = /(^|[\\/])(InformePDF|LandingPrecios|LandingSoftwareEntrenador|Auth|PlanGate)\.tsx$|\.test\.tsx?$/
  const fuentes = import.meta.glob('/src/**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
  it('ningún componente de la app usa text-[10px]', () => {
    expect(Object.keys(fuentes).length).toBeGreaterThan(100)
    const infractores = Object.entries(fuentes).filter(([f, txt]) => !PERMITIDOS.test(f) && txt.includes('text-[10px]')).map(([f]) => f)
    expect(infractores).toEqual([])
  })
})
