alter table public.users
  alter column trial_started_at drop default;

alter table public.users
  alter column trial_ends_at drop default;

update public.users
set
  trial_started_at = null,
  trial_ends_at = null
where trial_started_at is not null
   or trial_ends_at is not null;
