# PanelFit — Funcionalidades

Documento de referencia de todo lo que tiene la app, organizado por área. Pensado para consultar rápido qué existe y cómo funciona, no como manual de usuario.

## 1. Entrenador — Gestión de clientes

- **Clientes**: alta/baja, datos personales (peso, altura, género, fecha de nacimiento, objetivo, teléfono), notas privadas, alertas (llamar / revisión / valoración / otro) con fecha de recordatorio.
- **Etiquetas**: sistema central de etiquetas (color + emoji) aplicables a clientes, workouts y programas, con conteo de uso. Sustituyó al sistema anterior fragmentado entre pestañas.
- **Grupos (cohortes)**: agrupar clientes (ej. "Hipertrofia — Grupo A") para verlos juntos, independiente de las etiquetas (que son por rasgo individual).
- **Calendario**: citas con cada cliente (confirmada/cancelada/completada), notas por cita, recurrencia.
- **Acceso del cliente**: cada cliente tiene un token único (`?c=token`) que da acceso a su panel sin registro ni contraseña. El entrenador puede regenerar el token si quiere revocar el acceso anterior.

## 2. Niveles de plan (Básico / Alto Rendimiento)

- Dos planes ortogonales en `entrenadores.profile`: `planName` (free/starter/trial/pro/studio → límite de clientes) y `tier` (`basico` / `alto_rendimiento` → qué funciones ve).
- El superadmin asigna ambos desde el panel de administración.
- En `tier: basico` se ocultan las secciones avanzadas de Progreso (Riesgo, 1RM, Estándares de fuerza, Pesos sugeridos) — el resto de la app es igual para ambos niveles.
- **Generador de propuestas**: el superadmin rellena nivel, nº de clientes y precio acordado en una llamada, y genera un documento de una página listo para guardar como PDF y enviar al prospecto.

## 3. Planes de entrenamiento

- Estructura: Plan → Semanas → Días → Ejercicios. Cada ejercicio tiene series/reps, peso, tipo de serie (normal, dropset, etc. — personalizables), descansos configurables, vídeo de referencia, comentario del entrenador.
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

- Biblioteca propia por entrenador: nombre, categoría, descripción, vídeos (con etiqueta de especialidad: hipertrofia/fuerza/rehabilitación/etc.), tags.
- Los vídeos se priorizan por especialidad del cliente: si hay un vídeo específico para su especialidad se muestra ese, si no el genérico.
- Telemetría de uso (qué ejercicios se seleccionan más, qué vídeos se reproducen más) visible en Insights.
- **Sustitución de ejercicios**: sugiere alternativas si un ejercicio no es viable para un cliente.

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
- *(Nota interna: existen dos sistemas de nutrición parcialmente solapados — `DietEditor`/tabla `dietas` y `NutricionTab`/tabla `nutrition_plans` — pendiente de consolidar en uno solo, ver tareas pendientes.)*

## 12. Gamificación (lado cliente)

- **Insignias**: hitos automáticos por racha de días entrenados o número de sesiones totales.
- **Racha**: días consecutivos entrenando, visible al cliente y al entrenador.
- **Hábitos**: ver sección 6.

## 13. Modo cliente (sin instalar nada)

- Acceso por enlace con token, o cuenta opcional con email/contraseña (`claim_client_by_token`) si el cliente quiere acceder desde varios dispositivos.
- Pestañas: Hoy (entreno del día + widgets de racha/hábitos/próximas sesiones), Entreno activo, Progreso (calendario, historial, récords, peso, fotos, feedback de vídeo), Dieta, Encuestas, Más (ajustes/cerrar sesión).
- **Recuperación de contraseña**: para clientes que se registraron con email/contraseña, igual que para entrenadores.
- Tema visual personalizable por el entrenador (color, logo, imagen de fondo) — *white-label* básico.

## 14. Página pública del entrenador

- URL pública (`/p/slug`) tipo landing page con la marca del entrenador, bio, especialidades, botón de contacto por WhatsApp — para compartir en redes/bio de Instagram.

## 15. Superadmin

- Aprobar/rechazar entrenadores nuevos, asignar plan (límite de clientes) y nivel (básico/alto rendimiento).
- Generador de propuestas comerciales (ver sección 2).

## 16. Seguridad e infraestructura

- RLS (Row Level Security) en todas las tablas: cada entrenador solo ve sus propios datos y los de sus clientes; cada cliente solo ve los suyos.
- Políticas optimizadas (`(select auth.uid())`) para no penalizar el rendimiento al crecer.
- Índices en todas las claves foráneas usadas en filtros habituales.
- PWA instalable, funciona en móvil como app sin pasar por las tiendas de aplicaciones.

---

## Pendiente / aparcado a propósito

- **Pagos / cobro real** — decidido explícitamente dejarlo para más adelante.
- **Automatización real de WhatsApp** (sin clic) — requiere la API de pago de Meta/WhatsApp Business, evaluar cuando haya ingresos.
- **Consolidar los dos sistemas de nutrición** en uno solo.
- **n8n / automatización externa** — aparcado, retomar cuando haga falta.
