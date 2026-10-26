// ¿Tiene el cliente una dieta que ver? Decide si su panel enseña la pestaña Dieta: para quien no tiene ninguna, esa
// pestaña solo abría una pantalla vacía y ocupaba un hueco de la barra de abajo.

/** `datos` es la dieta guardada (tabla `dietas`); cuenta como dieta si trae comidas o algún objetivo de macros. */
export function dietaConContenido(datos: unknown): boolean {
  if (!datos || typeof datos !== 'object') return false
  const d = datos as { meals?: unknown; kcal?: unknown; protein?: unknown; carbs?: unknown; fats?: unknown }
  if (Array.isArray(d.meals) && d.meals.length > 0) return true
  return [d.kcal, d.protein, d.carbs, d.fats].some(n => typeof n === 'number' && n > 0)
}
