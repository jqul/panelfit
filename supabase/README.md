# Supabase: esquema, RLS y revisión de seguridad

Proyecto de producción: `panelfit` (`thurxdxazqqxuzbupghv`, eu-west-1).

## Qué hay aquí

| Ruta | Contenido |
| --- | --- |
| `migrations/20261018000001_baseline_tables.sql` | 46 tablas, claves, índices y RLS activado |
| `migrations/20261018000002_baseline_functions_triggers.sql` | Funciones (RPCs y helpers de RLS), triggers y el cron semanal |
| `migrations/20261018000003_baseline_rls_policies.sql` | Todas las políticas RLS de `public` |
| `migrations/20261018000004_baseline_storage.sql` | Buckets y políticas de `storage.objects` |
| `migrations/20261023000001_proteger_columnas_entrenadores.sql` | Bloque 1 de la propuesta, **aplicado el 2026-10-23** |
| `migrations/20261023000002_get_client_by_token_minimo.sql` | Bloque 2 de la propuesta, **aplicado el 2026-10-23** |
| `migrations/20261023000003_submit_lead_codigo_recomendacion.sql` | Bloque 7 de la propuesta, **aplicado el 2026-10-23** |
| `migrations/20261023000004_separar_politica_clientes.sql` | Bloque 3, **aplicado el 2026-10-23** |
| `migrations/20261023000005_revocar_ejecucion_funciones_trigger.sql` | Bloque 4, **aplicado el 2026-10-23** |
| `migrations/20261023000006_media_borrado_fotos_progreso.sql` | Bloque 5, **aplicado el 2026-10-23** |
| `migrations/20261023000007_rgpd_consentimientos.sql` | Bloque 9 (RGPD), **aplicado el 2026-10-23** |
| `migrations/20261023000008_rgpd_exportar_datos_cliente.sql` | Bloque 10 (RGPD), **aplicado el 2026-10-23** |
| `migrations/20261023000009_rgpd_borrado_completo_cliente.sql` | Bloque 11 (RGPD), **aplicado el 2026-10-23** |
| `migrations/20261024000001_enlace_caducidad.sql` | Bloque 8: caducidad opcional del enlace del cliente y `get_client_link_status`, **aplicado el 2026-10-24** |
| `migrations/20261025000001_handle_new_user_sin_clientes.sql` | El alta de un cliente deja de crear una fila fantasma en `entrenadores`, **aplicado el 2026-10-25**. Las 2 filas fantasma que ya existían (y la biblioteca de 1.504 ejercicios de una de ellas) se dejan: son inertes y podrían ser una cuenta de pruebas tuya |
| `migrations/20261025000002_anon_sin_permisos_tablas.sql` | Bloque 6: `anon` pierde los privilegios sobre las tablas (solo conserva SELECT en `plan_templates`), **aplicado el 2026-10-25**. Sin cambio de comportamiento: la RLS ya lo bloqueaba todo; ahora además lo bloquean los privilegios |
| `migrations/20261025000003_biblioteca_ejercicios.sql` | Biblioteca de ejercicios rediseñada: columnas `material`, `archived_at` y `alternativas` en `exercise_library`, **aplicado el 2026-10-25** |
| `migrations/20261025000004_rendimiento_politicas_e_indices.sql` | Rendimiento: dos políticas (`plan_history`, `weekly_reviews`) pasan a `(select auth.uid())` y dos claves foráneas ganan índice, **aplicado el 2026-10-25**. No cambia quién ve qué (prueba `bloque13_rendimiento.sql`) |
| `migrations/20261025000005_buscar_entrenador_solo_entrenadores.sql` | `find_trainer_by_email` solo la puede usar un entrenador aprobado y solo encuentra entrenadores aprobados (antes devolvía el uid de cualquier fila a cualquier usuario con sesión), **aplicado el 2026-10-25**. Prueba `bloque14_buscar_entrenador.sql` |
| `migrations/20261026000001_biblioteca_preferencias.sql` | Tabla `exercise_library_prefs` (una fila por entrenador, con RLS): favoritos y listas propias de la biblioteca sincronizados entre dispositivos, **aplicado el 2026-10-26**. Prueba `bloque15_biblioteca_preferencias.sql` |
| `hardening/20261023_rgpd.sql` | Origen de los bloques 9 a 11 (consentimientos, exportación y borrado completo de un cliente), ya aplicados. Ver `docs/rgpd.md` |
| `hardening/20261018_propuesta_endurecimiento.sql` | **Propuesta** de correcciones: los bloques 1 a 5 y 7 ya están aplicados; todos aplicados (el 8, caducidad del enlace, el 24-oct; el 6, privilegios de anon, el 25-oct) |
| `hardening/tests/` | Pruebas de los bloques 1, 6, 7, 8, 9 a 15 (alta de usuarios, rendimiento, búsqueda de entrenador, preferencias de la biblioteca), y de la biblioteca de ejercicios (`run-pglite-biblioteca.mjs`), con sus runners locales (ver más abajo) |
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

Los bloques 9 a 11 (RGPD) se prueban con `node supabase/hardening/tests/run-pglite-rgpd.mjs`: antes de aplicarlos demuestra que borrar solo la fila de `clientes` deja huérfanos los datos de salud con id `text`, y después ejecuta 19 casos (consentimientos, exportación, borrado, permisos, y que la exportación cubra todas las tablas con datos de cliente).

Los bloques 7 y 8 (enlaces de cliente) tienen su propio runner, `node supabase/hardening/tests/run-pglite-enlaces.mjs`: el 7 se prueba antes y después (`R1` y `R2` salen en FALLO antes) y el 8 solo después, porque antes la columna `token_expires_at` no existe.

Resultado esperado: antes del bloque 1, los casos `A1` a `A4` salen en FALLO (el ataque funciona); después, todos en OK. PGlite usa Postgres 18 y producción el 17, por eso las restricciones `NOT NULL` (que PG18 lista aparte) no se comparan. Es una simulación de Supabase (roles, `auth.uid()`, privilegios por defecto), no sustituye una prueba en un branch real con la app delante.

## Hallazgos

Orden de prioridad. El bloque indicado es el de `hardening/20261018_propuesta_endurecimiento.sql`.

| # | Gravedad | Hallazgo | Bloque |
| --- | --- | --- | --- |
| 1 | Crítico | `trainer_owns_entrenadores` permite a cada usuario modificar su propia fila sin restringir columnas: puede ponerse `approved = true`, `rol = 'super_admin'` o cambiar `profile.clientLimit`/`planName`. Se deduce de la política y de que solo existe un trigger `AFTER INSERT`; no se ha probado contra producción. | 1 (aplicado 23-oct) |
| 2 | Alto | `get_client_by_token` hace `select *`: quien tenga el enlace, sin sesión, recibe `notas_privadas`, `lesiones`, `precio_mensual`, `alerts` y `equipo_disponible`. La app del cliente no usa ninguna. | 2 (aplicado 23-oct) |
| 3 | Alto | Un cliente con sesión lee su propia fila de `clientes` completa por la API directa, también `notas_privadas`. Las RLS no filtran columnas; hace falta separar esas columnas en una tabla solo del entrenador. | seguimiento |
| 4 | Medio | `trainer_or_client_owns_clientes` es `FOR ALL`: el cliente puede borrar su fila (el `WITH CHECK` no aplica a `DELETE`). | 3 (aplicado 23-oct) |
| 5 | Medio | Funciones de trigger (`handle_new_user`, `notify_welcome_email`) y `find_trainer_by_email` ejecutables sin sesión como RPC. | 4 (aplicado 23-oct) |
| 6 | Medio | Las fotos de progreso no se pueden borrar de Storage (`delete_own` compara con `auth.uid()` la carpeta del cliente). | 5 (aplicado 23-oct) |
| 7 | Medio | El cliente tiene escritura completa (`FOR ALL`) sobre `planes`, `dietas`, `waivers`, `valoraciones`, `test_resultados`, `notificaciones` y sobre los comentarios del entrenador en `video_feedback`. Hoy la app solo necesita que el cliente escriba `diasElegidos` y sus propios registros. | seguimiento |
| 8 | Medio | Varias tablas guardan `client_id`/`clientId` como `text` sin clave foránea (`foto_sessions`, `dietas`, `ciclo_tracking`, `notificaciones`, `survey_*`, `valoraciones`, `video_feedback`, `test_resultados`, `registros_dolor`...) y `citas`, `push_subscriptions` y `readiness_checkins` referencian a `clientes` sin `ON DELETE CASCADE`. Borrar un cliente falla o deja huérfanos sus datos de salud (relevante para el derecho de supresión). | seguimiento |
| 9 | Bajo | `anon` tiene todos los privilegios de tabla (por defecto de Supabase); solo RLS lo frena. | 6 (opcional) |
| 10 | Bajo | Casi todas las políticas son `TO public` (incluye `anon`); basta `authenticated`. Además `plan_history` y `weekly_reviews` usan `auth.uid()` sin envolver en `select`, lo que penaliza el rendimiento. | seguimiento |
| 11 | Bajo | `trainer-videos` y `trainer-assets` son buckets públicos; cualquier usuario con sesión ve todos los vídeos de `trainer-videos`. | seguimiento |
| 12 | Bajo | Protección contra contraseñas filtradas desactivada en Auth (se activa en el panel, no por SQL). | panel de Supabase |
| 13 | Medio | Los tokens de cliente no caducan (sí se pueden regenerar desde Cliente > Configuración); `claim_client_by_token` reclama cualquier fila sin dueño mientras el token sea válido. | 8 (caducidad opcional) |
| 14 | Alto | El enlace "Invita a un amigo" compartía `?ref=<token>`: el mismo token que abre el panel del cliente. Quien recibía el enlace podía entrar a su plan y sus entrenos. El front ya manda un código derivado (`src/lib/referral.ts`); el bloque 7 (aplicado el 2026-10-23) hace que `submit_lead` lo entienda y deje de aceptar el token en bruto. | 7 (aplicado 23-oct) |
| 15 | Alto | No hay consentimiento explícito para los datos de salud (solo un descargo de responsabilidad), no se pueden exportar los datos de un cliente y el borrado de un cliente deja huérfanos sus datos de salud (tablas con id `text` sin clave foránea), sus ficheros de Storage y su cuenta de acceso. | 9, 10 y 11 (aplicados 23-oct) |

## Lo que ya está bien

- RLS activado en las 46 tablas; `internal_webhook_secrets` sin políticas, a propósito.
- `client-videos`, `exercise-videos` y `media` son privados, con política por cliente y entrenador.
- `send-push` valida la sesión y solo deja notificar a uno mismo o a su contraparte real.
- `send-welcome-email` y `weekly-checkin-digest` exigen un secreto guardado en base de datos y escapan el HTML.
- Los comandos del cron y de los triggers leen el secreto de la tabla, no lo llevan incrustado.
