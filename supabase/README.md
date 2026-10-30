# Supabase: esquema, RLS y revisión de seguridad

Proyecto de producción: `panelfit` (`thurxdxazqqxuzbupghv`, eu-west-1).

## Qué hay aquí

| Ruta | Contenido |
| --- | --- |
| `migrations/20261030000003_recordatorio_cita.sql` | Recordatorio de cita una hora antes: tarea programada cada 15 min (`recordatorio-cita`) que, si hay citas confirmadas con cliente que empiezan dentro de 30 a 75 min y sin recordar, llama a la función `recordatorio-cita` (secreto `recordatorio_cita`); la función reclama cada cita (`citas.recordada_at`, atómico) y manda el push al cliente. **Aplicada el 30-oct**; función desplegada (versión 1). Prueba `bloque27_recordatorio_cita.sql` (`run-pglite-recordatorio-cita.mjs`, 4 casos) |
| `migrations/20261030000002_horario_citas.sql` | Horario para reservas y reserva desde la app: `horario_citas` (franjas por día, duración, margen, antelación, autoconfirmar; solo su entrenador y el equipo), `agenda_cliente()` (el horario de su entrenador y lo ocupado, sin de quién) y `reservar_cita()` (vuelve a comprobar horario, antelación y hueco libre con margen; bloqueo por entrenador; 3 citas futuras como mucho). Horas de Madrid. **Aplicada el 30-oct**. Prueba `bloque26_horario_citas.sql` (`run-pglite-horario-citas.mjs`, 18 casos) |
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
| `migrations/20261026000002_archivar_clientes.sql` | Archivar clientes: columna `clientes.archived_at` y `get_client_by_token`, `mark_plan_opened` y `claim_client_by_token` ignoran a los archivados; `get_client_link_status` devuelve `archived`. `get_client_by_token` se rehace en la misma migración porque devuelve `SETOF clientes` con columnas en orden fijo, **aplicado el 2026-10-26** |
| `migrations/20261027000001_ausencias_y_eventos.sql` | Tablas `ausencias` y `eventos_cliente` (con RLS: el cliente, su entrenador o un compañero de su equipo; sin sesión, nada), y las dos entran en `client_data_tables` (exportación y borrado del RGPD), **aplicado el 2026-10-27**. Prueba `bloque16_ausencias_eventos.sql` (`run-pglite-ausencias-eventos.mjs`) |
| `migrations/20261027000002_calendario_ical.sql` | Calendario del cliente para Google / Apple / Outlook: tabla `calendario_enlaces` (un token por cliente, con RLS; `anon` sin acceso) y `calendario_datos(token)` (la única puerta para quien tenga la dirección secreta: sesiones confirmadas, fechas clave, ausencias y días de entreno; nada de salud, nada si el cliente está archivado). El token entra en el RGPD, **aplicado el 2026-10-27**. Prueba `bloque17_calendario_ical.sql` (`run-pglite-calendario.mjs`). La sirve `api/calendario.js` |
| `migrations/20261028000001_cuestionarios_cliente.sql` | Cuestionarios que el cliente responde de verdad: `encuestas_pendientes()` (lo que le toca al cliente con sesión por envío programado, etiqueta o «a cada cliente nuevo», sin abrirle las tablas del entrenador), columna `survey_templates.auto_nuevos_desde`, y `survey_responses` solo acepta del cliente respuestas a nombre de SU entrenador. Prueba `bloque18_cuestionarios.sql` (`run-pglite-cuestionarios.mjs`), **aplicado el 2026-10-28** |
| `migrations/20261028000002_aviso_nuevo_contacto.sql` | Aviso al entrenador cuando entra un contacto por su página pública: el trigger `leads_notify` deja una notificación (la campanita, en directo por Realtime) y pide el push a la función `notify-lead` con el secreto `new_lead` de `internal_webhook_secrets` (se crea a mano, no va en el fichero). Si el aviso falla, el contacto se guarda igual. Probado con PGlite (`hardening/tests/run-pglite-aviso-contactos.mjs`) y en producción (401 con secreto malo, 200 con el bueno). **Aplicada el 28-oct**. |
| `migrations/20261028000003_leads_convertido.sql` | Amplía los estados de `leads` con `convertido` (contacto que ya es cliente). Solo cambia la restricción; no toca datos. **Aplicada el 28-oct**. |
| `migrations/20261028000004_submit_lead_validacion_y_limites.sql` | `submit_lead` valida en el servidor: nombre, y un correo o un teléfono con forma válida (antes aceptaba contactos sin ningún dato), mensaje de hasta 1000 caracteres, el mismo correo o teléfono en 24 h no se duplica y como mucho 10 contactos por hora y entrenador (un robot ya no puede llenar la lista ni las notificaciones). Errores en español y cortos. Probado con PGlite (`hardening/tests/run-pglite-formulario-contacto.mjs`, 18 casos) y en producción con reversión. **Aplicada el 28-oct**. |
| `migrations/20261029000004_tareas_origen_programa.sql` | Columna `tareas_cliente.origen` (`programa:<id>`): las tareas que no son entrenos de un programa (cardio, vídeo, documento, evolución) se crean como tareas con fecha al asignarlo, y al cambiar o actualizar el programa se quitan las suyas por venir y sin hacer (`src/lib/sincronizarTareasPrograma.ts`). Las puestas a mano no llevan origen. Políticas sin cambios. **Aplicada el 29-oct**. Prueba `bloque24_tareas_origen.sql` (`run-pglite-tareas-origen.mjs`, 6 casos) |
| `migrations/20261029000003_nota_antes_sesion.sql` | Comentario antes del entreno: `notas_antes_sesion` (una por cliente y día; la escribe y cambia solo el cliente; la leen él, su entrenador y el equipo; sin sesión, nada). Entra en `client_data_tables` y cae en cascada. Va después de `20261029000002`. **Aplicada el 29-oct**. Prueba `bloque23_nota_antes_sesion.sql` (`run-pglite-nota-antes-sesion.mjs`, 13 casos) |
| `migrations/20261030000001_mensajes_programados_push.sql` | Push de los mensajes programados sin abrir la pestaña Mensajes: tarea programada cada hora (`mensajes-programados`, a y diez) que entre las 9 y las 20 de Madrid, si hay algún `programacion_mensajes` que ya toca y sin push, llama a la función `mensajes-programados` con el secreto `mensajes_programados` (solo en `internal_webhook_secrets`); la función reclama cada mensaje (`pushEnviado = true` de forma atómica, para no duplicar con la pestaña) y manda el push. Índice parcial para la comprobación. **Aplicada y función desplegada el 30-oct**. Prueba `bloque25_mensajes_programados.sql` (`run-pglite-mensajes-programados.mjs`, 14 casos) |
| `migrations/20261029000002_recordatorio_diario.sql` | Aviso diario de lo pendiente al cliente: tarea programada cada hora (`recordatorio-diario`) que a las 18:00 de Madrid llama a la función `recordatorio-diario` (secreto `recordatorio_diario` en `internal_webhook_secrets`). Columna `clientes.recordatorio_diario` (el cliente lo apaga con `recordatorio_diario_cliente`) y `recordatorios_enviados` (uno por cliente y día; solo service role; en `client_data_tables`). Rehace `get_client_by_token` con la columna nueva al final. Prueba `bloque22_recordatorio_diario.sql` (`run-pglite-recordatorio-diario.mjs`, 14 casos) |
| `migrations/20261029000001_recordar_contactos_sin_contestar.sql` | Recordatorio de contactos sin contestar: tarea programada cada hora (`recordar-contactos-sin-contestar`) que, una sola vez por contacto, avisa (campanita + push por `notify-lead` con `recordatorio`) de los contactos `nuevo` con más de 24 h y menos de 7 días, solo de 8:00 a 21:59 hora de Madrid. Columna `leads.recordado_at` para no repetir. Probado con PGlite (`hardening/tests/run-pglite-recordar-contactos.mjs`, 6 casos) y en producción con reversión. **Aplicada el 29-oct**; `notify-lead` desplegada en su versión 2. |
| `migrations/20261028000004_tareas_cliente.sql` | Tareas sueltas con fecha y repetición: `tareas_cliente` (una vez, cada día o cada semana en ciertos días, con «hasta» opcional; la crea y cambia solo el entrenador o su equipo, el cliente la ve) y `tareas_hechas` (el cliente o su entrenador la marca hecha, solo tareas de ese cliente). Sin sesión, nada; las dos entran en `client_data_tables` y caen en cascada, **aplicado el 2026-10-28**. Prueba `bloque20_tareas.sql` (`run-pglite-tareas.mjs`) |
| `hardening/20261023_rgpd.sql` | Origen de los bloques 9 a 11 (consentimientos, exportación y borrado completo de un cliente), ya aplicados. Ver `docs/rgpd.md` |
| `hardening/20261018_propuesta_endurecimiento.sql` | **Propuesta** de correcciones: los bloques 1 a 5 y 7 ya están aplicados; todos aplicados (el 8, caducidad del enlace, el 24-oct; el 6, privilegios de anon, el 25-oct) |
| `hardening/tests/` | Pruebas de los bloques 1, 6, 7, 8, 9 a 15 (alta de usuarios, rendimiento, búsqueda de entrenador, preferencias de la biblioteca), y de la biblioteca de ejercicios (`run-pglite-biblioteca.mjs`), con sus runners locales (ver más abajo) |
| `functions/` | Edge Functions (`send-push`, `send-welcome-email`, `weekly-checkin-digest`, `notify-lead`, `recordatorio-diario`, `mensajes-programados`) |

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
- `send-welcome-email`, `weekly-checkin-digest` y `notify-lead` exigen un secreto guardado en base de datos (`notify-lead` lo compara sin atajos de tiempo); las dos primeras escapan el HTML.
- Los comandos del cron y de los triggers leen el secreto de la tabla, no lo llevan incrustado.
