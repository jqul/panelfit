import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// Solo se pinta: no hace falta Supabase (y en CI no hay .env).
vi.mock('../../lib/supabase', () => ({ supabase: {} }))
import { CuestionarioCliente, type CuestionarioPendiente } from './CuestionarioCliente'

const cuestionario: CuestionarioPendiente = {
  template_id: 't', schedule_id: null, nombre: 'Inicial', trainer_id: 'tr',
  preguntas: [
    { id: 'a', type: 'scale', label: 'Energía', required: true },
    { id: 'b', type: 'number', label: 'Peso', unit: 'kg' },
    { id: 'c', type: 'yesno', label: '¿Lesión?' },
    { id: 'd', type: 'choice', label: 'Días', options: ['2', '3'] },
    { id: 'e', type: 'multi', label: 'Qué cuesta', options: ['Dormir', 'Dieta'] },
    { id: 'f', type: 'short', label: 'Objetivo' },
    { id: 'g', type: 'text', label: 'Comentarios' },
    { id: 'h', type: 'date', label: 'Desde cuándo' },
  ],
}

describe('CuestionarioCliente', () => {
  const html = renderToStaticMarkup(<CuestionarioCliente cuestionario={cuestionario} clientId="c" onEnviado={() => {}} />)

  it('pinta un control adecuado para cada tipo', () => {
    expect((html.match(/role="radio"/g) || []).length).toBe(10 + 2 + 2) // escala 1-10, sí/no, 2 opciones
    expect((html.match(/role="checkbox"/g) || []).length).toBe(2)       // varias opciones
    expect(html).toContain('type="number"')
    expect(html).toContain('>kg<')
    expect(html).toContain('type="date"')
    expect(html).toContain('<textarea')
    expect(html).toContain('Puedes marcar varias.')
  })

  it('marca las obligatorias y nada sale como respondido de inicio', () => {
    expect(html).toContain('aria-label="obligatoria"')
    expect(html).not.toContain('aria-checked="true"')
  })
})
