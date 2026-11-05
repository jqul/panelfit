import { useState } from 'react'
import { ChevronDown, Trophy } from 'lucide-react'
import type { ClientData, TrainingLogs, TrainingPlan } from '../../../types'
import { localDateKey } from '../../../lib/dates'
import { marcaDeReferencia } from '../../../lib/marcaRM'
import {
  LEVANTAMIENTOS, diasHasta, ejercicioProbable, faseHasta, intentosSugeridos, limpiarCompeticion, puntosDots, puntosGL, totalPlanificado,
  type Competicion, type Levantamiento,
} from '../../../lib/competicion'

const campo = 'text-sm bg-bg border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-accent/20'
const fmt = (n: number) => n.toLocaleString('es-ES')

// Pestaña Plan → "Competición": fecha, intentos de cada levantamiento (propuestos desde su marca, lib/marcaRM) y lo que
// darían en total y en puntos DOTS / IPF GL. El cliente lo ve en Hoy con la cuenta atrás (lib/competicion).
export function CompeticionPlan({ plan, logs, client, onPlanChange }: { plan: TrainingPlan; logs: TrainingLogs; client: ClientData; onPlanChange: (p: TrainingPlan) => void }) {
  const comp = limpiarCompeticion(plan.competicion)
  // Plegada por defecto: la pestaña Plan deja el resto del alto al editor
  const [abierta, setAbierta] = useState(false)
  const nombres = [...new Set(plan.weeks?.flatMap(w => w.days?.flatMap(d => d.exercises?.map(e => e.name.trim()).filter(Boolean) ?? []) ?? []) ?? [])]

  const guardar = (c: Competicion | undefined) => onPlanChange({ ...plan, competicion: c })
  const cambiar = (patch: Partial<Competicion>) => comp && guardar({ ...comp, ...patch })

  if (!comp) {
    return (
      <div className="flex-shrink-0 mb-3">
        <button onClick={() => {
          const en8 = new Date(); en8.setDate(en8.getDate() + 56)
          const ejercicios = Object.fromEntries(LEVANTAMIENTOS.map(l => [l.id, ejercicioProbable(l.id, nombres)]).filter(([, e]) => e))
          setAbierta(true)
          guardar({ fecha: localDateKey(en8), sexo: client.genero === 'h' || client.genero === 'm' ? client.genero : undefined, pesoCorporal: client.weight > 0 ? client.weight : undefined, ejercicios, intentos: {} })
        }} className="w-full flex items-center gap-2 px-4 py-3 bg-card border border-dashed border-border rounded-2xl text-sm font-semibold text-muted hover:border-accent hover:text-accent">
          <Trophy className="w-4 h-4" aria-hidden /> Preparar una competición
        </button>
      </div>
    )
  }

  const dias = diasHasta(comp.fecha)
  const fase = faseHasta(dias)
  const marcaDe = (lev: Levantamiento) => { const e = comp.ejercicios?.[lev]; return e ? marcaDeReferencia(e, plan, logs) : null }
  const intento = (lev: Levantamiento, i: 0 | 1 | 2, kg: number) => {
    const actual = comp.intentos?.[lev] ?? [0, 0, 0]
    const nuevo = [...actual] as [number, number, number]; nuevo[i] = kg > 0 ? kg : 0
    cambiar({ intentos: { ...comp.intentos, [lev]: nuevo } })
  }
  const total = totalPlanificado(comp)
  const totalSeguro = totalPlanificado(comp, 0)
  const bw = comp.pesoCorporal || 0
  const sexo = comp.sexo

  return (
    <section aria-label="Competición" className="flex-shrink-0 mb-3 px-4 py-3 bg-card border border-border rounded-2xl space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Trophy className="w-4 h-4 text-accent" aria-hidden />
        <p className="text-xs font-bold text-muted uppercase tracking-wider">Competición</p>
        <span className="text-sm font-semibold truncate flex-1 min-w-0">{comp.nombre || ''}</span>
        <span className="text-xs font-semibold" data-testid="cuenta-atras">{dias < 0 ? 'Ya pasó' : dias === 0 ? '¡Es hoy!' : `Faltan ${dias} días`}</span>
        {!abierta && total && <span className="text-xs text-muted">· {fmt(total)} kg</span>}
        <button onClick={() => setAbierta(a => !a)} aria-expanded={abierta} className="flex items-center gap-1 text-xs font-semibold text-accent">
          {abierta ? 'Plegar' : 'Editar'} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${abierta ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      </div>
      {fase && <p className="text-xs text-accent font-semibold">{fase}</p>}
      {abierta && (<>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <label className="text-xs text-muted col-span-2">Nombre
          <input value={comp.nombre ?? ''} maxLength={80} placeholder="Campeonato autonómico…" onChange={e => cambiar({ nombre: e.target.value })} className={`${campo} w-full mt-1`} />
        </label>
        <label className="text-xs text-muted">Día
          <input type="date" value={comp.fecha} onChange={e => e.target.value && cambiar({ fecha: e.target.value })} className={`${campo} w-full mt-1`} />
        </label>
        <label className="text-xs text-muted">Peso corporal (kg)
          <input type="number" inputMode="decimal" min={30} max={250} step={0.1} value={comp.pesoCorporal ?? ''} onChange={e => cambiar({ pesoCorporal: parseFloat(e.target.value) || undefined })} className={`${campo} w-full mt-1`} />
        </label>
      </div>
      <div className="flex items-center gap-2 text-xs" role="radiogroup" aria-label="Categoría">
        <span className="text-muted">Categoría</span>
        {([['h', 'Masculina'], ['m', 'Femenina']] as const).map(([v, l]) => (
          <button key={v} type="button" role="radio" aria-checked={sexo === v} onClick={() => cambiar({ sexo: v })}
            className={`px-2.5 py-1 rounded-full border font-semibold ${sexo === v ? 'bg-ink text-white border-ink' : 'border-border text-muted hover:text-ink'}`}>{l}</button>
        ))}
      </div>

      <ul className="space-y-2">
        {LEVANTAMIENTOS.map(l => {
          const m = marcaDe(l.id)
          const its = comp.intentos?.[l.id] ?? [0, 0, 0]
          return (
            <li key={l.id} className="border border-border rounded-xl p-2.5 space-y-2" aria-label={`Intentos de ${l.label}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold w-24">{l.label}</span>
                <select value={comp.ejercicios?.[l.id] ?? ''} aria-label={`Ejercicio del plan para ${l.label}`}
                  onChange={e => cambiar({ ejercicios: { ...comp.ejercicios, [l.id]: e.target.value || undefined } })} className={`${campo} flex-1 min-w-[140px] text-xs`}>
                  <option value="">Elige el ejercicio del plan…</option>
                  {nombres.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="text-xs text-muted">{m ? `Marca ${fmt(m.kg)} kg` : 'Sin marca'}</span>
                {m && <button onClick={() => cambiar({ intentos: { ...comp.intentos, [l.id]: intentosSugeridos(m.kg) } })} className="text-xs font-semibold text-accent">Proponer</button>}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['1º', '2º', '3º'] as const).map((n, i) => (
                  <label key={n} className="text-[11px] text-muted text-center">{n} intento
                    <input type="number" inputMode="decimal" min={0} step={2.5} value={its[i] || ''} aria-label={`${n} intento de ${l.label}`}
                      onChange={e => intento(l.id, i as 0 | 1 | 2, parseFloat(e.target.value) || 0)} className={`${campo} w-full mt-0.5 text-center font-semibold`} />
                  </label>
                ))}
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex items-baseline gap-4 flex-wrap px-1" data-testid="resumen-competicion">
        <p className="text-sm"><span className="text-muted text-xs">Total con los terceros </span><strong className="font-serif text-lg">{total ? `${fmt(total)} kg` : '—'}</strong></p>
        {totalSeguro && <p className="text-xs text-muted">con los primeros: {fmt(totalSeguro)} kg</p>}
        {total && bw > 0 && sexo ? (
          <p className="text-xs text-muted">DOTS <strong className="text-ink">{fmt(puntosDots(total, bw, sexo)!)}</strong> · IPF GL <strong className="text-ink">{fmt(puntosGL(total, bw, sexo)!)}</strong></p>
        ) : total ? <p className="text-xs text-muted">Pon peso corporal y categoría para ver los puntos</p> : null}
      </div>
      <div className="flex justify-end">
        <button onClick={() => { if (confirm('¿Quitar la competición? Se borran sus intentos.')) guardar(undefined) }} className="text-xs text-muted hover:text-warn">Quitar la competición</button>
      </div>
      </>)}
    </section>
  )
}
