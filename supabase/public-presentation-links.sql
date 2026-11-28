-- Índice privado de links públicos por conta e aula. O conteúdo continua no R2.
create table if not exists public.presentation_links (
 user_id uuid not null references auth.users(id) on delete cascade,
 lesson_id text not null check (lesson_id ~ '^[a-zA-Z0-9_-]{1,100}$'),
 token uuid not null,
 code text not null default '' check (code = '' or code ~ '^[A-HJKMNP-Z2-9]{6}$'),
 allow_copy boolean not null default false,
 created_at timestamptz not null default now(),
 primary key (user_id, lesson_id)
);
alter table public.presentation_links enable row level security;
revoke all on public.presentation_links from anon;
grant select, insert, update, delete on public.presentation_links to authenticated;
create policy "presentation_links_own" on public.presentation_links for all to authenticated
 using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
