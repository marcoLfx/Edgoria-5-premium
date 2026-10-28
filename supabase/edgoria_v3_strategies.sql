-- EDGORIA V3 additive migration. Execute once BEFORE preview deployment.
-- Does not change or delete any existing trade or user data.
create table if not exists public.edgoria_strategies (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 2 and 90),
 description text not null default '' check (length(description)<=1200),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id,name)
);
create index if not exists edgoria_strategies_user_idx on public.edgoria_strategies(user_id);
alter table public.edgoria_strategies enable row level security;
revoke all on public.edgoria_strategies from anon,authenticated;
grant select,insert,update,delete on public.edgoria_strategies to authenticated;
create policy edgoria_v3_strategies_read on public.edgoria_strategies for select to authenticated using (user_id=(select auth.uid()));
create policy edgoria_v3_strategies_insert on public.edgoria_strategies for insert to authenticated with check (user_id=(select auth.uid()));
create policy edgoria_v3_strategies_update on public.edgoria_strategies for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy edgoria_v3_strategies_delete on public.edgoria_strategies for delete to authenticated using (user_id=(select auth.uid()));

create table if not exists public.edgoria_trade_annotations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 trade_id uuid not null unique references public.trades(id) on delete cascade,
 strategy_id uuid references public.edgoria_strategies(id) on delete set null,
 notes text not null default '' check (length(notes)<=3000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists edgoria_trade_annotations_user_idx on public.edgoria_trade_annotations(user_id);
alter table public.edgoria_trade_annotations enable row level security;
revoke all on public.edgoria_trade_annotations from anon,authenticated;
grant select,insert,update,delete on public.edgoria_trade_annotations to authenticated;
create policy edgoria_v3_notes_read on public.edgoria_trade_annotations for select to authenticated using (user_id=(select auth.uid()));
create policy edgoria_v3_notes_insert on public.edgoria_trade_annotations for insert to authenticated
 with check (user_id=(select auth.uid()) and
 exists (select 1 from public.trades t where t.id=trade_id and t.user_id=(select auth.uid()) and t.external_id like 'mt5:%') and
 (strategy_id is null or exists (select 1 from public.edgoria_strategies s where s.id=strategy_id and s.user_id=(select auth.uid()))));
create policy edgoria_v3_notes_update on public.edgoria_trade_annotations for update to authenticated
 using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and
 exists (select 1 from public.trades t where t.id=trade_id and t.user_id=(select auth.uid()) and t.external_id like 'mt5:%') and
 (strategy_id is null or exists (select 1 from public.edgoria_strategies s where s.id=strategy_id and s.user_id=(select auth.uid()))));
create policy edgoria_v3_notes_delete on public.edgoria_trade_annotations for delete to authenticated using (user_id=(select auth.uid()));
