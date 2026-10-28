# PanelFit — Funcionalidades

Documento de referencia de todo lo que tiene la app, organizado por área. Pensado para consultar rápido qué existe y cómo funciona, no como manual de usuario.

## 1. Entrenador — Gestión de clientes

- **Clientes**: alta/baja, datos personales (peso, altura, género, fecha de nacimiento, objetivo, teléfono), notas privadas, alertas (llamar / revisión / valoración / otro) con fecha de recordatorio.
- **Etiquetas**: sistema central de etiquetas (color + emoji) aplicables a clientes, workouts y programas, con conteo de uso. Sustituyó al sistema anterior fragmentado entre pestañas.
- **Grupos (cohortes)**: agrupar clientes (ej. "Hipertrofia — Grupo A") para verlos juntos, independiente de las etiquetas (que son por rasgo individual).
- **Calendario**: citas con cada cliente (confirmada/cancelada/completada), notas por cita, recurrencia.
- **Acceso del cliente**: cada cliente tiene un enlace único (`?c=token`) que lleva a su pantalla de acceso; los datos de salud exigen además su cuenta (email y contraseña). El entrenador puede **regenerar** el enlace (el anterior deja de valer) y ponerle **caducidad opcional** (sin caducidad / 7 / 30 / 90 días, en Cliente › Configuración). Un enlace caducado dice «Este enlace ha caducado, pídele uno nuevo» (distinto de «Enlace no encontrado»); se reactiva eligiendo una caducidad nueva.
- **Bandeja (cola diaria)**: una fila por cliente que atender, ordenada por urgencia (*Urgente / Para hoy / Cuando puedas*): dolor fuerte o articular, carga alta, vídeos esperando, borradores sin publicar, check-ins, sustituciones y dudas del cliente. «Hecho» y «Posponer» (mañana / lunes) sacan la fila sin perder nada; lo urgente no se pospone.
- **Búsqueda global** (Ctrl/⌘+K, o la lupa en el móvil): un cuadro para llegar a un cliente, ejercicio, workout, programa o acción («Nuevo cliente», «Ir a la Bandeja»…). No distingue tildes ni mayúsculas; un ejercicio, workout o programa salta a su pestaña con el buscador ya relleno.
- **Acciones masivas**: modo «Seleccionar» en Clientes para asignar un workout o programa, enviar un mensaje, añadir/quitar etiquetas o mandar una encuesta a varios a la vez. Cada acción acaba con un resumen de hechos / fallos / omitidos; la asignación deja copia en el historial y se puede deshacer; **no pisa un borrador sin publicar**.
- **Primeros pasos**: asistente de tres pantallas (cliente → workout, con 3 plantillas de arranque → enviar el acceso por WhatsApp) y una tarjeta en «Hoy» que se marca sola con datos reales. Se reabre desde Ctrl+K.

## 2. Niveles de plan (Básico / Alto Rendimiento)

- Dos planes ortogonales en `entrenadores.profile`: `planName` (free/starter/trial/pro/studio → límite de clientes) y `tier` (`basico` / `alto_rendimiento` → qué funciones ve).
- El superadmin asigna ambos desde el panel de administración.
- En `tier: basico` se ocultan las secciones avanzadas de Progreso (Riesgo, 1RM, Estándares de fuerza, Pesos sugeridos) — el resto de la app es igual para ambos niveles.
- **Generador de propuestas**: el superadmin rellena nivel, nº de clientes y precio acordado en una llamada, y genera un documento de una página listo para guardar como PDF y enviar al prospecto.

## 3. Planes de entrenamiento

- El editor muestra la **duración estimada de cada día** («~55 min»), calculada con los descansos del plan.
- Estructura: Plan → Semanas → Días → Ejercicios. Cada ejercicio tiene series/reps, peso, tipo de serie (normal, dropset, etc. — personalizables), descansos configurables, vídeo de referencia, comentario del entrenador.
- **Intensidad y ejecución por ejercicio**: peso sugerido, **RIR objetivo** (`"2-3"`: el cliente lo ve como indicador al hacer la serie, sin abrir nada), **tempo** (cadencia `3-1-1-0` con marcador sonoro) y **plan B** (2-3 alternativas aprobadas de antemano, con la regla «con dolor, no sustituir»).
- **Programación por %1RM**: se puede definir el peso de un ejercicio como porcentaje de un 1RM conocido en vez de un kg fijo; se recalcula automáticamente.
- **Pesos sugeridos**: basado en el RIR (reps en reserva) que el cliente registró la última vez, sugiere el peso del próximo entreno (autorregulación).
- **Bloques de periodización**: plantillas de bloque (ej. "Hipertrofia 4 semanas") con una progresión de RPE/descarga por semana, completamente editables por el entrenador (crear los suyos desde cero).
- **Ciclos Wendler 5/3/1**: genera automáticamente las 4 semanas clásicas (5s/3s/1s/descarga) a partir del Training Max de cada levantamiento.
- **Conditioning Library**: bloques reutilizables de acondicionamiento (EMOM, AMRAP, Tabata, For Time, circuito) con su lista de ejercicios y objetivo, añadibles a la semana con un clic.
- **Calentamiento**: sección de calentamiento por día, independiente de los ejercicios principales.
- **Plantillas de workout**: guardar un plan como plantilla reutilizable para otros clientes, con tipo/etiquetas.
- **Marketplace de plantillas**: marcar una plantilla como pública la publica en una galería visible a todos los entrenadores de PanelFit; cualquiera puede añadirla a su propia librería con un clic (duplica, no enlaza). Sin pagos todavía — solo el mecanismo de compartir.
- **Programas**: plantillas de varias semanas que asignan un workout distinto a cada día de la semana.

## 4. Librería de ejercicios

- Biblioteca propia por entrenador: nombre, grupo, material, descripción, vídeos (con etiqueta de especialidad: hipertrofia/fuerza/rehabilitación/etc.), tags y alternativas.
- **Pantalla pensada para crear rápido**: buscador con chips con contador (*Todos · Más usados · Sin vídeo · Favoritos · Pendientes · Archivados*), «Recomendados» (lo más usado), «Explorar por» grupo y material, y un aviso de **huecos de contenido** (muy usados sin vídeo o sin alternativa). Tarjetas con miniatura, estado de la ficha (*Completo / Falta vídeo / Faltan indicaciones / Sin alternativa*) y origen (*Base PanelFit* / *Personal*).
- Ficha en un cajón lateral; **Nuevo ejercicio en segundos** (nombre + material + grupo). **Duplicar** una variante, **Archivar** (sale de los selectores y de la búsqueda, sin romper planes ni registros viejos) e **Importar** una lista pegada o un CSV (`nombre;grupo;material`, con vista previa y sin duplicar).
- El selector de «añadir ejercicio» al plan muestra primero lo más usado.
- **Uso real en la ficha**: además de «usado N veces», dice **a qué clientes** se lo has puesto ahora en el plan ("En el plan de 3 clientes: Ana, Luis y María" o "Ningún cliente lo lleva ahora"), para saber a quién afecta antes de cambiarlo o archivarlo. Los planes se leen al abrir la primera ficha.
- Los vídeos se priorizan por especialidad del cliente: si hay un vídeo específico para su especialidad se muestra ese, si no el genérico.
- Telemetría de uso (qué ejercicios se seleccionan más, qué vídeos se reproducen más) visible en Insights.
- **Sustitución guiada** (cliente): ver sección 13.

## 5. Seguimiento y analítica (pestaña Progreso)

Organizada en 4 grupos (antes eran 14 botones sueltos):

- **Rendimiento**: Fuerza (gráfica de peso/1RM por ejercicio), Récords (marcas personales), 1RM estimado (fórmula de Epley), Nivel de fuerza (estándares por ratio peso corporal: sentadilla/banca/peso muerto), Pesos sugeridos.
- **Carga y riesgo**: Riesgo (semáforo ACWR real — ratio de carga aguda 7d : crónica 28d, modelo de Gabbett — combinado con bienestar autoinformado), Volumen, Volumen por grupo muscular, Esta semana vs. anterior, Adherencia, Racha.
- **Cuerpo**: Peso corporal, Fotos de progreso, Distribución por grupos musculares.
- **Vídeos**: bandeja de vídeos de técnica enviados por el cliente, pendientes/comentados.

## 6. Bienestar y salud del cliente

- **PAR-Q + intake**: cuestionario de salud estándar (7 preguntas sí/no) más preguntas libres (lesiones, disponibilidad horaria) al darse de alta el cliente.
- **Check-in diario de bienestar**: sueño, dolor muscular, estrés, motivación (escala 1-5), alimenta el semáforo de Riesgo.
- **Valoraciones físicas**: ficha completa de medidas (peso, IMC, grasa corporal, masa muscular, perímetros de cintura/cadera/pecho/brazos/muslos) con histórico y notas.
- **Hábitos**: lista de hábitos diarios por cliente (ej. "Beber 2L de agua"), con check-in diario y racha.

## 7. Vídeo feedback

- El cliente sube un vídeo de ejecución de un ejercicio desde su entreno, con nota opcional.
- El entrenador responde con comentario de texto **y/o** grabando o subiendo un vídeo de respuesta (cámara o galería).
- El cliente ve el estado (pendiente/comentado), el comentario y el vídeo de respuesta en su propia pestaña de Progreso → Feedback.

## 8. Reacciones de sesión

- Al terminar un entreno, el cliente puede reaccionar con un emoji (🔥💪😅😩👍) y un comentario corto opcional.
- El entrenador las ve en el historial de Entrenos, junto a la fecha de la sesión.

## 9. Comunicación con el cliente

- **Mensajes preestablecidos** (en Perfil del cliente): plantillas por situación — nueva rutina, racha de entreno, día de descanso, personalizadas — editables a nivel general y con opción de personalizar el texto solo para un cliente concreto. Envío por WhatsApp en 1 clic con el nombre ya resuelto.
- **Mensajes programados**: desde cualquier plantilla, se puede programar su envío para una fecha futura concreta. Al llegar el día, aparece como pendiente en la pestaña Mensajes, se dispara automáticamente una notificación push real al cliente, y queda listo para enviar por WhatsApp con 1 clic.
- **Automatizaciones** (en Ajustes del cliente): mensaje de bienvenida automático al asignar un plan nuevo (WhatsApp + notificación push real al cliente), recordatorio de check-in semanal, alerta de inactividad.
- **Notificaciones push reales**: al entrenador cuando un cliente completa una sesión o sube un vídeo; al cliente cuando se le asigna un plan nuevo. Usa VAPID/Web Push, no requiere abrir la app.
- **Pestaña Mensajes**: vista general de encuestas pendientes esta semana, clientes inactivos, y envío rápido por WhatsApp a cualquier cliente.

## 10. Encuestas

- Plantillas de encuesta personalizadas (preguntas tipo escala, sí/no, texto).
- Programación de envío (semanal/quincenal/mensual/una vez), por cliente o para todos.
- Respuestas visibles por cliente y agregadas.
- Vinculables a etiquetas (asignar una encuesta automáticamente a clientes con cierta etiqueta).

## 11. Nutrición

- Plan de macros (kcal/proteína/carbos/grasas) por cliente, comidas con horario y alimentos, distribución de macros por comida, suplementación (visible/oculta al cliente), consejo del entrenador.
- Plantillas de dieta reutilizables (3 predefinidas + las que guarde el entrenador).
- *(Antes existía un segundo sistema paralelo — "Nutrición" en el menú, con su propia librería de plantillas — que nunca llegó a poder asignarse a ningún cliente. Se ha eliminado: ahora solo hay un sistema, el de arriba.)*

## 12. Gamificación (lado cliente)

- **Insignias**: hitos automáticos por racha de días entrenados o número de sesiones totales.
- **Racha**: días consecutivos entrenando, visible al cliente y al entrenador.
- **Hábitos**: ver sección 6.

## 13. Modo cliente (sin instalar nada)

- Acceso por enlace + cuenta del cliente (email y contraseña, `claim_client_by_token`). Solo vale la cuenta **de ese** cliente: con otra (p. ej. la de entrenador) se explica y no se deja una sesión a medias. Una cuenta de cliente que abre la raíz va a su panel.
- **Acceso directo / app instalada**: el enlace del cliente se recuerda en el dispositivo y el manifiesto de la app instalada (`/api/manifest?c=…`) arranca en su enlace, así el icono de la pantalla de inicio abre SU panel (y no la pantalla de entrenadores). Se olvida con «Borrar datos de este dispositivo».
- **¿No puedes hacerlo?** (en Más): por qué no puede un ejercicio → *Material ocupado* (solo alternativas aprobadas por el entrenador), *No lo entiendo* (indicaciones, vídeo y «Preguntar a mi entrenador»), *Me molesta* (zona + intensidad; con ≥7 recomienda parar; nunca una sustitución agresiva). La búsqueda libre queda al final y deja la sustitución *pendiente de revisar*. El entrenador la ve en su cola con **[Aceptar como alternativa habitual]**. Se guarda estructurada (`sustitucion`) sin tocar la receta del plan.
- **¿Ya lo hiciste? Regístralo sin repetirlo**: bajo «Empezar entrenamiento», abre el día prerrellenado con lo programado (Hoy o Ayer); se desmarca lo no hecho y se corrige peso o repeticiones.
- **Hoy con vida**: el entreno del día va primero (tarjeta con el color de la marca y botón grande; en verde cuando está hecho), «Esta semana» dice cómo vas en palabras («Has hecho 3 de 4. Te falta 1 para cerrar la semana.») y cada métrica trae su frase (racha, adherencia *Muy bien / Bien / A mejorar*, fuerza ↑ Subiendo / ↔ Estable / ↓ Bajando; lo que va mal se dice en ámbar, sin alarma). La nota de bienvenida va firmada («Nota de Javier»).
- **Cuánto dura y qué cabe**: la tarjeta de hoy estima la duración con los descansos reales del plan (redondeada a 5 min), una barra fina dice «Semana 2 de 9» del programa, y si la sesión es larga aparece **«¿Poco tiempo?» 30 / 45 / 60 min**: una guía de qué hacer (los principales siempre; el resto en orden hasta donde llegue el tiempo) que no cambia el plan ni los registros; se termina con «Terminar igual».
- **Pantalla encendida**: durante el entreno en vivo la pantalla no se apaga (Screen Wake Lock; donde el navegador no lo permite, se entrena igual); se suelta al cerrar la sesión.
- **Anillos y botón siempre a mano**: en la tarjeta de hoy, un anillo dice cuánto llevas del día («1/4») y otro dónde vas en el programa («Semana 2 de 9»); al desplazar el Hoy, el botón de entrenar queda fijo abajo («Entrenar ahora» / «Continuar»).
- **Modo foco**: fondo oscuro por defecto (con un botón sol/luna para cambiarlo, que se recuerda); «Serie 2 de 4» en grande con una barra por serie, aviso «Ejercicio completado · desliza para el siguiente» y «La última vez: 22 kg × 10» a la vista.
- **Celebraciones al terminar**: récord con nombre y kilos, «Semana completada. Buen trabajo.» si la sesión cierra la semana, racha con hitos (una semana, dos, un mes) y **semanas completas seguidas** («Semana completada: 3 semanas completas seguidas»). Al terminar su primer entreno se le ofrece, una sola vez, **activar los avisos** (mensajes del entrenador y cambios del plan).
- Pestañas: Hoy (entreno del día + widgets de racha/hábitos/próximas sesiones), Entreno activo, Progreso (calendario, historial, récords, peso, fotos, feedback de vídeo), Dieta (solo si el cliente tiene dieta: sin ella la barra queda en cuatro pestañas), Encuestas, Más (ajustes/cerrar sesión).
- **Recuperación de contraseña**: para clientes que se registraron con email/contraseña, igual que para entrenadores.
- **Consejos del entrenador**: en Ajustes, el entrenador escribe tarjetas cortas (sueño, descanso, qué hacer un día que no se puede entrenar…; hasta 20, con ejemplos para empezar y orden a su gusto) y el cliente las lee, plegadas, en Más → «Consejos de {nombre}». Se guardan en el perfil del entrenador, sin tablas nuevas.
- Tema visual personalizable por el entrenador (color, logo, imagen de fondo) — *white-label* básico.

## 14. Página pública del entrenador

- URL pública (`/p/slug`) tipo landing page con la marca del entrenador, bio, especialidades, botón de contacto por WhatsApp — para compartir en redes/bio de Instagram.
- **Contactos** (los que rellenan el formulario de la página): tienen su propia pestaña (Más → Contactos) con Nuevos / Contactados / Descartados, enlace directo a WhatsApp (un móvil de 9 cifras se toma como +34) y al correo, y si vienen de «Invita a un amigo», quién los refirió. Los nuevos se ven también en Hoy (tarjeta arriba a la derecha), en la Bandeja (sección propia) y con un número en «Más»; Ajustes → Página pública enlaza a la pestaña. **Aviso al llegar uno**: notificación en la campanita (en directo; al pulsarla lleva a Contactos) y push al móvil si tienes las notificaciones activadas.
- **Convertir en cliente** (en un toque, desde el contacto): abre el alta de cliente con su nombre, apellido y teléfono ya puestos, guarda su correo, su mensaje y quién lo refirió en las notas privadas del cliente, y el contacto pasa a «Clientes» (así ves cuántos de los que escriben acaban siéndolo).
- **Compartir tu página**: en Contactos, la tarjeta «Tu página pública» da el enlace para copiar, el menú de compartir del móvil (WhatsApp, Instagram…) y un **código QR** para tu perfil, un cartel o una tarjeta (se descarga como SVG; se genera en el dispositivo, sin servicios externos). Si la página no está activa, dice qué falta y lleva a Ajustes.

## 15. Superadmin

- Aprobar/rechazar entrenadores nuevos, asignar plan (límite de clientes) y nivel (básico/alto rendimiento).
- Generador de propuestas comerciales (ver sección 2).

## 16. Seguridad e infraestructura

- **Base de datos versionada y endurecida**: migraciones y pruebas en `supabase/` (ver su README); funciones y políticas auditadas, columnas del entrenador protegidas, `anon` sin permisos sobre las tablas (solo plantillas públicas), enlace del cliente que solo devuelve lo mínimo antes de autenticar.
- **Fotos y vídeos privados**: buckets privados con URL firmadas de corta duración; la ruta, no la URL, es lo que se guarda.
- **RGPD**: consentimiento versionado y retirable (salud / fotos), exportar los datos de un cliente y **borrarlos por completo** (filas de todas las tablas y ficheros de Storage) con confirmación escribiendo el nombre.
- **Datos en el dispositivo**: la copia local del cliente caduca a los 30 días, se borra al cerrar sesión y se puede desactivar o borrar a mano (sin perder entrenos pendientes de subir).
- **Sin conexión**: el entreno se guarda en el móvil, se ve qué falta por subir y al volver la conexión se sube fusionando sin pisar lo que el entrenador publicó en el servidor.
- **Calidad**: integración continua en cada PR (tipos, 480+ pruebas unitarias, ~65 pruebas end-to-end con un Supabase simulado, presupuesto de tamaño por ruta).
- **Accesibilidad**: foco visible con teclado, contraste AA del texto secundario, botones de icono con nombre (una prueba lo impide en el futuro), tipografías propias.
- RLS (Row Level Security) en todas las tablas: cada entrenador solo ve sus propios datos y los de sus clientes; cada cliente solo ve los suyos.
- Políticas optimizadas (`(select auth.uid())`) para no penalizar el rendimiento al crecer.
- Índices en todas las claves foráneas usadas en filtros habituales.
- PWA instalable, funciona en móvil como app sin pasar por las tiendas de aplicaciones.

---

## Pendiente / aparcado a propósito

- **Biblioteca: fusionar duplicados, compartir con el equipo y convertir en plantilla** — necesitan una identidad estable del ejercicio (hoy los planes y registros lo identifican por nombre) y políticas de acceso nuevas; aparcado hasta que haya varios entrenadores usándolo.
- **Pagos / cobro real** — decidido explícitamente dejarlo para más adelante.
- **Automatización real de WhatsApp** (sin clic) — requiere la API de pago de Meta/WhatsApp Business, evaluar cuando haya ingresos.
- **n8n / automatización externa** — aparcado, retomar cuando haga falta.
- **Integraciones con wearables** (Whoop, Garmin, Apple Health) — descartado por ahora a petición explícita, cara de construir.
- **Dominio propio** — pendiente de comprar (panelfit.es o panelfit.app disponibles), sin prisa.
