-- Run after setup-chat.sql / workspace-upgrade.sql. Editors and the owner of a
-- shared document may discover and control presentations of that document.
-- Viewers/commenters do not gain presentation-control permissions.
begin;
create or replace function public.sl_shared_remote_topic(p_topic text) returns boolean
language plpgsql stable security definer set search_path='' as $$
begin
 if p_topic !~ '^sl-live-doc:[a-f0-9-]{36}$' then return false; end if;
 return coalesce(public.sl_document_role(substring(p_topic from 13)::uuid) in ('owner','editor'),false);
 exception when invalid_text_representation then return false;
end;$$;
revoke all on function public.sl_shared_remote_topic(text) from public,anon;
grant execute on function public.sl_shared_remote_topic(text) to authenticated;
drop policy if exists sl_shared_remote_read on realtime.messages;
create policy sl_shared_remote_read on realtime.messages for select to authenticated using(extension='broadcast' and public.sl_shared_remote_topic((select realtime.topic())));
drop policy if exists sl_shared_remote_write on realtime.messages;
create policy sl_shared_remote_write on realtime.messages for insert to authenticated with check(extension='broadcast' and public.sl_shared_remote_topic((select realtime.topic())));
commit;
