alter table public.jobs
  add column if not exists pending_reason text;
