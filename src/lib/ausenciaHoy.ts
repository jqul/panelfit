import { localDateKey } from './dates'

// Lo mínimo para saber si un cliente está fuera hoy. Lo usa la lista de clientes, que se carga con el panel;
// el resto de ausencias y eventos (formularios, eventos, textos) vive en ./ausencias y se carga bajo demanda.
export type MotivoAusencia = 'viaje' | 'lesion' | 'enfermedad' | 'trabajo' | 'otro'

export const MOTIVO_LABEL: Record<MotivoAusencia, string> = {
  viaje: 'Viaje', trabajo: 'Trabajo', enfermedad: 'Enfermedad', lesion: 'Lesión', otro: 'Otro',
}

/** La ausencia que cubre hoy (si hay varias, la que termina más tarde). */
export function ausenciaActiva<T extends { desde: string; hasta: string }>(ausencias: T[], hoy: string = localDateKey()): T | null {
  return ausencias.filter(a => a.desde <= hoy && a.hasta >= hoy).sort((a, b) => b.hasta.localeCompare(a.hasta))[0] ?? null
}
