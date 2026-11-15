import type { TrainingLogs, TrainingPlan } from '../types'
import { historialPorEjercicio } from './historialEjercicio'
import { compartirImagen, recortar } from './tarjetaEntreno'

// Historia de éxito: la tarjeta que el entrenador comparte de un cliente con buen progreso (tiempo juntos, sesiones,
// cuánto ha subido en sus ejercicios principales y, si se pesa, cuánto ha cambiado). Solo el nombre de pila y sin
// fotos: lo que se publica de un cliente, mejor con su permiso. Mismo estilo que las demás tarjetas. Se carga al pulsar.

export interface MejoraHistoria { name: string; antes: number; ahora: number }
export interface DatosHistoria { semanas: number; sesiones: number; mejoras: MejoraHistoria[]; peso: { antes: number; ahora: number } | null }

const r1 = (n: number) => Math.round(n * 10) / 10
const kg = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 })

export function datosHistoria(logs: TrainingLogs, plan: TrainingPlan | null | undefined, pesos: { date: string; weight: number }[], hoy: string): DatosHistoria | null {
  const fechas = [...new Set(Object.values(logs || {}).filter(l => l?.done && l.dateDone).map(l => l.dateDone!))].sort()
  if (!fechas.length) return null
  const semanas = Math.max(1, Math.round((new Date(hoy + 'T12:00:00').getTime() - new Date(fechas[0] + 'T12:00:00').getTime()) / (7 * 86400000)))
  const mejoras = historialPorEjercicio(logs, plan)
    .map(h => {
      const conPeso = [...h.sesiones].reverse().filter(s => s.e1rm > 0)
      if (conPeso.length < 2) return null
      return { name: h.name, antes: r1(conPeso[0].e1rm), ahora: r1(Math.max(...conPeso.map(s => s.e1rm))) }
    })
    .filter((m): m is MejoraHistoria => !!m && m.ahora > m.antes)
    .sort((a, b) => (b.ahora - b.antes) / b.antes - (a.ahora - a.antes) / a.antes)
    .slice(0, 3)
  const ps = [...pesos].filter(p => p.weight > 0).sort((a, b) => a.date.localeCompare(b.date))
  const peso = ps.length >= 2 && Math.abs(ps[ps.length - 1].weight - ps[0].weight) >= 0.5 ? { antes: ps[0].weight, ahora: ps[ps.length - 1].weight } : null
  return { semanas, sesiones: fechas.length, mejoras, peso }
}

export function textoHistoria(d: DatosHistoria, nombre: string, marca?: string): string {
  return [
    `⭐ ${nombre}: ${d.semanas} semanas y ${d.sesiones} entrenos`,
    ...d.mejoras.map(m => `📈 ${m.name}: ${kg(m.antes)} → ${kg(m.ahora)} kg (+${Math.round(((m.ahora - m.antes) / m.antes) * 100)} %)`),
    d.peso ? `⚖️ Peso: ${kg(d.peso.antes)} → ${kg(d.peso.ahora)} kg` : null,
    marca ? `Entrena con ${marca}` : null,
  ].filter(Boolean).join('\n')
}

const W = 1080, H = 1350, M = 90

export async function dibujarHistoria(d: DatosHistoria, nombre: string, marca?: string): Promise<Blob> {
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
  ctx.fillStyle = acento; ctx.font = `700 30px ${fuente}`
  ctx.fillText('HISTORIA DE ÉXITO', M, y)
  y += 110
  ctx.fillStyle = texto; ctx.font = `700 92px ${serif}`
  ctx.fillText(recortar(ctx, nombre, W - 2 * M), M, y)
  y += 64
  ctx.fillStyle = suave; ctx.font = `500 36px ${fuente}`
  ctx.fillText(`${d.semanas} semanas · ${d.sesiones} entrenos`, M, y)

  y += 80
  for (const m of d.mejoras) {
    const pct = Math.round(((m.ahora - m.antes) / m.antes) * 100)
    ctx.fillStyle = caja
    ctx.beginPath(); ctx.roundRect(M, y, W - 2 * M, 150, 28); ctx.fill()
    ctx.fillStyle = suave; ctx.font = `600 28px ${fuente}`
    ctx.fillText(recortar(ctx, m.name.toUpperCase(), W - 2 * M - 220), M + 32, y + 50)
    ctx.fillStyle = texto; ctx.font = `700 56px ${fuente}`
    ctx.fillText(`${kg(m.antes)} → ${kg(m.ahora)} kg`, M + 32, y + 118)
    ctx.fillStyle = ok; ctx.font = `700 52px ${fuente}`; ctx.textAlign = 'right'
    ctx.fillText(`+${pct} %`, W - M - 32, y + 100)
    ctx.textAlign = 'left'
    y += 174
  }
  if (d.peso) {
    ctx.fillStyle = suave; ctx.font = `500 36px ${fuente}`
    ctx.fillText(`⚖️ Peso: ${kg(d.peso.antes)} → ${kg(d.peso.ahora)} kg`, M, y + 30)
  }
  if (d.mejoras.length) {
    ctx.fillStyle = suave; ctx.font = `500 24px ${fuente}`
    ctx.fillText('1RM estimado', M, H - M - 40)
  }
  ctx.font = `600 32px ${fuente}`; ctx.fillStyle = acento
  ctx.fillText(recortar(ctx, marca ? `Entrena con ${marca}` : 'Hecho con PanelFit', W - 2 * M), M, H - M + 20)
  return await new Promise<Blob>((ok2, ko) => c.toBlob(b => b ? ok2(b) : ko(new Error('no se pudo crear la imagen')), 'image/png'))
}

export async function compartirHistoria(d: DatosHistoria, nombre: string, marca?: string) {
  const slug = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'cliente'
  return compartirImagen(await dibujarHistoria(d, nombre, marca), `historia-${slug}.png`, textoHistoria(d, nombre, marca))
}
