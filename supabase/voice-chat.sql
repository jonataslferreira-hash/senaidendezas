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
