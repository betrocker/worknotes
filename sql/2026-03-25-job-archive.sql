alter table public.jobs
  add column if not exists archived_at timestamptz;

create index if not exists jobs_user_archived_at_idx
  on public.jobs (user_id, archived_at);
