# Sincronización de entrenos: qué se guarda, qué está pendiente y qué pasa si se edita a la vez

## Qué ve el cliente

- **Cabecera:** debajo del nombre, siempre `Guardado 18:32` (última sincronización) o, en naranja, `N sin subir`.
- **Barra bajo la cabecera:** `Guardando...` y `Guardado` mientras se sube; sin conexión, `Sin conexión · N ejercicios sin subir: se subirán al recuperar señal`; si falla, `No se pudo guardar · N ejercicios sin subir`. Mientras haya ejercicios sin subir la barra **no desaparece**, aunque ya haya conexión, y tiene un botón **Reintentar**.
- Al cerrar sesión con ejercicios sin subir se avisa de que se perderían (esos entrenos solo existen en ese dispositivo).

## Cómo se guarda

- La unidad es el **registro de un ejercicio** (una clave de `registros.logs`, por ejemplo `ex_w7_d2_r0`).
- Cada vez que el cliente marca algo, el dispositivo guarda una copia local y anota qué ejercicios cambiaron (`pf_logs_pending_<cliente>`, lista de claves) **antes** de subir. Si se corta la conexión o se cierra la pestaña a mitad, se reintenta solo al volver.
- Solo se suben esas claves. Antes se subía el objeto de entrenos entero, de modo que el último en subir borraba lo que otro hubiera escrito.

## Qué pasa si se edita a la vez

| Situación | Resultado |
| --- | --- |
| El cliente sube el ejercicio A y el entrenador (u otro dispositivo del cliente) escribió el ejercicio B | Se conservan los dos |
| Los dos cambian el **mismo** ejercicio | Gana el último en subir (solo ese ejercicio) |
| Alguien escribe justo entre la lectura y la escritura | Se detecta con `updatedAt` como versión y se reintenta fusionando (hasta 4 veces) |
| El cliente estuvo sin conexión y mientras tanto el entrenador escribió | Al subir se fusiona; el cliente ve lo del entrenador en los ejercicios que no ha tocado |
| El cliente cambia los días de entreno del plan | Solo se escribe `diasElegidos`, sobre el plan que haya **ahora** en el servidor (antes se escribía el plan entero de la pantalla y podía pisar lo que el entrenador acabara de publicar) |
| El entrenador publica el plan mientras el cliente tiene la app abierta | El cliente lo ve al volver a abrir la app. No se cambia el plan en mitad de una sesión a propósito |
| Entrenador edita los entrenos del cliente | Mismo mecanismo: solo sube lo que cambió y fusiona |

Al volver a la app (cambio de pestaña), si no hay nada subiéndose ni pendiente, se leen de nuevo los entrenos del servidor por si hay algo nuevo del entrenador o de otro dispositivo.

## Regla para quien escriba en `planes` o `registros`

`updatedAt` es la **versión**: la escritura del cliente solo se aplica si nadie ha escrito desde que la leyó. **Toda escritura en `planes.plan` o `registros.logs` debe subir `updatedAt`** (`Date.now()`, o `extract(epoch from now())*1000` en SQL). Si no, el cliente no puede detectar que cambió. Esto incluye a la revisión semanal automática del entrenador IA.

## Limitaciones conocidas

- Dos cambios al **mismo ejercicio** a la vez no se fusionan serie a serie: gana el último.
- El plan no se actualiza en caliente; se ve al abrir la app.
- Los entrenos pendientes viven en `localStorage` del dispositivo: si el cliente borra los datos del navegador sin subirlos, se pierden (por eso el aviso al cerrar sesión).
