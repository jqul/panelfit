// Notas privadas del entrenador sobre un cliente. Antes vivían en el plan (plan.coachNotes), que el cliente lee entero, así que
// viajaban hasta su móvil aunque no se pintaran. Ahora están en su propia tabla (notas_privadas_cliente: solo el entrenador o su
// equipo; lo que habla con Supabase está en notasPrivadasCliente.ts). Sin React ni red.

/** Devuelve el plan sin `coachNotes`: el plan que lee el cliente nunca debe llevar las notas privadas (ni al guardar ni al
 *  restaurar una copia antigua del historial, que todavía las conserva). No muta el original. */
export function quitarNotasDelPlan<T extends object>(plan: T): T {
  if (!plan || typeof plan !== 'object' || !('coachNotes' in plan)) return plan
  const { coachNotes: _notas, ...resto } = plan as T & { coachNotes?: unknown }
  return resto as T
}

/** Añade una etiqueta rápida («⚠️ Lesión»…) al final de las notas, en su propia línea. */
export function anadirEtiquetaANotas(notas: string, etiqueta: string): string {
  return `${notas}\n[${etiqueta}] `
}

/** ¿Hay notas con contenido? (las que solo tienen espacios o saltos de línea no cuentan) */
export function tieneNotas(notas: string | null | undefined): boolean {
  return !!notas && notas.trim().length > 0
}
