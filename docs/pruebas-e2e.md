# Pruebas end-to-end

Recorren la app en un navegador de verdad (Chrome) como lo haría una persona. Cubren los flujos donde un fallo
hace más daño: perder entrenos, enseñar datos de salud sin consentimiento, publicar mal un plan o no poder borrar.

```bash
npm run test:e2e        # ~3 min; arranca solo el servidor de desarrollo (puerto 5180; con otro worktree a la vez: E2E_PORT=5181 npm run test:e2e)
npm run typecheck:e2e   # tipos de las pruebas
```

Usan el **Chrome instalado en el ordenador** (no se descarga ningún navegador) y **nunca tocan la base de datos
real**: todas las peticiones a Supabase las contesta un simulador en memoria (`e2e/support/fakeSupabase.ts`).

## Qué cubren

| Fichero | Flujo | Qué comprueba |
| --- | --- | --- |
| `registro-cliente.e2e.ts` | Registro | Cliente nuevo: registro → consentimiento (sin marcar, sin poder continuar) → cuestionario → su panel; queda guardado el consentimiento (solo salud), el cuestionario y el descargo. Sin consentimiento de salud no se avanza aunque se firme el descargo. Un cliente que ya existía ve la pantalla de consentimiento una sola vez |
| `sesion-offline.e2e.ts` | Entreno sin conexión | Se pierde la conexión a mitad de un entreno: la serie queda en el móvil y **se ve dentro del entreno** que falta por subir; al volver se sube sola **sin pisar** lo que el entrenador escribió entretanto. Si falla la subida con conexión: queda pendiente y se puede reintentar |
| `entreno-sin-descargar.e2e.ts` | Entreno no descargado | Sin conexión y sin tener descargado el entreno: avisa en vez de romper; "Volver" y "Reintentar" |
| `publicar-plan.e2e.ts` | Publicar plan | El cliente no ve el borrador; al publicar, el plan nuevo llega al cliente, se limpia el borrador, sube la versión y queda copia en el historial. Si el cliente cambia sus días de entreno con la copia vieja en pantalla, **no pisa** lo que el entrenador acaba de publicar |
| `cola-diaria.e2e.ts` | Bandeja del entrenador | Los avisos se reúnen en una fila por cliente, ordenada por urgencia (urgente / para hoy / cuando puedas); lo urgente no se pospone; hecho y posponer sacan la fila, se recuperan y se recuerdan al recargar; un aviso nuevo devuelve a la cola a un cliente marcado como hecho |
| `borrar-datos.e2e.ts` | Borrado (RGPD) | El entrenador borra a un cliente: confirmación escribiendo el nombre, ficheros de Storage del cliente (los de otro no), filas de todas las tablas y solo las suyas, constancia del borrado. Si falla el borrado de ficheros no se borra nada más. El cliente que pide el borrado retira su consentimiento, avisa al entrenador y no se borra nada solo |

## Cómo funciona el simulador y qué NO prueba

`FakeSupabase` entiende lo justo de PostgREST (consultas con filtros, insertar, actualizar, borrar, upsert, errores
de clave duplicada), Auth (registro, entrar, refrescar), RPC, Storage (listar, borrar, firmar) y funciones. Lo que
no entiende **hace fallar la prueba** (`fake.unhandled`), igual que un error de JavaScript sin capturar en la
página: una consulta nueva de la app no pasa en silencio.

Es una simulación, así que **no prueba**:
- Las políticas RLS ni las funciones SQL reales (`export_client_data`, `delete_client_data`, el trigger de `entrenadores`...): eso está en `supabase/hardening/tests` con PGlite.
- El service worker (`serviceWorkers: 'block'`): tiene sus propias pruebas en `src/lib/serviceWorker.test.ts`.
- Un móvil real, la red real, el push ni el pago.

## Añadir un flujo

1. `seedWorld(fake, { ... })` (en `e2e/support/seed.ts`) crea un entrenador, un cliente con su plan y las cuentas; añade con `fake.seed(tabla, fila)` lo que haga falta.
2. Entra con `entrarComoEntrenador(page)` / `entrarComoCliente(page)` (`e2e/support/flows.ts`). Para dos personas a la vez, `browser.newContext()` + `fake.attach(contexto)`.
3. Escribe lo que haría la persona y comprueba **lo que ve** (`toBeVisible`, no solo `toContainText`: el entreno ocupa toda la pantalla y tapa lo de detrás) y **lo que quedó guardado** (`fake.rows(tabla)`).
4. Si la prueba provoca un error de página a propósito, decláralo con `erroresEsperados.push(/patrón/)`.
5. Para simular la caída de la red: `fake.offline = true` (el servidor no responde) y `context.setOffline(true)` (el navegador pasa a "sin conexión").

## Lo que encontraron al escribirlas

- La barra de estado del guardado quedaba **tapada por la pantalla del entreno**: justo donde hay que saber qué falta por subir. Ahora hay una pastilla dentro del entreno ("1 sin subir", se toca para reintentar).
- Si el entreno no estaba descargado y no había conexión, el error de descarga llegaba al límite de errores de toda la app. Ahora avisa y deja volver o reintentar.

## Integración continua

`.github/workflows/ci.yml` ejecuta, en cada pull request y en cada cambio a `main`:

| Trabajo | Qué hace |
| --- | --- |
| Tipos, pruebas y tamaño | `tsc` (app y pruebas e2e), `npm test` (pruebas unitarias) y `npm run size` (construye y falla si algún recorrido supera su presupuesto de peso) |
| Pruebas end-to-end | `npx playwright test` con el Chrome que ya traen los ejecutores de GitHub; si algo falla, sube los rastros de Playwright como artefacto `rastros-e2e` (7 días) |

Vercel sigue construyendo y desplegando por su lado: esto es lo que dice si el cambio rompe algo. Para que un PR
**no se pueda fusionar** con las pruebas en rojo hay que marcar los dos trabajos como "requeridos" en GitHub
(Settings → Branches → regla para `main` → "Require status checks to pass"); es un ajuste del repositorio,
no está hecho.
