import { useEffect, useMemo, useState } from 'react'
import { Moon } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { isDemoClientId } from '../../../lib/demoIds'
import { localDateKey } from '../../../lib/dates'
import { TrainingLogs } from '../../../types'
import { EmptyState } from './helpers'
import { useActividades } from '../../../hooks/useActividades'
import { DEPORTES } from '../../../lib/actividadReloj'
import { esNumerico } from '../../../lib/habitoNumerico'
import { hecha } from '../../../lib/seriesEfectivas'
import { esCalentamiento } from '../../../lib/tipoSerie'
import { lunesDeISO } from '../../../lib/exposicionCargas'
import { relojActivo } from '../../../lib/funcionesEnDesarrollo'
import { cardioPorSemana, esHabitoSueno, mediasSemanales, ultimasSemanas, type HabitoConNumero, type RegistroDia } from '../../../lib/recuperacion'

// ── Recuperación y actividad ──────────────────────────────────
// Horas de sueño, pasos y demás hábitos con número (lib/habitoNumerico), y el cardio de los entrenos del reloj, por semana
// y EN CRUDO, al lado de la carga de fuerza. No concluye nada: que dormir poco coincida con un peor rendimiento puede
// tener muchas causas. Cada media dice en cuántos días se apuntó.

const SEMANAS_VISIBLES = 6
const DIAS_ATRAS = 70

const n1 = (x: number) => (Math.round(x * 10) / 10).toLocaleString('es-ES', { maximumFractionDigits: 1 })
const cab = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

export function RecuperacionActividad({ clientId, logs }: { clientId: string; logs: TrainingLogs }) {
  const demo = isDemoClientId(clientId)
  const reloj = relojActivo() // el cardio del reloj está apagado hasta que se pueda sacar completo (lib/funcionesEnDesarrollo)
  const { actividades } = useActividades(clientId, reloj)
  const [habitos, setHabitos] = useState<HabitoConNumero[]>([])
  const [registros, setRegistros] = useState<RegistroDia[]>([])
  const [cargado, setCargado] = useState(demo)

  useEffect(() => {
    if (demo) return
    let vivo = true
    const desde = localDateKey(new Date(Date.now() - DIAS_ATRAS * 86_400_000))
    Promise.all([
      supabase.from('habitos').select('id, text, meta, unidad').eq('clientId', clientId),
      supabase.from('registros_habitos').select('date, valores').eq('clientId', clientId).gte('date', desde),
    ]).then(([h, r]) => {
      if (!vivo) return
      setHabitos(((h.data || []) as HabitoConNumero[]).filter(x => esNumerico({ id: x.id, meta: x.meta })))
      setRegistros((r.data || []) as RegistroDia[])
      setCargado(true)
    })
    return () => { vivo = false }
  }, [clientId, demo])

  const datos = useMemo(() => {
    const porHabito = habitos.map(h => ({ h, semanas: mediasSemanales(registros, h.id) }))
    const cardio = cardioPorSemana(actividades)
    // Carga de fuerza de cada semana, para mirarla al lado: sesiones hechas (días distintos) y RPE medio de las series
    const dias: Record<string, Set<string>> = {}
    const rpe: Record<string, { suma: number; n: number }> = {}
    Object.values(logs).forEach(log => {
      if (!log.done || !log.dateDone) return
      const s = lunesDeISO(log.dateDone)
      ;(dias[s] ??= new Set()).add(log.dateDone)
      for (const x of Object.values(log.sets || {})) {
        if (!x || !hecha(x) || esCalentamiento(x) || typeof x.rir !== 'number') continue
        const a = (rpe[s] ??= { suma: 0, n: 0 }); a.suma += 10 - x.rir; a.n++
      }
    })
    const fuerza: Record<string, { sesiones: number; rpe: number | null; series: number }> = {}
    for (const s of Object.keys(dias)) fuerza[s] = { sesiones: dias[s].size, rpe: rpe[s] ? rpe[s].suma / rpe[s].n : null, series: rpe[s]?.n ?? 0 }
    const semanas = ultimasSemanas([...porHabito.map(p => p.semanas), cardio], SEMANAS_VISIBLES)
    return { porHabito, cardio, fuerza, semanas }
  }, [habitos, registros, actividades, logs])

  const { porHabito, cardio, fuerza, semanas } = datos
  if (!cargado) return <p className="text-xs text-muted">Cargando…</p>
  if (!semanas.length) {
    return (
      <EmptyState icon={<Moon className="w-8 h-8 opacity-30" />} text="Aún no hay datos de sueño"
        sub="Crea en la ficha del cliente un hábito con meta en horas (p. ej. «Dormir», 7 h) y verás aquí su media semanal" />
    )
  }
  const hayCardio = reloj && semanas.some(s => cardio[s])
  const hayKm = semanas.some(s => (cardio[s]?.distanciaKm ?? 0) > 0)
  const ultimaConCardio = [...semanas].reverse().find(s => cardio[s])

  const Cabecera = ({ primera }: { primera: string }) => (
    <thead>
      <tr className="text-left text-[11px] text-muted uppercase tracking-wider">
        <th scope="col" className="py-1.5 pr-3 font-semibold">{primera}</th>
        {semanas.map(s => <th key={s} scope="col" className="py-1.5 px-2 text-right font-semibold whitespace-nowrap">{cab(s)}</th>)}
      </tr>
    </thead>
  )
  const Celda = ({ children }: { children: React.ReactNode }) => <td className="py-2 px-2 text-right tabular-nums whitespace-nowrap">{children}</td>

  return (
    <div className="space-y-5">
      {porHabito.length > 0 && (
        <section aria-label="Hábitos con número" className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Hábitos con número (media por día)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Media por día de cada hábito con número, por semana, y en cuántos días se apuntó</caption>
              <Cabecera primera="Hábito" />
              <tbody>
                {porHabito.map(({ h, semanas: m }) => (
                  <tr key={h.id} className="border-t border-border/50">
                    <th scope="row" className="py-2 pr-3 text-left font-normal">
                      <span className="font-semibold">{h.text}</span>{h.unidad ? <span className="text-muted text-xs"> ({h.unidad})</span> : null}
                      {esHabitoSueno(h) && <span className="ml-1.5 text-[11px] font-bold uppercase text-accent">Sueño</span>}
                    </th>
                    {semanas.map(s => <Celda key={s}>{m[s] ? `${n1(m[s].media)} · ${m[s].dias} ${m[s].dias === 1 ? 'día' : 'días'}` : '—'}</Celda>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted">Cada celda es «media · días en que se apuntó» esa semana. Con pocos días la media es poco fiable.</p>
        </section>
      )}

      {hayCardio && (
        <section aria-label="Cardio del reloj" className="space-y-1.5" data-testid="cardio-semanal">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Cardio (entrenos del reloj)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Minutos, sesiones y distancia de cardio por semana</caption>
              <Cabecera primera="Cardio" />
              <tbody>
                <tr className="border-t border-border/50"><th scope="row" className="py-2 pr-3 text-left font-semibold">Minutos</th>{semanas.map(s => <Celda key={s}>{cardio[s] ? Math.round(cardio[s].minutos) : '—'}</Celda>)}</tr>
                <tr className="border-t border-border/50"><th scope="row" className="py-2 pr-3 text-left font-semibold">Sesiones</th>{semanas.map(s => <Celda key={s}>{cardio[s]?.sesiones ?? '—'}</Celda>)}</tr>
                {hayKm && <tr className="border-t border-border/50"><th scope="row" className="py-2 pr-3 text-left font-semibold">Distancia (km)</th>{semanas.map(s => <Celda key={s}>{cardio[s]?.distanciaKm ? n1(cardio[s].distanciaKm) : '—'}</Celda>)}</tr>}
              </tbody>
            </table>
          </div>
          {ultimaConCardio && (
            <p className="text-[11px] text-muted" data-testid="cardio-por-tipo">
              Semana del {cab(ultimaConCardio)} por tipo:{' '}
              {Object.entries(cardio[ultimaConCardio].porDeporte).sort(([, a], [, b]) => (b as number) - (a as number)).map(([d, min]) => `${DEPORTES[d as keyof typeof DEPORTES]?.nombre ?? d} ${Math.round(min as number)} min`).join(' · ')}
            </p>
          )}
        </section>
      )}

      <section aria-label="Carga de fuerza para comparar" className="space-y-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Para comparar: carga de fuerza</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Sesiones de fuerza y RPE medio por semana</caption>
            <Cabecera primera="Fuerza" />
            <tbody>
              <tr className="border-t border-border/50"><th scope="row" className="py-2 pr-3 text-left font-semibold">Sesiones</th>{semanas.map(s => <Celda key={s}>{fuerza[s]?.sesiones ?? '—'}</Celda>)}</tr>
              <tr className="border-t border-border/50"><th scope="row" className="py-2 pr-3 text-left font-semibold">RPE medio</th>{semanas.map(s => <Celda key={s}>{fuerza[s]?.rpe != null ? `${n1(fuerza[s].rpe as number)} · ${fuerza[s].series}` : '—'}</Celda>)}</tr>
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted leading-snug">
          Se enseña al lado para que lo compares tú: no se concluye que una cosa cause la otra. Un mal rendimiento puede venir del sueño, del
          estrés, de la comida, del cardio o de nada de eso.
        </p>
      </section>
    </div>
  )
}
