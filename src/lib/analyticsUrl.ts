// El enlace de acceso de un cliente es `/?c=<token>`: quien lo tiene entra a su
// plan y sus entrenos sin contraseña. La analítica de Vercel manda la URL de
// cada visita, así que sin esto el token acabaría guardado en su panel.
const PARAMS_SENSIBLES = ['c']

export function sinParametrosSensibles(url: string): string {
  try {
    const u = new URL(url)
    for (const p of PARAMS_SENSIBLES) u.searchParams.delete(p)
    return u.toString()
  } catch {
    // URL que no se puede interpretar: mejor quitar toda la query que arriesgar el token
    return url.split('?')[0].split('#')[0]
  }
}
