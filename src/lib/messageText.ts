/** Sustituye los placeholders del mensaje por los datos reales del cliente. (Sin dependencias, para poder probarlo.) */
export function resolveMessage(texto: string, clientName: string): string {
  return texto.replace(/\{\{\s*cliente\s*\}\}/gi, clientName)
}
