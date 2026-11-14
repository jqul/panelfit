// Programas guardados de la galería (los de PanelFit y los de la comunidad), para tenerlos a mano sin añadirlos aún a
// la librería. Se guardan en el perfil del entrenador (profile.programasGuardados: ids 'pf:<clave>' o 'com:<id>'), así
// que los ve en cualquier dispositivo. En la demo, solo en memoria.

export const idPanelfit = (clave: string) => `pf:${clave}`
export const idComunidad = (id: string) => `com:${id}`

export function limpiarGuardados(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter((x): x is string => typeof x === 'string' && /^(pf|com):.{1,80}$/.test(x)))].slice(0, 200)
}

export function alternarGuardado(lista: string[], id: string): string[] {
  return lista.includes(id) ? lista.filter(x => x !== id) : [...lista, id]
}
