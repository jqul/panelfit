-- Vídeos para los clientes (2026-11-07).
--
-- La biblioteca de documentos (20261104000003_documentos.sql) admite también vídeos por enlace (YouTube, Vimeo...):
-- clases grabadas, movilidad, técnica. Con la misma visibilidad (oculto / todos / etiquetas) y la misma RLS: el cliente
-- solo recibe los que le tocan. Un documento lleva un archivo del bucket (ruta) o un enlace (url), nunca los dos.
-- Prueba: hardening/tests/bloque38_videos_documentos.sql (run-pglite-videos-documentos.mjs).

alter table public.documentos alter column ruta drop not null;
alter table public.documentos add column if not exists url text;

alter table public.documentos drop constraint if exists documentos_url_valida;
alter table public.documentos add constraint documentos_url_valida check (url is null or (length(url) <= 500 and url ~ '^https://[^[:space:]]+$'));

alter table public.documentos drop constraint if exists documentos_archivo_o_enlace;
alter table public.documentos add constraint documentos_archivo_o_enlace check ((ruta is null) <> (url is null));
