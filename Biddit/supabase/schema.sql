-- Biddit core schema (MVP)

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'customer' check (role in ('customer','provider','admin'))
);

-- Providers
create table if not exists public.provider_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  business_name text,
  phone text,
  website text,
  categories text[] default '{}',
  service_radius_miles int default 15,
  verification_status text not null default 'pending' check (verification_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- Jobs
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null,
  description text not null,
  city text not null,
  zip text not null,
  county text not null,
  state text not null default 'NC',
  status text not null default 'open' check (status in ('open','awarded','completed','cancelled')),
  awarded_provider_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Job photos (storage paths)
create table if not exists public.job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- Bids
create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  provider_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents bigint not null,
  message text,
  eta_days int,
  status text not null default 'active' check (status in ('active','withdrawn')),
  created_at timestamptz not null default now()
);

-- Conversations
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  provider_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (job_id, provider_id)
);

-- Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- Reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating >= 1 and rating <= 5),
  body text,
  created_at timestamptz not null default now()
);

-- Completions (pricing data)
create table if not exists public.job_completions (
  job_id uuid primary key references public.jobs(id) on delete cascade,
  final_price_cents bigint not null,
  category_snapshot text not null,
  zip_snapshot text not null,
  county_snapshot text not null,
  created_at timestamptz not null default now()
);

-- Provider documents metadata
create table if not exists public.provider_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'other' check (kind in ('license','insurance','id','other')),
  storage_bucket text not null default 'provider-docs',
  storage_path text not null,
  original_filename text,
  created_at timestamptz not null default now()
);

create index if not exists provider_documents_user_id_idx on public.provider_documents(user_id);

-- Auto-create profiles on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''), 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Pricing aggregate view
create or replace view public.pricing_zip_stats as
select
  category_snapshot as category,
  zip_snapshot as zip,
  count(*)::int as sample_count,
  (percentile_cont(0.5) within group (order by final_price_cents))::bigint as median_cents
from public.job_completions
group by category_snapshot, zip_snapshot;
