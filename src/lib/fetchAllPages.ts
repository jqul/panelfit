// PostgREST trunca cualquier select en silencio (sin error) al tope de filas
// configurado a nivel de proyecto en Supabase — 1000 por defecto — sin
// importar el .limit() que se pida. Esta paginación con .range() evita
// depender de ese tope.
export async function fetchAllPages<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<{ rows: T[]; error: unknown }> {
  const PAGE = 1000
  let rows: T[] = []
  let page = 0
  while (true) {
    const { data, error } = await buildQuery(page * PAGE, page * PAGE + PAGE - 1)
    if (error) return { rows, error }
    if (!data || data.length === 0) break
    rows = rows.concat(data)
    if (data.length < PAGE) break // última página
    page++
  }
  return { rows, error: null }
}
