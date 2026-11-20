import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { localDateKey } from '../lib/dates'
import { isDemoTrainerId } from '../lib/demoIds'
import { algunaBaja } from '../lib/checkinConfig'
import { getEffectiveWeekIdx } from '../lib/planWeek'
import { recordsDeLaSemana, lunesDe } from '../lib/recordsSemana'
import { estadoCalibracion, revisionCalibracion } from '../lib/calibracion'
import { recomendarSiguiente } from '../lib/recomendacionProgresion'
import { revisionSemanal, type EntradaRevision, type FilaRevision } from '../lib/revisionSemanal'
import { nombreParaMensaje } from '../lib/hoyResumen'
import type { ClientWithStats } from './useTrainerClients'
import type { TrainingLogs, TrainingPlan } from '../types'

// Los datos de TODOS los clientes para la revisión semanal (lib/revisionSemanal): planes, molestias y check-ins de los últimos 7 días y
// decisiones por revisar, en consultas únicas (no una por cliente). Todo derivado; no guarda nada.
const CLAVE = /^ex_w\d+_d\d+_r\d+$/
interface DolorRow { clientId: string; date: string; zona: string; intensidad: number; tipo?: string }
interface CheckinRow { clientId: string; date: string; sleep: number | null; soreness: number | null; motivation: number | null }

const dias = (desde: string, hasta: string) => Math.max(0, Math.round((Date.parse(hasta + 'T00:00:00Z') - Date.parse(desde + 'T00:00:00Z')) / 86_400_000))

export function useRevisionSemanal(trainerId: string, clients: ClientWithStats[], logsMap: Record<string, TrainingLogs | undefined>): { filas: FilaRevision[]; cargando: boolean } {
  const [planes, setPlanes] = useState<Record<string, TrainingPlan | null> | null>(null)
  const [dolor, setDolor] = useState<DolorRow[]>([])
  const [checkins, setCheckins] = useState<CheckinRow[]>([])
  const [decisiones, setDecisiones] = useState<Record<string, number>>({})
  const clave = clients.map(c => c.id).join(',')

  useEffect(() => {
    let vivo = true
    const hoy = localDateKey()
    const hace7 = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return localDateKey(d) })()
    if (isDemoTrainerId(trainerId)) {
      import('../lib/demo-data').then(d => { if (vivo) setPlanes(d.DEMO_PLAN_MAP) })
      return () => { vivo = false }
    }
    if (!clients.length) { setPlanes({}); return () => { vivo = false } }
    const ids = clients.map(c => c.id)
    supabase.from('planes').select('clientId, plan').in('clientId', ids).then(({ data }) => {
      if (!vivo) return
      const m: Record<string, TrainingPlan | null> = {}
      for (const r of (data || []) as { clientId: string; plan: { P?: TrainingPlan } | null }[]) m[r.clientId] = r.plan?.P || null
      setPlanes(m)
    })
    supabase.from('registros_dolor').select('clientId, date, zona, intensidad, tipo').in('clientId', ids).gte('date', hace7)
      .then(({ data }) => { if (vivo) setDolor((data || []) as DolorRow[]) })
    supabase.from('readiness_checkins').select('clientId, date, sleep, soreness, motivation').in('clientId', ids).gte('date', hace7)
      .then(({ data }) => { if (vivo) setCheckins((data || []) as CheckinRow[]) })
    // Solo el entrenador (o su equipo) ve estas decisiones (RLS): las de plazo cumplido y sin revisar, por cliente
    supabase.from('decisiones_entrenador').select('client_id, revisar_el').is('revisada_el', null).lte('revisar_el', hoy)
      .then(({ data }) => {
        if (!vivo) return
        const m: Record<string, number> = {}
        for (const r of (data || []) as { client_id: string }[]) m[r.client_id] = (m[r.client_id] ?? 0) + 1
        setDecisiones(m)
      })
    return () => { vivo = false }
  }, [trainerId, clave]) // eslint-disable-line react-hooks/exhaustive-deps

  const filas = useMemo(() => {
    if (!planes) return []
    const hoy = localDateKey()
    const lunes = lunesDe(hoy)
    const diaSemana = ((new Date(hoy + 'T12:00:00').getDay() + 6) % 7) + 1
    const records = recordsDeLaSemana(clients, logsMap, planes, hoy)
    const entradas: EntradaRevision[] = clients.map(c => {
      const logs = logsMap[c.id] || {}
      const plan = planes[c.id] ?? null
      const hechos = Object.entries(logs).filter(([k, l]) => CLAVE.test(k) && l?.done && l.dateDone)
      const fechas = [...new Set(hechos.map(([, l]) => l.dateDone as string))].sort()
      const ultima = fechas[fechas.length - 1]
      const semana = plan?.weeks?.length ? plan.weeks[getEffectiveWeekIdx(plan, logs)] : undefined
      const calib = estadoCalibracion(logs, plan, hoy)
      const ultimoCheckin = checkins.filter(x => x.clientId === c.id).sort((a, b) => b.date.localeCompare(a.date))[0]
      // Orientaciones «subir» no provisionales (lib/recomendacionProgresion); en calibración no se interpreta nada
      const progresionesListas = !plan || calib.activa ? [] : [...new Set((semana?.days || []).flatMap(d => (d.exercises || []).filter(e => e.kind !== 'libre' && e.kind !== 'run').map(e => e.name)))]
        .filter(nombre => { const r = recomendarSiguiente(logs, plan, nombre); return r.tipo === 'subir' && !r.provisional })
      return {
        id: c.id,
        nombrePila: nombreParaMensaje(c),
        nombreCompleto: `${c.name} ${c.surname || ''}`.trim(),
        tienePlan: !!plan?.weeks?.length,
        sesionesHechas: fechas.filter(f => f >= lunes && f <= hoy).length,
        sesionesPrevistas: (semana?.days || []).filter(d => d.exercises?.length).length,
        diaSemana,
        diasSinEntrenar: ultima ? dias(ultima, hoy) : null,
        ausente: !!c.ausencia,
        records: records.filter(r => r.clientId === c.id).map(r => r.ejercicio),
        // Solo molestias articulares de verdad: las agujetas (doms) no son una señal
        molestias: dolor.filter(d => d.clientId === c.id && d.tipo !== 'doms').map(d => ({ zona: d.zona, intensidad: d.intensidad })),
        checkinBajo: !!ultimoCheckin && algunaBaja(ultimoCheckin.sleep, ultimoCheckin.soreness, ultimoCheckin.motivation),
        calibracionPorRevisar: calib.activa && calib.sesionesHechas > 0 ? revisionCalibracion(logs, plan).length : 0,
        decisionesPorRevisar: decisiones[c.id] ?? 0,
        progresionesListas,
      }
    })
    return revisionSemanal(entradas)
  }, [planes, dolor, checkins, decisiones, clients, logsMap])

  return { filas, cargando: planes === null }
}
