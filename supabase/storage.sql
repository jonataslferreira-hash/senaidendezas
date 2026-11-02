-- Execute once in the Supabase SQL Editor as this project's administrator.
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('storage-lab-lessons', 'storage-lab-lessons', false, 52428800, array['application/json', 'application/gzip'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.lesson_files (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (id ~ '^[a-zA-Z0-9_-]{1,100}$'),
  title text not null check (char_length(title) <= 140),
  path text not null,
  bytes bigint not null check (bytes >= 0 and bytes <= 52428800),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.lesson_files drop constraint if exists lesson_files_check;
alter table public.lesson_files drop constraint if exists lesson_files_path_check;
alter table public.lesson_files add constraint lesson_files_path_check check (path in (user_id::text || '/lessons/' || id || '.json', user_id::text || '/lessons/' || id || '.json.gz'));
alter table public.lesson_files enable row level security;
grant select, insert, update, delete on public.lesson_files to authenticated;
revoke all on public.lesson_files from anon;
drop policy if exists "storage_lab_own_lesson_index" on public.lesson_files;
create policy "storage_lab_own_lesson_index" on public.lesson_files for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "storage_lab_own_files_read" on storage.objects;
create policy "storage_lab_own_files_read" on storage.objects for select to authenticated
  using (bucket_id = 'storage-lab-lessons' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "storage_lab_own_files_insert" on storage.objects;
create policy "storage_lab_own_files_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'storage-lab-lessons' and (storage.foldername(name))[1] = (select auth.uid()::text)
    and (storage.foldername(name))[2] = 'lessons' and storage.extension(name) in ('json', 'gz'));
drop policy if exists "storage_lab_own_files_update" on storage.objects;
create policy "storage_lab_own_files_update" on storage.objects for update to authenticated
  using (bucket_id = 'storage-lab-lessons' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'storage-lab-lessons' and (storage.foldername(name))[1] = (select auth.uid()::text)
    and (storage.foldername(name))[2] = 'lessons' and storage.extension(name) in ('json', 'gz'));
drop policy if exists "storage_lab_own_files_delete" on storage.objects;
create policy "storage_lab_own_files_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'storage-lab-lessons' and (storage.foldername(name))[1] = (select auth.uid()::text));
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('storage-lab-avatars', 'storage-lab-avatars', false, 262144, array['image/webp', 'image/png', 'image/jpeg','image/gif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "storage_lab_own_avatar" on storage.objects;
create policy "storage_lab_own_avatar" on storage.objects for all to authenticated
  using (bucket_id = 'storage-lab-avatars' and name = (select auth.uid()::text) || '/avatar.webp')
  with check (bucket_id = 'storage-lab-avatars' and name = (select auth.uid()::text) || '/avatar.webp');
commit;
