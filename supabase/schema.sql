-- Vedant's Bungalow — run in Supabase SQL editor after creating project
-- Extensions
create extension if not exists "pgcrypto";

-- Properties (optional catalog; bookings also store property_id text slug)
create table if not exists public.properties (
  id text primary key,
  name text not null,
  slug text not null unique,
  max_guests int not null default 12,
  base_price_per_night numeric(12,2) not null,
  description text,
  image_url text,
  created_at timestamptz default now()
);

insert into public.properties (id, name, slug, max_guests, base_price_per_night, description, image_url)
values
  ('grand_villa', 'The Grand Villa', 'grand_villa', 12, 12500, 'Pool-side villa for groups', null),
  ('cozy_cottage', 'Cozy Cottage', 'cozy_cottage', 4, 6500, 'Intimate cottage for couples & small families', null)
on conflict (id) do nothing;

create table if not exists public.amenities (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  label text not null,
  icon text
);

create table if not exists public.property_amenities (
  property_id text references public.properties(id) on delete cascade,
  amenity_id uuid references public.amenities(id) on delete cascade,
  primary key (property_id, amenity_id)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references public.properties(id),
  check_in date not null,
  check_out date not null,
  guests int not null default 1,
  guest_name text,
  guest_phone text,
  guest_email text,
  id_proof_note text,
  special_requests text,
  subtotal numeric(12,2),
  extra_guest_fee numeric(12,2) default 0,
  service_fee numeric(12,2) default 0,
  gst numeric(12,2) default 0,
  total_amount numeric(12,2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  razorpay_order_id text,
  razorpay_payment_id text,
  confirmation_code text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_bookings_property_dates on public.bookings (property_id, check_in, check_out);
create index if not exists idx_bookings_status on public.bookings (status);

create table if not exists public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  property_id text not null references public.properties(id) on delete cascade,
  block_date date not null,
  reason text,
  unique (property_id, block_date)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  stay_type text,
  rating int not null check (rating >= 1 and rating <= 5),
  body text not null,
  approved boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  stay_preference text,
  guests int,
  message text,
  created_at timestamptz default now()
);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tr_bookings_updated on public.bookings;
create trigger tr_bookings_updated
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- RLS
alter table public.properties enable row level security;
alter table public.amenities enable row level security;
alter table public.property_amenities enable row level security;
alter table public.bookings enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.reviews enable row level security;
alter table public.inquiries enable row level security;

-- Public read properties & amenities
drop policy if exists "properties_read_all" on public.properties;
create policy "properties_read_all" on public.properties for select using (true);

drop policy if exists "amenities_read_all" on public.amenities;
create policy "amenities_read_all" on public.amenities for select using (true);

drop policy if exists "property_amenities_read" on public.property_amenities;
create policy "property_amenities_read" on public.property_amenities for select using (true);

-- Reviews: approved public; full list for authenticated admin
drop policy if exists "reviews_read_approved" on public.reviews;
drop policy if exists "reviews_select" on public.reviews;
create policy "reviews_select" on public.reviews for select using (approved = true or auth.role() = 'authenticated');

-- Blocked dates: public read
drop policy if exists "blocked_read" on public.blocked_dates;
create policy "blocked_read" on public.blocked_dates for select using (true);

-- Bookings: insert for anon (guest checkout)
drop policy if exists "bookings_insert_anon" on public.bookings;
create policy "bookings_insert_anon" on public.bookings for insert with check (true);

-- Bookings: guests can read their own row by id (uuid in URL)
drop policy if exists "bookings_select_own" on public.bookings;
create policy "bookings_select_own" on public.bookings for select using (true);

-- Bookings: update — restrict in production via service role / edge functions only.
-- For simplicity, allow authenticated users full access; admin uses service role in dashboard.
drop policy if exists "bookings_update_authenticated" on public.bookings;
create policy "bookings_update_authenticated" on public.bookings
  for update using (auth.role() = 'authenticated');

-- Inquiries: insert anon
drop policy if exists "inquiries_insert_anon" on public.inquiries;
create policy "inquiries_insert_anon" on public.inquiries for insert with check (true);

drop policy if exists "inquiries_select_auth" on public.inquiries;
create policy "inquiries_select_auth" on public.inquiries for select using (auth.role() = 'authenticated');

drop policy if exists "reviews_admin_insert" on public.reviews;
create policy "reviews_admin_insert" on public.reviews for insert with check (auth.role() = 'authenticated');

drop policy if exists "reviews_admin_update" on public.reviews;
create policy "reviews_admin_update" on public.reviews for update using (auth.role() = 'authenticated');

drop policy if exists "blocked_admin_write" on public.blocked_dates;
create policy "blocked_admin_write" on public.blocked_dates for all using (auth.role() = 'authenticated');

-- Seed approved reviews (optional)
insert into public.reviews (guest_name, stay_type, rating, body, approved)
select * from (values
  ('Rahul Kulkarni', 'Family Trip · March 2024', 5, 'The pool, rooms and location were excellent.', true),
  ('Sneha Agarwal', 'Couple Stay · February 2024', 5, 'Peaceful, clean and very close to Venna Lake.', true)
) v(guest_name, stay_type, rating, body, approved)
where not exists (select 1 from public.reviews limit 1);
