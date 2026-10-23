// El enlace "Invita a un amigo" se comparte por WhatsApp y redes. Antes llevaba el
// token de acceso del cliente (`?ref=<token>`), que es justo lo que da entrada a
// su plan y sus entrenos. Ahora lleva un código derivado que solo sirve para
// atribuir la recomendación: los primeros 16 hex de sha256(token). No se puede
// invertir y no abre nada. La función submit_lead de la base de datos calcula lo
// mismo (supabase/hardening, bloque 7).
export async function referralCode(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest).slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('')
}
