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

interface Props {
  client: ClientData
  plan?: TrainingPlan | null
  logs?: TrainingLogs
  library?: { name: string; category?: string }[]
}

type Section = 'fuerza' | 'peso' | 'volumen' | 'volumen_grupo' | 'adherencia' | 'records' | 'comparativa' | 'distribucion' | 'rm' | 'racha' | 'fotos' | 'pesos_sugeridos' | 'fatiga' | 'videos' | 'estandares'

const SECTIONS: { id: Section; icon: string; label: string; desc: string }[] = [
  { id: 'pesos_sugeridos', icon: '🎯', label: 'Pesos sugeridos', desc: 'Próximo entreno según RIR registrado' },
  { id: 'fatiga',        icon: '🚦', label: 'Riesgo',         desc: 'Semáforo de carga + bienestar' },
  { id: 'videos',        icon: '🎥', label: 'Vídeos',         desc: 'Feedback de técnica pendiente' },
  { id: 'fuerza',       icon: '💪', label: 'Fuerza',        desc: 'Progreso de peso por ejercicio' },
  { id: 'records',      icon: '🏆', label: 'Récords',       desc: 'Marcas personales' },
  { id: 'rm',           icon: '⚡', label: '1RM est.',       desc: 'Estimación de fuerza máxima' },
  { id: 'estandares',   icon: '🏆', label: 'Nivel de fuerza', desc: 'Sentadilla/banca/peso muerto vs. estándares' },
  { id: 'volumen',      icon: '📊', label: 'Volumen',        desc: 'Carga total semanal' },
  { id: 'volumen_grupo', icon: '🧩', label: 'Volumen por grupo', desc: 'Series semanales por grupo muscular' },
  { id: 'comparativa',  icon: '↔️', label: 'Esta semana',   desc: 'Esta semana vs anterior' },
  { id: 'distribucion', icon: '🎯', label: 'Músculos',      desc: 'Distribución por grupos musculares' },
  { id: 'adherencia',   icon: '📅', label: 'Adherencia',    desc: '% días entrenados vs planificados' },
  { id: 'racha',        icon: '🔥', label: 'Racha',         desc: 'Racha y estadísticas globales' },
  { id: 'peso',         icon: '⚖️', label: 'Peso',          desc: 'Evolución del peso corporal' },
  { id: 'fotos',        icon: '📸', label: 'Fotos',         desc: 'Fotos de progreso del cliente' },
]

export function ProgresoTab({ client, plan, logs = {}, library }: Props) {
  const [section, setSection] = useState<Section>('fuerza')
  const current = SECTIONS.find(s => s.id === section)!
  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <div>
        <h3 className="font-serif font-bold text-lg">Progreso de {client.name}</h3>
        <p className="text-xs text-muted mt-0.5">Análisis de rendimiento y evolución</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${section === s.id ? 'bg-ink text-white border-ink' : 'bg-white border-border text-muted hover:border-accent'}`}>
            {s.icon} {s.label}
          </button>
        ))}
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
        {section === 'volumen'      && <VolumenChart       logs={logs} />}
        {section === 'volumen_grupo' && <VolumenGrupoChart logs={logs} plan={plan} library={library} />}
        {section === 'adherencia'   && <AdherenciaChart    logs={logs} plan={plan} />}
        {section === 'records'      && <RecordsTable       logs={logs} plan={plan} />}
        {section === 'comparativa'  && <ComparativaChart   logs={logs} />}
        {section === 'distribucion' && <DistribucionChart  logs={logs} plan={plan} library={library} />}
        {section === 'rm'           && <RMChart            logs={logs} plan={plan} />}
        {section === 'estandares'   && <StrengthStandardsChart client={client} logs={logs} plan={plan} />}
        {section === 'racha'        && <RachaStats         logs={logs} />}
        {section === 'fotos'        && <FotosTab           clientId={client.id} />}
      </div>
      <p className="text-[10px] text-muted text-center">Datos calculados a partir de los entrenos registrados · Se actualiza en tiempo real</p>
    </div>
  )
}
