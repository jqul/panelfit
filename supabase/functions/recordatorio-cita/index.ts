// Recordatorios y avisos de la agenda. Solo lo dispara la base de datos (lanzar_recordatorio_citas: la tarea de cada
// 15 minutos y, al momento, el trigger de las plazas de clase), con el secreto 'recordatorio_cita' de
// internal_webhook_secrets. Usa los mismos secrets VAPID que send-push. Manda tres avisos al cliente:
//   - cita confirmada una hora antes: "Tu cita es a las 18:00";
//   - clase de grupo con plaza una hora antes: "Tu clase es a las 18:00";
//   - plaza conseguida al salir de la lista de espera: "Ya tienes plaza en «Funcional»".
//
// Cada aviso se reclama antes de mandarlo (una actualización con condición, que es atómica): aunque la función se lance
// dos veces, el cliente recibe uno solo. Los clientes archivados no reciben nada.
import webpush from "npm:web-push@3.6.7"
import { createClient } from "npm:@supabase/supabase-js@2"

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? ""
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? ""
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:soporte@panelfit.app"

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
)

function igual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

/** "18:00" en hora de Madrid. */
const horaMadrid = (iso: string) => new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso))
/** "jue 12 nov, 18:00" en hora de Madrid. */
const diaHoraMadrid = (iso: string) => new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso))

/** Push a todos los dispositivos del cliente (si no está archivado). true si llegó a alguno. */
async function avisar(clientId: string, title: string, body: string): Promise<boolean> {
  const { data: cliente } = await supabase.from("clientes").select("archived_at").eq("id", clientId).maybeSingle()
  if (!cliente || cliente.archived_at) return false
  const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("client_id", clientId)
  const payload = JSON.stringify({ title, body: body.slice(0, 100), url: "/" })
  const results = await Promise.allSettled((subs || []).map(sub =>
    webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
      .catch(async (err: any) => {
        if (err?.statusCode === 404 || err?.statusCode === 410) await supabase.from("push_subscriptions").delete().eq("id", sub.id)
        throw err
      })))
  return results.some(r => r.status === "fulfilled")
}

type ClaseEmb = { titulo: string; start_at: string; cancelada: boolean }
const claseDe = (fila: { clases: ClaseEmb | ClaseEmb[] | null }) => (Array.isArray(fila.clases) ? fila.clases[0] : fila.clases)

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 })

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "")
  const { data: secretRow } = await supabase
    .from("internal_webhook_secrets").select("secret").eq("name", "recordatorio_cita").maybeSingle()
  if (!secretRow?.secret || !igual(token, secretRow.secret)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response(JSON.stringify({ error: "VAPID keys not configured" }), { status: 500 })
  }

  try {
    const ahora = Date.now()
    const desde = new Date(ahora + 30 * 60_000).toISOString()
    const hasta = new Date(ahora + 75 * 60_000).toISOString()
    let citasAvisadas = 0, clasesAvisadas = 0, plazasAvisadas = 0

    // ── Citas: una hora antes ──
    const { data: citas, error } = await supabase.from("citas")
      .select("id, client_id, title, start_at")
      .eq("status", "confirmada").is("recordada_at", null).not("client_id", "is", null)
      .gte("start_at", desde).lte("start_at", hasta)
    if (error) throw error
    for (const cita of citas || []) {
      // Reclamar: solo una ejecución consigue marcarla
      const { data: reclamada } = await supabase.from("citas").update({ recordada_at: new Date().toISOString() })
        .eq("id", cita.id).is("recordada_at", null).select("id")
      if (!reclamada?.length) continue
      if (await avisar(cita.client_id, `Tu cita es a las ${horaMadrid(cita.start_at)}`, String(cita.title || "Sesión con tu entrenador"))) citasAvisadas++
    }

    // ── Clases de grupo: una hora antes, a quien tiene plaza ──
    const { data: porRecordar, error: errClases } = await supabase.from("clase_plazas")
      .select("clase_id, client_id, clases!inner(titulo, start_at, cancelada)")
      .eq("estado", "reservada").is("recordada_at", null)
      .eq("clases.cancelada", false).gte("clases.start_at", desde).lte("clases.start_at", hasta)
    if (errClases) throw errClases
    for (const p of porRecordar || []) {
      const k = claseDe(p as any)
      if (!k) continue
      const { data: reclamada } = await supabase.from("clase_plazas").update({ recordada_at: new Date().toISOString() })
        .eq("clase_id", p.clase_id).eq("client_id", p.client_id).eq("estado", "reservada").is("recordada_at", null).select("clase_id")
      if (!reclamada?.length) continue
      if (await avisar(p.client_id, `Tu clase es a las ${horaMadrid(k.start_at)}`, k.titulo)) clasesAvisadas++
    }

    // ── Plaza conseguida al salir de la lista de espera ──
    const { data: plazas, error: errPlazas } = await supabase.from("clase_plazas")
      .select("clase_id, client_id, clases!inner(titulo, start_at, cancelada)")
      .eq("aviso_plaza_pendiente", true).eq("estado", "reservada")
    if (errPlazas) throw errPlazas
    for (const p of plazas || []) {
      const { data: reclamada } = await supabase.from("clase_plazas").update({ aviso_plaza_pendiente: false })
        .eq("clase_id", p.clase_id).eq("client_id", p.client_id).eq("aviso_plaza_pendiente", true).select("clase_id")
      if (!reclamada?.length) continue
      const k = claseDe(p as any)
      // Una clase ya empezada o cancelada no se avisa (el aviso queda consumido igualmente)
      if (!k || k.cancelada || new Date(k.start_at).getTime() <= ahora) continue
      if (await avisar(p.client_id, `Ya tienes plaza en «${k.titulo}»`, `Se ha liberado una plaza: ${diaHoraMadrid(k.start_at)}`)) plazasAvisadas++
    }

    return Response.json({
      enviados: citasAvisadas + clasesAvisadas + plazasAvisadas,
      citas: citasAvisadas, clases: clasesAvisadas, plazas: plazasAvisadas,
      candidatas: (citas?.length || 0) + (porRecordar?.length || 0) + (plazas?.length || 0),
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
