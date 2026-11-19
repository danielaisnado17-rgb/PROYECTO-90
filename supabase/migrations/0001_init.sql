-- PROJECT 90 — Esquema de base de datos
-- Ejecutar en Supabase: SQL Editor → pegar → Run.
-- Todas las tablas usan (user_id, id) como clave primaria y Row Level Security:
-- cada usuaria sólo puede leer y escribir sus propias filas.
-- "Usuarios" = auth.users (gestionado por Supabase Auth) + public.profiles.

create extension if not exists "pgcrypto";

-- Helper para crear tablas con el patrón común ---------------------------------
create or replace function public._p90_owner_policies(t text) returns void
language plpgsql as $$
begin
  execute format('alter table public.%I enable row level security', t);
  execute format('drop policy if exists "%s_select_own" on public.%I', t, t);
  execute format('drop policy if exists "%s_insert_own" on public.%I', t, t);
  execute format('drop policy if exists "%s_update_own" on public.%I', t, t);
  execute format('drop policy if exists "%s_delete_own" on public.%I', t, t);
  execute format('create policy "%s_select_own" on public.%I for select using (auth.uid() = user_id)', t, t);
  execute format('create policy "%s_insert_own" on public.%I for insert with check (auth.uid() = user_id)', t, t);
  execute format('create policy "%s_update_own" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
  execute format('create policy "%s_delete_own" on public.%I for delete using (auth.uid() = user_id)', t, t);
end $$;

-- Perfil físico ---------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id text not null,
  name text not null default '',
  age int, sex text, height_cm numeric, start_weight_kg numeric,
  start_date date not null,
  sleep_hours_usual text, gym_experience_months int, session_minutes int,
  activity_factor numeric,
  schedule jsonb not null default '{}'::jsonb,
  habits jsonb not null default '[]'::jsonb,
  notifications jsonb not null default '{}'::jsonb,
  onboarded boolean not null default false,
  updated_at timestamptz default now(),
  primary key (user_id, id)
);

-- Medidas corporales ----------------------------------------------------------
create table if not exists public.body_measurements (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id text not null,
  date date not null,
  weight_kg numeric, waist_cm numeric, hip_cm numeric, glutes_cm numeric,
  abdomen_cm numeric, thigh_cm numeric, arm_cm numeric,
  is_baseline boolean not null default false,
  notes text default '',
  primary key (user_id, id)
);

-- Ejercicios (personalizados o sobrescrituras de la biblioteca base) -----------
create table if not exists public.exercises (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id text not null,
  name text not null, primary_muscle text, secondary_muscles jsonb default '[]',
  equipment text, start_position text,
  instructions jsonb default '[]', technique jsonb default '[]', common_mistakes jsonb default '[]',
  safety text, images jsonb default '[]', media_source text, video_url text,
  increment_kg numeric default 1, is_custom boolean default true,
  primary key (user_id, id)
);

-- Rutinas ---------------------------------------------------------------------
create table if not exists public.routines (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id text not null,
  name text not null, focus text, color text,
  items jsonb not null default '[]',
  primary key (user_id, id)
);

-- Entrenamientos y series -----------------------------------------------------
create table if not exists public.workouts (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id text not null,
  date date not null, routine_id text, routine_name text,
  started_at timestamptz, finished_at timestamptz,
  session_rpe numeric, feeling int, pain boolean default false, notes text default '',
  primary key (user_id, id)
);

create table if not exists public.workout_sets (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id text not null,
  workout_id text not null, date date not null, exercise_id text not null,
  set_index int not null, weight_kg numeric, reps int, rpe numeric,
  completed boolean not null default false, created_at timestamptz default now(),
  primary key (user_id, id)
);
create index if not exists workout_sets_ex on public.workout_sets(user_id, exercise_id, date);

-- Referencias de carga (pesos iniciales pendientes de validar) -----------------
create table if not exists public.load_references (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id text not null,
  exercise_id text not null, weight_kg numeric, load_type text, equipment text,
  bar_weight_kg numeric, validated boolean default false, notes text default '', date date,
  primary key (user_id, id)
);

-- Historial de cargas: vista derivada de las series reales registradas ---------
create or replace view public.load_history with (security_invoker = true) as
  select user_id, exercise_id, date, workout_id,
         max(weight_kg) as top_weight_kg,
         max(reps) filter (where weight_kg is not null) as max_reps,
         sum(coalesce(weight_kg,0) * coalesce(reps,0)) as volume_kg
  from public.workout_sets where completed
  group by user_id, exercise_id, date, workout_id;

-- Alimentos, recetas, comidas, registro nutricional ---------------------------
create table if not exists public.foods (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id text not null,
  name text not null, category text, state text,
  kcal numeric, protein_g numeric, carbs_g numeric, fat_g numeric, fiber_g numeric,
  portion_name text, portion_g numeric, source text, estimated boolean default true,
  is_custom boolean default true,
  primary key (user_id, id)
);

create table if not exists public.recipes (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id text not null,
  name text not null, kind text default 'receta', ingredients jsonb default '[]',
  servings numeric default 1, favorite boolean default false, notes text default '',
  primary key (user_id, id)
);

create table if not exists public.meal_plans (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id text not null,
  date date not null, slot text not null, title text, items jsonb default '[]',
  recipe_id text, done boolean default false,
  primary key (user_id, id)
);

create table if not exists public.food_logs (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id text not null,
  date date not null, slot text not null, food_id text, recipe_id text, name text,
  grams numeric, kcal numeric, protein_g numeric, carbs_g numeric, fat_g numeric, fiber_g numeric,
  eaten_out boolean default false, estimated boolean default true, created_at timestamptz default now(),
  primary key (user_id, id)
);
create index if not exists food_logs_date on public.food_logs(user_id, date);

-- Objetivos nutricionales (historial; el más reciente es el vigente) ----------
create table if not exists public.goals (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id text not null,
  valid_from date not null, kcal numeric, protein_g numeric, carbs_g numeric, fat_g numeric,
  fiber_g numeric, water_ml numeric, set_by text, notes text default '',
  primary key (user_id, id)
);

-- Hidratación, sueño, natación, hábitos ---------------------------------------
create table if not exists public.hydration_logs (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id text not null, date date not null, ml numeric not null, created_at timestamptz default now(),
  primary key (user_id, id)
);
create table if not exists public.sleep_logs (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id text not null, date date not null, hours numeric, quality int,
  primary key (user_id, id)
);
create table if not exists public.swim_sessions (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id text not null, date date not null, duration_min numeric, distance_m numeric,
  rpe numeric, styles jsonb default '[]', feelings text default '',
  primary key (user_id, id)
);
create table if not exists public.habit_logs (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id text not null, date date not null, energy int, fatigue int, stress int,
  pain boolean default false, pain_area text default '', habits jsonb default '{}', notes text default '',
  primary key (user_id, id)
);

-- Fotografías de progreso (metadatos; el archivo vive en Storage privado) -----
create table if not exists public.progress_photos (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id text not null, date date not null, day_number int, pose text,
  storage_path text not null, notes text default '',
  primary key (user_id, id)
);

-- Evaluaciones y cierres de día ------------------------------------------------
create table if not exists public.evaluations (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id text not null, day int not null, date date, notes text default '', completed boolean default false,
  primary key (user_id, id)
);
create table if not exists public.day_closures (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  id text not null, date date not null, day_number int, mood int, note text default '',
  summary jsonb default '{}', created_at timestamptz default now(),
  primary key (user_id, id)
);

-- RLS en todas las tablas -----------------------------------------------------
select public._p90_owner_policies(t) from unnest(array[
  'profiles','body_measurements','exercises','routines','workouts','workout_sets',
  'load_references','foods','recipes','meal_plans','food_logs','goals','hydration_logs',
  'sleep_logs','swim_sessions','habit_logs','progress_photos','evaluations','day_closures'
]) as t;

-- Storage privado para fotos: cada usuaria sólo accede a su carpeta <user_id>/...
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do update set public = false;

drop policy if exists "p90 photos read own" on storage.objects;
drop policy if exists "p90 photos insert own" on storage.objects;
drop policy if exists "p90 photos delete own" on storage.objects;
create policy "p90 photos read own" on storage.objects for select
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "p90 photos insert own" on storage.objects for insert
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "p90 photos delete own" on storage.objects for delete
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
