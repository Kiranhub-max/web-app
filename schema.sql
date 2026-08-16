-- ============================================================
-- Daily Progress Tracker — Supabase Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. CATEGORIES
-- Predefined categories are seeded with user_id = NULL (global).
-- Custom categories a user creates later have their own user_id.
-- ------------------------------------------------------------
create table categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  name        text not null,
  icon        text,                      -- e.g. an emoji: '📚'
  created_at  timestamptz not null default now()
);

insert into categories (user_id, name, icon) values
  (null, 'Learning', '📚'),
  (null, 'Health', '🏃'),
  (null, 'Personal', '🧠');

-- ------------------------------------------------------------
-- 2. TASKS
-- The recurring activity definition (spec section 4.1)
-- ------------------------------------------------------------
create type task_frequency as enum ('daily', 'weekdays', 'custom');
create type task_status as enum ('active', 'archived');

create table tasks (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  category_id    uuid references categories(id) on delete set null,
  name           text not null,
  description    text,
  resource_url   text,
  frequency      task_frequency not null default 'daily',
  reminder_time  time,
  status         task_status not null default 'active',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_tasks_user_id on tasks(user_id);
create index idx_tasks_status on tasks(user_id, status);

-- ------------------------------------------------------------
-- 3. COMPLETIONS
-- Daily completion history (spec section 4.2)
-- One row per task per calendar date.
-- ------------------------------------------------------------
create table completions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  task_id       uuid not null references tasks(id) on delete cascade,
  date          date not null,
  completed     boolean not null default false,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (task_id, date)
);

create index idx_completions_user_date on completions(user_id, date);
create index idx_completions_task on completions(task_id);

-- ------------------------------------------------------------
-- 4. DAILY NOTES (spec section 19 — optional reflection journal)
-- ------------------------------------------------------------
create table daily_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  learned     text,
  reflection  text,
  created_at  timestamptz not null default now(),
  unique (user_id, date)
);

-- ------------------------------------------------------------
-- 5. updated_at auto-touch trigger for tasks
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_tasks_updated_at
before update on tasks
for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- Every table is scoped to auth.uid() = user_id.
-- Categories: users can read global (user_id is null) + their own,
-- but only write their own.
-- ============================================================

alter table categories enable row level security;
alter table tasks enable row level security;
alter table completions enable row level security;
alter table daily_notes enable row level security;

-- Categories
create policy "Read global or own categories"
  on categories for select
  using (user_id is null or user_id = auth.uid());

create policy "Insert own categories"
  on categories for insert
  with check (user_id = auth.uid());

create policy "Update own categories"
  on categories for update
  using (user_id = auth.uid());

create policy "Delete own categories"
  on categories for delete
  using (user_id = auth.uid());

-- Tasks
create policy "Manage own tasks"
  on tasks for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Completions
create policy "Manage own completions"
  on completions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Daily notes
create policy "Manage own daily notes"
  on daily_notes for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- HELPER VIEWS (used by Progress / History pages)
-- ============================================================

-- Daily completion % across ALL active tasks, per user per date
create view daily_progress as
select
  c.user_id,
  c.date,
  count(*) filter (where c.completed) as completed_count,
  count(*) as total_count,
  round(
    100.0 * count(*) filter (where c.completed) / nullif(count(*), 0), 1
  ) as completion_pct
from completions c
join tasks t on t.id = c.task_id
group by c.user_id, c.date;

-- Per-task completion % (spec section 14: Days Completed / Days Expected)
create view task_performance as
select
  t.id as task_id,
  t.user_id,
  t.name,
  count(c.*) filter (where c.completed) as days_completed,
  count(c.*) as days_expected,
  round(
    100.0 * count(c.*) filter (where c.completed) / nullif(count(c.*), 0), 1
  ) as completion_pct
from tasks t
left join completions c on c.task_id = t.id
group by t.id, t.user_id, t.name;

-- Per-category performance (spec section 15)
create view category_performance as
select
  cat.id as category_id,
  cat.name,
  cat.icon,
  t.user_id,
  round(avg(tp.completion_pct), 1) as completion_pct
from categories cat
join tasks t on t.category_id = cat.id
join task_performance tp on tp.task_id = t.id
group by cat.id, cat.name, cat.icon, t.user_id;

-- ============================================================
-- NOTES
-- - Streaks (current/best, overall + per-task) are best computed
--   client-side or in a Postgres function using window functions
--   over `completions`, since they need consecutive-day logic.
--   Happy to write that function next if useful.
-- - "Archiving" a task (spec section 10) = set tasks.status =
--   'archived'; never delete, so completions/history stay intact.
-- ============================================================
