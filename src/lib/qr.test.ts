import { describe, it, expect } from 'vitest'
import { qrRuta, qrSvg } from './qr'

describe('qrRuta', () => {
  it('da un cuadrado (21 módulos + 8 de margen para un enlace corto) con un trazo no vacío', () => {
    const q = qrRuta('https://panelfit.app/p/javier')
    expect(q.tamano).toBeGreaterThanOrEqual(21 + 8)
    expect((q.tamano - 8 - 17) % 4).toBe(0) // los QR miden 17 + 4·versión módulos de lado
    expect(q.d.startsWith('M')).toBe(true)
  })

  it('es determinista y cambia con el texto', () => {
    expect(qrRuta('https://a.es/p/x').d).toBe(qrRuta('https://a.es/p/x').d)
    expect(qrRuta('https://a.es/p/x').d).not.toBe(qrRuta('https://a.es/p/y').d)
  })

  it('un enlace más largo pide un QR más grande', () => {
    expect(qrRuta('https://panelfit.app/p/' + 'a'.repeat(60)).tamano).toBeGreaterThan(qrRuta('https://panelfit.app/p/a').tamano)
  })

  it('el trazo solo usa coordenadas dentro del dibujo', () => {
    const q = qrRuta('https://panelfit.app/p/javier')
    for (const m of q.d.matchAll(/M(\d+) (\d+)h(\d+)v1h-(\d+)z/g)) {
      const [x, y, w] = [Number(m[1]), Number(m[2]), Number(m[3])]
      expect(x).toBeGreaterThanOrEqual(4)
      expect(y).toBeGreaterThanOrEqual(4)
      expect(x + w).toBeLessThanOrEqual(q.tamano - 4)
      expect(y + 1).toBeLessThanOrEqual(q.tamano - 4)
    }
  })
})

describe('orientación', () => {
  it('los tres cuadrados de esquina están arriba a la izquierda, arriba a la derecha y abajo a la izquierda (no abajo a la derecha)', () => {
    const { tamano, d } = qrRuta('https://panelfit.app/p/javier')
    const fin = tamano - 4 // primera columna/fila del margen derecho/inferior
    expect(d).toContain('M4 4h7v1h-7z') // fila superior del cuadrado de arriba a la izquierda: 7 módulos oscuros
    expect(d).toContain(`M${fin - 7} 4h7v1h-7z`) // arriba a la derecha
    expect(d).toContain(`M4 ${fin - 7}h7v1h-7z`) // abajo a la izquierda
    expect(d).not.toContain(`M${fin - 7} ${fin - 7}h7v1h-7z`) // abajo a la derecha no lleva cuadrado de esquina
  })
})

describe('qrSvg', () => {
  it('es un SVG completo con fondo blanco y el trazo en negro', () => {
    const s = qrSvg('https://panelfit.app/p/javier')
    expect(s.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(s).toContain('fill="#fff"')
    expect(s).toContain('fill="#000"')
    expect(s.endsWith('</svg>')).toBe(true)
  })
})
