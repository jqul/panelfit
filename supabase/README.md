# Supabase: esquema, RLS y revisión de seguridad

Proyecto de producción: `panelfit` (`thurxdxazqqxuzbupghv`, eu-west-1).

## Qué hay aquí

| Ruta | Contenido |
| --- | --- |
| `migrations/20261018000001_baseline_tables.sql` | 47 tablas, claves, índices y RLS activado |
| `migrations/20261018000002_baseline_functions_triggers.sql` | Funciones (RPCs y helpers de RLS), triggers y el cron semanal |
| `migrations/20261018000003_baseline_rls_policies.sql` | Todas las políticas RLS de `public` |
| `migrations/20261018000004_baseline_storage.sql` | Buckets y políticas de `storage.objects` |
| `hardening/20261018_propuesta_endurecimiento.sql` | **Propuesta** de correcciones, sin aplicar |
| `functions/` | Edge Functions (`send-push`, `send-welcome-email`, `weekly-checkin-digest`) |

Los cuatro ficheros de `migrations/` son una **foto** de producción a 2026-10-18, reconstruida desde el catálogo de Postgres. No reproducen las 69 migraciones históricas que ya están aplicadas (no hay forma de recuperar su SQL original) y **no deben ejecutarse sobre producción**: sirven para crear entornos nuevos y para detectar desvíos con `supabase db diff`.
Reproducen las políticas tal cual están, defectos incluidos. Los secretos no están en el código: viven en `public.internal_webhook_secrets`.

Para alinear el historial del CLI con producción, marca el baseline como ya aplicado:

```bash
supabase migration repair --status applied 20261018000001 20261018000002 20261018000003 20261018000004
```

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
| 13 | Bajo | Los tokens de cliente no caducan ni se pueden regenerar; `claim_client_by_token` reclama cualquier fila sin dueño. | seguimiento |

## Lo que ya está bien

- RLS activado en las 47 tablas; `internal_webhook_secrets` sin políticas, a propósito.
- `client-videos`, `exercise-videos` y `media` son privados, con política por cliente y entrenador.
- `send-push` valida la sesión y solo deja notificar a uno mismo o a su contraparte real.
- `send-welcome-email` y `weekly-checkin-digest` exigen un secreto guardado en base de datos y escapan el HTML.
- Los comandos del cron y de los triggers leen el secreto de la tabla, no lo llevan incrustado.
