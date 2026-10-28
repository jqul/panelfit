-- Estado "convertido" para los contactos de la página pública (2026-10-28).
-- Cuando el entrenador convierte un contacto en cliente, el contacto pasa a "convertido": así se ve cuántos de los que
-- escriben acaban siendo clientes. Solo amplía la lista de estados permitidos; no toca datos.

alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status = any (array['nuevo', 'contactado', 'convertido', 'descartado']));
