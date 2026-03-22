insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-assets',
  'profile-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Profile assets upload by owner" on storage.objects;
create policy "Profile assets upload by owner"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Profile assets delete by owner" on storage.objects;
create policy "Profile assets delete by owner"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-assets'
  and auth.uid()::text = (storage.foldername(name))[1]
);
