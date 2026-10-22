import { describe, it, expect } from 'vitest'

// Guardia: media, client-videos y exercise-videos son buckets privados (fotos de
// progreso y vídeos de técnica). `getPublicUrl` sobre ellos genera una URL que no
// abre nada y, además, deja en la base de datos una URL "pública" que invita a
// confundirse. Hay que guardar la ruta y firmar al mostrar (lib/signedMedia.ts).
// trainer-assets (logos) y trainer-videos son públicos a propósito.
describe('buckets privados', () => {
  const PRIVADOS = /storage\s*\.\s*from\(\s*['"](media|client-videos|exercise-videos)['"]\s*\)\s*\.\s*getPublicUrl/
  const fuentes = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

  it('ningún archivo pide una URL pública de un bucket privado', () => {
    expect(Object.keys(fuentes).length).toBeGreaterThan(100)
    const infractores = Object.entries(fuentes).filter(([f, txt]) => !/\.test\.tsx?$/.test(f) && PRIVADOS.test(txt)).map(([f]) => f)
    expect(infractores).toEqual([])
  })
})
