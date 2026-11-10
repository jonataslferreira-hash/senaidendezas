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


-- Run after collaboration.sql. Uses the same membership checks as the editor.
begin;
create table if not exists public.sl_chat_messages(
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.sl_group_documents(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  author_name text not null,
  body text not null check(char_length(body) between 1 and 2000),
  slide_id text check(char_length(slide_id)<=100),
  created_at timestamptz not null default now()
);
create index if not exists sl_chat_document_time on public.sl_chat_messages(document_id,created_at desc);
alter table public.sl_chat_messages enable row level security;
revoke all on public.sl_chat_messages from anon,authenticated;
grant select on public.sl_chat_messages to authenticated;
drop policy if exists sl_chat_read on public.sl_chat_messages;
create policy sl_chat_read on public.sl_chat_messages for select to authenticated using(public.sl_document_access(document_id));
create or replace function public.sl_send_chat_message(p_document_id uuid,p_body text,p_slide_id text default null)
returns public.sl_chat_messages language plpgsql security definer set search_path='' as $$
declare result public.sl_chat_messages; person text;
begin
  if auth.uid() is null or not public.sl_document_access(p_document_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  if char_length(trim(p_body)) not between 1 and 2000 or char_length(p_slide_id)>100 then raise exception 'Mensagem inválida'; end if;
  select left(coalesce(nullif(raw_user_meta_data->>'display_name',''),'Colaborador'),80) into person from auth.users where id=auth.uid();
  insert into public.sl_chat_messages(document_id,author_id,author_name,body,slide_id)
    values(p_document_id,auth.uid(),person,trim(p_body),p_slide_id) returning * into result;
  return result;
end; $$;
revoke all on function public.sl_send_chat_message(uuid,text,text) from public,anon;
grant execute on function public.sl_send_chat_message(uuid,text,text) to authenticated;
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sl_chat_messages') then
    alter publication supabase_realtime add table public.sl_chat_messages;
  end if;
end $$;
commit;


begin;
create table if not exists public.sl_contacts(
 id uuid primary key default gen_random_uuid(),requester_id uuid not null references auth.users(id),recipient_id uuid not null references auth.users(id),
 status text not null default 'pending' check(status in('pending','accepted','declined')),created_at timestamptz not null default now(),
 low_id uuid generated always as(least(requester_id,recipient_id)) stored, high_id uuid generated always as(greatest(requester_id,recipient_id)) stored,
 unique(low_id,high_id),check(requester_id<>recipient_id)
);
create table if not exists public.sl_direct_messages(
 id uuid primary key default gen_random_uuid(),contact_id uuid not null references public.sl_contacts(id) on delete cascade,
 author_id uuid not null references auth.users(id),author_name text not null,body text not null check(char_length(body) between 1 and 2000),created_at timestamptz not null default now()
);
create index if not exists sl_direct_contact_time on public.sl_direct_messages(contact_id,created_at desc);
create table if not exists public.sl_chat_reads(contact_id uuid references public.sl_contacts(id) on delete cascade,user_id uuid references auth.users(id),last_read timestamptz not null default now(),primary key(contact_id,user_id));
create or replace function public.sl_contact_access(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.sl_contacts where id=p_id and status='accepted' and auth.uid() in(requester_id,recipient_id));$$;
alter table public.sl_contacts enable row level security;
alter table public.sl_direct_messages enable row level security;
alter table public.sl_chat_reads enable row level security;
revoke all on public.sl_contacts,public.sl_direct_messages,public.sl_chat_reads from anon,authenticated;
grant select on public.sl_contacts,public.sl_direct_messages,public.sl_chat_reads to authenticated;
drop policy if exists sl_contacts_read on public.sl_contacts;
create policy sl_contacts_read on public.sl_contacts for select to authenticated using(auth.uid() in(requester_id,recipient_id));
drop policy if exists sl_direct_read on public.sl_direct_messages;
create policy sl_direct_read on public.sl_direct_messages for select to authenticated using(public.sl_contact_access(contact_id));
drop policy if exists sl_reads_read on public.sl_chat_reads;
create policy sl_reads_read on public.sl_chat_reads for select to authenticated using(user_id=auth.uid());
create or replace function public.sl_find_contact(p_email text) returns table(user_id uuid,display_name text)
language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Entre na conta';end if;
 return query select u.id,left(coalesce(nullif(u.raw_user_meta_data->>'display_name',''),'Usuário'),80) from auth.users u where lower(u.email)=lower(trim(p_email)) and u.id<>auth.uid() and u.email_confirmed_at is not null;
end;$$;
create or replace function public.sl_request_contact(p_email text) returns public.sl_contacts
language plpgsql security definer set search_path='' as $$declare target uuid; result public.sl_contacts;begin
 if auth.uid() is null then raise exception 'Entre na conta';end if;
 select id into target from auth.users where lower(email)=lower(trim(p_email)) and email_confirmed_at is not null;
 if target is null or target=auth.uid() then raise exception 'Conta não encontrada ou é sua própria conta';end if;
 if (select count(*) from public.sl_contacts where requester_id=auth.uid() and created_at>now()-interval '1 minute')>=15 then raise exception 'Aguarde antes de enviar novas solicitações';end if;
 insert into public.sl_contacts(requester_id,recipient_id) values(auth.uid(),target) on conflict(low_id,high_id) do nothing;
 select * into result from public.sl_contacts where low_id=least(auth.uid(),target) and high_id=greatest(auth.uid(),target);return result;
end;$$;
create or replace function public.sl_respond_contact(p_id uuid,p_accept boolean) returns void
language plpgsql security definer set search_path='' as $$begin
 update public.sl_contacts set status=case when p_accept then 'accepted' else 'declined' end where id=p_id and recipient_id=auth.uid() and status='pending';
 if not found then raise exception 'Solicitação indisponível';end if;
end;$$;
create or replace function public.sl_list_contacts() returns table(id uuid,requester_id uuid,recipient_id uuid,status text,other_id uuid,other_name text,other_email text)
language sql stable security definer set search_path='' as $$
 select c.id,c.requester_id,c.recipient_id,c.status,u.id,left(coalesce(nullif(u.raw_user_meta_data->>'display_name',''),'Usuário'),80),u.email::text
 from public.sl_contacts c join auth.users u on u.id=case when c.requester_id=auth.uid() then c.recipient_id else c.requester_id end
 where auth.uid() in(c.requester_id,c.recipient_id) order by c.created_at desc;
$$;
create or replace function public.sl_send_direct_message(p_contact_id uuid,p_body text) returns public.sl_direct_messages
language plpgsql security definer set search_path='' as $$declare result public.sl_direct_messages; person text;begin
 if not public.sl_contact_access(p_contact_id) then raise exception 'É preciso aceitar a solicitação antes de conversar';end if;
 if char_length(trim(p_body)) not between 1 and 2000 then raise exception 'Mensagem inválida';end if;
 select left(coalesce(nullif(raw_user_meta_data->>'display_name',''),'Usuário'),80) into person from auth.users where id=auth.uid();
 insert into public.sl_direct_messages(contact_id,author_id,author_name,body) values(p_contact_id,auth.uid(),person,trim(p_body)) returning * into result;return result;
end;$$;
create or replace function public.sl_mark_chat_read(p_contact_id uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if not public.sl_contact_access(p_contact_id) then raise exception 'Acesso negado';end if;
 insert into public.sl_chat_reads(contact_id,user_id,last_read) values(p_contact_id,auth.uid(),now()) on conflict(contact_id,user_id) do update set last_read=excluded.last_read;
end;$$;
create or replace function public.sl_chat_badge() returns integer language sql stable security definer set search_path='' as $$
 select ((select count(*) from public.sl_contacts where recipient_id=auth.uid() and status='pending')+
 (select count(*) from public.sl_direct_messages m join public.sl_contacts c on c.id=m.contact_id left join public.sl_chat_reads r on r.contact_id=c.id and r.user_id=auth.uid() where c.status='accepted' and auth.uid() in(c.requester_id,c.recipient_id) and m.author_id<>auth.uid() and m.created_at>coalesce(r.last_read,'epoch'::timestamptz)))::integer;
$$;
revoke all on function public.sl_contact_access(uuid),public.sl_find_contact(text),public.sl_request_contact(text),public.sl_respond_contact(uuid,boolean),public.sl_list_contacts(),public.sl_send_direct_message(uuid,text),public.sl_mark_chat_read(uuid),public.sl_chat_badge() from public,anon;
grant execute on function public.sl_contact_access(uuid),public.sl_find_contact(text),public.sl_request_contact(text),public.sl_respond_contact(uuid,boolean),public.sl_list_contacts(),public.sl_send_direct_message(uuid,text),public.sl_mark_chat_read(uuid),public.sl_chat_badge() to authenticated;
do $$declare t text;begin foreach t in array array['sl_contacts','sl_direct_messages'] loop
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t);end if;
end loop;end$$;
notify pgrst,'reload schema';
commit;


-- Run after setup-chat.sql. Safe to run again. Roles, inbox invites and private profile access.
begin;
alter table public.sl_group_members add column if not exists role text not null default 'editor' check(role in ('viewer','commenter','editor'));
alter table public.sl_group_invites add column if not exists role text not null default 'editor' check(role in ('viewer','commenter','editor'));

create or replace function public.sl_document_role(p_document_id uuid) returns text
language sql stable security definer set search_path='' as $$
 select case when g.owner_id=auth.uid() then 'owner' else m.role end
 from public.sl_group_documents d join public.sl_groups g on g.id=d.group_id
 join public.sl_group_members m on m.group_id=g.id and m.user_id=auth.uid() where d.id=p_document_id;
$$;
create or replace function public.sl_group_edit_access(p_group_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.sl_group_members m join public.sl_groups g on g.id=m.group_id where m.group_id=p_group_id and m.user_id=auth.uid() and (m.role='editor' or g.owner_id=auth.uid()));
$$;
create or replace function public.sl_set_collaborator_role(p_document_id uuid,p_user_id uuid,p_role text) returns void
language plpgsql security definer set search_path='' as $$declare gid uuid;begin
 select d.group_id into gid from public.sl_group_documents d join public.sl_groups g on g.id=d.group_id where d.id=p_document_id and g.owner_id=auth.uid();
 if gid is null or p_role not in ('viewer','commenter','editor') then raise exception 'Acesso negado';end if;
 if exists(select 1 from public.sl_groups where id=gid and owner_id=p_user_id) then raise exception 'O dono mantém a administração';end if;
 update public.sl_group_members set role=p_role where group_id=gid and user_id=p_user_id;
end;$$;
create or replace function public.sl_collaborators(p_document_id uuid) returns table(user_id uuid,display_name text,avatar_path text,theme text,ui_style text,role text)
language sql stable security definer set search_path='' as $$
 select u.id,coalesce(nullif(u.raw_user_meta_data->>'display_name',''),'Colaborador'),u.raw_user_meta_data->>'avatar_path',u.raw_user_meta_data->>'theme',u.raw_user_meta_data->>'ui_style',case when g.owner_id=u.id then 'owner' else m.role end
 from public.sl_group_documents d join public.sl_groups g on g.id=d.group_id join public.sl_group_members m on m.group_id=g.id join auth.users u on u.id=m.user_id
 where d.id=p_document_id and public.sl_document_access(d.id);
$$;
create or replace function public.sl_my_invites() returns table(token uuid,document_id uuid,title text,inviter_name text,role text)
language sql stable security definer set search_path='' as $$
 select i.token,i.document_id,d.title,coalesce(nullif(u.raw_user_meta_data->>'display_name',''),'Colaborador'),i.role from public.sl_group_invites i join public.sl_group_documents d on d.id=i.document_id join auth.users u on u.id=i.created_by
 where i.email=lower(coalesce(auth.jwt()->>'email','')) and i.accepted_by is null and i.expires_at>now();
$$;
drop policy if exists sl_invites_read on public.sl_group_invites;
create policy sl_invites_read on public.sl_group_invites for select to authenticated using(created_by=auth.uid() or email=lower(coalesce(auth.jwt()->>'email','')));

create or replace function public.sl_profile_access(p_user_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (p_user_id=auth.uid() or exists(select 1 from public.sl_contacts c where c.status='accepted' and auth.uid() in(c.requester_id,c.recipient_id) and p_user_id in(c.requester_id,c.recipient_id)) or exists(select 1 from public.sl_group_members a join public.sl_group_members b on b.group_id=a.group_id where a.user_id=auth.uid() and b.user_id=p_user_id));
$$;
create or replace function public.sl_person_profile(p_user_id uuid) returns table(display_name text,avatar_path text,theme text,ui_style text)
language sql stable security definer set search_path='' as $$
 select coalesce(nullif(u.raw_user_meta_data->>'display_name',''),'Colaborador'),u.raw_user_meta_data->>'avatar_path',u.raw_user_meta_data->>'theme',u.raw_user_meta_data->>'ui_style' from auth.users u where u.id=p_user_id and public.sl_profile_access(p_user_id);
$$;

create or replace function public.sl_create_group(p_name text) returns public.sl_groups
language plpgsql security definer set search_path='' as $$
declare g public.sl_groups;
begin
  if auth.uid() is null then raise exception 'Login necessário'; end if;
  if (select count(*) from public.sl_groups where owner_id=auth.uid()) >= 30 then raise exception 'Limite de 30 grupos por conta'; end if;
  insert into public.sl_groups(owner_id,name) values(auth.uid(),left(coalesce(nullif(trim(p_name),''),'Minha aula'),140)) returning * into g;
  insert into public.sl_group_members(group_id,user_id) values(g.id,auth.uid()); return g;
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
  insert into public.sl_group_members(group_id,user_id,role) values(d.group_id,auth.uid(),i.role) on conflict do nothing;
  update public.sl_group_invites set accepted_by=auth.uid() where token=p_token; return d;
end; $$;

create or replace function public.sl_invite_with_role(p_document_id uuid,p_email text,p_role text) returns jsonb
language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 if p_role not in ('viewer','commenter','editor') then raise exception 'Permissão inválida';end if;
 result:=public.sl_invite_collaborator(p_document_id,p_email);
 update public.sl_group_invites set role=p_role where token=(result->>'token')::uuid;
 return result;
end;$$;
revoke all on function public.sl_invite_with_role(uuid,text,text) from public,anon;
grant execute on function public.sl_invite_with_role(uuid,text,text) to authenticated;
-- Broadcast writes are restricted separately from presence, which all readers can publish.
create or replace function public.sl_topic_access(p_topic text) returns boolean
language plpgsql stable security definer set search_path='' as $$begin
 if p_topic ~ '^sl-doc-v2:[a-f0-9-]{36}$' then return public.sl_document_access(substring(p_topic from 11)::uuid);end if;
 if p_topic ~ '^sl-typing-doc:[a-f0-9-]{36}$' then return public.sl_document_access(substring(p_topic from 15)::uuid);end if;
 if p_topic ~ '^sl-typing-dm:[a-f0-9-]{36}$' then return public.sl_contact_access(substring(p_topic from 14)::uuid);end if;
 return false;
 exception when invalid_text_representation then return false;
end;$$;
drop policy if exists sl_collab_write on realtime.messages;
create policy sl_collab_write on realtime.messages for insert to authenticated with check(
 public.sl_topic_access((select realtime.topic())) and (
 extension='presence' or (extension='broadcast' and (
 (select realtime.topic()) not like 'sl-doc-v2:%'
 ))));

-- Every document update checks the current role in Postgres. A previously joined
-- channel cannot keep editing after demotion using cached Realtime permissions.
create or replace function public.sl_broadcast_document(p_document_id uuid,p_event text,p_data text default null,p_client uuid default null) returns void
language plpgsql security definer set search_path='' as $$begin
 if coalesce(public.sl_document_role(p_document_id),'') not in ('owner','editor') then raise exception 'Você não pode editar esta aula';end if;
 if p_event='update' and p_data is not null and char_length(p_data) between 1 and 33000 and p_data ~ '^[A-Za-z0-9+/]*={0,2}$' then
   perform realtime.send(jsonb_build_object('data',p_data,'client',p_client),'update','sl-doc-v2:'||p_document_id::text,true);
 elsif p_event='saved' then
   perform realtime.send('{}'::jsonb,'saved','sl-doc-v2:'||p_document_id::text,true);
 else raise exception 'Atualização inválida';end if;
end;$$;
revoke all on function public.sl_broadcast_document(uuid,text,text,uuid) from public,anon;
grant execute on function public.sl_broadcast_document(uuid,text,text,uuid) to authenticated;

-- Enforce write roles even for direct RPC callers using the published API.
create or replace function public.sl_enforce_document_write() returns trigger
language plpgsql security definer set search_path='' as $$begin
 if not public.sl_group_edit_access(new.group_id) then raise exception 'Sua permissão permite apenas leitura ou comentários';end if;
 return new;
end;$$;
drop trigger if exists sl_document_role_guard on public.sl_group_documents;
create trigger sl_document_role_guard before insert or update on public.sl_group_documents for each row execute function public.sl_enforce_document_write();
create or replace function public.sl_enforce_comment() returns trigger
language plpgsql security definer set search_path='' as $$begin
 if public.sl_document_role(new.document_id) not in ('owner','editor','commenter') or public.sl_document_role(new.document_id) is null then raise exception 'Sua permissão permite apenas visualizar';end if;
 return new;
end;$$;
drop trigger if exists sl_comment_role_guard on public.sl_chat_messages;
create trigger sl_comment_role_guard before insert on public.sl_chat_messages for each row execute function public.sl_enforce_comment();

create or replace function public.sl_chat_badge() returns integer language sql stable security definer set search_path='' as $$
 select ((select count(*) from public.sl_my_invites())+(select count(*) from public.sl_contacts where recipient_id=auth.uid() and status='pending')+
 (select count(*) from public.sl_direct_messages m join public.sl_contacts c on c.id=m.contact_id left join public.sl_chat_reads r on r.contact_id=c.id and r.user_id=auth.uid() where c.status='accepted' and auth.uid() in(c.requester_id,c.recipient_id) and m.author_id<>auth.uid() and m.created_at>coalesce(r.last_read,'epoch'::timestamptz)))::integer;
$$;
revoke all on function public.sl_document_role(uuid),public.sl_group_edit_access(uuid),public.sl_set_collaborator_role(uuid,uuid,text),public.sl_collaborators(uuid),public.sl_my_invites(),public.sl_profile_access(uuid),public.sl_person_profile(uuid),public.sl_enforce_document_write(),public.sl_enforce_comment() from public,anon;
grant execute on function public.sl_document_role(uuid),public.sl_group_edit_access(uuid),public.sl_set_collaborator_role(uuid,uuid,text),public.sl_collaborators(uuid),public.sl_my_invites(),public.sl_profile_access(uuid),public.sl_person_profile(uuid) to authenticated;
do $$declare t text;begin foreach t in array array['sl_group_invites','sl_group_members'] loop
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t);end if;
end loop;end$$;
notify pgrst,'reload schema';
commit;


-- Private discovery and controls are visible only to devices logged into the same account.
begin;
create or replace function public.sl_own_presentation_topic(p_topic text) returns boolean
language plpgsql stable security definer set search_path='' as $$begin
 if p_topic !~ '^sl-live:[a-f0-9-]{36}$' then return false;end if;
 return substring(p_topic from 9)::uuid=auth.uid();
 exception when invalid_text_representation then return false;
end;$$;
revoke all on function public.sl_own_presentation_topic(text) from public,anon;
grant execute on function public.sl_own_presentation_topic(text) to authenticated;
drop policy if exists sl_own_presentation_read on realtime.messages;
create policy sl_own_presentation_read on realtime.messages for select to authenticated using(extension in ('presence','broadcast') and public.sl_own_presentation_topic((select realtime.topic())));
drop policy if exists sl_own_presentation_write on realtime.messages;
create policy sl_own_presentation_write on realtime.messages for insert to authenticated with check(extension in ('presence','broadcast') and public.sl_own_presentation_topic((select realtime.topic())));
commit;

-- Voice attachments use R2; the database stores only the small message reference.
begin;
create or replace function public.sl_chat_audio_access(p_scope text,p_id uuid,p_write boolean default false) returns boolean
language sql stable security definer set search_path='' as $$
 select case when p_scope='dm' then exists(select 1 from public.sl_contacts c where c.id=p_id and c.status='accepted' and auth.uid() in(c.requester_id,c.recipient_id))
 when p_scope='doc' then case when p_write then coalesce(public.sl_document_role(p_id) in('owner','editor','commenter'),false) else public.sl_document_access(p_id) end
 else false end;
$$;
revoke all on function public.sl_chat_audio_access(text,uuid,boolean) from public,anon;
grant execute on function public.sl_chat_audio_access(text,uuid,boolean) to authenticated;
commit;
