# Rendimiento: peso de lo que se descarga

Se mide lo que cada recorrido necesita **antes de poder usar la pantalla** (HTML, JS de entrada, CSS y, si la
ruta es perezosa, su trozo y los que Vite precarga con él), en gzip. Lo que se pide después (pestañas,
gráficas, Excel, el entreno en vivo) no cuenta.

```bash
npm run size          # build + informe + falla si se pasa el presupuesto
node scripts/bundle-report.mjs   # solo el informe, sobre un dist/ ya hecho
```

## Antes y después (2026-10-24)

| Recorrido | Antes | Después | Presupuesto |
| --- | --- | --- | --- |
| Landing y blog | 144 kB | **127 kB** | 135 kB |
| Cliente (`/?c=token`) | 243 kB | **169 kB** | 175 kB |
| Entrenador (panel) | 384 kB | **282 kB** | 295 kB |

Estimación de solo transferencia con la "4G lenta" de Lighthouse (1,6 Mb/s): el cliente pasa de ~1,2 s a ~0,9 s,
y el panel del entrenador de ~2,0 s a ~1,4 s. **No es una medida en un móvil real**: no cuenta la latencia ni el
tiempo de ejecución del JS, que en un Android de gama baja pesa tanto como la descarga.

## Segunda pasada (2026-10-26): el panel del cliente, de 183 a 169 kB

El panel del cliente había vuelto a subir con las funciones nuevas (183 de 185 kB). Se midió qué había dentro (la entrada compartida son 110 kB: React y Supabase) y se sacó lo que solo se usa a veces:

- **Tipos de serie**: `seriesTypes.tsx` mezclaba los datos que usa el cliente con el gestor, el modal y el hook del entrenador; los datos están ahora en `seriesTypesData.ts` (el cliente ya no se descarga el gestor).
- **Bajo demanda**: el registro/acceso (`ClientRegister`), la pestaña Más, la encuesta y el calendario se descargan al llegar a ellos. Quien ya ha entrado no los baja nunca si no los abre.
- Presupuesto del cliente: **175 kB** (antes 185). El mayor trozo que queda es la entrada compartida: Supabase pesa ~66 kB gzip ahí dentro (Realtime y Phoenix ~16 kB, que solo usa el panel del entrenador); sacarlos exigiría una capa propia sobre el cliente de Supabase y no se ha hecho.

## Tercera pasada (2026-10-28): el cliente, de 174 a 161 kB

Con los cuestionarios, el calendario y las tareas el cliente volvió a rozar el límite (174 de 175 kB). Se sacaron de la carga inicial las pestañas que no hacen falta para enseñar Hoy:

- **Entreno y Dieta** (`TrainingPlanView`, `DietEditor`) se descargan aparte y se precargan cuando el navegador está libre (no sin conexión ni con el ahorro de datos), como el entreno en vivo, para que estén en la caché del service worker. Si no se pudieron descargar y no hay conexión, la pestaña avisa con un botón de Reintentar en vez de romper la app (`client-view/pestanasDiferidas.tsx`).
- **Consentimiento e instalar la app** (`ConsentGate`, `PWAInstallBanner`): casi nadie los ve, se bajan al mostrarlos.
- Presupuesto del cliente: **165 kB** (antes 175).

## Cuarta pasada (2026-10-29): el panel del entrenador, de 293 a 224 kB

El panel estaba a 2 kB de su límite (293 de 295). Las pestañas que no hacen falta para abrir el Resumen (Workouts, Programas, Mensajes, Insights, Adherencia, Negocio, Grupos, Etiquetas, Calendario) se descargan aparte y se precargan cuando el navegador está libre (no con el ahorro de datos), así que al tocarlas ya están.

- Presupuesto del panel: **240 kB** (antes 295).
- Efecto secundario: al cambiar cómo se reparten los trozos compartidos, el cliente pasa de 161,0 a 162,6 kB (sigue bajo sus 165).

## Qué se hizo

- **Tipografías alojadas en el propio dominio** (`public/fonts/`, 3 ficheros `.woff2` latinos, 81 kB en total, de Google Fonts con licencia SIL OFL): estaban en un `@import` del CSS que bloquea el pintado hasta bajar otra hoja de otro dominio, y cada visita enviaba la IP del visitante a Google. Ahora no hay ninguna conexión externa, las dos de la primera pantalla se precargan y el service worker las guarda (caché primero), así que también salen sin conexión. `font-display: swap`. Si se sustituye un fichero hay que cambiarle el nombre.
- **Entreno en vivo** (`ActiveWorkout`, 37 kB): se carga al abrir una sesión y se precarga cuando el navegador está libre (no sin conexión ni con el ahorro de datos), así sigue estando en la caché del service worker para entrenar sin conexión.
- **Gráfica del panel del entrenador:** `recharts` (105 kB) se descargaba al abrir el panel por una sola gráfica; ahora va aparte y bajo demanda.
- **El cliente cargaba el editor de planes del entrenador entero** solo para leer una constante (`DEFAULT_SERIES_TYPES`), con la biblioteca de ejercicios de 130 kB dentro. Ahora importa solo el módulo pequeño.
- **Datos de ejemplo del modo demo** (~25 kB): ya no viajan en el JS de entrada ni en el recorrido del cliente. Solo se descargan en el modo demo (`demoIds.ts` da los ids sin cargar los datos; la vista demo es un trozo aparte).
- **Analítica:** se carga cuando el navegador está libre (como mucho a los 4 s) en vez de en el arranque. Efecto secundario: un visitante que se va en menos de ese tiempo no cuenta como visita.
- Excel (`xlsx`, 159 kB) ya era bajo demanda y se mantiene.

## Lo que queda (por orden de peso)

1. **Entrada: 109 kB**. Más de la mitad es el cliente de Supabase (auth, realtime, storage...), que no se puede recortar sin cambiar de librería; el resto es React. Es el suelo actual de cualquier página.
2. **Panel del entrenador: ~25 kB de datos de ejemplo** (`demo-data` y `demo-data-extra`) que siguen cargándose porque ~25 componentes los importan de forma estática. Pasarlos a importación bajo demanda, como se hizo con el cliente, lo dejaría cerca de 255 kB.
3. **`testCatalog` y `PlanGate`** (17 y 27 kB) también están en el recorrido del entrenador.
4. Solo está el subconjunto latino de las tipografías (cubre español, inglés y las lenguas de Europa occidental); un carácter fuera de ese rango se pinta con la tipografía del sistema.

## Cómo medirlo en un móvil de verdad

1. Móvil Android con el depurador USB activado, conectado al ordenador; en Chrome del ordenador, `chrome://inspect`.
2. Abre la app en el móvil y, en DevTools, pestaña **Network**: "Disable cache", throttling "Fast 4G" (o el real del móvil) y recarga. Anota `DOMContentLoaded`, `Load` y el total transferido.
3. Pestaña **Lighthouse** (modo móvil): LCP, TBT y "Reduce JavaScript execution time".
4. Compara landing, `/?c=<token>` de un cliente y el panel del entrenador.

Los presupuestos de `scripts/bundle-report.mjs` solo suben con una decisión consciente.
