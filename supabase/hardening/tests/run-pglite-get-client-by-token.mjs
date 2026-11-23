// Runner local de la prueba de get_client_by_token (el enlace /?c=<token> del cliente), sin base de datos real.
// Uso (desde la raíz del repo):
//   npm i --no-save @electric-sql/pglite
//   node supabase/hardening/tests/run-pglite-get-client-by-token.mjs
//   node supabase/hardening/tests/run-pglite-get-client-by-token.mjs --sin-arreglo   (omite la migración nueva: reproduce el fallo de producción; debe salir con HAY FALLOS)
//
// Aplica TODAS las migraciones que añaden columnas a `clientes` (la función devuelve SETOF clientes con la lista escrita a mano y hay que rehacerla con cada una) y la nueva, y comprueba:
//   1. la ESTRUCTURA del resultado frente a la de la tabla: número de columnas, orden, nombre y tipo (los metadatos que devuelve Postgres con el resultado, no un simple recuento);
//   2. los casos de contenido y acceso de bloque47_get_client_by_token.sql.
// Sale con código 1 si algo falla.
import { crearBase, read } from './pglite-base.mjs'

const sinArreglo = process.argv.includes('--sin-arreglo')
const db = await crearBase()

const cadena = [
  '20261024000001_enlace_caducidad.sql', '20261026000002_archivar_clientes.sql', '20261029000002_recordatorio_diario.sql', '20261030000005_profesional_cliente.sql',
  '20261104000002_programas_enlazados.sql', '20261114000001_archivar_terminados.sql',
  ...(sinArreglo ? [] : ['20261123000010_get_client_by_token_archivado_motivo.sql']),
]
for (const m of cadena) {
  let sql = read(`migrations/${m}`)
  sql = sql.slice(0, sql.includes('-- Tarea programada') ? sql.indexOf('-- Tarea programada') : sql.length) // PGlite no tiene cron
  await db.exec(sql)
  console.log(`migración aplicada: ${m}`)
}
if (sinArreglo) console.log('(sin la migración nueva: se espera que la función falle)')

const filas = []
const comprobar = (caso, ok, detalle = '') => { filas.push({ caso, resultado: ok ? 'OK' : 'FALLO', detalle: String(detalle).slice(0, 90) }); return ok }

// ── 1. Estructura del resultado frente a la de la tabla ──
await db.exec(`
  alter table public.entrenadores disable trigger welcome_email_trigger;
  insert into public.entrenadores (uid, email, "displayName", approved, rol, role) values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'e1@test.local', 'Estructura', true, 'trainer', 'trainer');
  insert into public.clientes (id, "trainerId", name, token) values ('e1000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000e1', 'Estructura', 'tok-estructura');
`)
const tabla = (await db.query(`
  select a.attname as nombre, a.atttypid::int as tipo, format_type(a.atttypid, a.atttypmod) as tipo_texto
  from pg_attribute a where a.attrelid = 'public.clientes'::regclass and a.attnum > 0 and not a.attisdropped order by a.attnum`)).rows
let resultado = null, error = null
try { resultado = await db.query(`select * from public.get_client_by_token('tok-estructura')`) } catch (e) { error = e }
if (error) {
  comprobar('E0 la función se ejecuta sobre un token válido', false, error.message)
} else {
  const campos = resultado.fields
  comprobar('E0 la función se ejecuta sobre un token válido y devuelve su fila', resultado.rows.length === 1, `${resultado.rows.length} fila(s)`)
  comprobar('E1 el número de columnas del resultado es el de la tabla', campos.length === tabla.length, `${campos.length} frente a ${tabla.length}`)
  comprobar('E2 los nombres, en el mismo ORDEN que la tabla', JSON.stringify(campos.map(c => c.name)) === JSON.stringify(tabla.map(t => t.nombre)),
    campos.map(c => c.name).filter((n, i) => n !== tabla[i]?.nombre)[0] ?? '')
  const tiposDistintos = campos.map((c, i) => [c.name, c.dataTypeID, tabla[i]?.tipo, tabla[i]?.tipo_texto]).filter(([, a, b]) => a !== b)
  comprobar('E3 el tipo de CADA columna coincide con el de la tabla', tiposDistintos.length === 0, tiposDistintos.map(([n, , , t]) => `${n} (${t})`).join(', '))
  comprobar('E4 incluye la columna que faltaba (archivado_motivo), en último lugar', campos.at(-1)?.name === 'archivado_motivo' && tabla.at(-1)?.nombre === 'archivado_motivo', campos.at(-1)?.name)
}

// ── 2. Casos de contenido y acceso (si la función no se ejecuta, también fallan: es lo que se quiere ver) ──
try {
  const res = await db.exec(read('hardening/tests/bloque47_get_client_by_token.sql'))
  const r = [...res].reverse().find(x => x.fields?.some(f => f.name === 'caso'))
  for (const x of r.rows) comprobar(x.caso, x.resultado === 'OK', x.detalle)
} catch (e) {
  comprobar('B47 los casos de bloque47 se ejecutan', false, e.message)
}

console.table(filas)
const ok = filas.every(x => x.resultado === 'OK')
console.log(ok ? `todo OK (${filas.length} casos)` : `HAY FALLOS: ${filas.filter(x => x.resultado !== 'OK').length} de ${filas.length}`)

await db.close()
process.exitCode = ok ? 0 : 1
