import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarRange, MoveHorizontal } from 'lucide-react'
import type { TrainingLogs, TrainingPlan } from '../../../types'
import { lunesDe, sumarDias, lunesDeSemana } from '../../../lib/fechasPlan'
import { sesionesDelPlan, moverSesion, type SesionFechada } from '../../../lib/moverSesiones'
import { localDateKey } from '../../../lib/dates'
import { supabase } from '../../../lib/supabase'
import { isDemoClientId } from '../../../lib/demoIds'

// El plan del cliente sobre un calendario de verdad: cada sesión en su fecha (hecha, a medias, sin hacer o por
// venir) y las ausencias que ha avisado. Se mueve una sesión arrastrándola a otro día o tocándola y eligiendo
// fecha (en el móvil no hay arrastrar). Mover solo guarda la excepción en el plan: lib/fechasPlan.ts.

type Estado = 'hecha' | 'medias' | 'fallada' | 'futura'

function estadoSesion(plan: TrainingPlan, logs: TrainingLogs, s: SesionFechada, hoy: string): Estado {
  const ejercicios = plan.weeks[s.w]?.days[s.d]?.exercises || []
  const hechos = ejercicios.filter((_, r) => logs[`ex_${s.clave}_r${r}`]?.done).length
  if (logs[`finished_${s.clave}`]?.sessionFinished || (ejercicios.length > 0 && hechos === ejercicios.length)) return 'hecha'
  if (hechos > 0) return 'medias'
  return s.fecha && s.fecha < hoy ? 'fallada' : 'futura'
}

const ESTILO: Record<Estado, string> = {
  hecha: 'bg-ok/15 text-ok border-ok/30',
  medias: 'bg-attn/15 text-attn border-attn/30',
  fallada: 'bg-warn/10 text-warn border-warn/30',
  futura: 'bg-card text-ink border-border',
}
const ETIQUETA: Record<Estado, string> = { hecha: 'hecha', medias: 'a medias', fallada: 'sin hacer', futura: 'por hacer' }

const fmt = (f: string, o: Intl.DateTimeFormatOptions) => new Date(f + 'T12:00:00').toLocaleDateString('es-ES', o)

export function PlanCalendario({ plan, logs, clientId, onPlanChange }: {
  plan: TrainingPlan; logs: TrainingLogs; clientId: string; onPlanChange: (p: TrainingPlan) => void
}) {
  const hoy = localDateKey()
  const [mes, setMes] = useState(() => hoy.slice(0, 7) + '-01')
  const [elegida, setElegida] = useState<string | null>(null)
  const [nuevaFecha, setNuevaFecha] = useState('')
  const [encima, setEncima] = useState<string | null>(null)
  const [ausencias, setAusencias] = useState<{ desde: string; hasta: string }[]>([])

  useEffect(() => {
    if (isDemoClientId(clientId)) return
    supabase.from('ausencias').select('desde,hasta').eq('client_id', clientId)
      .then(({ data }) => setAusencias((data || []) as { desde: string; hasta: string }[]))
  }, [clientId])

  const sesiones = useMemo(() => sesionesDelPlan(plan, logs), [plan, logs])
  const porFecha = useMemo(() => {
    const m: Record<string, SesionFechada[]> = {}
    sesiones.forEach(s => { if (s.fecha) (m[s.fecha] ||= []).push(s) })
    return m
  }, [sesiones])
  const sinFecha = sesiones.filter(s => !s.fecha)
  const sel = sesiones.find(s => s.clave === elegida) || null

  if (!plan.fechaInicio) return (
    <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
      <CalendarRange className="w-8 h-8 mx-auto text-muted opacity-50" />
      <p className="font-serif font-bold text-lg">¿Cuándo empieza el plan?</p>
      <p className="text-sm text-muted">Con la fecha de inicio, cada sesión cae en su día y la puedes mover.</p>
      <input type="date" aria-label="Fecha de inicio del plan" onChange={e => e.target.value && onPlanChange({ ...plan, fechaInicio: e.target.value })}
        className="px-3 py-2 bg-bg border border-border rounded-xl text-sm" />
    </div>
  )

  const mover = (s: SesionFechada, fecha: string | null) => {
    onPlanChange(moverSesion(plan, s.w, s.d, fecha))
    setElegida(null)
  }
  const fuera = (f: string) => ausencias.some(a => a.desde <= f && f <= a.hasta)

  // 6 semanas desde el lunes de la semana del día 1 del mes
  const inicio = lunesDe(mes)
  const dias = Array.from({ length: 42 }, (_, i) => sumarDias(inicio, i))
  const mesActual = mes.slice(0, 7)
  const cambiarMes = (n: number) => { const d = new Date(mes + 'T12:00:00'); d.setMonth(d.getMonth() + n); setMes(localDateKey(d).slice(0, 7) + '-01') }
  const semanaPlan = (lunes: string) => {
    const l0 = lunesDeSemana(plan, 0)
    if (!l0) return null
    const w = Math.round((new Date(lunes + 'T12:00:00').getTime() - new Date(l0 + 'T12:00:00').getTime()) / (7 * 86400000))
    return w >= 0 && w < plan.weeks.length ? w : null
  }

  const chip = (s: SesionFechada) => {
    const estado = estadoSesion(plan, logs, s, hoy)
    // Lo ya entrenado se queda en el día en que se hizo: no se arrastra.
    const fija = !!s.hechaEl
    return (
      <button key={s.clave} type="button" draggable={!fija} onDragStart={e => { e.dataTransfer.setData('text/plain', s.clave); e.dataTransfer.effectAllowed = 'move' }}
        onClick={() => { setElegida(s.clave); setNuevaFecha(s.fecha || hoy) }}
        aria-label={`${s.titulo}, semana ${s.w + 1}, ${ETIQUETA[estado]}${s.movida ? ', movida' : ''}${s.propuesta ? ', día propuesto' : ''}${fija ? '' : '. Mover'}`}
        className={`w-full text-left px-1 sm:px-1.5 py-0.5 rounded-md border text-[11px] font-semibold truncate ${fija ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${s.propuesta ? 'border-dashed' : ''} ${ESTILO[estado]} ${elegida === s.clave ? 'ring-2 ring-accent' : ''}`}>
        {s.movida && <MoveHorizontal className="inline w-3 h-3 mr-0.5 -mt-0.5" aria-hidden />}
        {/* En el móvil la casilla es estrecha: solo lo de antes del guion y sin "Día" ("DÍA A — Pecho" → "A") */}
        <span className="sm:hidden">{s.titulo.split(/\s[—–-]\s|:/)[0].replace(/^d[ií]a\s+/i, '') || s.titulo}</span><span className="hidden sm:inline">{s.titulo}</span>
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="bg-card border border-border rounded-2xl p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => cambiarMes(-1)} aria-label="Mes anterior" className="p-2 rounded-lg hover:bg-bg-alt text-muted"><ChevronLeft className="w-4 h-4" /></button>
          <p className="text-sm font-semibold">{(m => m[0].toUpperCase() + m.slice(1))(fmt(mes, { month: 'long', year: 'numeric' }))}</p>
          <button onClick={() => cambiarMes(1)} aria-label="Mes siguiente" className="p-2 rounded-lg hover:bg-bg-alt text-muted"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-[2rem_repeat(7,minmax(0,1fr))] gap-1">
          <div />
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <div key={d} className="text-center text-[11px] font-bold text-muted py-1">{d}</div>)}
          {Array.from({ length: 6 }, (_, fila) => {
            const lunes = dias[fila * 7]
            const w = semanaPlan(lunes)
            return [
              <div key={`s${fila}`} className="text-[11px] font-bold text-muted pt-1.5 text-center" title={w !== null ? plan.weeks[w].label : undefined}>{w !== null ? `S${w + 1}` : ''}</div>,
              ...dias.slice(fila * 7, fila * 7 + 7).map(f => {
                const otroMes = f.slice(0, 7) !== mesActual
                return (
                  <div key={f}
                    onDragOver={e => { e.preventDefault(); setEncima(f) }} onDragLeave={() => setEncima(x => x === f ? null : x)}
                    onDrop={e => { e.preventDefault(); setEncima(null); const s = sesiones.find(x => x.clave === e.dataTransfer.getData('text/plain')); if (s) mover(s, f) }}
                    className={`min-h-[64px] rounded-lg border p-1 space-y-0.5 transition-colors ${encima === f ? 'border-accent bg-accent/5' : 'border-border/60'} ${fuera(f) ? 'bg-accent2/15' : otroMes ? 'bg-bg/60' : 'bg-bg'}`}>
                    <p className={`text-[11px] font-semibold ${f === hoy ? 'text-accent' : otroMes ? 'text-muted/50' : 'text-muted'}`}>
                      {Number(f.slice(8))}{fuera(f) && <span className="sr-only"> (ausencia)</span>}
                    </p>
                    {(porFecha[f] || []).map(chip)}
                  </div>
                )
              }),
            ]
          })}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[11px] text-muted">
          {(['hecha', 'medias', 'fallada', 'futura'] as Estado[]).map(e => (
            <span key={e} className="flex items-center gap-1"><span className={`w-3 h-3 rounded border ${ESTILO[e]}`} />{ETIQUETA[e][0].toUpperCase() + ETIQUETA[e].slice(1)}</span>
          ))}
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-accent2/30" />Ausencia</span>
          <span className="flex items-center gap-1"><MoveHorizontal className="w-3 h-3" />Movida</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-dashed border-muted" />Día propuesto (el plan no lo fija)</span>
        </div>
        <p className="text-[11px] text-muted mt-1.5">Arrastra una sesión a otro día, o tócala para elegir la fecha: el cliente la verá ese día en su app. Lo ya entrenado sale el día en que lo hizo.</p>
      </div>

      {sel && (
        <div className="bg-card border border-accent/30 rounded-2xl p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold">{sel.titulo} <span className="text-muted font-normal">· {plan.weeks[sel.w]?.label || `Semana ${sel.w + 1}`}</span></p>
            <p className="text-xs text-muted mt-0.5">{sel.hechaEl ? `La hizo el ${fmt(sel.hechaEl, { weekday: 'long', day: 'numeric', month: 'long' })}` : sel.fecha ? `${sel.propuesta ? 'Propuesta' : 'Ahora'}: ${fmt(sel.fecha, { weekday: 'long', day: 'numeric', month: 'long' })}${sel.movida ? ' (movida)' : ''}${sel.propuesta ? ' — fíjala para que el cliente la vea con fecha' : ''}` : 'Sin fecha en el plan'}</p>
          </div>
          {sel.hechaEl ? (
            <button onClick={() => setElegida(null)} className="px-3 py-2 border border-border rounded-xl text-sm text-muted hover:text-ink">Cerrar</button>
          ) : (
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={nuevaFecha} onChange={e => setNuevaFecha(e.target.value)} aria-label="Nueva fecha"
              className="px-3 py-2 bg-bg border border-border rounded-xl text-sm" />
            <button onClick={() => nuevaFecha && mover(sel, nuevaFecha)} disabled={!nuevaFecha || (nuevaFecha === sel.fecha && !sel.propuesta)}
              className="px-4 py-2 bg-ink text-white rounded-xl text-sm font-semibold disabled:opacity-40">Mover aquí</button>
            {sel.movida && <button onClick={() => mover(sel, null)} className="px-3 py-2 border border-border rounded-xl text-sm text-muted hover:text-ink">Volver a su día</button>}
            <button onClick={() => setElegida(null)} className="px-3 py-2 text-sm text-muted hover:text-ink">Cancelar</button>
          </div>
          )}
        </div>
      )}

      {sinFecha.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-sm font-semibold">Sin día asignado ({sinFecha.length})</p>
          <p className="text-xs text-muted mt-0.5 mb-2">El plan no dice qué día va cada una. Arrástralas a un día o tócalas para fecharlas.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {sinFecha.map(s => <div key={s.clave}>{chip(s)}<p className="text-[11px] text-muted mt-0.5">Semana {s.w + 1}</p></div>)}
          </div>
        </div>
      )}
    </div>
  )
}
