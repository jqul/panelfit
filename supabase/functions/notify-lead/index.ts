// Avisa por push al entrenador de un contacto de su página pública: uno nuevo, o (con `recordatorio`) uno que lleva
// más de un día sin contestar. Solo lo disparan el trigger `leads_notify` y la tarea programada de la base de datos:
// el secreto 'new_lead' vive únicamente en la tabla internal_webhook_secrets (nunca en el código).
// Usa los mismos secrets VAPID que send-push.
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Comparación sin atajos: el tiempo no depende de en qué carácter falla.
function igual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 })

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "")
  const { data: secretRow } = await supabase
    .from("internal_webhook_secrets").select("secret").eq("name", "new_lead").maybeSingle()
  if (!secretRow?.secret || !igual(token, secretRow.secret)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response(JSON.stringify({ error: "VAPID keys not configured" }), { status: 500 })
  }

  try {
    const { trainer_id, name, recordatorio } = await req.json()
    if (typeof trainer_id !== "string" || !UUID.test(trainer_id)) {
      return new Response(JSON.stringify({ error: "trainer_id required" }), { status: 400 })
    }
    const quien = String(name ?? "").replace(/\s+/g, " ").trim().slice(0, 60) || "Alguien"

    const { data: subs, error } = await supabase.from("push_subscriptions").select("*").eq("trainer_id", trainer_id)
    if (error) throw error

    const payload = JSON.stringify({
      title: recordatorio ? "Contacto sin contestar" : "Nuevo contacto",
      body: recordatorio ? `${quien} lleva más de un día esperando tu respuesta` : `${quien} te ha escrito desde tu página pública`,
      url: "/",
    })

    const results = await Promise.allSettled(
      (subs || []).map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        ).catch(async (err: any) => {
          // Suscripción caducada o inválida -> limpiar
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id)
          }
          throw err
        })
      )
    )

    const sent = results.filter((r) => r.status === "fulfilled").length
    return new Response(JSON.stringify({ sent, total: subs?.length || 0 }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
