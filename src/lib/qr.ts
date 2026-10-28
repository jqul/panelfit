// Código QR de un enlace, dibujado como un solo trazo SVG (sin imágenes ni servicios externos: el enlace no sale del
// dispositivo). Usa qrcode-generator (MIT, sin dependencias) para calcular los módulos.

import qrcode from 'qrcode-generator'

const MARGEN = 4 // módulos en blanco alrededor (el mínimo que piden los lectores)

export interface QrRuta {
  /** Lado del dibujo en módulos, con el margen. */
  tamano: number
  /** Trazo SVG con todos los módulos oscuros (una fila de módulos seguidos = un solo rectángulo). */
  d: string
}

export function qrRuta(texto: string): QrRuta {
  const qr = qrcode(0, 'M') // versión automática, corrección de errores media
  qr.addData(texto)
  qr.make()
  const n = qr.getModuleCount()
  let d = ''
  for (let r = 0; r < n; r++) {
    let c = 0
    while (c < n) {
      if (!qr.isDark(r, c)) { c++; continue }
      const ini = c
      while (c < n && qr.isDark(r, c)) c++
      d += `M${ini + MARGEN} ${r + MARGEN}h${c - ini}v1h${ini - c}z`
    }
  }
  return { tamano: n + MARGEN * 2, d }
}

/** El QR como fichero SVG completo (para descargarlo e imprimirlo). */
export function qrSvg(texto: string): string {
  const { tamano, d } = qrRuta(texto)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tamano} ${tamano}" width="512" height="512" shape-rendering="crispEdges">` +
    `<rect width="${tamano}" height="${tamano}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`
}
