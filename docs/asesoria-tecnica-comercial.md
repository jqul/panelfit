# Asesoría técnica y comercial — PanelFit

Fecha: 2026-07-17

## Diagnóstico ejecutivo

PanelFit ya no está en una fase de idea: tiene producto, demo, PWA, panel de entrenador, vista de cliente, planes, rutinas, seguimiento, encuestas, progreso, precios y control por planes. El problema principal no parece ser falta de funcionalidades, sino **falta de distribución, validación externa y conversión del interés en conversaciones reales con entrenadores**.

La prioridad ya no debería ser añadir más módulos. La prioridad debe ser convertir PanelFit en una oferta fácil de entender, fácil de probar y fácil de recomendar.

## Estado actual detectado en el repo

### Fortalezas

- Existe una landing dentro del flujo de autenticación con propuesta orientada a entrenadores: “Software para entrenadores personales”, demo en vivo y solicitud de acceso.
- Hay un sistema de precios separado con planes Starter, Pro y Studio.
- Hay feature flags por plan (`free`, `starter`, `trial`, `pro`, `studio`) para monetización futura.
- El onboarding ya intenta llevar al entrenador a configurar perfil, marca y primer cliente.
- La app tiene una PWA configurada y un flujo móvil para cliente por enlace.

### Riesgos técnicos

- El build estaba bloqueado por un carácter inválido al inicio de `ClientPanel.tsx`. Queda corregido en esta revisión.
- `ClientPanel.tsx`, `TrainerDashboard.tsx` y `TrainingPlanEditor.tsx` son componentes grandes, por lo que el coste de modificar producto aumenta con cada nueva feature.
- La landing comercial vive dentro de `Auth.tsx`; esto sirve para arrancar, pero no es ideal para SEO ni para crear landings por intención de búsqueda.
- No hay todavía una estructura pública fuerte de páginas SEO como `/app-entrenadores`, `/software-entrenador-personal` o `/alternativas/harbiz`.

### Riesgos comerciales

- “Solicitar acceso” puede generar fricción si el entrenador no entiende qué recibe y cuándo.
- Los testimonios parecen placeholders; si no son reales, pueden reducir confianza.
- La demo existe, pero falta una ruta comercial clara: demo → caso de uso → formulario/contacto → seguimiento manual.
- Si nadie te habla para probarla, el problema probablemente está en el canal y en el mensaje, no solo en el producto.

## Veredicto

PanelFit está lo bastante avanzado para buscar beta testers reales. No esperaría a tener el producto perfecto. Pero antes de pedir pruebas masivas, hay que preparar una oferta beta muy concreta:

> “Busco 10 entrenadores personales que gestionen clientes por WhatsApp/Excel para probar gratis durante 30 días una app que les permite crear rutinas, compartir el panel del cliente por enlace y ver seguimiento. A cambio solo pido feedback sincero de 20 minutos.”

## Prioridad técnica inmediata

### 1. Mantener build verde

El producto debe poder desplegarse siempre. Cualquier cambio futuro debe terminar con `npm run build` pasando.

### 2. Separar landing pública de app privada

Crear páginas públicas simples:

1. `/app-entrenadores`
2. `/software-entrenador-personal`
3. `/precios`
4. `/demo`

La app privada puede seguir detrás del login, pero Google y los usuarios nuevos necesitan páginas públicas entendibles.

### 3. Reducir riesgo de componentes grandes

No hacer un refactor masivo. Extraer por orden:

1. `useTrainerClients`
2. `useClientPlan`
3. `useDemoData`
4. `usePricingPlans`

### 4. Instrumentar métricas mínimas

Añadir eventos simples:

- click en “Ver demo”
- click en “Solicitar acceso”
- registro enviado
- demo abierta
- primer cliente creado
- primer plan guardado

Sin métricas, no sabrás si el problema está en visitas, conversión o activación.

## Prioridad comercial inmediata

### 1. Cambiar el objetivo: no “usuarios”, sino conversaciones

Durante 30 días, la métrica principal debe ser:

- 50 entrenadores contactados
- 15 respuestas
- 8 demos realizadas
- 5 pruebas activas
- 3 entrevistas de feedback completas

No midas todavía facturación. Mide aprendizaje y activación.

### 2. Nicho inicial recomendado

No ataques a todos los entrenadores. Elige un segmento inicial:

**Entrenadores online o híbridos que ya venden asesorías por WhatsApp y usan Excel/Notion/PDF.**

Por qué:

- ya tienen dolor real,
- ya cobran a clientes,
- ya entienden rutinas online,
- el beneficio de PanelFit es inmediato.

### 3. Mensaje principal

Evita venderlo como “software completo”. Mejor:

> “Deja de mandar rutinas en PDF y hacer seguimiento por WhatsApp. Con PanelFit cada cliente tiene su panel móvil con rutina, vídeos y progreso, sin instalar app.”

### 4. Oferta beta

Usar una oferta clara:

- 30 días gratis
- configuración contigo por WhatsApp o videollamada
- ayuda para meter sus primeros 3 clientes
- feedback de 20 minutos al final

No digas “prueba mi app” de forma genérica. Di exactamente qué gana.

## Canales gratuitos recomendados

### Canal 1 — Instagram directo

Buscar perfiles con palabras como:

- entrenador online
- asesoría online
- coach fitness
- entrenamiento personalizado
- hipertrofia online
- powerlifting coach

Mensaje corto:

> Hola, estoy creando PanelFit, una herramienta para entrenadores que ahora mandan rutinas por WhatsApp/PDF. Permite que cada cliente tenga su panel móvil con rutina, vídeos y progreso sin instalar nada. Estoy buscando 10 entrenadores para probarla gratis 30 días y darme feedback. ¿Te paso la demo?

### Canal 2 — LinkedIn

Publicar construcción en público:

- problema observado,
- captura o vídeo corto,
- avance semanal,
- pregunta para entrenadores.

Ejemplo:

> Muchos entrenadores gestionan clientes con WhatsApp + Excel. Estoy creando PanelFit para que cada cliente tenga su propio panel móvil. Esta semana estoy buscando 10 entrenadores para probarlo gratis y decirme qué sobra/falta.

### Canal 3 — Comunidades

No entrar vendiendo. Entrar preguntando:

> Entrenadores online: ¿cómo gestionáis rutinas, vídeos y seguimiento ahora mismo? Estoy validando una herramienta y quiero entender el flujo real.

Después de recibir respuestas, ofrecer demo por privado.

### Canal 4 — Contenido SEO gratuito

Publicar 1 artículo semanal orientado a dolor real:

1. Cómo organizar clientes de entrenamiento personal sin Excel
2. Cómo enviar rutinas online sin PDFs infinitos
3. Qué debe tener una app para entrenadores personales
4. Cómo hacer seguimiento semanal de clientes fitness
5. Cómo pasar de WhatsApp a un panel de clientes

## Embudo recomendado

### Fase 1 — Atracción

- Post corto en LinkedIn/Instagram.
- Mensaje directo a entrenadores.
- Landing pública simple.

### Fase 2 — Conversación

- “¿Cómo gestionas ahora tus clientes?”
- “¿Cuántos clientes llevas?”
- “¿Qué te da más pereza: rutinas, seguimiento o comunicación?”

### Fase 3 — Demo guiada

No mandar solo link. Hacer demo de 10 minutos:

1. Crear cliente.
2. Asignar rutina.
3. Abrir panel móvil del cliente.
4. Ver progreso/entrenos.

### Fase 4 — Activación

Ayudarle a meter sus primeros 1-3 clientes. Si no mete clientes reales, no validas nada.

### Fase 5 — Feedback

Preguntar:

- ¿Lo usarías con clientes reales?
- ¿Qué te impide usarlo mañana?
- ¿Qué te falta para pagar 15-30 €/mes?
- ¿Qué eliminarías?
- ¿Qué parte enseñarías a otro entrenador?

## SEO: qué hacer sin gastar dinero

Google necesita páginas públicas claras, no solo una app. Según la documentación oficial de Google Search Central, el SEO consiste en ayudar a buscadores a entender el contenido y ayudar a usuarios a decidir si visitan el sitio. También recomienda contenido útil, fiable y pensado para personas, no contenido creado solo para manipular rankings.

Plan mínimo:

1. Mejorar `title` y `meta description`.
2. Crear `robots.txt`.
3. Crear `sitemap.xml`.
4. Crear landing `/app-entrenadores`.
5. Conectar Google Search Console.
6. Publicar una pieza útil por semana.

No esperes leads inmediatas desde Google. SEO es acumulativo. Para conseguir testers ahora, el canal principal debe ser contacto directo.

## Pricing recomendado para beta

No empieces optimizando precio. Empieza entendiendo disposición a pagar.

Propuesta:

- Beta gratis 30 días.
- Starter futuro: 15 €/mes hasta 15 clientes.
- Pro futuro: 29-39 €/mes para clientes ilimitados y marca propia.
- Studio: precio manual para centros.

Durante beta, pregunta:

> “Si esto te ahorra 2 horas por semana y te ayuda a dar mejor servicio, ¿qué precio te parecería justo?”

## Lo que no haría ahora

- No añadiría más features antes de hablar con entrenadores.
- No pagaría anuncios.
- No haría una comparativa agresiva contra Harbiz todavía.
- No reharia toda la UI.
- No crearía 20 landings SEO sin tener una landing base que convierta.
- No mantendría testimonios si no son verificables.

## Plan de 14 días

### Día 1

- Confirmar build verde.
- Preparar demo estable.
- Escribir una landing simple o mejorar la landing actual.

### Día 2

- Grabar vídeo demo de 60-90 segundos.
- Preparar mensaje de outreach.

### Día 3-5

- Contactar 10 entrenadores por día.
- Publicar 1 post diario mostrando avances.

### Día 6-7

- Hacer demos con quienes respondan.
- Anotar objeciones literalmente.

### Semana 2

- Activar 3-5 entrenadores reales.
- Ayudarles a meter clientes.
- Recoger feedback.
- Ajustar solo lo que bloquee activación.

## Métricas que debes mirar

### Producto

- Entrenadores que entran a demo.
- Entrenadores que crean primer cliente.
- Entrenadores que asignan primer plan.
- Clientes finales que abren su panel.

### Comercial

- Mensajes enviados.
- Respuestas.
- Demos agendadas.
- Demos realizadas.
- Betas activadas.
- Feedback recibido.

### Conversión mínima esperada en frío

Con mensajes directos manuales, al principio puedes esperar tasas bajas. Lo importante es iterar el mensaje.

Objetivo inicial razonable:

- 100 mensajes enviados
- 15 respuestas
- 5 demos
- 2-3 usuarios beta reales

Si no llegas a esto, ajusta mensaje y segmento antes de tocar producto.

## Decisión estratégica

PanelFit debe dejar de comportarse como “proyecto en construcción” y empezar a comportarse como “beta privada para entrenadores concretos”.

La frase guía debería ser:

> “Ayudo a entrenadores online a dejar de gestionar rutinas y seguimiento por WhatsApp/PDF, dando a cada cliente un panel móvil propio sin instalar app.”

Si esa frase no genera interés, el problema es posicionamiento. Si genera interés pero no usan la demo, el problema es activación. Si usan la demo pero no siguen, el problema es valor o confianza.
