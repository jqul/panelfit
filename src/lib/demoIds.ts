// Identificadores y comprobaciones del modo demo, en un módulo diminuto para que el código real de
// la app (cliente, entrenador) pueda saber si es demo SIN descargar los datos de ejemplo
// (demo-data y demo-data-extra, ~25 kB gzip), que solo se cargan bajo demanda en el modo demo.
export const DEMO_TRAINER_ID = 'demo-trainer-001'
export const DEMO_PUBLIC_SLUG = 'alexfit'
export const isDemoClientId = (id?: string | null): boolean => !!id && id.startsWith('demo-client-')
export const isDemoTrainerId = (id?: string | null): boolean => id === DEMO_TRAINER_ID
