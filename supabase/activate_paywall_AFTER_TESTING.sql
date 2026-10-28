-- DO NOT RUN UNTIL REAL CHECKOUT, TRIALS, SIGNED WEBHOOKS, RLS AND USER RECOVERY HAVE BEEN TESTED.
-- Restrictive policy means BOTH ownership RLS and active entitlement must be true.
-- All previous records remain intact even if subscription expires.
create or replace function edgoria_internal.has_active_entitlement(p_user uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select p_user=(select auth.uid()) and exists (
  select 1 from public.edgoria_subscriptions s where s.user_id=p_user and (
   (s.status in ('active','trialing') and (s.current_period_ends_at>now() or s.trial_ends_at>now()))
   or (s.status='canceled' and s.current_period_ends_at>now())
  )
 );
$$;
revoke all on function edgoria_internal.has_active_entitlement(uuid) from public,anon;
grant usage on schema edgoria_internal to authenticated;
grant execute on function edgoria_internal.has_active_entitlement(uuid) to authenticated;
-- Avoid exposing internal tables in the API schema list.
do $$ declare tab text;begin
 foreach tab in array array['accounts','trades','journal_entries','payouts','edgoria_risk_rules'] loop
  execute format('drop policy if exists edgoria_paid_access_gate on public.%I',tab);
  execute format('create policy edgoria_paid_access_gate on public.%I as restrictive for all to authenticated using (edgoria_internal.has_active_entitlement((select auth.uid()))) with check (edgoria_internal.has_active_entitlement((select auth.uid())))',tab);
 end loop;
end $$;
