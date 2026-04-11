create extension if not exists postgis;

create table if not exists profiles (
  id uuid primary key,
  role text not null check (role in ('customer', 'mechanic')),
  full_name text not null,
  phone text unique,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists mechanic_status (
  profile_id uuid primary key references profiles(id) on delete cascade,
  is_online boolean default false,
  vehicle_type text,
  current_lat double precision,
  current_lng double precision,
  updated_at timestamptz default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  base_price numeric(10,2) default 0,
  created_at timestamptz default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id),
  mechanic_id uuid references profiles(id),
  service_id uuid references services(id),
  issue_note text,
  status text not null default 'requested' check (status in ('requested','accepted','on_the_way','arrived','completed','cancelled')),
  customer_lat double precision not null,
  customer_lng double precision not null,
  customer_address text,
  eta_minutes integer,
  amount numeric(10,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_bookings_customer_id on bookings(customer_id);
create index if not exists idx_bookings_mechanic_id on bookings(mechanic_id);
create index if not exists idx_bookings_status on bookings(status);

insert into services (name, base_price)
values
  ('Puncture Repair', 199),
  ('Battery Jump Start', 299),
  ('Fuel Delivery', 249),
  ('Towing Support', 699),
  ('EV Assistance', 399)
on conflict (name) do nothing;


insert into profiles (id, role, full_name, phone)
values
  ('11111111-1111-1111-1111-111111111111', 'customer', 'Demo Customer', '+910000000001'),
  ('22222222-2222-2222-2222-222222222222', 'mechanic', 'Demo Mechanic', '+910000000002')
on conflict (id) do nothing;

insert into mechanic_status (profile_id, is_online, vehicle_type, current_lat, current_lng)
values ('22222222-2222-2222-2222-222222222222', true, 'Bike', 13.0827, 80.2707)
on conflict (profile_id) do update set
  is_online = excluded.is_online,
  vehicle_type = excluded.vehicle_type,
  current_lat = excluded.current_lat,
  current_lng = excluded.current_lng,
  updated_at = now();
