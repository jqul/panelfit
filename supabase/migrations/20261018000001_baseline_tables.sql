-- BASELINE reconstruido desde producción (proyecto panelfit, 2026-10-18).
-- Es una foto del esquema `public` tal y como está desplegado: tablas, claves,
-- índices y RLS activado. No se aplica sobre producción (ya existe); sirve para
-- levantar entornos nuevos y para que `supabase db diff` detecte cambios.
-- Ver supabase/README.md.

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ── Tablas ───────────────────────────────────────────────

create table public.entrenadores (
  uid uuid not null,
  email text not null,
  "displayName" text,
  role text default 'trainer',
  approved boolean default false,
  "createdAt" bigint,
  rol text default 'trainer',
  especialidades text[] default '{}',
  profile jsonb default '{}',
  slug text,
  public_page jsonb,
  notif_email text,
  notif_prefs jsonb default '{"inactividad": {"app": true, "email": false}, "alerta_vencida": {"app": true, "email": false}, "sesion_completada": {"app": true, "email": false}}',
  auto_checkin_enabled boolean default false,
  constraint entrenadores_pkey primary key (uid),
  constraint entrenadores_email_key unique (email),
  constraint entrenadores_slug_key unique (slug)
);

create table public.clientes (
  id uuid not null default gen_random_uuid(),
  "trainerId" uuid,
  name text not null,
  surname text,
  weight double precision,
  "fatPercentage" double precision,
  "muscleMass" double precision,
  "totalLifted" double precision,
  "planDescription" text,
  token text,
  "createdAt" bigint,
  objetivo text default 'general',
  phone text default '',
  altura numeric,
  genero text,
  fechanacimiento text,
  notas_privadas text default '',
  alerts jsonb default '[]',
  auth_user_id uuid,
  label_ids jsonb default '[]',
  notif_email text,
  notif_prefs jsonb default '{"mensaje": {"email": true}, "nueva_rutina": {"email": true}}',
  precio_mensual numeric,
  lesiones text,
  equipo_disponible text,
  metricas_cliente jsonb not null default '[]',
  plan_last_opened_at timestamptz,
  main_goal text,
  constraint clientes_pkey primary key (id),
  constraint clientes_token_key unique (token),
  constraint clientes_auth_user_id_fkey foreign key (auth_user_id) references auth.users(id) on delete set null,
  constraint "clientes_trainerId_fkey" foreign key ("trainerId") references public.entrenadores(uid) on delete cascade
);

create table public.checkins (
  id uuid not null default gen_random_uuid(),
  "clientId" uuid,
  respuestas jsonb,
  "createdAt" bigint default (extract(epoch from now()) * 1000),
  tipo text default 'checkin',
  constraint checkins_pkey primary key (id),
  constraint "checkins_clientId_fkey" foreign key ("clientId") references public.clientes(id) on delete cascade
);

create table public.ciclo_tracking (
  client_id text not null,
  trainer_id text not null,
  activo boolean not null default false,
  ultima_regla date,
  duracion_ciclo integer not null default 28,
  updated_at bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  constraint ciclo_tracking_pkey primary key (client_id)
);

create table public.citas (
  id uuid not null default gen_random_uuid(),
  trainer_id uuid not null,
  client_id uuid,
  title text not null default 'Sesión',
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'confirmada',
  notes text default '',
  recurring text,
  recurring_until date,
  created_at bigint not null default (extract(epoch from now()) * 1000),
  constraint citas_pkey primary key (id),
  constraint citas_recurring_check check (recurring = 'weekly'),
  constraint citas_status_check check (status = any (array['pendiente','confirmada','cancelada','completada'])),
  constraint citas_client_id_fkey foreign key (client_id) references public.clientes(id),
  constraint citas_trainer_id_fkey foreign key (trainer_id) references public.entrenadores(uid)
);

create table public.cohortes (
  id text not null,
  trainer_id text not null,
  nombre text not null,
  descripcion text,
  color text default '#6e5438',
  fecha_inicio text,
  fecha_fin text,
  activa boolean default true,
  created_at bigint not null,
  puntos_por_sesion numeric default 10,
  constraint cohortes_pkey primary key (id)
);

create table public.cohorte_clientes (
  id text not null,
  cohorte_id text not null,
  client_id text not null,
  joined_at bigint not null,
  constraint cohorte_clientes_pkey primary key (id),
  constraint cohorte_clientes_cohorte_id_fkey foreign key (cohorte_id) references public.cohortes(id) on delete cascade
);

create table public.conditioning_blocks (
  id text not null,
  trainer_id uuid not null,
  name text not null,
  type text not null default 'circuito',
  rounds integer,
  work_sec integer,
  rest_sec integer,
  duration_min integer,
  items jsonb not null default '[]',
  notes text,
  created_at bigint not null,
  constraint conditioning_blocks_pkey primary key (id)
);

create table public.dietas (
  id uuid not null default gen_random_uuid(),
  cliente_id text,
  datos jsonb,
  "updatedAt" timestamptz default now(),
  constraint dietas_pkey primary key (id)
);

create table public.encuestas (
  id uuid not null default gen_random_uuid(),
  cliente_id uuid,
  preguntas jsonb not null default '[]',
  respuestas jsonb,
  fecha_envio date,
  fecha_respuesta timestamp,
  created_at timestamp default now(),
  constraint encuestas_pkey primary key (id)
);

create table public.encuestas_biblioteca (
  id text not null,
  "trainerId" uuid,
  nombre text,
  preguntas jsonb,
  "createdAt" bigint default (extract(epoch from now()) * 1000),
  constraint encuestas_biblioteca_pkey primary key (id)
);

create table public.exercise_library (
  id text not null,
  trainer_id text not null,
  name text not null,
  description text default '',
  category text default '',
  especialidades text[] default '{}',
  videos jsonb default '[]',
  tags text[] default '{}',
  is_main boolean default false,
  use_count integer default 0,
  video_use_count integer default 0,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  constraint exercise_library_pkey primary key (id)
);

create table public.exercise_usage_events (
  id text not null default (gen_random_uuid())::text,
  trainer_id text not null,
  exercise_id text not null,
  exercise_name text not null,
  event_type text not null,
  client_id text,
  especialidad text,
  created_at bigint default (extract(epoch from now()) * 1000),
  constraint exercise_usage_events_pkey primary key (id)
);

create table public.foto_sessions (
  id text not null,
  client_id text not null,
  date text not null,
  front_url text,
  side_url text,
  back_url text,
  note text,
  created_at bigint default (extract(epoch from now()) * 1000),
  constraint foto_sessions_pkey primary key (id)
);

create table public.fotos (
  id uuid not null default gen_random_uuid(),
  cliente_id uuid,
  fecha date not null,
  url_frente text,
  url_espalda text,
  url_lateral text,
  created_at timestamptz default now(),
  constraint fotos_pkey primary key (id),
  constraint fotos_cliente_fecha_unique unique (cliente_id, fecha)
);

create table public.fv_profile_trials (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  trainer_id uuid not null,
  date date not null,
  load_kg numeric not null default 0,
  bodyweight_kg numeric not null,
  pushoff_distance_m numeric not null,
  jump_height_m numeric not null,
  notes text,
  created_at bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  constraint fv_profile_trials_pkey primary key (id),
  constraint fv_profile_trials_client_id_fkey foreign key (client_id) references public.clientes(id) on delete cascade,
  constraint fv_profile_trials_trainer_id_fkey foreign key (trainer_id) references public.entrenadores(uid) on delete cascade
);

create table public.habitos (
  id uuid not null default gen_random_uuid(),
  "clientId" uuid,
  text text,
  sub text,
  "order" integer,
  constraint habitos_pkey primary key (id),
  constraint "habitos_clientId_fkey" foreign key ("clientId") references public.clientes(id) on delete cascade
);

-- Secretos internos de webhooks/cron. RLS activado y SIN políticas a propósito:
-- solo accesible con service role y desde funciones SECURITY DEFINER.
create table public.internal_webhook_secrets (
  name text not null,
  secret text not null,
  created_at timestamptz not null default now(),
  constraint internal_webhook_secrets_pkey primary key (name)
);

create table public.survey_templates (
  id text not null,
  trainer_id text not null,
  name text not null,
  questions jsonb not null default '[]',
  created_at bigint default (extract(epoch from now()) * 1000),
  constraint survey_templates_pkey primary key (id)
);

create table public.labels (
  id text not null,
  trainer_id text not null,
  name text not null,
  color text not null default '#6e5438',
  emoji text not null default '🏷️',
  survey_template_id text,
  created_at bigint not null default (extract(epoch from now()) * 1000),
  constraint labels_pkey primary key (id),
  constraint labels_survey_template_id_fkey foreign key (survey_template_id) references public.survey_templates(id) on delete set null
);

create table public.leads (
  id uuid not null default gen_random_uuid(),
  trainer_id uuid not null,
  name text not null,
  email text,
  phone text,
  message text,
  status text not null default 'nuevo',
  created_at bigint not null,
  referred_by_client_id uuid,
  constraint leads_pkey primary key (id),
  constraint leads_status_check check (status = any (array['nuevo','contactado','descartado'])),
  constraint leads_referred_by_client_id_fkey foreign key (referred_by_client_id) references public.clientes(id) on delete set null
);

create table public.notificaciones (
  id text not null,
  trainer_id text not null,
  client_id text,
  tipo text not null,
  titulo text not null,
  mensaje text,
  leida boolean default false,
  created_at bigint not null,
  destinatario text default 'trainer',
  email_enviado boolean default false,
  constraint notificaciones_pkey primary key (id)
);

create table public.plan_history (
  id uuid not null default gen_random_uuid(),
  "clientId" uuid not null,
  plan jsonb not null,
  note text,
  published_by text,
  published_at timestamptz not null default now(),
  constraint plan_history_pkey primary key (id),
  constraint "plan_history_clientId_fkey" foreign key ("clientId") references public.clientes(id) on delete cascade
);

create table public.plan_templates (
  id text not null,
  trainer_id text not null,
  name text not null,
  description text default '',
  plan jsonb not null default '{}',
  created_at bigint not null,
  updated_at bigint not null,
  label_ids jsonb default '[]',
  is_public boolean not null default false,
  constraint plan_templates_pkey primary key (id)
);

create table public.planes (
  "clientId" uuid not null,
  plan jsonb,
  "updatedAt" bigint,
  plan_borrador jsonb,
  borrador_activo boolean default false,
  borrador_started_at timestamptz,
  constraint planes_pkey primary key ("clientId"),
  constraint "planes_clientId_fkey" foreign key ("clientId") references public.clientes(id) on delete cascade
);

create table public.plantillas_mensajes (
  id text not null,
  "trainerId" uuid,
  tipo text,
  nombre text,
  texto text,
  "createdAt" bigint default (extract(epoch from now()) * 1000),
  constraint plantillas_mensajes_pkey primary key (id)
);

create table public.programacion_mensajes (
  id uuid not null default gen_random_uuid(),
  "trainerId" uuid,
  "clientId" uuid,
  tipo text,
  mensaje text,
  "encuestaId" text,
  "fechaEnvio" date,
  enviado boolean default false,
  "createdAt" bigint default (extract(epoch from now()) * 1000),
  "pushEnviado" boolean default false,
  constraint programacion_mensajes_pkey primary key (id),
  constraint "programacion_mensajes_clientId_fkey" foreign key ("clientId") references public.clientes(id) on delete cascade
);

create table public.programs (
  id text not null,
  trainer_id text not null,
  name text not null default 'Nuevo programa',
  tipo text not null default 'General',
  label_ids jsonb default '[]',
  weeks jsonb not null default '[]',
  created_at bigint not null default (extract(epoch from now()) * 1000),
  updated_at bigint not null default (extract(epoch from now()) * 1000),
  constraint programs_pkey primary key (id)
);

create table public.progress_photos (
  id uuid not null default gen_random_uuid(),
  "clientId" uuid,
  date text,
  "frontUrl" text,
  "backUrl" text,
  "sideUrl" text,
  "createdAt" timestamptz default now(),
  constraint progress_photos_pkey primary key (id),
  constraint "progress_photos_clientId_fkey" foreign key ("clientId") references public.clientes(id) on delete cascade
);

create table public.push_subscriptions (
  id uuid not null default gen_random_uuid(),
  trainer_id uuid,
  client_id uuid,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at bigint not null default (extract(epoch from now()) * 1000),
  constraint push_subscriptions_pkey primary key (id),
  constraint push_subscriptions_endpoint_key unique (endpoint),
  constraint push_subscriptions_check check ((trainer_id is not null) <> (client_id is not null)),
  constraint push_subscriptions_client_id_fkey foreign key (client_id) references public.clientes(id),
  constraint push_subscriptions_trainer_id_fkey foreign key (trainer_id) references public.entrenadores(uid)
);

create table public.readiness_checkins (
  id uuid not null default gen_random_uuid(),
  "clientId" uuid not null,
  date date not null,
  sleep smallint not null,
  soreness smallint not null,
  stress smallint not null,
  motivation smallint not null,
  created_at bigint not null default (extract(epoch from now()) * 1000),
  constraint readiness_checkins_pkey primary key (id),
  constraint "readiness_checkins_clientId_date_key" unique ("clientId", date),
  constraint readiness_checkins_motivation_check check (motivation >= 1 and motivation <= 5),
  constraint readiness_checkins_sleep_check check (sleep >= 1 and sleep <= 5),
  constraint readiness_checkins_soreness_check check (soreness >= 1 and soreness <= 5),
  constraint readiness_checkins_stress_check check (stress >= 1 and stress <= 5),
  constraint "readiness_checkins_clientId_fkey" foreign key ("clientId") references public.clientes(id)
);

create table public.registros (
  "clientId" uuid not null,
  logs jsonb,
  "updatedAt" bigint,
  session_notes jsonb default '[]',
  constraint registros_pkey primary key ("clientId"),
  constraint "registros_clientId_fkey" foreign key ("clientId") references public.clientes(id) on delete cascade
);

create table public.registros_dolor (
  id text not null,
  "clientId" text not null,
  date text not null,
  zona text not null,
  intensidad integer not null,
  nota text,
  created_at bigint not null,
  tipo text,
  constraint registros_dolor_pkey primary key (id),
  constraint registros_dolor_intensidad_check check (intensidad >= 0 and intensidad <= 10)
);

create table public.registros_habitos (
  "clientId" uuid not null,
  date text not null,
  "completedHabitIds" jsonb,
  constraint registros_habitos_pkey primary key ("clientId", date),
  constraint "registros_habitos_clientId_fkey" foreign key ("clientId") references public.clientes(id) on delete cascade
);

create table public.registros_peso (
  id uuid not null default gen_random_uuid(),
  "clientId" uuid,
  weight double precision,
  "fatPercentage" double precision,
  date text,
  "createdAt" timestamptz default now(),
  constraint registros_peso_pkey primary key (id),
  constraint registros_peso_client_date_unique unique ("clientId", date),
  constraint "registros_peso_clientId_fkey" foreign key ("clientId") references public.clientes(id) on delete cascade
);

create table public.session_load (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  trainer_id uuid not null,
  date date not null,
  duration_min integer not null,
  rpe numeric not null,
  load_au numeric not null,
  created_at bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  constraint session_load_pkey primary key (id),
  constraint session_load_client_id_fkey foreign key (client_id) references public.clientes(id) on delete cascade,
  constraint session_load_trainer_id_fkey foreign key (trainer_id) references public.entrenadores(uid) on delete cascade
);

-- Sin FK a clientes en producción (se conserva tal cual).
create table public.session_reactions (
  id uuid not null default gen_random_uuid(),
  "clientId" uuid not null,
  "dayTitle" text,
  date date not null,
  emoji text not null,
  comment text,
  created_at timestamptz not null default now(),
  constraint session_reactions_pkey primary key (id)
);

create table public.survey_responses (
  id text not null,
  schedule_id text,
  template_id text not null,
  client_id text not null,
  trainer_id text not null,
  answers jsonb not null default '{}',
  completed_at bigint default (extract(epoch from now()) * 1000),
  constraint survey_responses_pkey primary key (id)
);

create table public.survey_schedules (
  id text not null,
  trainer_id text not null,
  template_id text not null,
  client_id text,
  frequency text not null default 'weekly',
  day_of_week integer default 5,
  active boolean default true,
  last_sent_at bigint,
  created_at bigint default (extract(epoch from now()) * 1000),
  constraint survey_schedules_pkey primary key (id)
);

create table public.team_members (
  id uuid not null default gen_random_uuid(),
  owner_id uuid not null,
  member_uid uuid not null,
  role text not null default 'coach',
  created_at bigint not null,
  constraint team_members_pkey primary key (id),
  constraint team_members_owner_id_member_uid_key unique (owner_id, member_uid),
  constraint team_members_member_uid_fkey foreign key (member_uid) references public.entrenadores(uid) on delete cascade,
  constraint team_members_owner_id_fkey foreign key (owner_id) references public.entrenadores(uid) on delete cascade
);

create table public.test_catalogo (
  id text not null,
  trainer_id text not null,
  nombre text not null,
  categoria text not null,
  unidad text,
  descripcion text,
  es_default boolean default false,
  created_at bigint not null,
  constraint test_catalogo_pkey primary key (id)
);

create table public.test_resultados (
  id text not null,
  trainer_id text not null,
  client_id text not null,
  test_id text not null,
  valor numeric not null,
  fecha text not null,
  notas text,
  created_at bigint not null,
  constraint test_resultados_pkey primary key (id),
  constraint test_resultados_test_id_fkey foreign key (test_id) references public.test_catalogo(id) on delete cascade
);

create table public.valoraciones (
  id text not null,
  client_id text not null,
  trainer_id text not null,
  fecha date not null,
  peso numeric(5,2),
  imc numeric(4,1),
  grasa_corporal numeric(4,1),
  masa_muscular numeric(5,2),
  cintura numeric(5,1),
  cadera numeric(5,1),
  pecho numeric(5,1),
  brazo_d numeric(5,1),
  brazo_i numeric(5,1),
  muslo_d numeric(5,1),
  muslo_i numeric(5,1),
  notas text default '',
  fotos jsonb default '[]',
  created_at bigint not null default (extract(epoch from now()) * 1000),
  constraint valoraciones_pkey primary key (id)
);

create table public.video_feedback (
  id text not null,
  trainer_id text not null,
  client_id text not null,
  exercise_name text not null,
  video_url text not null,
  client_note text,
  trainer_comment text,
  trainer_comment_video_url text,
  status text default 'pendiente',
  created_at bigint not null,
  commented_at bigint,
  constraint video_feedback_pkey primary key (id)
);

create table public.waivers (
  id uuid not null default gen_random_uuid(),
  "clientId" uuid not null,
  signed_name text not null,
  accepted_at bigint not null,
  text_version text not null,
  constraint waivers_pkey primary key (id),
  constraint "waivers_clientId_fkey" foreign key ("clientId") references public.clientes(id) on delete cascade
);

create table public.weekly_reviews (
  id uuid not null default gen_random_uuid(),
  "clientId" uuid not null,
  week_start date not null,
  objetivo_semanal text,
  estado text not null default 'en_curso',
  nota text,
  created_by text,
  created_at timestamptz not null default now(),
  constraint weekly_reviews_pkey primary key (id),
  constraint weekly_reviews_estado_check check (estado = any (array['en_curso','riesgo','conseguido'])),
  constraint "weekly_reviews_clientId_fkey" foreign key ("clientId") references public.clientes(id) on delete cascade
);

-- ── Índices ──────────────────────────────────────────────
create index citas_client_idx on public.citas (client_id, start_at);
create index citas_trainer_idx on public.citas (trainer_id, start_at);
create index fv_profile_trials_client_date_idx on public.fv_profile_trials (client_id, date);
create index fv_profile_trials_client_id_idx on public.fv_profile_trials (client_id);
create index idx_checkins_clientid on public.checkins ("clientId");
create index idx_clientes_auth_user_id on public.clientes (auth_user_id);
create index idx_clientes_trainerid on public.clientes ("trainerId");
create index idx_cohorte_clientes_client on public.cohorte_clientes (client_id);
create index idx_cohorte_clientes_cohorte on public.cohorte_clientes (cohorte_id);
create unique index idx_cohorte_clientes_unique on public.cohorte_clientes (cohorte_id, client_id);
create index idx_cohortes_trainer on public.cohortes (trainer_id, activa);
create index idx_entrenadores_slug on public.entrenadores (slug);
create index idx_exercise_library_name on public.exercise_library (trainer_id, name);
create index idx_exercise_library_trainer on public.exercise_library (trainer_id);
create index idx_habitos_clientid on public.habitos ("clientId");
create index idx_labels_survey_template_id on public.labels (survey_template_id);
create index idx_leads_trainer_id on public.leads (trainer_id);
create index idx_notificaciones_trainer on public.notificaciones (trainer_id, leida, created_at desc);
create index idx_plan_templates_trainer on public.plan_templates (trainer_id);
create index idx_programacion_mensajes_clientid on public.programacion_mensajes ("clientId");
create index idx_progress_photos_clientid on public.progress_photos ("clientId");
create index idx_registros_peso_clientid on public.registros_peso ("clientId");
create index idx_team_members_member on public.team_members (member_uid);
create index idx_team_members_owner on public.team_members (owner_id);
create index idx_test_catalogo_trainer on public.test_catalogo (trainer_id);
create index idx_test_resultados_client on public.test_resultados (client_id, test_id, fecha desc);
create index idx_test_resultados_test_id on public.test_resultados (test_id);
create index idx_usage_trainer on public.exercise_usage_events (trainer_id, event_type);
create index idx_video_feedback_client on public.video_feedback (client_id, created_at desc);
create index idx_video_feedback_trainer on public.video_feedback (trainer_id, status, created_at desc);
create index idx_waivers_clientid on public.waivers ("clientId");
create index plan_history_client_idx on public.plan_history ("clientId", published_at desc);
create index programs_trainer_id_idx on public.programs (trainer_id);
create index push_subscriptions_client_idx on public.push_subscriptions (client_id);
create index push_subscriptions_trainer_idx on public.push_subscriptions (trainer_id);
create index readiness_checkins_client_idx on public.readiness_checkins ("clientId", date);
create index registros_dolor_client_idx on public.registros_dolor ("clientId");
create index session_load_client_id_idx on public.session_load (client_id);
create index session_load_trainer_id_idx on public.session_load (trainer_id);
create index valoraciones_client_id_idx on public.valoraciones (client_id);
create index valoraciones_trainer_id_idx on public.valoraciones (trainer_id);
create index weekly_reviews_client_idx on public.weekly_reviews ("clientId", week_start desc);

-- ── RLS activado en todas las tablas ─────────────────────
alter table public.checkins enable row level security;
alter table public.ciclo_tracking enable row level security;
alter table public.citas enable row level security;
alter table public.clientes enable row level security;
alter table public.cohorte_clientes enable row level security;
alter table public.cohortes enable row level security;
alter table public.conditioning_blocks enable row level security;
alter table public.dietas enable row level security;
alter table public.encuestas enable row level security;
alter table public.encuestas_biblioteca enable row level security;
alter table public.entrenadores enable row level security;
alter table public.exercise_library enable row level security;
alter table public.exercise_usage_events enable row level security;
alter table public.foto_sessions enable row level security;
alter table public.fotos enable row level security;
alter table public.fv_profile_trials enable row level security;
alter table public.habitos enable row level security;
alter table public.internal_webhook_secrets enable row level security;
alter table public.labels enable row level security;
alter table public.leads enable row level security;
alter table public.notificaciones enable row level security;
alter table public.plan_history enable row level security;
alter table public.plan_templates enable row level security;
alter table public.planes enable row level security;
alter table public.plantillas_mensajes enable row level security;
alter table public.programacion_mensajes enable row level security;
alter table public.programs enable row level security;
alter table public.progress_photos enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.readiness_checkins enable row level security;
alter table public.registros enable row level security;
alter table public.registros_dolor enable row level security;
alter table public.registros_habitos enable row level security;
alter table public.registros_peso enable row level security;
alter table public.session_load enable row level security;
alter table public.session_reactions enable row level security;
alter table public.survey_responses enable row level security;
alter table public.survey_schedules enable row level security;
alter table public.survey_templates enable row level security;
alter table public.team_members enable row level security;
alter table public.test_catalogo enable row level security;
alter table public.test_resultados enable row level security;
alter table public.valoraciones enable row level security;
alter table public.video_feedback enable row level security;
alter table public.waivers enable row level security;
alter table public.weekly_reviews enable row level security;
