create table if not exists public.job_images (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs (id) on delete cascade,
  user_id uuid references public.users (id) on delete cascade,
  kind text not null default 'before',
  image_url text,
  storage_path text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.job_images
  add column if not exists image_url text,
  add column if not exists created_at timestamptz not null default timezone('utc'::text, now()),
  add column if not exists user_id uuid references public.users (id) on delete cascade,
  add column if not exists kind text not null default 'before',
  add column if not exists storage_path text;

alter table public.job_images
  alter column created_at set default timezone('utc'::text, now());

alter table public.job_images
  drop constraint if exists job_images_kind_check;

alter table public.job_images
  add constraint job_images_kind_check
  check (kind in ('before', 'after'));

create index if not exists job_images_job_id_kind_created_at_idx
  on public.job_images (job_id, kind, created_at);

create index if not exists job_images_user_id_created_at_idx
  on public.job_images (user_id, created_at desc);

alter table public.job_images enable row level security;

drop policy if exists "Job images select by owner" on public.job_images;
create policy "Job images select by owner"
on public.job_images
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Job images insert by owner" on public.job_images;
create policy "Job images insert by owner"
on public.job_images
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Job images delete by owner" on public.job_images;
create policy "Job images delete by owner"
on public.job_images
for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-images',
  'job-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Job images upload by owner" on storage.objects;
create policy "Job images upload by owner"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'job-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Job images delete from storage by owner" on storage.objects;
create policy "Job images delete from storage by owner"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'job-images'
  and auth.uid()::text = (storage.foldername(name))[1]
);
