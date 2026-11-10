import type { TrainingLogs, TrainingPlan } from '../types'
import { historialPorEjercicio } from './historialEjercicio'
import { volumenLog } from './volumen'
import { cuentaEnProgreso } from './cuentaEnProgreso'
import { compartirImagen, recortar } from './tarjetaEntreno'

// Tarjeta «Mi mes» para compartir en redes: entrenos, toneladas y series del mes y los récords que batió (su 1RM
// estimado de ese mes frente al mejor de antes), con la marca de su entrenador al pie. Mismo estilo que la tarjeta del
// entreno (lib/tarjetaEntreno). Este módulo se carga al pulsar.

export interface RecordMes { name: string; ahora: number; antes: number }
export interface ResumenMes { mes: string; sesiones: number; volumen: number; series: number; records: RecordMes[] }

const r1 = (n: number) => Math.round(n * 10) / 10
const kg = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 })

/** `mes` 'YYYY-MM'. Los récords: ejercicios cuyo mejor 1RM estimado del mes supera al mejor de antes (si había antes). */
export function resumenMes(logs: TrainingLogs, plan: TrainingPlan | null | undefined, mes: string): ResumenMes {
  const delMes = Object.values(logs || {}).filter(l => l?.done && l.dateDone?.startsWith(mes) && cuentaEnProgreso(l))
  const sesiones = new Set(delMes.map(l => l.dateDone)).size
  const volumen = Math.round(delMes.reduce((s, l) => s + volumenLog(l), 0))
  const series = delMes.reduce((s, l) => s + Object.values(l.sets || {}).filter(x => parseInt(String(x?.reps ?? '')) > 0).length, 0)

  const records: RecordMes[] = []
  for (const h of historialPorEjercicio(logs, plan)) {
    const ahora = Math.max(0, ...h.sesiones.filter(x => x.date.startsWith(mes)).map(x => x.e1rm))
    const antes = Math.max(0, ...h.sesiones.filter(x => x.date < `${mes}-01`).map(x => x.e1rm))
    if (antes > 0 && ahora > antes) records.push({ name: h.name, ahora: r1(ahora), antes: r1(antes) })
  }
  records.sort((a, b) => (b.ahora - b.antes) - (a.ahora - a.antes) || a.name.localeCompare(b.name, 'es'))
  return { mes, sesiones, volumen, series, records }
}

export function nombreMes(mes: string): string {
  const t = new Date(`${mes}-15T12:00:00`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export function textoMes(r: ResumenMes, marca?: string): string {
  return [
    `📅 Mi ${nombreMes(r.mes).toLowerCase()} en números`,
    `🏋️ ${r.sesiones} entrenos · ${kg(r.volumen / 1000)} t movidas · ${r.series} series`,
    r.records.length ? `🏆 ${r.records.slice(0, 3).map(x => `${x.name} ${kg(x.ahora)} kg (+${kg(r1(x.ahora - x.antes))})`).join(', ')}` : null,
    marca ? `Entrenando con ${marca}` : 'Hecho con PanelFit',
  ].filter(Boolean).join('\n')
}

const W = 1080, H = 1350, M = 90

export async function dibujarTarjetaMes(r: ResumenMes, marca?: string): Promise<Blob> {
  try { await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready } catch { /* sin API de fuentes */ }
  const acento = '#d9a066', ok = '#7bd69a'
  const fuente = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif'
  const serif = 'Georgia, "Times New Roman", serif'
  const fondo = '#1d1a17', texto = '#f6f1e9', suave = 'rgba(246,241,233,0.62)', caja = 'rgba(246,241,233,0.07)'

  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('canvas no disponible')
  ctx.fillStyle = fondo; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = acento; ctx.fillRect(0, 0, W, 14)

  let y = M + 40
  ctx.fillStyle = acento
  ctx.font = `700 30px ${fuente}`
  ctx.fillText('MI MES EN NÚMEROS', M, y)
  y += 110
  ctx.fillStyle = texto
  ctx.font = `700 84px ${serif}`
  ctx.fillText(recortar(ctx, nombreMes(r.mes), W - 2 * M), M, y)

  y += 60
  const datos: [string, string][] = [['Entrenos', String(r.sesiones)], ['Toneladas', kg(r1(r.volumen / 1000))], ['Series', String(r.series)]]
  const gap = 24, bw = (W - 2 * M - 2 * gap) / 3, bh = 190
  datos.forEach(([label, valor], i) => {
    const x = M + i * (bw + gap)
    ctx.fillStyle = caja
    ctx.beginPath(); ctx.roundRect(x, y, bw, bh, 28); ctx.fill()
    ctx.fillStyle = texto
    ctx.font = `700 72px ${fuente}`
    ctx.fillText(recortar(ctx, valor, bw - 48), x + 28, y + 100)
    ctx.fillStyle = suave
    ctx.font = `600 26px ${fuente}`
    ctx.fillText(label.toUpperCase(), x + 28, y + 152)
  })
  y += bh + 90

  ctx.fillStyle = suave
  ctx.font = `700 26px ${fuente}`
  ctx.fillText(r.records.length ? 'RÉCORDS DEL MES · 1RM ESTIMADO' : 'RÉCORDS DEL MES', M, y)
  y += 70
  if (!r.records.length) {
    ctx.fillStyle = suave
    ctx.font = `500 36px ${fuente}`
    ctx.fillText('Constancia, que es lo que hace los récords 💪', M, y)
  }
  const caben = Math.max(1, Math.floor((H - M - 120 - y) / 80))
  for (const x of r.records.slice(0, caben)) {
    const detalle = `${kg(x.ahora)} kg`
    const mejora = `+${kg(r1(x.ahora - x.antes))}`
    ctx.font = `700 42px ${fuente}`
    ctx.fillStyle = ok
    ctx.textAlign = 'right'
    ctx.fillText(mejora, W - M, y)
    const anchoMejora = ctx.measureText(mejora).width
    ctx.fillStyle = texto
    ctx.fillText(detalle, W - M - anchoMejora - 28, y)
    const anchoDetalle = ctx.measureText(detalle).width
    ctx.textAlign = 'left'
    ctx.font = `500 40px ${fuente}`
    ctx.fillStyle = suave
    ctx.fillText(recortar(ctx, `🏆 ${x.name}`, W - 2 * M - anchoMejora - anchoDetalle - 70), M, y)
    ctx.fillStyle = caja
    ctx.fillRect(M, y + 28, W - 2 * M, 2)
    y += 80
  }
  if (r.records.length > caben) {
    ctx.font = `500 32px ${fuente}`
    ctx.fillStyle = suave
    ctx.fillText(`y ${r.records.length - caben} récords más`, M, y)
  }

  ctx.font = `600 30px ${fuente}`
  ctx.fillStyle = marca ? acento : suave
  ctx.fillText(recortar(ctx, marca ? `Entrenando con ${marca}` : 'Hecho con PanelFit', W - 2 * M), M, H - M + 20)

  return await new Promise<Blob>((ok2, ko) => c.toBlob(b => b ? ok2(b) : ko(new Error('no se pudo crear la imagen')), 'image/png'))
}

export async function compartirTarjetaMes(r: ResumenMes, marca?: string) {
  return compartirImagen(await dibujarTarjetaMes(r, marca), `mi-mes-${r.mes}.png`, textoMes(r, marca))
}
