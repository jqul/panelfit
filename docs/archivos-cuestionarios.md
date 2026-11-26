# Archivos en los cuestionarios (Bloque 2, 2026-11-25)

Un cliente puede **subir archivos como respuesta a una pregunta** de un cuestionario: su rutina actual o programas anteriores (PDF, captura, Excel…). Este documento recoge los requisitos cerrados, la arquitectura, el modelo de amenazas, la retención y el plan de pruebas. La pregunta de tipo `archivos` ya está disponible en el editor de encuestas; **rediseñar los dos cuestionarios para usarla es el Bloque 3** y no se hace aquí.

## 1. Requisitos (cerrados con el usuario)

| Tema | Decisión |
| --- | --- |
| Formatos | PDF, JPG, PNG, WEBP, HEIC/HEIF, XLSX, CSV y TXT. Sin macros, ejecutables ni comprimidos. Sin Word ni PowerPoint |
| Límites | Como mucho **5 archivos por pregunta** y **20 MB cada uno** |
| Validación | **En el servidor**: no basta el tipo que declara el navegador (se miran los primeros bytes y la estructura) |
| Privacidad | Depósito privado, sin URL pública permanente; descarga con **URL firmada de vida corta** y como adjunto |
| Quién ve qué | El cliente, solo los suyos. Su entrenador, los de sus clientes. El resto del equipo, solo lo que ya puede ver de esa ficha |
| Coach IA | **No recibe ni procesa los archivos** |
| Retención | Activos: se conservan. Archivados: 12 meses **con aviso previo** al entrenador. Eliminados: entran en el borrado RGPD (y en la exportación). Subidas que nunca llegan a enviarse: se borran a los 30 días |

«Lo que ya puede ver de esa ficha» se aplica como **la misma regla que `survey_responses`**: hoy solo el entrenador dueño y el propio cliente leen las respuestas; los compañeros de equipo (con o sin `solo_asignados`) y el super admin no. Un archivo no se puede leer con más permisos que la respuesta que lo cita. Si algún día se abre la lectura de respuestas al equipo, la política de archivos se cambia a la vez.

## 2. Arquitectura

```
cliente ──(1) archivo_reservar ──▶ fila `archivos_cliente` (estado reservado) + ruta <clientId>/<uuid>.<ext>
cliente ──(2) Storage upload ───▶ depósito `cuestionario-archivos` (solo si hay una fila reservada de ese cliente en esa ruta)
cliente ──(3) función `archivos-cliente` {verificar} ──▶ lee el objeto, comprueba bytes y estructura
                                           ├─ válido → estado verificado
                                           └─ no válido → borra el objeto, estado rechazado + motivo
cliente ──(4) INSERT survey_responses (answers con los archivos) ──▶ trigger BEFORE valida y reescribe; AFTER vincula (estado enviado)
entrenador ◀─ createSignedUrl(300 s, descarga) ◀─ política del depósito (la fila decide)
cron diario ──▶ función `archivos-limpieza` ──▶ borra objetos con la Storage API y marca las filas
```

Por qué cada pieza:

- **Tabla `archivos_cliente`**: es la que decide quién lee (patrón de `documentos`). La política de `storage.objects` pregunta a la tabla, así que basta cambiar la fila para cortar el acceso.
- **Reserva previa**: la subida a Storage solo se permite sobre una ruta reservada. Sin ella, un cliente podría llenar su carpeta con cualquier cosa; con ella, el número de archivos pendientes está acotado (5 por pregunta, 25 por cliente) y solo para preguntas `archivos` de una plantilla de SU entrenador.
- **Sin política de UPDATE en el depósito**: un archivo verificado no se puede sobrescribir (nada de «subo uno bueno, me lo validan y lo cambio por otro»).
- **Función de borde para verificar**: SQL no puede leer el contenido de un objeto. Con la clave de servicio descarga el objeto y lo comprueba. Hasta que está `verificado`, ni el entrenador puede descargarlo.
- **Trigger en `survey_responses`**: el cliente inserta con PostgREST directamente (política `for all`), sin RPC. La validación tiene que vivir donde pasa el dato. El trigger comprueba que cada archivo citado es del cliente, de esa pregunta y de esa plantilla, está verificado y no hay más de 5, y **reescribe nombre, tamaño y tipo con los de la base de datos** (el cliente no puede inventarlos).
- **Borrado con la Storage API**: borrar de `storage.objects` por SQL deja el archivo físico huérfano. Todo borrado (limpieza, descartar, RGPD) pasa por la función de borde.
- **Clave de servicio solo en las funciones de borde**, con autorización explícita dentro del código (y probada).
- **El tipo del archivo lo fija el servidor**, no el navegador: supabase-js sube un archivo como formulario y el tipo que recibe el depósito es el del propio archivo (un `.heic` llega sin tipo y un `.csv` de Windows como `application/vnd.ms-excel`). Por eso la app vuelve a envolver el archivo con el tipo que devolvió `archivo_reservar` antes de subirlo (probado en vitest y en e2e).

### Piezas

| Pieza | Dónde |
| --- | --- |
| Migración (depósito, tabla, políticas, funciones SQL, triggers, RGPD, secreto y tarea programada) | `supabase/migrations/20261125000010_archivos_cuestionario.sql` |
| Validación de bytes y estructura (pura) | `supabase/functions/archivos-cliente/validar.ts` |
| Función del cliente: `verificar`, `descartar`, `borrar-cliente` | `supabase/functions/archivos-cliente/` |
| Función de limpieza programada | `supabase/functions/archivos-limpieza/` |
| Lógica pura del cliente (límites, tipos, nombres) | `src/lib/archivos.ts` |
| Llamadas a Supabase | `src/lib/archivosCliente.ts` |
| Pregunta de subida (carga diferida) | `src/components/client/ArchivosPregunta.tsx` |
| Lista y descarga del entrenador (carga diferida) | `src/components/trainer/ArchivosRespuesta.tsx` |

## 3. Modelo de amenazas

| Amenaza | Defensa | Prueba |
| --- | --- | --- |
| Un cliente lee o descarga archivos de otro | Políticas de tabla y de depósito por propietario | PGlite: cliente B no ve filas ni objetos de A |
| Un cliente sube a la carpeta de otro | La política de inserción exige una fila reservada del propio cliente en esa ruta | PGlite |
| Un cliente sube sin reservar (llenar el depósito) | Sin fila reservada no hay política que lo permita | PGlite |
| Un cliente cita en sus respuestas archivos de otro | El trigger rechaza ids ajenos, no verificados, de otra pregunta o de otra plantilla | PGlite |
| Un cliente inventa el nombre o el tipo en la respuesta | El trigger los reescribe con los de la base | PGlite |
| Un cliente miente en el tipo (un `.exe` como `.pdf`) | Función de borde: firma, estructura y coherencia con la extensión | Vitest sobre `validar.ts` |
| Excel con macros (`.xlsx` con `vbaProject.bin`), embebidos, ActiveX | Se mira el directorio central del zip, sin descomprimir | Vitest |
| Bomba de compresión | Límites de entradas y de tamaño descomprimido declarado, sin descomprimir | Vitest |
| Sobrescribir un archivo ya verificado | Sin política de UPDATE | PGlite |
| Un entrenador o compañero ajeno lee archivos | Mismas reglas que `survey_responses`; el equipo no | PGlite (dueño, otro entrenador, compañero con y sin `solo_asignados`, super admin, anónimo) |
| Descarga que ejecuta algo en la app | Solo adjunto con URL firmada de 5 min; nunca se muestra en línea | e2e |
| Inyección de fórmulas al abrir un CSV/XLSX | Se descarga, no se abre en la app; aviso al entrenador | Revisión |
| Nombres de archivo con rutas o HTML | La ruta no usa el nombre; el nombre se limpia y React lo escapa | Vitest |
| Función de borde llamada por quien no debe | `verificar` y `descartar`: solo el cliente dueño. `borrar-cliente`: `can_manage_client`. Limpieza: secreto interno con comparación en tiempo constante | Vitest con dobles |
| Archivos de un cliente que se borra | `borrar-cliente` antes de `delete_client_data`; el barrido de huérfanos recoge lo que quede | Vitest + PGlite |
| Coach IA recibe archivos | Ninguna función `coach_ia_*` toca `archivos_cliente`; el formulario público no admite la pregunta | PGlite + Vitest |

### Lo que NO cubre (se dice claro)

- **No es un antivirus.** Se comprueba que el archivo es de verdad lo que dice y que no lleva macros ni elementos activos conocidos; no se analiza malware. El entrenador abre los archivos con su propio visor, descargados como adjunto.
- **PDF**: se rechazan los que llevan `/Launch`, `/EmbeddedFile`, `/JavaScript` o `/JS`. Un PDF con objetos comprimidos puede esconderlos; es una barrera razonable, no absoluta.
- **Imágenes**: se comprueba la cabecera; un archivo que es imagen válida y a la vez otra cosa (políglota) no se detecta.
- **HEIC**: se valida la cabecera y la marca de compatibilidad; **solo descarga, sin vista previa** (no hay decodificador en la app por el presupuesto de tamaño).
- **Límite real del depósito**: el del propio depósito (20 MB) lo aplica Storage; no se ha podido probar con una subida real hasta tener un cliente real (ver 6).
- **Los depósitos `client-videos` y `exercise-videos` no tienen límite de tamaño ni de tipos.** Está fuera de este bloque; queda anotado.

## 4. Retención

Función SQL `archivos_para_limpiar` (probada con reloj simulado) y función de borde `archivos-limpieza`, cada día a las 04:00 (Madrid):

1. **Reservado** y nunca verificado, más de 24 h → se borra objeto y fila.
2. **Rechazado** → se borra el objeto y la fila.
3. **Verificado sin respuesta enviada** (o con la respuesta borrada), más de 30 días → se borra objeto y fila.
4. **Cliente archivado**: a los ~11 meses se avisa al entrenador (notificación con la fecha) y se marca `aviso_borrado_at`. A los 12 meses **y al menos 30 días después del aviso** se borra el objeto y la fila queda como `caducado` (constancia). Si el cliente se desarchiva, el aviso se anula.
5. **Objetos sin fila** (huérfanos) de más de 24 h → se borran.
6. Si la Storage API falla, la fila se conserva y se reintenta al día siguiente.

Una respuesta ya enviada que cita un archivo caducado sigue existiendo: el entrenador ve «archivo borrado por caducidad».

## 5. RGPD

- **Borrado**: `archivos_cliente` entra en `client_data_tables()`, así que `delete_client_data` borra sus filas y deja la cuenta en `registro_borrados`. Antes, el panel llama a `archivos-cliente {borrar-cliente}` (si el cliente tiene archivos) para borrar los objetos con la Storage API; si falla, **no se borra nada más**, como ya hacía con fotos y vídeos.
- **Exportación**: `export_client_data` incluye las filas (metadatos) y el JSON de descarga añade enlaces firmados de 7 días a los archivos vigentes.

## 6. Verificación en producción (tras fusionar y con autorización)

1. Aplicar la migración y comprobar con `list_migrations`, `storage.buckets` (privado, 20 MB, tipos), políticas, triggers y tarea programada.
2. Desplegar las dos funciones y comprobar que sin credenciales responden 401.
3. **Pruebas de permisos con reversión** (bloque `DO` con claims simulados que termina en `RAISE EXCEPTION`): filas y rutas ajenas, reserva, cita de archivos ajenos. Después, consulta de 0 residuos.
4. Sin subida real: no se crea ningún cliente de prueba. La primera subida real queda como comprobación del límite del depósito.

## 7. Pruebas

- **Vitest**: validación de formatos y estructura, nombres, límites, tipo `archivos` en el motor, manejadores de las funciones de borde con dobles (autorización, borrado, reintentos), guardas de que Coach IA y el formulario público no usan archivos.
- **PGlite** (con un esquema `storage` simulado, como en `documentos`): permisos entre clientes, entrenadores, equipo, super admin y anónimo; reserva y límites; triggers; retención con reloj simulado; RGPD.
- **e2e**: el cliente sube, ve el límite y los errores, quita un archivo y envía; el entrenador ve y descarga; un cuestionario sin archivos sigue igual; la demo.
- **Presupuestos de tamaño**: el cliente va por 164,2 de 165 kB, así que todo lo nuevo va en trozos diferidos.
