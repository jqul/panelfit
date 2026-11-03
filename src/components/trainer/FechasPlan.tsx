import { useState } from 'react'
import { inicioParaTerminar, finDePlan, semanaQueEntra } from '../../lib/fechaFin'

const fmt = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })

// Cuándo empieza el plan: por fecha de inicio o, para llegar a una competición o un evento, por fecha de fin (se calcula
// el lunes de inicio, lib/fechaFin). Siempre devuelve la fecha de inicio, que es lo que se guarda en el plan.
export function FechasPlan({ inicio, onInicio, semanas }: { inicio: string; onInicio: (inicio: string) => void; semanas: number }) {
  const [modo, setModo] = useState<'inicio' | 'fin'>('inicio')
  const [fin, setFin] = useState(() => finDePlan(inicio, semanas))
  const entra = semanaQueEntra(inicio, semanas)
  const chip = (activo: boolean) => `flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activo ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'}`
  return (
    <div className="space-y-2">
      <div className="flex p-0.5 bg-bg-alt rounded-xl" role="group" aria-label="Fijar la fecha">
        <button type="button" aria-pressed={modo === 'inicio'} onClick={() => setModo('inicio')} className={chip(modo === 'inicio')}>Empieza el</button>
        <button type="button" aria-pressed={modo === 'fin'} onClick={() => { setModo('fin'); setFin(finDePlan(inicio, semanas)) }} className={chip(modo === 'fin')}>Termina el</button>
      </div>
      {modo === 'inicio' ? (
        <input type="date" value={inicio} onChange={e => e.target.value && onInicio(e.target.value)} aria-label="Fecha de inicio"
          className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
      ) : (
        <input type="date" value={fin} aria-label="Fecha de fin"
          onChange={e => { if (!e.target.value) return; setFin(e.target.value); onInicio(inicioParaTerminar(e.target.value, semanas)) }}
          className="w-full px-3 py-2.5 bg-bg border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent/20" />
      )}
      <p className="text-xs text-muted" data-testid="resumen-fechas">
        Del {fmt(inicio)} al {fmt(finDePlan(inicio, semanas))} ({semanas} {semanas === 1 ? 'semana' : 'semanas'}).
        {entra !== null && <span className="text-warn font-semibold"> Ya habría empezado: entra directamente en la semana {entra}.</span>}
      </p>
    </div>
  )
}
