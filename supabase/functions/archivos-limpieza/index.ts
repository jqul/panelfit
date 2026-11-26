// Limpieza diaria de los archivos de los cuestionarios: borra con la Storage API lo que caduca y avisa a los entrenadores. Solo la dispara la tarea programada de la base de datos
// (lanzar_limpieza_archivos), con el secreto 'archivos_limpieza' de internal_webhook_secrets (verify_jwt = false). Qué toca borrar y a quién avisar lo decide la base de datos
// (funciones archivos_* de la migración 20261125000010); las reglas de orquestación están en limpieza.ts, con pruebas. Diseño en docs/archivos-cuestionarios.md.
import { createClient } from "npm:@supabase/supabase-js@2"
import { igual, limpiar, type Deps } from "./limpieza.ts"

const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")
const BUCKET = "cuestionario-archivos"

const deps: Deps = {
  async avisar() {
    const { data, error } = await admin.rpc("archivos_avisar_caducidad")
    if (error) throw new Error(error.message)
    return Number(data) || 0
  },
  async reclamar() {
    const { data, error } = await admin.rpc("archivos_reclamar_limpieza")
    if (error) throw new Error(error.message)
    return (data ?? []) as { id: string; ruta: string }[]
  },
  async finalizar(ids) {
    const { data, error } = await admin.rpc("archivos_finalizar_limpieza", { p_ids: ids })
    if (error) throw new Error(error.message)
    return Number(data) || 0
  },
  async huerfanos() {
    const { data, error } = await admin.rpc("archivos_huerfanos")
    if (error) throw new Error(error.message)
    return ((data ?? []) as { name: string }[]).map(o => o.name)
  },
  async borrar(rutas) {
    const { error } = await admin.storage.from(BUCKET).remove(rutas)
    if (error) console.error("archivos-limpieza: Storage:", error.message)
    return !error
  },
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 })
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "")
  const { data: secreto } = await admin.from("internal_webhook_secrets").select("secret").eq("name", "archivos_limpieza").maybeSingle()
  if (!secreto?.secret || !igual(token, secreto.secret)) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  const resumen = await limpiar(deps)
  if (resumen.errores.length) console.error("archivos-limpieza:", resumen.errores.join(" | "))
  return Response.json(resumen)
})
