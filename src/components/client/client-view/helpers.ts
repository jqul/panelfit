// Copia local del cliente y del plan del día — permite un arranque en frío sin
// conexión (ej. sótano de gimnasio) mostrando la última versión conocida en vez
// de un enlace "no válido" o una pantalla en blanco.
export const CLIENT_CACHE_KEY = (token: string) => `pf_client_cache_${token}`
export const PLAN_CACHE_KEY = (clientId: string) => `pf_plan_cache_${clientId}`
