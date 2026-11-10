-- EDGORIA 6.1: private payment evidence, separate from activation and commissions.
-- Apply in staging first. This migration does not alter existing MT5/journal tables.
-- Storage objects never become public and users cannot mark their own evidence verified.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('edgoria-payment-proofs','edgoria-payment-proofs',false,3145728,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=3145728,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

create table if not exists public.edgoria_payment_proofs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 object_path text not null unique,
 amount_cents integer not null check(amount_cents in (1099,1499)),
 network text not null default 'TRC20' check(network='TRC20'),
 transaction_reference text,
 status text not null default 'pending' check(status in ('pending','verified','rejected')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id) on delete set null,
 review_note text,
 constraint edgoria_payment_path check(object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|webp)$'),
 constraint edgoria_payment_status_created check(status='pending' or reviewed_at is not null)
);
create unique index if not exists edgoria_one_pending_payment_proof_per_user
 on public.edgoria_payment_proofs(user_id) where status='pending';
create index if not exists edgoria_payment_proofs_review_queue on public.edgoria_payment_proofs(status,created_at desc);
alter table public.edgoria_payment_proofs enable row level security;
revoke all on public.edgoria_payment_proofs from public,anon,authenticated;
grant select,insert on public.edgoria_payment_proofs to authenticated;
grant select,update,insert on public.edgoria_payment_proofs to service_role;

drop policy if exists edgoria_proof_owner_select on public.edgoria_payment_proofs;
create policy edgoria_proof_owner_select on public.edgoria_payment_proofs for select to authenticated
using(user_id=(select auth.uid()));
drop policy if exists edgoria_proof_owner_insert on public.edgoria_payment_proofs;
create policy edgoria_proof_owner_insert on public.edgoria_payment_proofs for insert to authenticated
with check(user_id=(select auth.uid()) and status='pending' and reviewed_at is null and reviewed_by is null
 and object_path like (select auth.uid())::text||'/%');

-- INSERT only. Deliberately no client UPDATE/DELETE and no public SELECT on storage objects.
drop policy if exists edgoria_payment_storage_upload on storage.objects;
create policy edgoria_payment_storage_upload on storage.objects for insert to authenticated
with check(bucket_id='edgoria-payment-proofs' and (storage.foldername(name))[1]=(select auth.uid())::text
 and lower(storage.extension(name)) in ('png','jpg','webp'));

create table if not exists public.edgoria_payment_proof_audit (
 id uuid primary key default gen_random_uuid(),
 proof_id uuid not null references public.edgoria_payment_proofs(id),
 user_id uuid not null,
 admin_id uuid not null references auth.users(id),
 action text not null check(action in ('verified','rejected')),
 note text,
 created_at timestamptz not null default now()
);
alter table public.edgoria_payment_proof_audit enable row level security;
revoke all on public.edgoria_payment_proof_audit from public,anon,authenticated;
grant select,insert on public.edgoria_payment_proof_audit to service_role;
-- Authorization of admin actions remains in the Vercel server, not client RLS or metadata.

-- Atomic server-only decision and audit. No access grants and no commission writes.
create or replace function public.edgoria_review_payment_proof(
 p_proof_id uuid,p_admin_id uuid,p_status text,p_note text default null
) returns text language plpgsql security invoker set search_path='' as $$
declare v_user uuid;
begin
 if p_status not in ('verified','rejected') then raise exception 'Invalid status'; end if;
 if p_status='rejected' and length(btrim(coalesce(p_note,'')))<5 then raise exception 'A rejection reason is required'; end if;
 update public.edgoria_payment_proofs
 set status=p_status, reviewed_by=p_admin_id, reviewed_at=pg_catalog.now(), review_note=nullif(btrim(coalesce(p_note,'')),'')
 where id=p_proof_id and status='pending' returning user_id into v_user;
 if v_user is null then raise exception 'Proof already reviewed or missing'; end if;
 insert into public.edgoria_payment_proof_audit(proof_id,user_id,admin_id,action,note)
 values(p_proof_id,v_user,p_admin_id,p_status,nullif(btrim(coalesce(p_note,'')),''));
 return p_status;
end $$;
revoke all on function public.edgoria_review_payment_proof(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.edgoria_review_payment_proof(uuid,uuid,text,text) to service_role;
