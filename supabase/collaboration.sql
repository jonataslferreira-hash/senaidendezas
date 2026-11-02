-- Run in Supabase SQL Editor. No service-role key belongs in the frontend.
begin;
create table if not exists public.sl_groups (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
  name text not null check(char_length(name) between 1 and 140), created_at timestamptz not null default now()
);
create table if not exists public.sl_group_members (
  group_id uuid references public.sl_groups(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade,
  primary key(group_id,user_id)
);
create table if not exists public.sl_group_documents (
  id uuid primary key, group_id uuid not null references public.sl_groups(id) on delete cascade,
  title text not null check(char_length(title) between 1 and 140), revision uuid not null,
  version integer not null default 1 check(version > 0), updated_at timestamptz not null default now()
);
create table if not exists public.sl_group_invites (
  token uuid primary key default gen_random_uuid(), document_id uuid not null references public.sl_group_documents(id) on delete cascade,
  email text not null check(char_length(email) <= 254), created_by uuid not null references auth.users(id),
  expires_at timestamptz not null default now()+interval '7 days', accepted_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create or replace function public.sl_group_access(p_group_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.sl_group_members where group_id=p_group_id and user_id=(select auth.uid()));
$$;
create or replace function public.sl_group_contains_user(p_group_id uuid,p_user_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select public.sl_group_access(p_group_id) and exists(select 1 from public.sl_group_members where group_id=p_group_id and user_id=p_user_id);
$$;
create or replace function public.sl_document_access(p_document_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.sl_group_documents d where d.id=p_document_id and public.sl_group_access(d.group_id));
$$;
create or replace function public.sl_revision_unused(p_group_id uuid,p_revision uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select public.sl_group_access(p_group_id) and not exists(select 1 from public.sl_group_documents where group_id=p_group_id and revision=p_revision);
$$;
alter table public.sl_groups enable row level security;
alter table public.sl_group_members enable row level security;
alter table public.sl_group_documents enable row level security;
alter table public.sl_group_invites enable row level security;
revoke all on public.sl_groups,public.sl_group_members,public.sl_group_documents,public.sl_group_invites from anon,authenticated;
grant select on public.sl_groups,public.sl_group_members,public.sl_group_documents,public.sl_group_invites to authenticated;
drop policy if exists sl_groups_read on public.sl_groups;
create policy sl_groups_read on public.sl_groups for select to authenticated using(public.sl_group_access(id));
drop policy if exists sl_members_read on public.sl_group_members;
create policy sl_members_read on public.sl_group_members for select to authenticated using(public.sl_group_access(group_id));
drop policy if exists sl_documents_read on public.sl_group_documents;
create policy sl_documents_read on public.sl_group_documents for select to authenticated using(public.sl_group_access(group_id));
drop policy if exists sl_invites_read on public.sl_group_invites;
create policy sl_invites_read on public.sl_group_invites for select to authenticated using(created_by=(select auth.uid()));

create or replace function public.sl_create_group(p_name text) returns public.sl_groups
language plpgsql security definer set search_path='' as $$
declare g public.sl_groups;
begin
  if auth.uid() is null then raise exception 'Login necessário'; end if;
  if (select count(*) from public.sl_groups where owner_id=auth.uid()) >= 30 then raise exception 'Limite de 30 grupos por conta'; end if;
  insert into public.sl_groups(owner_id,name) values(auth.uid(),left(coalesce(nullif(trim(p_name),''),'Minha aula'),140)) returning * into g;
  insert into public.sl_group_members values(g.id,auth.uid()); return g;
end; $$;
create or replace function public.sl_publish_group_doc(p_group_id uuid,p_doc_id uuid,p_expected_version integer,p_revision uuid,p_title text)
returns public.sl_group_documents language plpgsql security definer set search_path='' as $$
declare d public.sl_group_documents;
begin
  if not public.sl_group_access(p_group_id) then raise exception 'Acesso negado'; end if;
  -- Group lock also serializes first publication, when the document row does not exist yet.
  perform 1 from public.sl_groups where id=p_group_id for update;
  select * into d from public.sl_group_documents where id=p_doc_id for update;
  if found then
    if d.group_id <> p_group_id or d.version <> p_expected_version then raise exception 'A versão mudou' using errcode='40001'; end if;
    update public.sl_group_documents set revision=p_revision,title=left(coalesce(nullif(trim(p_title),''),'Minha aula'),140),version=version+1,updated_at=now() where id=p_doc_id returning * into d;
  else
    if p_expected_version <> 0 then raise exception 'A versão mudou' using errcode='40001'; end if;
    if not exists(select 1 from public.sl_groups where id=p_group_id and owner_id=auth.uid()) then raise exception 'Somente o dono cria documentos'; end if;
    insert into public.sl_group_documents(id,group_id,title,revision) values(p_doc_id,p_group_id,left(coalesce(nullif(trim(p_title),''),'Minha aula'),140),p_revision) returning * into d;
  end if; return d;
end; $$;
create or replace function public.sl_invite_collaborator(p_document_id uuid,p_email text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.sl_group_documents; i public.sl_group_invites;
begin
  select * into d from public.sl_group_documents where id=p_document_id;
  if not found or not exists(select 1 from public.sl_groups where id=d.group_id and owner_id=auth.uid()) then raise exception 'Somente o dono pode convidar'; end if;
  if p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or char_length(p_email)>254 then raise exception 'E-mail inválido'; end if;
  if (select count(*) from public.sl_group_invites where created_by=auth.uid() and created_at>now()-interval '1 hour')>=30 then raise exception 'Aguarde antes de enviar mais convites'; end if;
  insert into public.sl_group_invites(document_id,email,created_by) values(d.id,lower(trim(p_email)),auth.uid()) returning * into i;
  return jsonb_build_object('token',i.token,'title',d.title,'email',i.email);
end; $$;
create or replace function public.sl_accept_invite(p_token uuid) returns public.sl_group_documents
language plpgsql security definer set search_path='' as $$
declare i public.sl_group_invites; d public.sl_group_documents;
begin
  if auth.uid() is null then raise exception 'Entre na conta para aceitar'; end if;
  select * into i from public.sl_group_invites where token=p_token for update;
  if not found or i.expires_at<now() then raise exception 'Convite inválido ou expirado'; end if;
  if lower(coalesce(auth.jwt()->>'email',''))<>i.email or (i.accepted_by is not null and i.accepted_by<>auth.uid()) then raise exception 'Entre usando o e-mail que recebeu o convite'; end if;
  select * into d from public.sl_group_documents where id=i.document_id;
  perform 1 from public.sl_groups where id=d.group_id for update;
  if (select count(*) from public.sl_group_members where group_id=d.group_id)>=30 and not public.sl_group_access(d.group_id) then raise exception 'Grupo cheio'; end if;
  insert into public.sl_group_members values(d.group_id,auth.uid()) on conflict do nothing;
  update public.sl_group_invites set accepted_by=auth.uid() where token=p_token; return d;
end; $$;

-- Only document members can read/send broadcasts or presence on private channels.
create or replace function public.sl_topic_access(p_topic text) returns boolean
language plpgsql stable security definer set search_path='' as $$
begin
  if p_topic !~ '^sl-doc:[a-f0-9-]{36}$' then return false; end if;
  return public.sl_document_access(substring(p_topic from 8)::uuid);
exception when invalid_text_representation then return false;
end; $$;
drop policy if exists sl_collab_read on realtime.messages;
create policy sl_collab_read on realtime.messages for select to authenticated using(extension in ('broadcast','presence') and public.sl_topic_access((select realtime.topic())));
drop policy if exists sl_collab_write on realtime.messages;
create policy sl_collab_write on realtime.messages for insert to authenticated with check(extension in ('broadcast','presence') and public.sl_topic_access((select realtime.topic())));

revoke all on function public.sl_group_access(uuid),public.sl_group_contains_user(uuid,uuid),public.sl_document_access(uuid),public.sl_create_group(text),public.sl_publish_group_doc(uuid,uuid,integer,uuid,text),public.sl_invite_collaborator(uuid,text),public.sl_accept_invite(uuid),public.sl_topic_access(text) from public,anon;
grant execute on function public.sl_group_access(uuid),public.sl_group_contains_user(uuid,uuid),public.sl_document_access(uuid),public.sl_create_group(text),public.sl_publish_group_doc(uuid,uuid,integer,uuid,text),public.sl_invite_collaborator(uuid,text),public.sl_accept_invite(uuid),public.sl_topic_access(text) to authenticated;
revoke all on function public.sl_revision_unused(uuid,uuid) from public,anon;
grant execute on function public.sl_revision_unused(uuid,uuid) to authenticated;
commit;
