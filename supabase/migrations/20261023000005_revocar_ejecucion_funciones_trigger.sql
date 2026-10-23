-- Bloque 4 de hardening (2026-10-23): las funciones de trigger dejan de ser RPC y
-- find_trainer_by_email deja de ser ejecutable sin sesión.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.notify_welcome_email() from public, anon, authenticated;
revoke execute on function public.find_trainer_by_email(text) from public, anon;
