-- Producción: proyectos de cada cliente con sus etapas (ficha operativa de Web Esencial).
-- Pégalo una vez en Supabase → SQL Editor → Run. Se puede volver a ejecutar sin perder datos.
-- Requiere el esquema base (schema.sql): usa clients, touch_updated_at() e is_panel_admin().

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid not null references public.clients (id) on delete cascade,
  service text not null,
  title text,
  -- Fase actual (índice en las etapas de la ficha) y día en que empezó.
  phase integer not null default 0 check (phase >= 0),
  phase_started date not null default current_date,
  -- Fases terminadas: [{ i, s, e }] con índice, inicio y fin (fechas AAAA-MM-DD).
  history jsonb not null default '[]'::jsonb,
  -- Mensajes ya enviados por fase: ["4:recordatorio", …].
  sent jsonb not null default '[]'::jsonb,
  paused_since date,
  closed_admin boolean not null default false,
  paid_deposit boolean not null default false,
  paid_balance boolean not null default false
);

-- Servicios con ficha: we (Web Esencial), wep (Web Esencial + Panel), eco (Ecommerce Esencial); otro = sin ficha.
-- Al sumar un servicio nuevo, se actualiza esta lista y se vuelve a ejecutar el archivo.
alter table public.projects drop constraint if exists projects_service_check;
alter table public.projects add constraint projects_service_check check (service in ('we', 'wep', 'eco', 'otro'));

create index if not exists projects_client_idx on public.projects (client_id, created_at);

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

alter table public.projects enable row level security;

drop policy if exists "admins gestionan proyectos" on public.projects;
create policy "admins gestionan proyectos" on public.projects
  for all to authenticated using (public.is_panel_admin()) with check (public.is_panel_admin());
