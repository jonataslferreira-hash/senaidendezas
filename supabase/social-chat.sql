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
