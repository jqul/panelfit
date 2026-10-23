# RGPD: datos de salud en PanelFit

> **Borrador técnico, no asesoramiento jurídico.** Describe lo que la aplicación hace hoy
> y lo que falta. Los textos que ve el cliente (`src/lib/privacyTexts.ts`) y los puntos de
> la sección "Pendiente de revisión legal" deben validarse con un profesional (abogado o
> delegado de protección de datos) antes de usar la app con clientes reales de otros
> entrenadores.

## Quién es quién

| Papel | Quién | Qué implica |
| --- | --- | --- |
| Responsable del tratamiento | Cada entrenador | Decide para qué se usan los datos de sus clientes y atiende sus derechos |
| Encargado del tratamiento | PanelFit (quien opera la plataforma) | Trata los datos por cuenta del entrenador; hace falta un contrato de encargado (art. 28) con cada entrenador |
| Subencargados | Supabase (base de datos y ficheros, región `eu-west-1`, Irlanda), Vercel (alojamiento de la web), Resend (emails) | Hay que tener firmados sus contratos de tratamiento de datos y revisar transferencias fuera del EEE (Vercel y Resend pueden tratar datos en EE. UU.) |

## Qué datos se guardan (categorías especiales, art. 9)

- **Salud:** cuestionario de salud al registrarse (`checkins`, tipo `intake`), dolor y molestias (`registros_dolor`), lesiones, peso y composición corporal (`registros_peso`, `valoraciones`), estado de recuperación (`readiness_checkins`), registros de entrenamiento (`registros`), notas del entrenador (`clientes.notas_privadas`).
- **Imagen:** fotos de progreso (`foto_sessions`, bucket privado `media`) y vídeos de técnica (`client-videos`, `exercise-videos`).
- **Identificación y contacto:** nombre, email de la cuenta, teléfono.

La lista completa de tablas con datos de un cliente está en `client_data_tables()`
(`supabase/hardening/20261023_rgpd.sql`). La prueba `tests/bloque9_11_rgpd.sql` falla si
se añade una tabla con columna de cliente y no se incluye ahí.

## Base legal y consentimiento

- **Datos de salud y fotos:** consentimiento explícito (art. 9.2.a). Se pide al registrarse (antes del cuestionario de salud) y, a los clientes ya existentes, con una pantalla de una sola vez la próxima vez que entran.
- **Granular:** salud (obligatorio para usar la app) y fotos/medidas (opcional; sin él no se pueden subir fotos y el resto funciona igual).
- **Casillas sin marcar** de entrada, texto versionado (`CONSENT_VERSION`), historial de solo añadir en `consentimientos` (aceptar, ampliar o retirar es una fila nueva; el cliente no puede editarla ni borrarla).
- **Retirada:** desde Más > Tus datos el cliente puede quitar las fotos o pedir el borrado. Pedir el borrado retira el consentimiento de salud, avisa al entrenador (notificación `solicitud_borrado`) y bloquea el guardado de más datos hasta que lo vuelva a dar.
- **Cambiar el texto de fondo** exige subir `CONSENT_VERSION`: se vuelve a pedir a todos.

El descargo de responsabilidad (`waivers`) es otra cosa: no sustituye al consentimiento.

## Derechos y dónde se ejercen

| Derecho | Cliente | Entrenador |
| --- | --- | --- |
| Acceso y portabilidad (art. 15 y 20) | Más > Tus datos > Descargar mis datos (JSON con todas sus tablas y enlaces privados a sus fotos y vídeos, válidos 7 días) | Cliente > Configuración > Datos personales > Exportar |
| Supresión (art. 17) | Más > Tus datos > Pedir que se borren mis datos | Cliente > Configuración > Datos personales > Borrar todos sus datos, o el botón de eliminar de la lista de clientes: borra ficheros de Storage, todas las tablas y la cuenta de acceso |
| Retirar el consentimiento | Fotos: interruptor. Salud: pedir el borrado | Ve el estado del consentimiento en la misma sección |
| Rectificación | A través de su entrenador | Edita la ficha y los registros |

Decisiones que conviene revisar:
- La exportación **del cliente** no incluye las notas privadas, alertas ni etiquetas que el entrenador guarda sobre él; la del **entrenador** sí lo incluye todo. Si un cliente reclama sus notas, el entrenador las entrega desde su exportación.
- El borrado es total y no se puede deshacer. Queda una constancia sin datos personales en `registro_borrados` (id del cliente, entrenador, fecha y número de filas por tabla).
- La cuenta de acceso del cliente se borra solo si no es también la cuenta de un entrenador real ni de otro cliente.

## Conservación (propuesta, sin automatizar)

| Dato | Plazo propuesto |
| --- | --- |
| Datos del cliente activo | Mientras dure la relación |
| Cliente que se va | Borrado a petición, o como máximo a los 24 meses sin actividad |
| Prueba del consentimiento | Mientras se traten los datos; al borrar al cliente se borra con él |
| Constancia de borrados | Sin datos personales; se conserva |
| Copias locales en el dispositivo del cliente | 30 días y se borran al cerrar sesión (ya implementado) |

Falta una lista de "clientes inactivos más de 24 meses" para que el entrenador decida;
no se ha automatizado ningún borrado a propósito.

## Pendiente de revisión legal / de producto

1. Revisar con un profesional los textos de `privacyTexts.ts` y la propuesta de plazos.
2. Política de privacidad pública y aviso legal (hoy solo hay el texto dentro de la app).
3. Contrato de encargado de tratamiento entre PanelFit y cada entrenador, y contratos con Supabase, Vercel y Resend; revisar las transferencias a EE. UU.
4. Registro de actividades de tratamiento de cada entrenador.
5. Valorar si hace falta evaluación de impacto (art. 35) y si algún entrenador debe nombrar delegado de protección de datos.
6. Procedimiento de brechas de seguridad (aviso a la AEPD en 72 horas).
7. Menores: hoy no se pide la edad. Si hay clientes menores de 14 años hace falta el consentimiento de sus padres o tutores.
8. Los emails de aviso (bienvenida, check-in semanal) no deben llevar datos de salud en el cuerpo: revisarlos.
9. Backups de Supabase: los datos borrados siguen en las copias hasta que caducan. Indicar el plazo en la política de privacidad.
10. Cuentas fantasma: cada cliente que se registra crea también una fila "entrenador pendiente" (`handle_new_user`). El borrado la elimina, pero conviene no crearla (no estaba en el alcance de este cambio).
