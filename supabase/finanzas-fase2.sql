-- Finanzas · fase 2: gastos fijos que el panel recuerda cada mes.
-- Ejecutar en Supabase → SQL Editor después de finanzas.sql. Se puede ejecutar más de una vez.
alter table public.fin_docs add column if not exists fijo boolean not null default false;
