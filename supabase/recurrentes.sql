-- Servicios mensuales: alojamiento, SEO o retainer de cada cliente, con lo que se cobra cada mes,
-- su costo para ALIVE y los meses ya pagados. Pégalo una vez en Supabase → SQL Editor → Run.
-- Se puede volver a ejecutar sin perder datos. Requiere el esquema base (schema.sql).

create table if not exists public.recurring (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid not null references public.clients (id) on delete cascade,
  kind text not null check (kind in ('aloj_web', 'aloj_eco', 'seo', 'aloj_seo', 'otro')),
  name text,
  amount numeric(12, 2) not null check (amount >= 0),
  cost numeric(12, 2) not null default 0 check (cost >= 0),
  started_on date not null default current_date,
  ended_on date,
  billing_day integer not null default 1 check (billing_day between 1 and 28),
  -- Meses pagados: [{ "month": "2026-11", "paid_at": "2026-11-03" }, …]
  paid_months jsonb not null default '[]'::jsonb
);

create index if not exists recurring_client_idx on public.recurring (client_id, created_at);

alter table public.recurring enable row level security;

drop policy if exists "admins gestionan recurrentes" on public.recurring;
create policy "admins gestionan recurrentes" on public.recurring
  for all to authenticated using (public.is_panel_admin()) with check (public.is_panel_admin());

-- Avisos de cobro ya enviados por mes (se suma a tablas creadas antes de esta columna).
alter table public.recurring add column if not exists sent jsonb not null default '[]'::jsonb;
