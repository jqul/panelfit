import { useState } from 'react'
import { ClientData, TrainingPlan, TrainingLogs } from '../../types'
import { FuerzaChart } from './progreso-tab/FuerzaChart'
import { PesoChart } from './progreso-tab/PesoChart'
import { VolumenChart, VolumenGrupoChart } from './progreso-tab/VolumenCharts'
import { AdherenciaChart } from './progreso-tab/AdherenciaChart'
import { RecordsTable } from './progreso-tab/RecordsTable'
import { ComparativaChart } from './progreso-tab/ComparativaChart'
import { DistribucionChart } from './progreso-tab/DistribucionChart'
import { RMChart } from './progreso-tab/RMChart'
import { RachaStats } from './progreso-tab/RachaStats'
import { FotosTab } from './progreso-tab/FotosTab'
import { PesosSugeridosChart } from './progreso-tab/PesosSugeridosChart'
import { RiesgoChart } from './progreso-tab/RiesgoChart'
import { VideoFeedbackTab } from './progreso-tab/VideoFeedbackTab'
import { StrengthStandardsChart } from './progreso-tab/StrengthStandardsChart'
import { PruebasChart } from './progreso-tab/PruebasChart'
import { FVProfileChart } from './progreso-tab/FVProfileChart'
import { MonthlyRecap } from './progreso-tab/MonthlyRecap'
import { CicloCard } from './progreso-tab/CicloCard'
import { CicloRendimientoChart } from './progreso-tab/CicloRendimientoChart'
import { DolorChart } from './progreso-tab/DolorChart'
import { ADVANCED_SECTIONS, useTrainerTier } from '../../lib/tier'
import { Section, SECTIONS, GROUPS, useTrainerMetricSettings } from '../../lib/progresoSections'

interface Props {
  client: ClientData
  plan?: TrainingPlan | null
  logs?: TrainingLogs
  library?: { name: string; category?: string }[]
  trainerId?: string
}

export function ProgresoTab({ client, plan, logs = {}, library, trainerId }: Props) {
  const tier = useTrainerTier(trainerId)
  const metricasActivasRaw = useTrainerMetricSettings(trainerId) // null = todas activas
  const sectionsByTier = SECTIONS.filter(s => tier !== 'basico' || !ADVANCED_SECTIONS.has(s.id))
  // Si el entrenador ha desmarcado literalmente todas las métricas (o algo dejó
  // la lista corrupta), no lo dejamos sin ninguna sección — mejor mostrarlas
  // todas que romper la pestaña.
  const metricasActivas = metricasActivasRaw && sectionsByTier.some(s => metricasActivasRaw.has(s.id)) ? metricasActivasRaw : null
  const visibleSections = sectionsByTier.filter(s => !metricasActivas || metricasActivas.has(s.id))
  const visibleIds = new Set(visibleSections.map(s => s.id))
  const groups = GROUPS.map(g => ({ ...g, sections: g.sections.filter(id => visibleIds.has(id)) })).filter(g => g.sections.length > 0)

  const [section, setSection] = useState<Section>('fuerza')
  const activeGroup = groups.find(g => g.sections.includes(section)) || groups[0]
  const current = visibleSections.find(s => s.id === section) || visibleSections[0]

  if (!current) return <p className="text-sm text-muted">No tienes ninguna métrica activa. Actívalas desde Ajustes → Métricas activas.</p>

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <div>
        <h3 className="font-serif font-bold text-lg">Progreso de {client.name}</h3>
        <p className="text-xs text-muted mt-0.5">Análisis de rendimiento y evolución</p>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {groups.map(g => (
          <button key={g.id} onClick={() => setSection(g.sections[0])}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all ${activeGroup?.id === g.id ? 'bg-ink text-white' : 'bg-bg-alt text-muted hover:text-ink'}`}>
            {g.icon} {g.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {activeGroup?.sections.map(id => {
          const s = SECTIONS.find(x => x.id === id)!
          return (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${section === s.id ? 'bg-ink text-white border-ink' : 'bg-white border-border text-muted hover:border-accent'}`}>
              {s.icon} {s.label}
            </button>
          )
        })}
      </div>
      <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div className="mb-4">
          <p className="text-sm font-bold">{current.icon} {current.label}</p>
          <p className="text-xs text-muted mt-0.5">{current.desc}</p>
        </div>
        {section === 'pesos_sugeridos' && <PesosSugeridosChart logs={logs} plan={plan} />}
        {section === 'fatiga'       && <RiesgoChart       clientId={client.id} logs={logs} />}
        {section === 'videos'       && <VideoFeedbackTab   client={client} />}
        {section === 'fuerza'       && <FuerzaChart       logs={logs} plan={plan} />}
        {section === 'peso'         && <PesoChart         clientId={client.id} />}
        {section === 'dolor'        && <DolorChart        clientId={client.id} />}
        {section === 'volumen'      && <VolumenChart       logs={logs} />}
        {section === 'volumen_grupo' && <VolumenGrupoChart logs={logs} plan={plan} library={library} />}
        {section === 'adherencia'   && <AdherenciaChart    logs={logs} plan={plan} />}
        {section === 'records'      && <RecordsTable       logs={logs} plan={plan} />}
        {section === 'comparativa'  && <ComparativaChart   logs={logs} />}
        {section === 'resumen_mensual' && <MonthlyRecap    logs={logs} plan={plan} />}
        {section === 'distribucion' && <DistribucionChart  logs={logs} plan={plan} library={library} />}
        {section === 'rm'           && <RMChart            logs={logs} plan={plan} />}
        {section === 'estandares'   && <StrengthStandardsChart client={client} logs={logs} plan={plan} />}
        {section === 'pruebas'      && (trainerId
          ? <PruebasChart clientId={client.id} trainerId={trainerId} />
          : <p className="text-xs text-muted">No se pudo determinar el entrenador.</p>)}
        {section === 'fv_profile'   && (trainerId
          ? <FVProfileChart client={client} trainerId={trainerId} />
          : <p className="text-xs text-muted">No se pudo determinar el entrenador.</p>)}
        {section === 'racha'        && <RachaStats         logs={logs} />}
        {section === 'fotos'        && <FotosTab           clientId={client.id} />}
        {section === 'ciclo'        && (
          <div className="space-y-5">
            <CicloCard clientId={client.id} />
            <div className="border-t border-border pt-4">
              <CicloRendimientoChart clientId={client.id} logs={logs} />
            </div>
          </div>
        )}
      </div>
      <p className="text-[10px] text-muted text-center">Datos calculados a partir de los entrenos registrados · Se actualiza en tiempo real</p>
    </div>
  )
}
