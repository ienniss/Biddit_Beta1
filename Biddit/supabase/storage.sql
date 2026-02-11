-- Storage policies (run after creating buckets in Supabase UI)
-- Buckets:
--   provider-docs (private)
--   job-photos (public for MVP)

-- Provider docs: users can access only their own folder (userId/*), admins can access all
drop policy if exists "provider_docs_read_own" on storage.objects;
create policy "provider_docs_read_own"
on storage.objects for select
using (
  bucket_id = 'provider-docs'
  and (
    (auth.uid()::text = (string_to_array(name, '/'))[1])
    or public.is_admin()
  )
);

drop policy if exists "provider_docs_insert_own" on storage.objects;
create policy "provider_docs_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'provider-docs'
  and auth.uid()::text = (string_to_array(name, '/'))[1]
);

drop policy if exists "provider_docs_delete_own" on storage.objects;
create policy "provider_docs_delete_own"
on storage.objects for delete
using (
  bucket_id = 'provider-docs'
  and (
    auth.uid()::text = (string_to_array(name, '/'))[1]
    or public.is_admin()
  )
);

-- Job photos: keep simple for MVP (authenticated can upload; you can tighten later)
drop policy if exists "job_photos_insert_authenticated" on storage.objects;
create policy "job_photos_insert_authenticated"
on storage.objects for insert
with check (bucket_id = 'job-photos' and auth.role() = 'authenticated');

drop policy if exists "job_photos_delete_authenticated" on storage.objects;
create policy "job_photos_delete_authenticated"
on storage.objects for delete
using (bucket_id = 'job-photos' and auth.role() = 'authenticated');
