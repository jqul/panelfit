import { describe, it, expect, vi } from 'vitest'
vi.mock('./supabase', () => ({ supabase: {} }))
import { nombreSeguro, problemaArchivo, quienLoVe, tamanoLegible, tituloDesdeNombre } from './documentos'

describe('problemaArchivo', () => {
  it('admite PDF, imágenes y ofimática hasta 20 MB', () => {
    expect(problemaArchivo({ type: 'application/pdf', size: 1000 })).toBeNull()
    expect(problemaArchivo({ type: 'image/png', size: 20 * 1024 * 1024 })).toBeNull()
  })
  it('rechaza otros tipos y lo que pasa de 20 MB', () => {
    expect(problemaArchivo({ type: 'application/x-msdownload', size: 10 })).toMatch(/no se admite/)
    expect(problemaArchivo({ type: 'application/pdf', size: 20 * 1024 * 1024 + 1 })).toMatch(/20 MB/)
  })
})

describe('nombres', () => {
  it('nombre seguro para la ruta: sin acentos, espacios ni símbolos', () => {
    expect(nombreSeguro('Guía de técnica (v2).pdf')).toBe('Guia-de-tecnica-v2-.pdf')
    expect(nombreSeguro('¿?.pdf')).toBe('.pdf')
    expect(nombreSeguro('***')).toBe('archivo')
  })
  it('título por defecto: el nombre sin extensión', () => {
    expect(tituloDesdeNombre('Normas_del-centro.pdf')).toBe('Normas del centro')
  })
})

describe('tamanoLegible', () => {
  it('B, KB y MB con coma decimal', () => {
    expect(tamanoLegible(500)).toBe('500 B')
    expect(tamanoLegible(2048)).toBe('2 KB')
    expect(tamanoLegible(1.5 * 1024 * 1024)).toBe('1,5 MB')
  })
})

describe('quienLoVe', () => {
  const etiquetas = [{ id: 'a', name: 'Online' }, { id: 'b', name: 'VIP' }]
  it('una frase por visibilidad', () => {
    expect(quienLoVe({ visibilidad: 'oculto', etiquetas: [] }, etiquetas)).toBe('Oculto: solo tú')
    expect(quienLoVe({ visibilidad: 'todos', etiquetas: [] }, etiquetas)).toBe('Todos tus clientes')
    expect(quienLoVe({ visibilidad: 'etiquetas', etiquetas: ['a', 'b'] }, etiquetas)).toBe('Clientes con Online, VIP')
    expect(quienLoVe({ visibilidad: 'etiquetas', etiquetas: ['borrada'] }, etiquetas)).toBe('Nadie (no has elegido etiquetas)')
  })
})
