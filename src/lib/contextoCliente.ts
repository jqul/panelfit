// Contexto de un vistazo para las filas de «Hoy»: el objetivo del cliente y sus etiquetas, para saber de quién se trata sin abrir la
// ficha. No es otra pantalla de filtros (para eso están Clientes y Etiquetas): solo texto corto junto al nombre.
export interface EtiquetaLite { id: string; name: string; emoji: string; color: string }
export interface ClienteContexto { objetivo?: string | null; main_goal?: string | null; label_ids?: string[] }

/** `main_goal` es el objetivo en palabras del cliente (más específico); si no, el tipo de objetivo salvo «general», que no dice nada.
 *  Etiquetas: las primeras `max` en el orden del entrenador y cuántas quedan fuera. */
export function contextoCliente<E extends EtiquetaLite>(c: ClienteContexto, etiquetas: E[], max = 2) {
  const propio = c.main_goal?.trim()
  const tipo = c.objetivo?.trim()
  const objetivo = propio || (tipo && tipo.toLowerCase() !== 'general' ? tipo : null)
  const suyas = etiquetas.filter(e => (c.label_ids || []).includes(e.id))
  return { objetivo, etiquetas: suyas.slice(0, max), resto: Math.max(0, suyas.length - max) }
}
