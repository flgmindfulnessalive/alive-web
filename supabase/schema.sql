-- Esquema del panel de ALIVE. Pégalo una vez en Supabase → SQL Editor → Run.
-- Clientes (briefs y consultas), notas internas y lista de correos con acceso al panel.
-- Los proyectos de producción están en proyectos.sql (ejecútalo después de este).
-- Seguridad por filas: solo los correos de panel_admins pueden leer o editar. Las funciones de
-- Vercel insertan con la clave secreta (service role), que no pasa por estas reglas.

create table if not exists public.panel_admins (
  email text primary key
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text not null check (source in ('brief', 'contacto', 'manual')),
  stage text not null default 'nuevo'
    check (stage in ('nuevo', 'conversacion', 'propuesta', 'ganado', 'perdido')),
  name text not null,
  email text,
  phone text,
  company text,
  sector text,
  message text,
  value numeric(12, 2),
  brief_id text unique,
  answers jsonb,
  files jsonb not null default '[]'::jsonb
);

create index if not exists clients_stage_idx on public.clients (stage, created_at desc);
create index if not exists clients_created_idx on public.clients (created_at desc);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  created_at timestamptz not null default now(),
  author text,
  body text not null check (char_length(body) between 1 and 5000)
);

create index if not exists notes_client_idx on public.notes (client_id, created_at desc);

-- updated_at automático
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists clients_touch on public.clients;
create trigger clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();

-- ¿El usuario conectado es administrador del panel?
create or replace function public.is_panel_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.panel_admins where email = lower(auth.jwt() ->> 'email'));
$$;

alter table public.panel_admins enable row level security;
alter table public.clients enable row level security;
alter table public.notes enable row level security;

drop policy if exists "admins leen admins" on public.panel_admins;
create policy "admins leen admins" on public.panel_admins
  for select to authenticated using (public.is_panel_admin());

drop policy if exists "admins gestionan clientes" on public.clients;
create policy "admins gestionan clientes" on public.clients
  for all to authenticated using (public.is_panel_admin()) with check (public.is_panel_admin());

drop policy if exists "admins gestionan notas" on public.notes;
create policy "admins gestionan notas" on public.notes
  for all to authenticated using (public.is_panel_admin()) with check (public.is_panel_admin());

-- IMPORTANTE: cambia el correo de ejemplo por el tuyo antes de ejecutar (puedes añadir varios).
insert into public.panel_admins (email) values ('tu-correo@ejemplo.com')
  on conflict do nothing;
