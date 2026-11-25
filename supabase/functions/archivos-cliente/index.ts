// Archivos que el cliente sube a un cuestionario: comprobarlos en el servidor, quitarlos y borrar los de un cliente (RGPD). Las reglas están en handler.ts (con pruebas);
// aquí solo se conecta con Supabase. Corre con la clave de servicio (se salta RLS): cada acción comprueba quién llama antes de tocar nada.
// Se despliega con verify_jwt = true (la sesión del cliente o del entrenador). Diseño en docs/archivos-cuestionarios.md.
import { createClient } from "npm:@supabase/supabase-js@2"
import { manejar, type Deps, type Fila } from "./handler.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")
const BUCKET = "cuestionario-archivos"
const TROZO = 100

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } })

const COLUMNAS = "id, client_id, ruta, nombre, ext, tipo, tamano, estado, response_id"

const deps: Deps = {
  async usuario(jwt) {
    const { data, error } = await admin.auth.getUser(jwt)
    return error || !data.user ? null : data.user.id
  },
  async clienteDe(uid) {
    const { data } = await admin.from("clientes").select("id").eq("auth_user_id", uid).limit(1).maybeSingle()
    return data?.id ?? null
  },
  async puedeGestionar(jwt, clientId) {
    // Con la sesión de quien llama (no la clave de servicio): can_manage_client mira auth.uid()
    const usuario = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } } })
    const { data, error } = await usuario.rpc("can_manage_client", { p_client_id: clientId })
    return !error && data === true
  },
  async fila(id) {
    const { data } = await admin.from("archivos_cliente").select(COLUMNAS).eq("id", id).maybeSingle()
    return (data as Fila | null) ?? null
  },
  async filasDeCliente(clientId) {
    const { data, error } = await admin.from("archivos_cliente").select("ruta").eq("client_id", clientId)
    if (error) throw new Error(error.message)
    return data ?? []
  },
  async marcarVerificado(id, tamano, tipo) {
    const { data } = await admin.from("archivos_cliente")
      .update({ estado: "verificado", tamano, tipo, verificado_at: new Date().toISOString() })
      .eq("id", id).eq("estado", "reservado").select("id")
    return (data?.length ?? 0) > 0
  },
  async marcarRechazado(id, motivo) {
    const { data } = await admin.from("archivos_cliente").update({ estado: "rechazado", motivo }).eq("id", id).eq("estado", "reservado").select("id")
    return (data?.length ?? 0) > 0
  },
  async marcarBorrando(id) {
    const { data } = await admin.from("archivos_cliente").update({ estado: "borrando", borrado_motivo: "limpieza" })
      .eq("id", id).in("estado", ["reservado", "verificado", "rechazado"]).is("response_id", null).select("id")
    return (data?.length ?? 0) > 0
  },
  async borrarFila(id, estado) {
    await admin.from("archivos_cliente").delete().eq("id", id).eq("estado", estado)
  },
  async descargar(ruta) {
    const { data, error } = await admin.storage.from(BUCKET).download(ruta)
    return error || !data ? null : new Uint8Array(await data.arrayBuffer())
  },
  async borrar(rutas) {
    for (let i = 0; i < rutas.length; i += TROZO) {
      const { error } = await admin.storage.from(BUCKET).remove(rutas.slice(i, i + TROZO))
      if (error) return false
    }
    return true
  },
  async listarCarpeta(clientId) {
    const rutas: string[] = []
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await admin.storage.from(BUCKET).list(clientId, { limit: 1000, offset })
      if (error) throw new Error(error.message)
      for (const o of data ?? []) if (o.id) rutas.push(`${clientId}/${o.name}`)
      if ((data?.length ?? 0) < 1000) return rutas
    }
  },
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "")
  let cuerpo: unknown = null
  try { cuerpo = await req.json() } catch { /* sin cuerpo: la acción lo rechazará */ }
  try {
    const r = await manejar({ metodo: req.method, jwt, cuerpo }, deps)
    return json(r.cuerpo, r.status)
  } catch (e) {
    console.error("archivos-cliente:", (e as Error).message)
    return json({ ok: false, codigo: "error" }, 500)
  }
})
