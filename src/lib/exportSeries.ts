import type { TrainingLogs, TrainingPlan } from '../types'
import { estimate1RM } from './strength'
import { cuentaEnProgreso } from './cuentaEnProgreso'

// Exportar el progreso de un cliente serie a serie (CSV para Excel): fecha, semana y día del plan, ejercicio, nº de
// serie, peso, reps, RIR y 1RM estimado. Separador ';' y coma decimal, con BOM, que es como lo abre Excel en español.
// Los registros marcados «No contar en el progreso» se exportan, pero se señalan. Puro salvo `descargarCSV`.

export interface FilaSerie {
  fecha: string; semana: number | ''; dia: string; ejercicio: string; serie: number
  peso: number | ''; reps: number; rir: number | ''; e1rm: number | ''; nota: string
}

const KEY_RE = /^ex_w(\d+)_d(\d+)_r(\d+)$/
const num = (v: unknown) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null }

export function filasSeries(logs: TrainingLogs, plan?: TrainingPlan | null): FilaSerie[] {
  const filas: (FilaSerie & { orden: number[] })[] = []
  for (const [key, log] of Object.entries(logs || {})) {
    if (!log?.done || !log.dateDone) continue
    const m = key.match(KEY_RE)
    const [w, d, r] = m ? [+m[1], +m[2], +m[3]] : [-1, -1, -1]
    const dia = m ? plan?.weeks?.[w]?.days?.[d] : undefined
    const planEx = dia?.exercises?.[r]
    if (planEx?.kind === 'libre') continue
    const ejercicio = (log.substituteName || planEx?.name || '').trim()
    if (!ejercicio) continue
    const notas = [log.substituteName && planEx?.name && log.substituteName !== planEx.name ? `en lugar de ${planEx.name}` : '', log.porLado ? 'peso por lado' : '', cuentaEnProgreso(log) ? '' : 'no cuenta en el progreso']
      .filter(Boolean).join('; ')
    Object.entries(log.sets || {}).map(([i, s]) => ({ i: +i, s })).sort((a, b) => a.i - b.i).forEach(({ i, s }, n) => {
      const reps = num(s?.reps)
      if (!reps || reps <= 0) return
      const peso = num(s?.weight)
      const rir = num(s?.rir)
      filas.push({
        fecha: log.dateDone!, semana: m ? w + 1 : '', dia: dia?.title || '', ejercicio, serie: n + 1,
        peso: peso ?? '', reps, rir: rir ?? '',
        e1rm: peso && peso > 0 && reps <= 10 ? Math.round(estimate1RM(peso, reps) * 10) / 10 : '',
        nota: notas, orden: [w, d, r, i],
      })
    })
  }
  return filas
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.orden[0] - b.orden[0] || a.orden[1] - b.orden[1] || a.orden[2] - b.orden[2] || a.orden[3] - b.orden[3])
    .map(({ orden: _o, ...f }) => f)
}

const CABECERA = ['Fecha', 'Semana', 'Día', 'Ejercicio', 'Serie', 'Peso (kg)', 'Reps', 'RIR', '1RM estimado (kg)', 'Nota']

const celda = (v: string | number) => {
  const t = typeof v === 'number' ? String(v).replace('.', ',') : v
  return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

export function csvSeries(filas: FilaSerie[]): string {
  const lineas = [CABECERA, ...filas.map(f => [f.fecha, f.semana, f.dia, f.ejercicio, f.serie, f.peso, f.reps, f.rir, f.e1rm, f.nota])]
  return '﻿' + lineas.map(l => l.map(celda).join(';')).join('\r\n') + '\r\n'
}

/** «progreso-maria-garcia-2026-11-10.csv» */
export function nombreArchivo(nombre: string, fecha: string): string {
  const slug = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cliente'
  return `progreso-${slug}-${fecha}.csv`
}

export function descargarCSV(nombre: string, texto: string) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = nombre
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
