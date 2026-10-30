-- Tipos de cita con color (2026-10-30).
--
-- El entrenador define sus tipos de cita ("Entreno personal", "Valoración", "Online"…) con color y duración en su
-- perfil (entrenadores.profile.tiposCita, src/lib/tiposCita.ts). Cada cita guarda a qué tipo pertenece; si el tipo se
-- borra, la cita se queda con su título y sin color. Las políticas de citas no cambian.

alter table public.citas add column if not exists tipo_id text check (tipo_id is null or char_length(tipo_id) between 1 and 40);
