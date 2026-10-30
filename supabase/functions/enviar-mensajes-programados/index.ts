// Envía como push al cliente los mensajes programados (tabla programacion_mensajes) que ya tocan. Solo lo dispara la
// tarea programada de la base de datos (lanzar_mensajes_programados), con el secreto 'mensajes_programados' de
// internal_webhook_secrets. Usa los mismos secrets VAPID que send-push.
//
// Marca "pushEnviado" y no "enviado": "enviado" lo marca el entrenador desde su panel, y la pestaña Mensajes no
// repite el push si pushEnviado ya está. Un mensaje de un cliente sin suscripción push no se marca: queda pendiente.
import webpush from "npm:web-push@3.6.7"
import { createClient } from "npm:@supabase/supabase-js@2"
import { mensajesAEnviar, sumarDias, DIAS_MAX_ATRASO, type MensajePendiente } from "./seleccion.ts"

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
    const hoy = hoyMadrid()
    const { data: filas, error } = await supabase
      .from("programacion_mensajes")
      .select('id, "clientId", mensaje, "fechaEnvio"')
      .eq("enviado", false).eq("pushEnviado", false)
      .lte("fechaEnvio", hoy).gte("fechaEnvio", sumarDias(hoy, -DIAS_MAX_ATRASO))
      .limit(500)
    if (error) throw error
    const pendientes: MensajePendiente[] = (filas || []).map(f => ({
      id: f.id as string, clientId: f.clientId as string, mensaje: f.mensaje as string, fechaEnvio: f.fechaEnvio as string,
    }))
    if (!pendientes.length) return Response.json({ enviados: 0 })

    const ids = [...new Set(pendientes.map(m => m.clientId))]
    const { data: subs, error: e2 } = await supabase.from("push_subscriptions").select("*").in("client_id", ids)
    if (e2) throw e2
    const conPush = new Set((subs || []).map(s => s.client_id as string))
    const sel = mensajesAEnviar(pendientes, conPush, hoy)

    let enviados = 0
    for (const m of sel.enviar) {
      const payload = JSON.stringify({ title: "Tu entrenador", body: m.mensaje, url: "/" })
      const results = await Promise.allSettled((subs || []).filter(s => s.client_id === m.clientId).map(sub =>
        webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
          .catch(async (err: any) => {
            if (err?.statusCode === 404 || err?.statusCode === 410) await supabase.from("push_subscriptions").delete().eq("id", sub.id)
            throw err
          })))
      // Solo se marca si llegó a algún dispositivo; si no, se reintenta en la siguiente ejecución.
      if (results.some(r => r.status === "fulfilled")) {
        await supabase.from("programacion_mensajes").update({ pushEnviado: true }).eq("id", m.id)
        enviados++
      }
    }
    return Response.json({ enviados, sinSuscripcion: sel.sinSuscripcion, atrasados: sel.atrasados })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
