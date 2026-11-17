import { describe, it, expect } from 'vitest'
import { contextoCliente, type EtiquetaLite } from './contextoCliente'

const e = (id: string): EtiquetaLite => ({ id, name: id, emoji: '🏷️', color: '#000' })
const todas = [e('a'), e('b'), e('c'), e('d')]

describe('contextoCliente', () => {
  it('el objetivo en palabras del cliente manda sobre el tipo; «general» no dice nada', () => {
    expect(contextoCliente({ main_goal: ' Competir en abril ', objetivo: 'hipertrofia' }, []).objetivo).toBe('Competir en abril')
    expect(contextoCliente({ objetivo: 'hipertrofia' }, []).objetivo).toBe('hipertrofia')
    expect(contextoCliente({ objetivo: 'general' }, []).objetivo).toBeNull()
    expect(contextoCliente({ objetivo: 'General' }, []).objetivo).toBeNull()
    expect(contextoCliente({ main_goal: '  ', objetivo: undefined }, []).objetivo).toBeNull()
  })

  it('solo las etiquetas del cliente, en el orden del entrenador, y cuántas quedan fuera', () => {
    const r = contextoCliente({ label_ids: ['d', 'a', 'c'] }, todas, 2)
    expect(r.etiquetas.map(x => x.id)).toEqual(['a', 'c'])
    expect(r.resto).toBe(1)
  })

  it('sin etiquetas, o con una etiqueta borrada, no inventa nada', () => {
    expect(contextoCliente({}, todas)).toMatchObject({ etiquetas: [], resto: 0 })
    expect(contextoCliente({ label_ids: ['borrada'] }, todas)).toMatchObject({ etiquetas: [], resto: 0 })
  })
})
