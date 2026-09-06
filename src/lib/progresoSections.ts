import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Secciones de ProgresoTab (entrenador) — extraído a módulo compartido para que
// tanto ProgresoTab como los Ajustes del entrenador (activar/desactivar) y el
// portal del cliente (qué le enseño) trabajen con la misma lista de ids.
export type Section = 'fuerza' | 'peso' | 'volumen' | 'volumen_grupo' | 'adherencia' | 'records' | 'comparativa' | 'distribucion' | 'rm' | 'racha' | 'fotos' | 'pesos_sugeridos' | 'fatiga' | 'videos' | 'estandares' | 'pruebas' | 'resumen_mensual' | 'ciclo' | 'fv_profile' | 'dolor'

export const SECTIONS: { id: Section; icon: string; label: string; desc: string }[] = [
  { id: 'pesos_sugeridos', icon: '🎯', label: 'Pesos sugeridos', desc: 'Próximo entreno según RIR registrado' },
  { id: 'fatiga',        icon: '🚦', label: 'Riesgo',         desc: 'Semáforo de carga + bienestar' },
  { id: 'videos',        icon: '🎥', label: 'Vídeos',         desc: 'Feedback de técnica pendiente' },
  { id: 'fuerza',       icon: '💪', label: 'Fuerza',        desc: 'Progreso de peso por ejercicio' },
  { id: 'records',      icon: '🏆', label: 'Récords',       desc: 'Marcas personales' },
  { id: 'rm',           icon: '⚡', label: '1RM est.',       desc: 'Estimación de fuerza máxima' },
  { id: 'estandares',   icon: '🏆', label: 'Nivel de fuerza', desc: 'Sentadilla/banca/peso muerto vs. estándares' },
  { id: 'pruebas',      icon: '🧪', label: 'Pruebas físicas', desc: 'Salto, Cooper, flexibilidad y más' },
  { id: 'fv_profile',   icon: '🚀', label: 'Perfil F-V',     desc: 'Fuerza-Velocidad del salto (Samozino/Morin)' },
  { id: 'volumen',      icon: '📊', label: 'Volumen',        desc: 'Carga total semanal' },
  { id: 'volumen_grupo', icon: '🧩', label: 'Volumen por grupo', desc: 'Series semanales por grupo muscular' },
  { id: 'comparativa',  icon: '↔️', label: 'Esta semana',   desc: 'Esta semana vs anterior' },
  { id: 'resumen_mensual', icon: '🗓️', label: 'Resumen mensual', desc: 'Este mes vs el anterior' },
  { id: 'distribucion', icon: '🎯', label: 'Músculos',      desc: 'Distribución por grupos musculares' },
  { id: 'adherencia',   icon: '📅', label: 'Adherencia',    desc: '% días entrenados vs planificados' },
  { id: 'racha',        icon: '🔥', label: 'Racha',         desc: 'Racha y estadísticas globales' },
  { id: 'peso',         icon: '⚖️', label: 'Peso',          desc: 'Evolución del peso corporal' },
  { id: 'dolor',        icon: '🩹', label: 'Dolor',         desc: 'Seguimiento de dolor — útil en rehabilitación' },
  { id: 'fotos',        icon: '📸', label: 'Fotos',         desc: 'Fotos de progreso del cliente' },
  { id: 'ciclo',        icon: '🌙', label: 'Ciclo',          desc: 'Fase actual, guía de intensidad y rendimiento por fase (opcional)' },
]

export const GROUPS: { id: string; label: string; icon: string; sections: Section[] }[] = [
  { id: 'rendimiento', label: 'Rendimiento', icon: '💪', sections: ['fuerza', 'records', 'rm', 'estandares', 'pesos_sugeridos', 'pruebas', 'fv_profile'] },
  { id: 'carga',       label: 'Carga y riesgo', icon: '🚦', sections: ['fatiga', 'volumen', 'volumen_grupo', 'comparativa', 'resumen_mensual', 'adherencia', 'racha'] },
  { id: 'cuerpo',      label: 'Cuerpo',       icon: '⚖️', sections: ['peso', 'dolor', 'fotos', 'distribucion', 'ciclo'] },
  { id: 'videos',      label: 'Vídeos',       icon: '🎥', sections: ['videos'] },
]

// Secciones que tiene sentido enseñar al cliente en su propio panel: excluye
// las que ya tienen su propia pestaña dedicada (peso, fotos, records, vídeos)
// y las que necesitan props extra que el portal del cliente no calcula
// (volumen_grupo/distribucion piden la biblioteca de ejercicios, pruebas/
// fv_profile/estándares piden datos adicionales del cliente).
export const CLIENT_SHAREABLE_SECTIONS: Section[] = ['fuerza', 'rm', 'volumen', 'adherencia', 'racha', 'fatiga', 'dolor', 'resumen_mensual']

// Métricas activas del entrenador: qué secciones usa en general (para no
// llenarle el menú de cosas que no usa, ej. un entrenador que nunca hace
// tests de salto no necesita ver "Perfil F-V"). Se guarda en
// entrenadores.profile.metricasActivas — si no existe, se asume que todas
// están activas (compatibilidad con entrenadores existentes).
export function useTrainerMetricSettings(trainerId?: string) {
  const [enabled, setEnabled] = useState<Set<Section> | null>(null) // null = todas activas

  useEffect(() => {
    if (!trainerId) return
    supabase.from('entrenadores').select('profile').eq('uid', trainerId).maybeSingle()
      .then(({ data }) => {
        const list = (data?.profile as { metricasActivas?: Section[] } | null)?.metricasActivas
        setEnabled(list ? new Set(list) : null)
      })
  }, [trainerId])

  return enabled
}
