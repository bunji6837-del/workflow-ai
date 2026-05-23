-- WorkFlow AI schema
-- Supabase SQL Editor에서 전체 실행하세요.

create extension if not exists "pgcrypto";

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  status text not null default '진행중',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  assignee_name text,
  assignee_user_id uuid references auth.users(id) on delete set null,
  due_date date,
  status text not null default '대기',
  priority text not null default '보통',
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  source_row jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  body text not null,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_projects_updated_at on public.projects;
create trigger trg_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.messages enable row level security;

drop policy if exists "workspace select for members" on public.workspaces;
create policy "workspace select for members"
on public.workspaces
for select
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
  )
);

drop policy if exists "workspace insert by owner" on public.workspaces;
create policy "workspace insert by owner"
on public.workspaces
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "members select own workspace" on public.workspace_members;
create policy "members select own workspace"
on public.workspace_members
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
  )
);

drop policy if exists "projects select for workspace members" on public.projects;
create policy "projects select for workspace members"
on public.projects
for select
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = projects.workspace_id
      and wm.user_id = auth.uid()
  )
);

drop policy if exists "projects write for workspace members" on public.projects;
create policy "projects write for workspace members"
on public.projects
for all
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = projects.workspace_id
      and wm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = projects.workspace_id
      and wm.user_id = auth.uid()
  )
);

drop policy if exists "tasks select for workspace members" on public.tasks;
create policy "tasks select for workspace members"
on public.tasks
for select
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = tasks.workspace_id
      and wm.user_id = auth.uid()
  )
);

drop policy if exists "tasks write for workspace members" on public.tasks;
create policy "tasks write for workspace members"
on public.tasks
for all
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = tasks.workspace_id
      and wm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = tasks.workspace_id
      and wm.user_id = auth.uid()
  )
);

drop policy if exists "messages select for workspace members" on public.messages;
create policy "messages select for workspace members"
on public.messages
for select
to authenticated
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = messages.workspace_id
      and wm.user_id = auth.uid()
  )
);

drop policy if exists "messages insert for workspace members" on public.messages;
create policy "messages insert for workspace members"
on public.messages
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = messages.workspace_id
      and wm.user_id = auth.uid()
  )
);

-- Realtime 활성화
-- 이미 추가되어 있으면 중복 에러가 날 수 있습니다. 그 경우 해당 줄은 넘어가면 됩니다.
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.messages;
