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
