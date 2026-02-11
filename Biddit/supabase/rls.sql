-- Enable RLS
alter table public.profiles enable row level security;
alter table public.provider_profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.job_photos enable row level security;
alter table public.bids enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.job_completions enable row level security;
alter table public.provider_documents enable row level security;

-- Helpers
create or replace function public.is_admin()
returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.is_approved_provider()
returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.provider_profiles pp
    where pp.user_id = auth.uid()
      and pp.verification_status = 'approved'
  );
$$;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- provider_profiles
drop policy if exists "provider_profiles_select_approved" on public.provider_profiles;
create policy "provider_profiles_select_approved"
on public.provider_profiles for select
using (verification_status = 'approved' or user_id = auth.uid() or public.is_admin());

drop policy if exists "provider_profiles_insert_own" on public.provider_profiles;
create policy "provider_profiles_insert_own"
on public.provider_profiles for insert
with check (user_id = auth.uid());

drop policy if exists "provider_profiles_update_own" on public.provider_profiles;
create policy "provider_profiles_update_own"
on public.provider_profiles for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

-- jobs
drop policy if exists "jobs_select_open_or_participant" on public.jobs;
create policy "jobs_select_open_or_participant"
on public.jobs for select
using (
  status = 'open'
  or customer_id = auth.uid()
  or awarded_provider_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "jobs_insert_customer" on public.jobs;
create policy "jobs_insert_customer"
on public.jobs for insert
with check (customer_id = auth.uid());

drop policy if exists "jobs_update_owner_or_admin" on public.jobs;
create policy "jobs_update_owner_or_admin"
on public.jobs for update
using (customer_id = auth.uid() or public.is_admin())
with check (customer_id = auth.uid() or public.is_admin());

-- job_photos
drop policy if exists "job_photos_select_public" on public.job_photos;
create policy "job_photos_select_public"
on public.job_photos for select
using (true);

drop policy if exists "job_photos_insert_owner" on public.job_photos;
create policy "job_photos_insert_owner"
on public.job_photos for insert
with check (
  exists(select 1 from public.jobs j where j.id = job_photos.job_id and j.customer_id = auth.uid())
);

drop policy if exists "job_photos_delete_owner" on public.job_photos;
create policy "job_photos_delete_owner"
on public.job_photos for delete
using (
  exists(select 1 from public.jobs j where j.id = job_photos.job_id and j.customer_id = auth.uid())
);

-- bids
drop policy if exists "bids_select_owner_or_provider" on public.bids;
create policy "bids_select_owner_or_provider"
on public.bids for select
using (
  provider_id = auth.uid()
  or exists (select 1 from public.jobs j where j.id = bids.job_id and j.customer_id = auth.uid())
  or public.is_admin()
);

drop policy if exists "bids_insert_approved_provider" on public.bids;
create policy "bids_insert_approved_provider"
on public.bids for insert
with check (provider_id = auth.uid() and public.is_approved_provider());

drop policy if exists "bids_update_own" on public.bids;
create policy "bids_update_own"
on public.bids for update
using (provider_id = auth.uid() or public.is_admin())
with check (provider_id = auth.uid() or public.is_admin());

-- conversations
drop policy if exists "conversations_select_participants" on public.conversations;
create policy "conversations_select_participants"
on public.conversations for select
using (
  customer_id = auth.uid()
  or provider_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "conversations_insert_participants" on public.conversations;
create policy "conversations_insert_participants"
on public.conversations for insert
with check (
  (customer_id = auth.uid() or provider_id = auth.uid())
  and ((provider_id <> auth.uid()) or public.is_approved_provider())
);

-- messages
drop policy if exists "messages_select_participants" on public.messages;
create policy "messages_select_participants"
on public.messages for select
using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (c.customer_id = auth.uid() or c.provider_id = auth.uid())
  )
  or public.is_admin()
);

drop policy if exists "messages_insert_sender_in_conversation" on public.messages;
create policy "messages_insert_sender_in_conversation"
on public.messages for insert
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (c.customer_id = auth.uid() or c.provider_id = auth.uid())
  )
);

-- reviews
drop policy if exists "reviews_select_public" on public.reviews;
create policy "reviews_select_public"
on public.reviews for select
using (true);

drop policy if exists "reviews_insert_participants_completed" on public.reviews;
create policy "reviews_insert_participants_completed"
on public.reviews for insert
with check (
  reviewer_id = auth.uid()
  and exists (
    select 1 from public.jobs j
    where j.id = reviews.job_id
      and j.status = 'completed'
      and (j.customer_id = auth.uid() or j.awarded_provider_id = auth.uid())
  )
);

-- job_completions
drop policy if exists "job_completions_select_public" on public.job_completions;
create policy "job_completions_select_public"
on public.job_completions for select
using (true);

drop policy if exists "job_completions_insert_owner_or_admin" on public.job_completions;
create policy "job_completions_insert_owner_or_admin"
on public.job_completions for insert
with check (
  public.is_admin()
  or exists (select 1 from public.jobs j where j.id = job_completions.job_id and j.customer_id = auth.uid())
);

drop policy if exists "job_completions_upsert_owner_or_admin" on public.job_completions;
create policy "job_completions_upsert_owner_or_admin"
on public.job_completions for update
using (
  public.is_admin()
  or exists (select 1 from public.jobs j where j.id = job_completions.job_id and j.customer_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.jobs j where j.id = job_completions.job_id and j.customer_id = auth.uid())
);

-- provider_documents
drop policy if exists "provider_documents_select_own_or_admin" on public.provider_documents;
create policy "provider_documents_select_own_or_admin"
on public.provider_documents for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "provider_documents_insert_own" on public.provider_documents;
create policy "provider_documents_insert_own"
on public.provider_documents for insert
with check (user_id = auth.uid());

drop policy if exists "provider_documents_delete_own_or_admin" on public.provider_documents;
create policy "provider_documents_delete_own_or_admin"
on public.provider_documents for delete
using (user_id = auth.uid() or public.is_admin());
