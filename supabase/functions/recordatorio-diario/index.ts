// Aviso de las 18:00 al cliente: "Te queda el entreno de hoy" / "Te quedan 2 tareas de hoy". Solo lo dispara la
// tarea programada de la base de datos (lanzar_recordatorio_diario), con el secreto 'recordatorio_diario' de
// internal_webhook_secrets. Usa los mismos secrets VAPID que send-push.
//
// A quién: clientes con alguna suscripción push que no han apagado el aviso (clientes.recordatorio_diario), que no
// están archivados ni de ausencia "no puedo" hoy, y a los que no se les ha mandado ya hoy (recordatorios_enviados).
import webpush from "npm:web-push@3.6.7"
import { createClient } from "npm:@supabase/supabase-js@2"
import { pendientesDeHoy, textoAviso, type Plan, type Logs, type TareaLite } from "./pendientes.ts"

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
    .from("internal_webhook_secrets").select("secret").eq("name", "recordatorio_diario").maybeSingle()
  if (!secretRow?.secret || !igual(token, secretRow.secret)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response(JSON.stringify({ error: "VAPID keys not configured" }), { status: 500 })
  }

  try {
    const hoy = hoyMadrid()
    const { data: subs, error } = await supabase.from("push_subscriptions").select("*").not("client_id", "is", null)
    if (error) throw error
    const ids = [...new Set((subs || []).map(s => s.client_id as string))]
    if (!ids.length) return Response.json({ enviados: 0 })

    const [cli, planes, regs, tareas, hechas, ausencias, ya] = await Promise.all([
      supabase.from("clientes").select("id, archived_at, recordatorio_diario").in("id", ids),
      supabase.from("planes").select('"clientId", plan').in("clientId", ids),
      supabase.from("registros").select('"clientId", logs').in("clientId", ids),
      supabase.from("tareas_cliente").select("id, client_id, titulo, fecha, repetir, dias, hasta").in("client_id", ids).lte("fecha", hoy),
      supabase.from("tareas_hechas").select("tarea_id, client_id").in("client_id", ids).eq("fecha", hoy),
      supabase.from("ausencias").select("client_id").in("client_id", ids).eq("tipo", "no_puedo").lte("desde", hoy).gte("hasta", hoy),
      supabase.from("recordatorios_enviados").select("client_id").eq("fecha", hoy),
    ])
    for (const r of [cli, planes, regs, tareas, hechas, ausencias, ya]) if (r.error) throw r.error

    const fuera = new Set([
      ...(cli.data || []).filter(c => c.archived_at || c.recordatorio_diario === false).map(c => c.id),
      ...(ausencias.data || []).map(a => a.client_id),
      ...(ya.data || []).map(r => r.client_id),
    ])
    const vivos = new Set((cli.data || []).map(c => c.id))
    const planDe = new Map((planes.data || []).map(p => [p.clientId, (p.plan?.P ?? null) as Plan | null]))
    const logsDe = new Map((regs.data || []).map(r => [r.clientId, (r.logs ?? null) as Logs | null]))

    let enviados = 0
    for (const clientId of ids) {
      if (!vivos.has(clientId) || fuera.has(clientId)) continue
      const suyas = (tareas.data || []).filter(t => t.client_id === clientId) as TareaLite[]
      const marcadas = new Set((hechas.data || []).filter(h => h.client_id === clientId).map(h => h.tarea_id as string))
      const aviso = textoAviso(pendientesDeHoy(planDe.get(clientId) ?? null, logsDe.get(clientId) ?? null, suyas, marcadas, hoy))
      if (!aviso) continue

      // Primero se apunta (la clave primaria evita dos avisos el mismo día aunque la tarea se lance dos veces).
      const { error: e } = await supabase.from("recordatorios_enviados").insert({ client_id: clientId, fecha: hoy })
      if (e) continue
      const payload = JSON.stringify({ ...aviso, url: "/" })
      const results = await Promise.allSettled((subs || []).filter(s => s.client_id === clientId).map(sub =>
        webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
          .catch(async (err: any) => {
            if (err?.statusCode === 404 || err?.statusCode === 410) await supabase.from("push_subscriptions").delete().eq("id", sub.id)
            throw err
          })))
      if (results.some(r => r.status === "fulfilled")) enviados++
    }
    return Response.json({ enviados, candidatos: ids.length })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
