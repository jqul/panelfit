# Supabase: esquema, RLS y revisión de seguridad

Proyecto de producción: `panelfit` (`thurxdxazqqxuzbupghv`, eu-west-1).

## Qué hay aquí

| Ruta | Contenido |
| --- | --- |
| `migrations/20261018000001_baseline_tables.sql` | 46 tablas, claves, índices y RLS activado |
| `migrations/20261018000002_baseline_functions_triggers.sql` | Funciones (RPCs y helpers de RLS), triggers y el cron semanal |
| `migrations/20261018000003_baseline_rls_policies.sql` | Todas las políticas RLS de `public` |
| `migrations/20261018000004_baseline_storage.sql` | Buckets y políticas de `storage.objects` |
| `hardening/20261018_propuesta_endurecimiento.sql` | **Propuesta** de correcciones, sin aplicar |
| `hardening/tests/` | Pruebas de los bloques 1, 7 y 8 y sus runners locales (ver más abajo) |
| `functions/` | Edge Functions (`send-push`, `send-welcome-email`, `weekly-checkin-digest`) |

Los cuatro ficheros de `migrations/` son una **foto** de producción a 2026-10-18, reconstruida desde el catálogo de Postgres. No reproducen las 69 migraciones históricas que ya están aplicadas (no hay forma de recuperar su SQL original) y **no deben ejecutarse sobre producción**: sirven para crear entornos nuevos y para detectar desvíos con `supabase db diff`.
Reproducen las políticas tal cual están, defectos incluidos. Los secretos no están en el código: viven en `public.internal_webhook_secrets`.

Para alinear el historial del CLI con producción, marca el baseline como ya aplicado:

```bash
supabase migration repair --status applied 20261018000001 20261018000002 20261018000003 20261018000004
```

## Cómo probar el bloque 1 sin pagar un branch

El runner carga el baseline en un Postgres en memoria (PGlite), ejecuta la prueba antes y después de aplicar el bloque 1 y compara las huellas del esquema con las de producción. No toca ninguna base de datos real.

```bash
npm i --no-save @electric-sql/pglite
node supabase/hardening/tests/run-pglite.mjs
```

Los bloques 7 y 8 (enlaces de cliente) tienen su propio runner, `node supabase/hardening/tests/run-pglite-enlaces.mjs`: el 7 se prueba antes y después (`R1` y `R2` salen en FALLO antes) y el 8 solo después, porque antes la columna `token_expires_at` no existe.

Resultado esperado: antes del bloque 1, los casos `A1` a `A4` salen en FALLO (el ataque funciona); después, todos en OK. PGlite usa Postgres 18 y producción el 17, por eso las restricciones `NOT NULL` (que PG18 lista aparte) no se comparan. Es una simulación de Supabase (roles, `auth.uid()`, privilegios por defecto), no sustituye una prueba en un branch real con la app delante.

## Hallazgos

Orden de prioridad. El bloque indicado es el de `hardening/20261018_propuesta_endurecimiento.sql`.

| # | Gravedad | Hallazgo | Bloque |
| --- | --- | --- | --- |
| 1 | Crítico | `trainer_owns_entrenadores` permite a cada usuario modificar su propia fila sin restringir columnas: puede ponerse `approved = true`, `rol = 'super_admin'` o cambiar `profile.clientLimit`/`planName`. Se deduce de la política y de que solo existe un trigger `AFTER INSERT`; no se ha probado contra producción. | 1 |
| 2 | Alto | `get_client_by_token` hace `select *`: quien tenga el enlace, sin sesión, recibe `notas_privadas`, `lesiones`, `precio_mensual`, `alerts` y `equipo_disponible`. La app del cliente no usa ninguna. | 2 |
| 3 | Alto | Un cliente con sesión lee su propia fila de `clientes` completa por la API directa, también `notas_privadas`. Las RLS no filtran columnas; hace falta separar esas columnas en una tabla solo del entrenador. | seguimiento |
| 4 | Medio | `trainer_or_client_owns_clientes` es `FOR ALL`: el cliente puede borrar su fila (el `WITH CHECK` no aplica a `DELETE`). | 3 |
| 5 | Medio | Funciones de trigger (`handle_new_user`, `notify_welcome_email`) y `find_trainer_by_email` ejecutables sin sesión como RPC. | 4 |
| 6 | Medio | Las fotos de progreso no se pueden borrar de Storage (`delete_own` compara con `auth.uid()` la carpeta del cliente). | 5 |
| 7 | Medio | El cliente tiene escritura completa (`FOR ALL`) sobre `planes`, `dietas`, `waivers`, `valoraciones`, `test_resultados`, `notificaciones` y sobre los comentarios del entrenador en `video_feedback`. Hoy la app solo necesita que el cliente escriba `diasElegidos` y sus propios registros. | seguimiento |
| 8 | Medio | Varias tablas guardan `client_id`/`clientId` como `text` sin clave foránea (`foto_sessions`, `dietas`, `ciclo_tracking`, `notificaciones`, `survey_*`, `valoraciones`, `video_feedback`, `test_resultados`, `registros_dolor`...) y `citas`, `push_subscriptions` y `readiness_checkins` referencian a `clientes` sin `ON DELETE CASCADE`. Borrar un cliente falla o deja huérfanos sus datos de salud (relevante para el derecho de supresión). | seguimiento |
| 9 | Bajo | `anon` tiene todos los privilegios de tabla (por defecto de Supabase); solo RLS lo frena. | 6 (opcional) |
| 10 | Bajo | Casi todas las políticas son `TO public` (incluye `anon`); basta `authenticated`. Además `plan_history` y `weekly_reviews` usan `auth.uid()` sin envolver en `select`, lo que penaliza el rendimiento. | seguimiento |
| 11 | Bajo | `trainer-videos` y `trainer-assets` son buckets públicos; cualquier usuario con sesión ve todos los vídeos de `trainer-videos`. | seguimiento |
| 12 | Bajo | Protección contra contraseñas filtradas desactivada en Auth (se activa en el panel, no por SQL). | panel de Supabase |
| 13 | Medio | Los tokens de cliente no caducan (sí se pueden regenerar desde Cliente > Configuración); `claim_client_by_token` reclama cualquier fila sin dueño mientras el token sea válido. | 8 (caducidad opcional) |
| 14 | Alto | El enlace "Invita a un amigo" compartía `?ref=<token>`: el mismo token que abre el panel del cliente. Quien recibía el enlace podía entrar a su plan y sus entrenos. El front ya manda un código derivado (`src/lib/referral.ts`); falta aplicar el bloque 7 para que `submit_lead` lo entienda y deje de aceptar el token en bruto. | 7 |

## Lo que ya está bien

- RLS activado en las 46 tablas; `internal_webhook_secrets` sin políticas, a propósito.
- `client-videos`, `exercise-videos` y `media` son privados, con política por cliente y entrenador.
- `send-push` valida la sesión y solo deja notificar a uno mismo o a su contraparte real.
- `send-welcome-email` y `weekly-checkin-digest` exigen un secreto guardado en base de datos y escapan el HTML.
- Los comandos del cron y de los triggers leen el secreto de la tabla, no lo llevan incrustado.
