// Notas privadas de ejemplo de los clientes demo. Antes iban dentro de cada plan (plan.coachNotes); ahora viven aparte, igual que
// en producción (tabla notas_privadas_cliente, que el cliente no puede leer). En el demo se editan en el navegador
// (lib/notasPrivadasCliente.ts) y esto es solo el punto de partida.
export const DEMO_NOTAS_PRIVADAS: Record<string, string> = {
  'demo-client-001': 'María progresa muy bien. Cuidado con la rodilla derecha en sentadilla — usar rodillera. Aumentar peso en press banca la próxima semana.',
  'demo-client-002': 'Carlos está en fase pico. No tocar técnica ahora — solo progresión de carga. Competición en 3 semanas.',
  'demo-client-003': 'Laura empieza muy motivada. Vigilar que no baje demasiado las calorías por su cuenta.',
  'demo-client-004': 'A 3 meses de su competición. Fase de acumulación de volumen — no buscamos RPE 9 todavía, prioriza técnica y consistencia. La bajada de intensidad y el pico llegarán en el último mes.',
  'demo-client-005': 'Semana 6 post-cirugía de menisco. Progresar rango de movimiento de forma gradual. Ante cualquier dolor agudo (no simple molestia), parar el ejercicio y avisar — nada de "aguantar".',
  'demo-client-006': 'Primera vez en el gimnasio. Foco 100% en aprender la técnica y crear el hábito — nada de buscar peso máximo todavía. Ánimo en cada sesión: cuesta arrancar, pero ya lleva 4 semanas seguidas sin fallar.',
  'demo-client-007': 'Pretemporada — bloque de fuerza-potencia en el gimnasio antes de afinar la técnica de carrera con el entrenador de pista. Vigilar isquiotibiales, tiene historial de sobrecarga.',
}
