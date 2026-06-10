-- Offline/cloud sync update policies.
-- Soft deletes are stored as updates to deleted_at, so every synced table
-- needs an owner-scoped update policy.

drop policy if exists "Offline sync clients update by owner" on public.clients;
create policy "Offline sync clients update by owner"
on public.clients
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Offline sync jobs update by owner" on public.jobs;
create policy "Offline sync jobs update by owner"
on public.jobs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Offline sync payments update by owner" on public.payments;
create policy "Offline sync payments update by owner"
on public.payments
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Offline sync expenses update by owner" on public.expenses;
create policy "Offline sync expenses update by owner"
on public.expenses
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Offline sync job invoice items update by owner" on public.job_invoice_items;
create policy "Offline sync job invoice items update by owner"
on public.job_invoice_items
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Offline sync job images update by owner" on public.job_images;
create policy "Offline sync job images update by owner"
on public.job_images
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Offline sync invoices update by owner" on public.invoices;
create policy "Offline sync invoices update by owner"
on public.invoices
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
