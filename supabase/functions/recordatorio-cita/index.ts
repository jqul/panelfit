// Recordatorio de cita una hora antes ("Tu cita es a las 18:00"). Solo lo dispara la tarea programada de la base de
// datos (lanzar_recordatorio_citas), con el secreto 'recordatorio_cita' de internal_webhook_secrets. Usa los mismos
// secrets VAPID que send-push.
//
// Cada cita se reclama antes de avisar (recordada_at con una condición, que es atómico): aunque la tarea se lance dos
// veces, el cliente recibe un único aviso. Los clientes archivados no reciben nada.
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
    const { data: citas, error } = await supabase.from("citas")
      .select("id, client_id, title, start_at")
      .eq("status", "confirmada").is("recordada_at", null).not("client_id", "is", null)
      .gte("start_at", new Date(ahora + 30 * 60_000).toISOString())
      .lte("start_at", new Date(ahora + 75 * 60_000).toISOString())
    if (error) throw error

    let enviados = 0
    for (const cita of citas || []) {
      // Reclamar: solo una ejecución consigue marcarla
      const { data: reclamada } = await supabase.from("citas").update({ recordada_at: new Date().toISOString() })
        .eq("id", cita.id).is("recordada_at", null).select("id")
      if (!reclamada?.length) continue

      const { data: cliente } = await supabase.from("clientes").select("archived_at").eq("id", cita.client_id).maybeSingle()
      if (!cliente || cliente.archived_at) continue
      const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("client_id", cita.client_id)
      const payload = JSON.stringify({
        title: `Tu cita es a las ${horaMadrid(cita.start_at)}`,
        body: String(cita.title || "Sesión con tu entrenador").slice(0, 100),
        url: "/",
      })
      const results = await Promise.allSettled((subs || []).map(sub =>
        webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
          .catch(async (err: any) => {
            if (err?.statusCode === 404 || err?.statusCode === 410) await supabase.from("push_subscriptions").delete().eq("id", sub.id)
            throw err
          })))
      if (results.some(r => r.status === "fulfilled")) enviados++
    }
    return Response.json({ enviados, candidatas: citas?.length || 0 })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
