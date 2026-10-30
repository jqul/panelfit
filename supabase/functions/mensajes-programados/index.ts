// Push al cliente de los mensajes programados que ya tocan ("Tienes un mensaje nuevo"). Solo lo dispara la tarea
// programada de la base de datos (lanzar_mensajes_programados), con el secreto 'mensajes_programados' de
// internal_webhook_secrets. Usa los mismos secrets VAPID que send-push.
//
// Cada mensaje se reclama antes de mandarlo (pushEnviado = true con una condición, que es atómico): si la pestaña
// Mensajes del entrenador lo manda a la vez, o la tarea se lanza dos veces, solo uno lo consigue y el cliente recibe
// un único push. Los clientes archivados no reciben nada (y su mensaje queda sin reclamar).
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

/** Hoy en Madrid, 'YYYY-MM-DD'. */
const hoyMadrid = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date())

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 })

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "")
  const { data: secretRow } = await supabase
    .from("internal_webhook_secrets").select("secret").eq("name", "mensajes_programados").maybeSingle()
  if (!secretRow?.secret || !igual(token, secretRow.secret)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response(JSON.stringify({ error: "VAPID keys not configured" }), { status: 500 })
  }

  try {
    const { data: pendientes, error } = await supabase.from("programacion_mensajes")
      .select('id, "clientId", mensaje')
      .or("enviado.is.null,enviado.eq.false")
      .or('pushEnviado.is.null,pushEnviado.eq.false')
      .lte("fechaEnvio", hoyMadrid())
      .limit(200)
    if (error) throw error
    if (!pendientes?.length) return Response.json({ enviados: 0, candidatos: 0 })

    const ids = [...new Set(pendientes.map(m => m.clientId as string))]
    const [cli, subs] = await Promise.all([
      supabase.from("clientes").select("id, archived_at").in("id", ids),
      supabase.from("push_subscriptions").select("*").in("client_id", ids),
    ])
    if (cli.error) throw cli.error
    if (subs.error) throw subs.error
    const activos = new Set((cli.data || []).filter(c => !c.archived_at).map(c => c.id))

    let enviados = 0
    for (const m of pendientes) {
      if (!activos.has(m.clientId)) continue
      const { data: reclamado, error: e } = await supabase.from("programacion_mensajes")
        .update({ pushEnviado: true }).eq("id", m.id).or('pushEnviado.is.null,pushEnviado.eq.false').select("id")
      if (e || !reclamado?.length) continue
      const payload = JSON.stringify({ title: "Tienes un mensaje nuevo", body: String(m.mensaje || "").slice(0, 300), url: "/" })
      const results = await Promise.allSettled((subs.data || []).filter(s => s.client_id === m.clientId).map(sub =>
        webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
          .catch(async (err: any) => {
            if (err?.statusCode === 404 || err?.statusCode === 410) await supabase.from("push_subscriptions").delete().eq("id", sub.id)
            throw err
          })))
      if (results.some(r => r.status === "fulfilled")) enviados++
    }
    return Response.json({ enviados, candidatos: pendientes.length })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
