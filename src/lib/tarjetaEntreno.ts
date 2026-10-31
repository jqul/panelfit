// Tarjeta del entreno terminado para compartir como imagen (Instagram, WhatsApp...): el día, la duración, el volumen,
// las series, los récords y la mejor serie de cada ejercicio. Se dibuja en un canvas (sin librerías) y se comparte con
// el menú del móvil; donde no se puede compartir un archivo (ordenador), se descarga. Este módulo se carga al pulsar.

export interface EjercicioTarjeta { name: string; sets: { weight?: string; reps?: string; done?: boolean }[] }
export interface DatosTarjeta {
  titulo: string
  fecha: Date
  duracion: string
  volumen: number
  series: number
  ejercicios: EjercicioTarjeta[]
  records: { name: string; best: number }[]
}

const num = (v?: string) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0 }
const kg = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 })

/** Una línea por ejercicio con alguna serie hecha: su mejor serie («85×5») o, sin peso, cuántas series. */
export function lineasTarjeta(ejercicios: EjercicioTarjeta[]): { name: string; detalle: string }[] {
  return ejercicios.flatMap(e => {
    const hechas = e.sets.filter(s => s.done)
    if (!hechas.length) return []
    let mejor: { w: number; r: number } | null = null
    for (const s of hechas) {
      const w = num(s.weight), r = Math.round(num(s.reps))
      if (w > 0 && (!mejor || w > mejor.w || (w === mejor.w && r > mejor.r))) mejor = { w, r }
    }
    return [{ name: e.name, detalle: mejor ? `${kg(mejor.w)}×${mejor.r}` : `${hechas.length} ${hechas.length === 1 ? 'serie' : 'series'}` }]
  })
}

export function textoTarjeta(d: DatosTarjeta): string {
  return [
    `💪 ¡Entreno completado! — ${d.titulo}`,
    `⏱️ ${d.duracion} · 🏋️ ${kg(Math.round(d.volumen))} kg · ${d.series} series`,
    d.records.length ? `🏆 ${d.records.map(r => `${r.name} (${kg(r.best)} kg)`).join(', ')}` : null,
    'Hecho con PanelFit',
  ].filter(Boolean).join('\n')
}

const W = 1080, H = 1350, M = 90

function recortar(ctx: CanvasRenderingContext2D, t: string, max: number) {
  if (ctx.measureText(t).width <= max) return t
  let s = t
  while (s.length > 1 && ctx.measureText(s + '…').width > max) s = s.slice(0, -1)
  return s.trimEnd() + '…'
}

/** Hasta `lineas` líneas, partiendo por palabras; la última se recorta con «…». */
function partir(ctx: CanvasRenderingContext2D, t: string, max: number, lineas: number) {
  const out: string[] = []
  let cur = ''
  for (const p of t.split(/\s+/)) {
    const prueba = cur ? `${cur} ${p}` : p
    if (ctx.measureText(prueba).width <= max || !cur) cur = prueba
    else { out.push(cur); cur = p }
  }
  if (cur) out.push(cur)
  if (out.length <= lineas) return out
  return [...out.slice(0, lineas - 1), recortar(ctx, out.slice(lineas - 1).join(' '), max)]
}

export async function dibujarTarjeta(d: DatosTarjeta): Promise<Blob> {
  try { await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready } catch { /* sin API de fuentes */ }
  // Colores propios de la tarjeta (siempre oscura): los de la app están pensados para fondo claro
  const acento = '#d9a066', ok = '#7bd69a'
  const fuente = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif'
  const serif = 'Georgia, "Times New Roman", serif'

  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('canvas no disponible')
  const fondo = '#1d1a17', texto = '#f6f1e9', suave = 'rgba(246,241,233,0.62)', caja = 'rgba(246,241,233,0.07)'

  ctx.fillStyle = fondo
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = acento
  ctx.fillRect(0, 0, W, 14)
  ctx.textBaseline = 'alphabetic'

  let y = M + 40
  ctx.fillStyle = acento
  ctx.font = `700 30px ${fuente}`
  ctx.fillText('ENTRENO COMPLETADO', M, y)
  ctx.fillStyle = suave
  ctx.font = `500 30px ${fuente}`
  const fecha = d.fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  ctx.textAlign = 'right'
  ctx.fillText(fecha.charAt(0).toUpperCase() + fecha.slice(1), W - M, y)
  ctx.textAlign = 'left'

  y += 100
  ctx.fillStyle = texto
  ctx.font = `700 76px ${serif}`
  for (const l of partir(ctx, d.titulo, W - 2 * M, 2)) { ctx.fillText(l, M, y); y += 88 }

  // Tres datos
  y += 20
  const datos: [string, string][] = [['Duración', d.duracion], ['Volumen', `${kg(Math.round(d.volumen))} kg`], ['Series', String(d.series)]]
  const gap = 24, bw = (W - 2 * M - 2 * gap) / 3, bh = 170
  datos.forEach(([label, valor], i) => {
    const x = M + i * (bw + gap)
    ctx.fillStyle = caja
    ctx.beginPath(); ctx.roundRect(x, y, bw, bh, 28); ctx.fill()
    ctx.fillStyle = texto
    ctx.font = `700 56px ${fuente}`
    ctx.fillText(recortar(ctx, valor, bw - 48), x + 28, y + 88)
    ctx.fillStyle = suave
    ctx.font = `600 26px ${fuente}`
    ctx.fillText(label.toUpperCase(), x + 28, y + 136)
  })
  y += bh + 70

  // Récords
  for (const r of d.records.slice(0, 2)) {
    ctx.fillStyle = ok
    ctx.font = `700 36px ${fuente}`
    ctx.fillText(recortar(ctx, `🏆 Récord en ${r.name}: ${kg(r.best)} kg`, W - 2 * M), M, y)
    y += 58
  }
  if (d.records.length) y += 20

  // Ejercicios
  ctx.fillStyle = suave
  ctx.font = `700 26px ${fuente}`
  ctx.fillText('EJERCICIOS', M, y)
  y += 64
  const lineas = lineasTarjeta(d.ejercicios)
  const caben = Math.max(1, Math.floor((H - M - 110 - y) / 66))
  const mostrar = lineas.length > caben ? lineas.slice(0, caben - 1) : lineas
  for (const l of mostrar) {
    ctx.font = `700 38px ${fuente}`
    ctx.fillStyle = texto
    ctx.textAlign = 'right'
    ctx.fillText(l.detalle, W - M, y)
    const ancho = ctx.measureText(l.detalle).width
    ctx.textAlign = 'left'
    ctx.font = `500 38px ${fuente}`
    ctx.fillStyle = suave
    ctx.fillText(recortar(ctx, l.name, W - 2 * M - ancho - 40), M, y)
    ctx.fillStyle = caja
    ctx.fillRect(M, y + 24, W - 2 * M, 2)
    y += 66
  }
  if (mostrar.length < lineas.length) {
    ctx.font = `500 32px ${fuente}`
    ctx.fillStyle = suave
    ctx.fillText(`y ${lineas.length - mostrar.length} ejercicios más`, M, y)
  }

  ctx.font = `600 28px ${fuente}`
  ctx.fillStyle = suave
  ctx.fillText('Hecho con PanelFit', M, H - M + 20)

  return await new Promise<Blob>((ok2, ko) => c.toBlob(b => b ? ok2(b) : ko(new Error('no se pudo crear la imagen')), 'image/png'))
}

/** Comparte la tarjeta con el menú del sistema o, si no se puede compartir un archivo, la descarga. */
export async function compartirTarjeta(d: DatosTarjeta): Promise<'compartida' | 'descargada' | 'cancelada'> {
  const blob = await dibujarTarjeta(d)
  const y = d.fecha
  const nombre = `entreno-${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}.png`
  const file = new File([blob], nombre, { type: 'image/png' })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text: textoTarjeta(d) }); return 'compartida' }
    catch (e) { if ((e as Error)?.name === 'AbortError') return 'cancelada' }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nombre
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'descargada'
}
