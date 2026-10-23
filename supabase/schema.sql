-- OnRoute schema (Supabase / PostgreSQL)

create table points (
  id serial primary key,
  number text unique not null
);

create table stops (
  id serial primary key,
  name text not null
);

-- which stops a point visits, in order
create table point_stops (
  point_id int references points(id),
  stop_id int references stops(id),
  stop_order int not null,
  primary key (point_id, stop_id)
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  point_id int not null references points(id),
  stop_id int not null references stops(id),
  created_at timestamptz default now()
);

-- Row Level Security
alter table points enable row level security;
alter table stops enable row level security;
alter table point_stops enable row level security;
alter table profiles enable row level security;

create policy "read points" on points for select using (true);
create policy "read stops" on stops for select using (true);
create policy "read point_stops" on point_stops for select using (true);

create policy "own profile read" on profiles for select using (auth.uid() = id);
create policy "own profile insert" on profiles for insert with check (auth.uid() = id);
create policy "own profile update" on profiles for update using (auth.uid() = id);
