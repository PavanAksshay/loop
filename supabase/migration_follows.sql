-- =====================================================================
-- WALKBUDDY FOLLOW SYSTEM MIGRATION (WITH ENHANCEMENTS)
-- =====================================================================

create table if not exists public.follows (
  id           uuid primary key default gen_random_uuid(),
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending'
                 check (status in ('pending', 'accepted', 'declined', 'blocked')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  constraint follows_unique_pair unique (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create index if not exists follows_follower_idx  on public.follows (follower_id, status);
create index if not exists follows_following_idx on public.follows (following_id, status);

-- Enable RLS
alter table public.follows enable row level security;

-- RLS Policies
drop policy if exists "follows_select_involved" on public.follows;
create policy "follows_select_involved" on public.follows for select using (auth.uid() in (follower_id, following_id));

drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own" on public.follows for insert with check (auth.uid() = follower_id);

drop policy if exists "follows_update_target" on public.follows;
create policy "follows_update_target" on public.follows for update using (auth.uid() = following_id) with check (auth.uid() = following_id);

drop policy if exists "follows_delete_involved" on public.follows;
create policy "follows_delete_involved" on public.follows for delete using (auth.uid() in (follower_id, following_id));

-- Realtime
alter table public.follows replica identity full;

-- =====================================================================
-- RPCs
-- =====================================================================

create or replace function public.is_following(p_viewer uuid, p_target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.follows
     where follower_id = p_viewer
       and following_id = p_target
       and status = 'accepted'
  );
$$;

create or replace function public.is_mutual_follow(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_following(p_a, p_b) and public.is_following(p_b, p_a);
$$;

create or replace function public.search_users(
  p_query text,
  p_limit integer default 20
)
returns table (
  id              uuid,
  username        text,
  full_name       text,
  avatar_url      text,
  city            text,
  follow_status   text,
  follows_me      boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.city,
    f_out.status as follow_status,
    coalesce(f_in.status = 'accepted', false) as follows_me
  from public.profiles p
  left join public.follows f_out
    on f_out.follower_id = auth.uid() and f_out.following_id = p.id
  left join public.follows f_in
    on f_in.follower_id = p.id and f_in.following_id = auth.uid()
  where p.id <> auth.uid()
    and p.username is not null
    and length(trim(p_query)) >= 2
    and (
      p.username ilike '%' || trim(p_query) || '%'
      or p.full_name ilike '%' || trim(p_query) || '%'
    )
    and coalesce(f_out.status, '') <> 'blocked'
    and coalesce(f_in.status, '') <> 'blocked'
  order by
    (lower(p.username) = lower(trim(p_query))) desc,
    (lower(p.username) like lower(trim(p_query)) || '%') desc,
    p.username asc
  limit least(greatest(p_limit, 1), 50);
$$;

create or replace function public.list_follow_connections(
  p_kind text default 'following'
)
returns table (
  follow_id  uuid,
  id         uuid,
  username   text,
  full_name  text,
  avatar_url text,
  status     text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.id,
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    f.status,
    f.created_at
  from public.follows f
  join public.profiles p
    on p.id = case
                when p_kind in ('followers', 'requests') then f.follower_id
                else f.following_id
              end
  where
    case p_kind
      when 'followers' then f.following_id = auth.uid() and f.status = 'accepted'
      when 'requests'  then f.following_id = auth.uid() and f.status = 'pending'
      when 'sent'      then f.follower_id  = auth.uid() and f.status = 'pending'
      when 'blocked'   then f.follower_id  = auth.uid() and f.status = 'blocked'
      else                  f.follower_id  = auth.uid() and f.status = 'accepted'
    end
  order by f.created_at desc;
$$;

create or replace function public.block_user(p_target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;
  if v_me = p_target_id then
    raise exception 'Cannot block self';
  end if;

  -- Remove reverse follow relationship if any
  delete from public.follows
   where follower_id = p_target_id and following_id = v_me;

  -- Upsert block row where follower_id = v_me and following_id = p_target_id, status = 'blocked'
  insert into public.follows (follower_id, following_id, status, responded_at)
  values (v_me, p_target_id, 'blocked', now())
  on conflict (follower_id, following_id)
  do update set status = 'blocked', responded_at = now();
end;
$$;

create or replace function public.unblock_user(p_target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.follows
   where follower_id = v_me and following_id = p_target_id and status = 'blocked';
end;
$$;

create or replace function public.get_follow_suggestions(
  p_limit integer default 10
)
returns table (
  id                      uuid,
  username                text,
  full_name               text,
  avatar_url              text,
  city                    text,
  mutual_count            bigint,
  mutual_sample_usernames text[]
)
language sql
stable
security definer
set search_path = public
as $$
  with my_following as (
    select following_id
    from public.follows
    where follower_id = auth.uid() and status = 'accepted'
  ),
  candidates as (
    select p.id, p.username, p.full_name, p.avatar_url, p.city
    from public.profiles p
    where p.id <> auth.uid()
      and p.username is not null
      and not exists (
        select 1 from public.follows f
        where (f.follower_id = auth.uid() and f.following_id = p.id and f.status in ('accepted', 'pending', 'blocked'))
           or (f.follower_id = p.id and f.following_id = auth.uid() and f.status = 'blocked')
      )
  ),
  mutuals as (
    select
      c.id as candidate_id,
      count(f2.follower_id) as mutual_count,
      array_agg(p_mut.username) filter (where p_mut.username is not null) as all_mutuals
    from candidates c
    left join public.follows f2
      on f2.following_id = c.id
     and f2.status = 'accepted'
     and f2.follower_id in (select following_id from my_following)
    left join public.profiles p_mut
      on p_mut.id = f2.follower_id
    group by c.id
  )
  select
    c.id,
    c.username,
    c.full_name,
    c.avatar_url,
    c.city,
    coalesce(m.mutual_count, 0) as mutual_count,
    coalesce(m.all_mutuals[1:3], array[]::text[]) as mutual_sample_usernames
  from candidates c
  left join mutuals m on m.candidate_id = c.id
  order by
    coalesce(m.mutual_count, 0) desc,
    (c.city is not null) desc,
    c.username asc
  limit least(greatest(p_limit, 1), 30);
$$;

create or replace function public.bulk_respond_follow_requests(
  p_follow_ids uuid[],
  p_accept boolean
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.follows
  set status = case when p_accept then 'accepted' else 'declined' end,
      responded_at = now()
  where id = any(p_follow_ids)
    and following_id = auth.uid()
    and status = 'pending';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.get_follow_analytics()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_followers bigint;
  v_following bigint;
  v_mutuals bigint;
  v_pending bigint;
  v_growth_week bigint;
  v_growth_month bigint;
  v_history json;
begin
  if v_me is null then
    return json_build_object(
      'followers_count', 0,
      'following_count', 0,
      'mutuals_count', 0,
      'pending_count', 0,
      'growth_week', 0,
      'growth_month', 0,
      'history', '[]'::json
    );
  end if;

  select count(*) into v_followers
  from public.follows
  where following_id = v_me and status = 'accepted';

  select count(*) into v_following
  from public.follows
  where follower_id = v_me and status = 'accepted';

  select count(*) into v_mutuals
  from public.follows f1
  join public.follows f2
    on f1.following_id = f2.follower_id
   and f1.follower_id = f2.following_id
  where f1.follower_id = v_me
    and f1.status = 'accepted'
    and f2.status = 'accepted';

  select count(*) into v_pending
  from public.follows
  where following_id = v_me and status = 'pending';

  select count(*) into v_growth_week
  from public.follows
  where following_id = v_me
    and status = 'accepted'
    and created_at >= (now() - interval '7 days');

  select count(*) into v_growth_month
  from public.follows
  where following_id = v_me
    and status = 'accepted'
    and created_at >= (now() - interval '30 days');

  select json_agg(
    json_build_object(
      'date', to_char(d.day, 'Mon DD'),
      'followers', coalesce(h.cnt, 0)
    )
    order by d.day asc
  ) into v_history
  from (
    select generate_series(
      date_trunc('day', now() - interval '6 days'),
      date_trunc('day', now()),
      interval '1 day'
    ) as day
  ) d
  left join (
    select date_trunc('day', created_at) as day, count(*) as cnt
    from public.follows
    where following_id = v_me and status = 'accepted'
    group by date_trunc('day', created_at)
  ) h on h.day = d.day;

  return json_build_object(
    'followers_count', coalesce(v_followers, 0),
    'following_count', coalesce(v_following, 0),
    'mutuals_count', coalesce(v_mutuals, 0),
    'pending_count', coalesce(v_pending, 0),
    'growth_week', coalesce(v_growth_week, 0),
    'growth_month', coalesce(v_growth_month, 0),
    'history', coalesce(v_history, '[]'::json)
  );
end;
$$;
