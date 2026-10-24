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
| Cliente (`/?c=token`) | 243 kB | **177 kB** | 185 kB |
| Entrenador (panel) | 384 kB | **282 kB** | 295 kB |

Estimación de solo transferencia con la "4G lenta" de Lighthouse (1,6 Mb/s): el cliente pasa de ~1,2 s a ~0,9 s,
y el panel del entrenador de ~2,0 s a ~1,4 s. **No es una medida en un móvil real**: no cuenta la latencia ni el
tiempo de ejecución del JS, que en un Android de gama baja pesa tanto como la descarga.

## Qué se hizo

- **Tipografías:** estaban en un `@import` del CSS, que bloquea el pintado hasta bajar otra hoja de otro dominio. Ahora van con `preconnect` y una hoja que no bloquea (`media="print"` + `onload`), con `font-display: swap`.
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
4. Las tipografías vienen de Google Fonts: alojarlas en el propio dominio quitaría una conexión a otro origen (y que Google reciba la IP de cada visitante, que es un asunto de RGPD). Pendiente de decidir porque implica añadir los ficheros `.woff2` al repositorio.

## Cómo medirlo en un móvil de verdad

1. Móvil Android con el depurador USB activado, conectado al ordenador; en Chrome del ordenador, `chrome://inspect`.
2. Abre la app en el móvil y, en DevTools, pestaña **Network**: "Disable cache", throttling "Fast 4G" (o el real del móvil) y recarga. Anota `DOMContentLoaded`, `Load` y el total transferido.
3. Pestaña **Lighthouse** (modo móvil): LCP, TBT y "Reduce JavaScript execution time".
4. Compara landing, `/?c=<token>` de un cliente y el panel del entrenador.

Los presupuestos de `scripts/bundle-report.mjs` solo suben con una decisión consciente.
