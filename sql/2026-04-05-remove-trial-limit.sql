update public.users
set trial_ends_at = timezone('utc', now() + interval '100 years')
where trial_ends_at is not null;