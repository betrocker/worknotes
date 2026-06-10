-- Offline/cloud sync foundation.
-- Adds server-side metadata needed for local-first sync and soft deletes.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_payment_user_id_from_job()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is null and new.job_id is not null then
    select user_id into new.user_id
    from public.jobs
    where id = new.job_id;
  end if;
  return new;
end;
$$;

create or replace function public.set_expense_user_id_from_job()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is null and new.job_id is not null then
    select user_id into new.user_id
    from public.jobs
    where id = new.job_id;
  end if;
  return new;
end;
$$;

alter table public.clients
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

alter table public.jobs
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

alter table public.payments
  add column if not exists user_id uuid references public.users (id) on delete cascade,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

alter table public.expenses
  add column if not exists user_id uuid references public.users (id) on delete cascade,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

alter table public.job_images
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz,
  add column if not exists local_uri text,
  add column if not exists upload_status text not null default 'synced';

alter table public.job_invoice_items
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

alter table public.invoices
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

update public.payments
set user_id = jobs.user_id
from public.jobs
where payments.job_id = jobs.id
  and payments.user_id is null;

update public.expenses
set user_id = jobs.user_id
from public.jobs
where expenses.job_id = jobs.id
  and expenses.user_id is null;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

drop trigger if exists payments_set_user_id_from_job on public.payments;
create trigger payments_set_user_id_from_job
before insert or update of job_id, user_id on public.payments
for each row execute function public.set_payment_user_id_from_job();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

drop trigger if exists expenses_set_user_id_from_job on public.expenses;
create trigger expenses_set_user_id_from_job
before insert or update of job_id, user_id on public.expenses
for each row execute function public.set_expense_user_id_from_job();

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

drop trigger if exists job_images_set_updated_at on public.job_images;
create trigger job_images_set_updated_at
before update on public.job_images
for each row execute function public.set_updated_at();

drop trigger if exists job_invoice_items_set_updated_at on public.job_invoice_items;
create trigger job_invoice_items_set_updated_at
before update on public.job_invoice_items
for each row execute function public.set_updated_at();

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create index if not exists clients_user_updated_at_idx
  on public.clients (user_id, updated_at desc);

create index if not exists clients_user_deleted_at_idx
  on public.clients (user_id, deleted_at);

create index if not exists jobs_user_updated_at_idx
  on public.jobs (user_id, updated_at desc);

create index if not exists jobs_user_deleted_at_idx
  on public.jobs (user_id, deleted_at);

create index if not exists payments_user_updated_at_idx
  on public.payments (user_id, updated_at desc);

create index if not exists payments_user_deleted_at_idx
  on public.payments (user_id, deleted_at);

create index if not exists expenses_user_updated_at_idx
  on public.expenses (user_id, updated_at desc);

create index if not exists expenses_user_deleted_at_idx
  on public.expenses (user_id, deleted_at);

create index if not exists job_images_user_updated_at_idx
  on public.job_images (user_id, updated_at desc);

create index if not exists job_images_user_deleted_at_idx
  on public.job_images (user_id, deleted_at);

create index if not exists job_invoice_items_user_updated_at_idx
  on public.job_invoice_items (user_id, updated_at desc);

create index if not exists job_invoice_items_user_deleted_at_idx
  on public.job_invoice_items (user_id, deleted_at);

create index if not exists invoices_user_updated_at_idx
  on public.invoices (user_id, updated_at desc);

create index if not exists invoices_user_deleted_at_idx
  on public.invoices (user_id, deleted_at);
