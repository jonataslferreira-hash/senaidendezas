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
