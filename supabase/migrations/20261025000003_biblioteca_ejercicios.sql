-- Biblioteca de ejercicios rediseñada (2026-10-25): material, archivado y alternativas.
--  · material: Barra, Mancuerna, Máquina... (vacío = la app lo deduce del nombre).
--  · archived_at: archivado. El ejercicio desaparece al crear planes nuevos pero NO se borra: los planes y
--    registros ya guardados van por nombre y siguen funcionando (y el cliente sigue viendo su vídeo).
--  · alternativas: nombres de ejercicios que lo sustituyen (por nombre, igual que los planes).
-- Sin políticas nuevas: las de exercise_library (el entrenador es dueño de lo suyo; el cliente lee la de su
-- entrenador) ya cubren las columnas nuevas. Prueba: hardening/tests/bloque_biblioteca.sql

alter table public.exercise_library
  add column if not exists material text default '',
  add column if not exists archived_at bigint,
  add column if not exists alternativas text[] default '{}';
