-- EDGORIA 3.1 FINAL: add-only signup approval, safe media, and private identity mirror.
-- Existing users remain active; existing suspended users remain suspended.

alter table public.edgoria_v4_access_grants drop constraint if exists edgoria_v4_access_grants_access_status_check;
alter table public.edgoria_v4_access_grants add constraint edgoria_v4_access_grants_access_status_check check (access_status in ('pending','active','suspended'));
-- First migrate existing accounts before installing the pending-by-default trigger.
insert into public.edgoria_v4_access_grants(user_id,access_status)
select id,'active' from auth.users on conflict (user_id) do nothing;

alter table public.edgoria_v4_profiles add column if not exists email text;
alter table public.edgoria_v4_profiles add column if not exists email_confirmed_at timestamptz;
update public.edgoria_v4_profiles p
set email=u.email,email_confirmed_at=u.email_confirmed_at
from auth.users u where u.id=p.user_id and (p.email is distinct from u.email or p.email_confirmed_at is distinct from u.email_confirmed_at);

-- A user cannot change a displayed email in the profiles table: it mirrors auth.users only.
create or replace function public.edgoria31_identity_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 select u.email,u.email_confirmed_at into new.email,new.email_confirmed_at
 from auth.users u where u.id=new.user_id;
 return new;
end $$;
drop trigger if exists edgoria31_identity_guard on public.edgoria_v4_profiles;
create trigger edgoria31_identity_guard before insert or update on public.edgoria_v4_profiles
for each row execute function public.edgoria31_identity_guard();

create or replace function public.edgoria31_register_pending() returns trigger language plpgsql security definer set search_path='' as $$
declare fullname text; home text;
begin
 insert into public.edgoria_v4_access_grants(user_id,access_status)
 values(new.id,'pending') on conflict(user_id) do nothing;
 fullname=left(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),'Usuario nuevo'),120);
 home=left(coalesce(nullif(trim(new.raw_user_meta_data->>'country'),''),'Sin especificar'),100);
 insert into public.edgoria_v4_profiles(user_id,full_name,country,phone,experience,email,email_confirmed_at)
 values(new.id,fullname,home,nullif(left(new.raw_user_meta_data->>'phone',24),''),'prefiero_no_decir',new.email,new.email_confirmed_at)
 on conflict(user_id) do nothing;
 return new;
end $$;
drop trigger if exists edgoria31_register_pending on auth.users;
create trigger edgoria31_register_pending after insert on auth.users
for each row execute function public.edgoria31_register_pending();

create or replace function public.edgoria31_update_confirmation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.edgoria_v4_profiles set email=new.email,email_confirmed_at=new.email_confirmed_at
 where user_id=new.id;
 return new;
end $$;
drop trigger if exists edgoria31_update_confirmation on auth.users;
create trigger edgoria31_update_confirmation after update of email,email_confirmed_at on auth.users
for each row execute function public.edgoria31_update_confirmation();

-- Deny unapproved users direct access to their journal through the Data API even if UI is bypassed.
create or replace function public.edgoria31_active_account() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.edgoria_v4_access_grants g where g.user_id=(select auth.uid()) and g.access_status='active');
$$;
revoke all on function public.edgoria31_active_account() from public,anon;
grant execute on function public.edgoria31_active_account() to authenticated,service_role;
do $$declare t record; begin
 for t in select c.table_name from information_schema.columns c
 join pg_class p on p.relname=c.table_name join pg_namespace ns on ns.oid=p.relnamespace and ns.nspname='public'
 where c.table_schema='public' and c.column_name='user_id' and c.data_type='uuid'
 and p.relrowsecurity and c.table_name not in ('edgoria_v4_access_grants','edgoria_v4_profiles','edgoria_v4_roles')
 loop
  execute format('drop policy if exists edgoria31_approval_required on public.%I',t.table_name);
  execute format('create policy edgoria31_approval_required on public.%I as restrictive for all to authenticated using ((select public.edgoria31_active_account())) with check ((select public.edgoria31_active_account()))',t.table_name);
 end loop;
end $$;

-- Journal images: private bucket, owner-only metadata and storage access. No public URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('edgoria-journal','edgoria-journal',false,3145728,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=3145728,allowed_mime_types=excluded.allowed_mime_types;
create table if not exists public.edgoria_journal_attachments(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 entry_id uuid not null references public.journal_entries(id) on delete cascade,
 storage_path text not null unique,
 mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp')),
 created_at timestamptz not null default now(),
 constraint journal_path_own check(length(storage_path) between 40 and 220)
);
create index if not exists idx_journal_attachments_owner_entry on public.edgoria_journal_attachments(user_id,entry_id);
alter table public.edgoria_journal_attachments enable row level security;
create policy journal31_select on public.edgoria_journal_attachments for select to authenticated
 using (user_id=(select auth.uid()) and (select public.edgoria31_active_account()));
create policy journal31_insert on public.edgoria_journal_attachments for insert to authenticated
 with check(user_id=(select auth.uid()) and (select public.edgoria31_active_account())
 and split_part(storage_path,'/',1)=(select auth.uid())::text
 and exists(select 1 from public.journal_entries j where j.id=entry_id and j.user_id=(select auth.uid())));
create policy journal31_delete on public.edgoria_journal_attachments for delete to authenticated
 using(user_id=(select auth.uid()) and (select public.edgoria31_active_account()));
grant select,insert,delete on public.edgoria_journal_attachments to authenticated;
create policy journal31_files_read on storage.objects for select to authenticated
 using(bucket_id='edgoria-journal' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.edgoria31_active_account()));
create policy journal31_files_insert on storage.objects for insert to authenticated
 with check(bucket_id='edgoria-journal' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.edgoria31_active_account()));
create policy journal31_files_delete on storage.objects for delete to authenticated
 using(bucket_id='edgoria-journal' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.edgoria31_active_account()));
