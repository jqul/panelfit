// Un registro que el entrenador ha marcado como «No contar en el progreso» (un peso mal apuntado, una sesión rara) no
// cuenta en las estadísticas: índice de progreso, récords, historial por ejercicio, gráficas, volumen ni riesgo por carga.
// No se borra: sigue en el historial de sesiones y se puede volver a contar. Todas las cuentas preguntan aquí.

export const cuentaEnProgreso = (log?: { noContar?: boolean } | null) => !log?.noContar
