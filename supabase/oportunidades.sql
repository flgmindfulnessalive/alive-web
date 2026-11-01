-- Oportunidades: cada pedido de un cliente es una oportunidad (un proyecto que aún no empieza) con
-- su servicio, monto y etapa. Un cliente que vuelve a comprar suma una oportunidad nueva.
-- Solo las ganadas aparecen en Producción. Pégalo una vez en Supabase → SQL Editor → Run.
-- Se puede volver a ejecutar sin duplicar nada. Requiere proyectos.sql.

alter table public.projects add column if not exists deal_stage text not null default 'ganado';
alter table public.projects drop constraint if exists projects_deal_stage_check;
alter table public.projects add constraint projects_deal_stage_check
  check (deal_stage in ('conversacion', 'propuesta', 'ganado', 'perdido'));
alter table public.projects add column if not exists deal_updated_at timestamptz not null default now();
alter table public.projects add column if not exists won_at date;

-- Los proyectos que ya existían cuentan como ganados desde su creación.
update public.projects set won_at = created_at::date where deal_stage = 'ganado' and won_at is null;

-- Clientes que estaban en conversación, con propuesta o perdidos pasan a tener su oportunidad,
-- con el valor que tenían. El servicio queda «por definir»: se elige al abrirla en el tablero.
insert into public.projects (client_id, service, title, amount, deal_stage, deal_updated_at, phase_started)
select c.id, 'otro', 'Por definir', c.value, c.stage, c.updated_at, current_date
from public.clients c
where c.stage in ('conversacion', 'propuesta', 'perdido')
  and not exists (select 1 from public.projects p where p.client_id = c.id and p.deal_stage <> 'ganado');

create index if not exists projects_deal_idx on public.projects (deal_stage, deal_updated_at desc);

-- Propuesta comercial guardada en cada oportunidad (la arma y la descarga el panel).
alter table public.projects add column if not exists proposal jsonb;
