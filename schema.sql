-- =====================================================
-- BookingApp — Supabase Schema
-- Chạy file này trong: Supabase Dashboard → SQL Editor → New Query → Run
-- =====================================================

-- Bảng lịch hẹn của khách hàng
create table if not exists bookings (
  id          uuid primary key default gen_random_uuid(),
  date        text not null,          -- "YYYY-MM-DD"
  time        text not null,          -- "HH:MM"
  duration    integer not null default 60,
  category    text not null default '',
  client_name  text not null,
  client_email text not null,
  notes       text default '',
  created_at  timestamptz default now()
);

-- Bảng giờ bị chặn bởi admin
create table if not exists blocked_times (
  id         uuid primary key default gen_random_uuid(),
  date       text not null,
  time       text not null,
  duration   integer not null default 60,
  note       text default '',
  created_at timestamptz default now()
);

-- Row Level Security (cho phép public đọc/ghi — phù hợp với tool cá nhân)
alter table bookings      enable row level security;
alter table blocked_times enable row level security;

create policy "Public access bookings"
  on bookings for all to anon
  using (true) with check (true);

create policy "Public access blocked_times"
  on blocked_times for all to anon
  using (true) with check (true);
