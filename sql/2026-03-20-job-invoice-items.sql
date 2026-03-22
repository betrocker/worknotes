create table if not exists public.job_invoice_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  unit text,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  position integer not null default 1,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists job_invoice_items_job_idx
  on public.job_invoice_items (job_id, position, created_at);

create index if not exists job_invoice_items_user_idx
  on public.job_invoice_items (user_id, created_at desc);

alter table public.job_invoice_items enable row level security;

drop policy if exists "Job invoice items select by owner" on public.job_invoice_items;
create policy "Job invoice items select by owner"
on public.job_invoice_items
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Job invoice items insert by owner" on public.job_invoice_items;
create policy "Job invoice items insert by owner"
on public.job_invoice_items
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Job invoice items update by owner" on public.job_invoice_items;
create policy "Job invoice items update by owner"
on public.job_invoice_items
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Job invoice items delete by owner" on public.job_invoice_items;
create policy "Job invoice items delete by owner"
on public.job_invoice_items
for delete
to authenticated
using (auth.uid() = user_id);
