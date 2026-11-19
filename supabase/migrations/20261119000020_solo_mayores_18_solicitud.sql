-- Solo mayores de 18 en la solicitud pública de programación inicial (2026-11-19), tras revisar #205.
--
-- La edad (18-100) es obligatoria SIEMPRE, también sin consentimiento de salud, y se comprueba en la base de datos (aunque, sin
-- consentimiento, no se guarde): los menores exigirían el consentimiento de su tutor, que esta versión no gestiona. Sin edad válida no hay
-- solicitud. (El push por tipo, el recordatorio y la purga de 60 días de las «a revisar» van en 20261119000010_solicitud_revision_aviso.)
-- Prueba: hardening/tests/bloque40_solicitud_programacion.sql (casos 15a-15f).

create or replace function public.limpiar_respuestas_programacion(p_resp jsonb, p_salud boolean)
 returns jsonb language plpgsql immutable
 set search_path to 'public'
as $$
declare
  v_out jsonb := '{}'::jsonb;
  r record;
  v jsonb;
  v_txt text;
  v_num numeric;
  v_edad jsonb;
begin
  if p_resp is null or jsonb_typeof(p_resp) <> 'object' then raise exception 'Las respuestas no son válidas'; end if;
  if length(p_resp::text) > 20000 then raise exception 'Las respuestas son demasiado largas'; end if;
  -- V1: solo mayores de 18. Se comprueba SIEMPRE (con o sin consentimiento de salud, y aunque la edad no se guarde): sin una edad
  -- válida de 18 a 100 años no hay solicitud, para no tratar datos de salud de menores sin el consentimiento de su tutor.
  v_edad := p_resp -> 'edad';
  if v_edad is null or jsonb_typeof(v_edad) <> 'number' or (v_edad #>> '{}')::numeric < 18 or (v_edad #>> '{}')::numeric > 100 then
    raise exception 'Esta solicitud es solo para mayores de 18 años';
  end if;
  for r in select * from (values
    ('objetivo',          'choice', false, true,  null::numeric, null::numeric),
    ('objetivo_detalle',  'text',   false, false, null, null),
    ('experiencia',       'choice', false, true,  null, null),
    ('rutina_actual',     'text',   false, false, null, null),
    ('dias',              'choice', false, true,  null, null),
    ('duracion',          'choice', false, true,  null, null),
    ('material',          'multi',  false, true,  null, null),
    ('rechaza',           'text',   true,  false, null, null),
    ('molestias',         'yesno',  true,  false, null, null),
    ('molestias_detalle', 'text',   true,  false, null, null),
    ('marcas',            'text',   false, false, null, null),
    ('peso',              'number', true,  false, 20, 400),
    ('altura',            'number', true,  false, 100, 250),
    ('edad',              'number', true,  true,  18, 100),
    ('fase',              'choice', true,  false, null, null),
    ('sueno',             'number', true,  false, 0, 24),
    ('estres',            'scale',  true,  false, 1, 10),
    ('pasos',             'number', false, false, 0, 100000),
    ('cardio',            'text',   false, false, null, null),
    ('prioridad',         'multi',  false, false, null, null),
    ('barreras',          'multi',  false, false, null, null),
    ('extra',             'text',   false, false, null, null)
  ) as q(id, tipo, salud, obligatoria, minimo, maximo) loop
    -- Lo de salud, sin consentimiento, se descarta aquí: nunca llega a guardarse
    if r.salud and not p_salud then continue; end if;
    v := p_resp -> r.id;
    if v is null or v = 'null'::jsonb
       or (jsonb_typeof(v) = 'string' and btrim(v #>> '{}') = '')
       or (jsonb_typeof(v) = 'array' and jsonb_array_length(v) = 0) then
      if r.obligatoria then raise exception 'Faltan respuestas obligatorias'; end if;
      continue;
    end if;
    if r.tipo = 'text' then
      if jsonb_typeof(v) <> 'string' or length(v #>> '{}') > 1000 then raise exception 'Una respuesta es demasiado larga'; end if;
      v_out := v_out || jsonb_build_object(r.id, btrim(v #>> '{}'));
    elsif r.tipo = 'choice' then
      if jsonb_typeof(v) <> 'string' or length(v #>> '{}') > 200 then raise exception 'Una respuesta no es válida'; end if;
      v_out := v_out || jsonb_build_object(r.id, btrim(v #>> '{}'));
    elsif r.tipo = 'yesno' then
      if jsonb_typeof(v) <> 'boolean' then raise exception 'Una respuesta no es válida'; end if;
      v_out := v_out || jsonb_build_object(r.id, v);
    elsif r.tipo = 'multi' then
      if jsonb_typeof(v) <> 'array' or jsonb_array_length(v) > 12
         or exists (select 1 from jsonb_array_elements(v) e where jsonb_typeof(e) <> 'string' or length(e #>> '{}') > 100) then
        raise exception 'Una respuesta no es válida';
      end if;
      v_out := v_out || jsonb_build_object(r.id, v);
    else -- number, scale
      if jsonb_typeof(v) <> 'number' then raise exception 'Revisa los números que has escrito'; end if;
      v_num := (v #>> '{}')::numeric;
      if v_num < r.minimo or v_num > r.maximo then raise exception 'Revisa los números que has escrito'; end if;
      v_out := v_out || jsonb_build_object(r.id, v_num);
    end if;
  end loop;
  return v_out;
end;
$$;
revoke execute on function public.limpiar_respuestas_programacion(jsonb, boolean) from public, anon, authenticated;
