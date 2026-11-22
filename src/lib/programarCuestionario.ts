import { supabase } from './supabase'

// Deja a un cliente con un cuestionario pendiente: usa la plantilla del entrenador con el nombre del modelo (así, si ya la editó, se respeta lo que cambió) o,
// si todavía no existe, la crea a partir del modelo; y programa un envío ÚNICO para ese cliente (`encuestas_pendientes` se lo enseña hasta que lo conteste).
// Es lo mismo que hace el editor de Encuestas («Usar modelo» y «Programar envío»), aquí en un paso y desde el alta del cliente. Habla con Supabase: sin
// lógica que probar aparte. Las preguntas del modelo se cargan aquí, al crear el cliente (no en el panel). Devuelve false si algo falla (el cliente ya está creado: el entrenador puede enviarlo a mano desde Encuestas).
export async function programarCuestionario(trainerId: string, clientId: string, modeloId: string): Promise<boolean> {
  const { MODELOS_PROGRAMACION } = await import('./modelosProgramacion')
  const modelo = MODELOS_PROGRAMACION.find(m => m.id === modeloId)
  if (!modelo) return false
  const { data: previas, error: errorBusqueda } = await supabase.from('survey_templates').select('id').eq('trainer_id', trainerId).eq('name', modelo.name).limit(1)
  if (errorBusqueda) return false
  let templateId: string | undefined = (previas as { id: string }[] | null)?.[0]?.id
  if (!templateId) {
    templateId = `tmpl_${Date.now()}`
    const { error } = await supabase.from('survey_templates').insert({ id: templateId, trainer_id: trainerId, name: modelo.name, questions: modelo.questions, created_at: Date.now(), auto_nuevos_desde: null })
    if (error) return false
  }
  const { error } = await supabase.from('survey_schedules').insert({
    id: `sched_${Date.now()}`, trainer_id: trainerId, template_id: templateId, client_id: clientId, frequency: 'once', day_of_week: 0, active: true, last_sent_at: null,
  })
  return !error
}
