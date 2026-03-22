create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete cascade,
  invoice_number text not null,
  sequence_number integer not null,
  year integer not null,
  issued_at date not null default current_date,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.invoices
  add column if not exists user_id uuid references public.users (id) on delete cascade,
  add column if not exists job_id uuid references public.jobs (id) on delete cascade,
  add column if not exists invoice_number text,
  add column if not exists sequence_number integer,
  add column if not exists year integer,
  add column if not exists issued_at date not null default current_date,
  add column if not exists created_at timestamptz not null default timezone('utc'::text, now());

alter table public.invoices
  alter column invoice_number set not null,
  alter column sequence_number set not null,
  alter column year set not null;

create unique index if not exists invoices_user_job_unique_idx
  on public.invoices (user_id, job_id);

create unique index if not exists invoices_user_year_sequence_unique_idx
  on public.invoices (user_id, year, sequence_number);

create unique index if not exists invoices_user_invoice_number_unique_idx
  on public.invoices (user_id, invoice_number);

create index if not exists invoices_user_issued_at_idx
  on public.invoices (user_id, issued_at desc);

alter table public.invoices enable row level security;

drop policy if exists "Invoices select by owner" on public.invoices;
create policy "Invoices select by owner"
on public.invoices
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Invoices insert by owner" on public.invoices;
create policy "Invoices insert by owner"
on public.invoices
for insert
to authenticated
with check (auth.uid() = user_id);
