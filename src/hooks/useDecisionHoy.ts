import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { localDateKey } from '../lib/dates'
import { isDemoTrainerId } from '../lib/demoIds'
import { fetchClientPain } from '../lib/clientPain'
import { algunaBaja } from '../lib/checkinConfig'
import { getEffectiveWeekIdx } from '../lib/planWeek'
import { recordsDeLaSemana } from '../lib/recordsSemana'
import { estadoCalibracion, revisionCalibracion } from '../lib/calibracion'
import { recomendarSiguiente } from '../lib/recomendacionProgresion'
import { evidenciaDescarga } from '../lib/evidenciaDescarga'
import { decisionHoy, type DecisionHoy, type EntradaClienteHoy, type EntradaSolicitud } from '../lib/decisionHoy'
import { esSolicitud, type Lead } from '../lib/leads'
import { entradasCasosIa } from '../lib/coachIa'
import { estadoParq, type FilaAdmision } from '../lib/retencionParq'
import { useCoachIa } from './useCoachIa'
import type { Decision } from '../lib/diarioDecisiones'
import type { ClientWithStats } from './useTrainerClients'
import type { TrainingLogs, TrainingPlan } from '../types'

// Los datos de TODOS los clientes para «Decisión de hoy» (lib/decisionHoy), en consultas únicas y no una por cliente: planes, molestias y
// check-ins de las últimas semanas, ausencias y decisiones. Todo derivado: no guarda nada. Si una consulta falla, esa parte queda vacía y las
// lecturas lo dicen como «datos insuficientes».
const DIAS_CONTEXTO = 21
interface DolorRow { clientId: string; date: string; zona: string; intensidad: number; tipo?: string }
interface CheckinRow { clientId: string; date: string; sleep: number | null; soreness: number | null; motivation: number | null }
interface AusenciaRow { client_id: string; desde: string; hasta: string }
type DecisionRow = Decision & { client_id: string }
type AdmisionRow = FilaAdmision & { clientId: string }

const hace = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return localDateKey(d) }
const porCliente = <T extends { clientId?: string; client_id?: string }>(xs: T[], id: string) => xs.filter(x => (x.clientId ?? x.client_id) === id)

function textoCheckin(c: CheckinRow): string {
  return ([['sueño', c.sleep], ['dolor', c.soreness], ['energía', c.motivation]] as const).filter(([, v]) => v !== null && v <= 2).map(([n, v]) => `${n} ${v}/5`).join(', ')
}

export function useDecisionHoy(trainerId: string, clients: ClientWithStats[], logsMap: Record<string, TrainingLogs | undefined>, leadsNuevos: Lead[]): { decision: DecisionHoy; cargando: boolean } {
  const [planes, setPlanes] = useState<Record<string, TrainingPlan | null> | null>(null)
  const [dolor, setDolor] = useState<DolorRow[]>([])
  const [checkins, setCheckins] = useState<CheckinRow[]>([])
  const [ausencias, setAusencias] = useState<AusenciaRow[]>([])
  const [decisiones, setDecisiones] = useState<DecisionRow[]>([])
  const [admisiones, setAdmisiones] = useState<AdmisionRow[]>([])
  const clave = clients.map(c => c.id).join(',')
  // Coach IA beta: solo si esta cuenta lo tiene habilitado (lo dice la base de datos); en la demostración no se llama a nada
  const coachIa = useCoachIa(isDemoTrainerId(trainerId))

  useEffect(() => {
    let vivo = true
    if (isDemoTrainerId(trainerId)) {
      import('../lib/demo-data').then(d => {
        if (!vivo) return
        setPlanes(d.DEMO_PLAN_MAP)
        setCheckins(Object.entries(d.DEMO_READINESS_MAP).flatMap(([clientId, rows]) => rows.filter(r => r.date >= hace(DIAS_CONTEXTO)).map(r => ({ ...r, clientId }))) as CheckinRow[])
      })
      // En la demo las molestias viven en el navegador (como las lee la ficha), para que la lista y la ficha no se contradigan
      Promise.all(clients.map(c => fetchClientPain(c.id).then(rows => rows.map(r => ({ ...r, clientId: c.id })))))
        .then(rows => { if (vivo) setDolor(rows.flat() as DolorRow[]) })
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
    supabase.from('registros_dolor').select('clientId, date, zona, intensidad, tipo').in('clientId', ids).gte('date', hace(DIAS_CONTEXTO))
      .then(({ data }) => { if (vivo) setDolor((data || []) as DolorRow[]) })
    supabase.from('readiness_checkins').select('clientId, date, sleep, soreness, motivation').in('clientId', ids).gte('date', hace(DIAS_CONTEXTO))
      .then(({ data }) => { if (vivo) setCheckins((data || []) as CheckinRow[]) })
    supabase.from('ausencias').select('client_id, desde, hasta').in('client_id', ids).gte('hasta', hace(60))
      .then(({ data }) => { if (vivo) setAusencias((data || []) as AusenciaRow[]) })
    // La ficha de admisión (cuestionario de salud) y las veces que se marcó como revisada: lo que falte por revisar entra en la lista (lib/retencionParq)
    // select('*'): si la columna `huella` aún no existe (migración sin aplicar), la lectura no falla y las fichas cuentan como sin revisar, en vez de perderse todo el estado
    supabase.from('checkins').select('*').in('clientId', ids).in('tipo', ['intake', 'parq_revisado'])
      .then(({ data }) => { if (vivo) setAdmisiones((data || []) as AdmisionRow[]) })
    // Solo el entrenador (o su equipo) ve estas decisiones (RLS)
    supabase.from('decisiones_entrenador').select('*')
      .then(({ data }) => { if (vivo) setDecisiones((data || []) as DecisionRow[]) })
    return () => { vivo = false }
  }, [trainerId, clave]) // eslint-disable-line react-hooks/exhaustive-deps

  const decision = useMemo(() => {
    if (!planes) return decisionHoy([], [])
    const hoy = localDateKey()
    const records = recordsDeLaSemana(clients, logsMap, planes, hoy)
    const entradas: EntradaClienteHoy[] = clients.map(c => {
      const logs = logsMap[c.id] || {}
      const plan = planes[c.id] ?? null
      const semana = plan?.weeks?.length ? plan.weeks[getEffectiveWeekIdx(plan, logs)] : undefined
      const calib = estadoCalibracion(logs, plan, hoy)
      const checkinsC = porCliente(checkins, c.id)
      const ultimo = checkinsC.filter(x => x.date >= hace(7)).sort((a, b) => b.date.localeCompare(a.date))[0]
      const decisionesC = porCliente(decisiones, c.id)
      const salud = estadoParq(porCliente(admisiones, c.id))
      return {
        id: c.id,
        nombre: `${c.name} ${c.surname || ''}`.trim(),
        ausente: !!c.ausencia,
        // Solo molestias articulares de verdad (las agujetas no son una señal) y de los últimos 7 días
        molestias: porCliente(dolor, c.id).filter(d => d.tipo !== 'doms' && d.date >= hace(7)).map(d => ({ zona: d.zona, intensidad: d.intensidad })),
        checkinBajo: ultimo && algunaBaja(ultimo.sleep, ultimo.soreness, ultimo.motivation) ? textoCheckin(ultimo) || 'por debajo de lo normal' : null,
        calibracionPorRevisar: calib.activa && calib.sesionesHechas > 0 ? revisionCalibracion(logs, plan).length : 0,
        decisionesPorRevisar: decisionesC.filter(d => !d.revisada_el && d.revisar_el && d.revisar_el <= hoy).length,
        // Orientaciones «subir» no provisionales (lib/recomendacionProgresion); en calibración no se interpreta nada
        progresionesListas: !plan || calib.activa ? [] : [...new Set((semana?.days || []).flatMap(d => (d.exercises || []).filter(e => e.kind !== 'libre' && e.kind !== 'run').map(e => e.name)))]
          .filter(nombre => { const r = recomendarSiguiente(logs, plan, nombre); return r.tipo === 'subir' && !r.provisional }),
        records: records.filter(r => r.clientId === c.id).map(r => r.ejercicio),
        parq: salud.pendienteDeRevisar && salud.nivel !== 'ninguno' ? { nivel: salud.nivel } : null,
        descarga: plan?.weeks?.length ? evidenciaDescarga({ hoy, plan, logs, checkins: checkinsC, dolor: porCliente(dolor, c.id), ausencias: porCliente(ausencias, c.id), decisiones: decisionesC }) : null,
      }
    })
    const ahora = Date.now()
    const solicitudes: EntradaSolicitud[] = leadsNuevos.map(l => ({ id: l.id, nombre: l.name, revisionPersonal: l.status === 'revisar', diasEsperando: Math.floor((ahora - l.created_at) / 86_400_000), esSolicitud: esSolicitud(l) }))
    return decisionHoy(entradas, solicitudes, undefined, entradasCasosIa(coachIa.casos, ahora))
  }, [planes, dolor, checkins, ausencias, decisiones, admisiones, clients, logsMap, leadsNuevos, coachIa.casos])

  return { decision, cargando: planes === null }
}

