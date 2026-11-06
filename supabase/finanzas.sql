-- Finanzas del panel (RMT · Perú): comprobantes de venta y de compra, cierres mensuales y ajustes.
-- Ejecutar en Supabase → SQL Editor después de schema.sql, proyectos.sql y recurrentes.sql.
-- Se puede ejecutar más de una vez: solo crea lo que falta.
--
-- El panel es control interno: los registros oficiales siguen en el SIRE de SUNAT y la declaración
-- la presenta el contador. Aquí se guarda cada comprobante con su archivo y se calcula el mes.

-- ——— Comprobantes (ventas y compras en una sola tabla) ———
create table if not exists public.fin_docs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  direction text not null check (direction in ('venta', 'compra')),
  -- Periodo tributario en el que se anota (AAAA-MM). Una compra puede anotarse en un mes posterior al de emisión.
  period text not null check (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  issued_on date not null,
  -- Tipo de comprobante (tabla 10 de SUNAT): 01 factura, 02 recibo por honorarios, 03 boleta, 07 nota de crédito,
  -- 08 nota de débito, 12 ticket, 14 recibo de servicios públicos, 91 comprobante de no domiciliado, 00 otro.
  doc_type text not null check (doc_type in ('01', '02', '03', '07', '08', '12', '14', '91', '00')),
  series text,
  number text,
  -- Contraparte (cliente o proveedor). Tipo de documento (tabla 2): 6 RUC, 1 DNI, 4 carné de extranjería,
  -- 7 pasaporte, 0 documento del exterior.
  party_doc_type text not null default '6' check (party_doc_type in ('0', '1', '4', '6', '7')),
  party_doc text,
  party_name text not null,
  currency text not null default 'PEN' check (currency in ('PEN', 'USD')),
  fx_rate numeric(8, 3) not null default 1 check (fx_rate > 0),
  -- gravada (con IGV), exportacion (servicio exportado, IGV 0), exonerada / inafecta, no_gravada (sin IGV por otro motivo).
  operation text not null default 'gravada' check (operation in ('gravada', 'exportacion', 'exonerada', 'no_gravada')),
  base numeric(12, 2) not null default 0,
  igv numeric(12, 2) not null default 0,
  other numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  -- Compras: categoría del gasto y si se usa el IGV como crédito fiscal.
  category text,
  credit_igv boolean not null default false,
  -- Pago: medio y fecha (bancarización), retención de recibos por honorarios.
  paid_via text check (paid_via in ('banco', 'tarjeta', 'efectivo', 'whop', 'otro')),
  paid_on date,
  retention numeric(12, 2) not null default 0,
  -- Detracción (SPOT): si aplica, monto y número de constancia.
  detraccion boolean not null default false,
  detraccion_amount numeric(12, 2),
  detraccion_ref text,
  -- Cobros del panel que respalda esta venta: «dep:<proyecto>», «bal:<proyecto>», «rec:<servicio>:<AAAA-MM>».
  links text[] not null default '{}',
  client_id uuid references public.clients (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  annulled boolean not null default false,
  notes text,
  -- Archivos en el bucket privado «comprobantes»: [{ path, name, size }].
  files jsonb not null default '[]'::jsonb
);

create index if not exists fin_docs_period_idx on public.fin_docs (period, direction, issued_on);
create index if not exists fin_docs_party_idx on public.fin_docs (party_doc);

drop trigger if exists fin_docs_touch on public.fin_docs;
create trigger fin_docs_touch before update on public.fin_docs
  for each row execute function public.touch_updated_at();

-- ——— Cierres mensuales (meses declarados) ———
create table if not exists public.fin_closings (
  period text primary key check (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  closed_at timestamptz not null default now(),
  closed_by text,
  -- Resultado del mes en soles: ventas, IGV, crédito, saldo a favor, pago a cuenta y totales.
  summary jsonb not null,
  declared_ref text,
  notes text
);

-- ——— Ajustes (UIT, tasas y umbrales): una sola fila ———
create table if not exists public.fin_settings (
  id integer primary key default 1 check (id = 1),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

insert into public.fin_settings (id, data) values (1, '{}'::jsonb) on conflict do nothing;

-- Un mes declarado no se edita por accidente: para corregirlo hay que reabrirlo (borrar su cierre).
create or replace function public.fin_docs_lock() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from public.fin_closings c where c.period = coalesce(old.period, new.period))
     or (tg_op <> 'DELETE' and exists (select 1 from public.fin_closings c where c.period = new.period)) then
    raise exception 'El periodo está cerrado. Reábrelo en Finanzas → Cierre del mes para corregirlo.';
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists fin_docs_lock on public.fin_docs;
create trigger fin_docs_lock before insert or update or delete on public.fin_docs
  for each row execute function public.fin_docs_lock();

-- ——— Seguridad: solo administradores del panel ———
alter table public.fin_docs enable row level security;
alter table public.fin_closings enable row level security;
alter table public.fin_settings enable row level security;

drop policy if exists "admins gestionan comprobantes" on public.fin_docs;
create policy "admins gestionan comprobantes" on public.fin_docs
  for all to authenticated using (public.is_panel_admin()) with check (public.is_panel_admin());

drop policy if exists "admins gestionan cierres" on public.fin_closings;
create policy "admins gestionan cierres" on public.fin_closings
  for all to authenticated using (public.is_panel_admin()) with check (public.is_panel_admin());

drop policy if exists "admins gestionan ajustes" on public.fin_settings;
create policy "admins gestionan ajustes" on public.fin_settings
  for all to authenticated using (public.is_panel_admin()) with check (public.is_panel_admin());

-- ——— Archivos: bucket privado «comprobantes» (PDF, XML e imágenes, hasta 10 MB) ———
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 10485760,
  array['application/pdf', 'application/xml', 'text/xml', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

drop policy if exists "admins leen comprobantes" on storage.objects;
create policy "admins leen comprobantes" on storage.objects
  for select to authenticated using (bucket_id = 'comprobantes' and public.is_panel_admin());

drop policy if exists "admins suben comprobantes" on storage.objects;
create policy "admins suben comprobantes" on storage.objects
  for insert to authenticated with check (bucket_id = 'comprobantes' and public.is_panel_admin());

drop policy if exists "admins borran comprobantes" on storage.objects;
create policy "admins borran comprobantes" on storage.objects
  for delete to authenticated using (bucket_id = 'comprobantes' and public.is_panel_admin());
