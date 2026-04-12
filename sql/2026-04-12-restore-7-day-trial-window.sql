alter table public.users
  alter column trial_started_at set default timezone('utc', now());

alter table public.users
  alter column trial_ends_at set default (timezone('utc', now()) + interval '7 days');

update public.users
set
  trial_started_at = coalesce(trial_started_at, trial_ends_at - interval '7 days', timezone('utc', now())),
  trial_ends_at =
    coalesce(trial_started_at, trial_ends_at - interval '7 days', timezone('utc', now())) + interval '7 days'
where trial_started_at is null
   or trial_ends_at is null
   or trial_ends_at >
      coalesce(trial_started_at, trial_ends_at - interval '7 days', timezone('utc', now())) + interval '7 days';
