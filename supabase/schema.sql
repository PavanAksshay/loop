-- =====================================================================
--  LOOP FITNESS & WALKBUDDY — MASTER PRODUCTION SCHEMA (FROM SCRATCH)
--  
--  Run this complete SQL script in the Supabase SQL Editor.
--  Safely resets existing tables and creates the fresh production schema.
-- =====================================================================

-- 0. Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================================
-- CLEANUP / RESET (FOR A FRESH RUN FROM SCRATCH)
-- =====================================================================
drop view if exists public.trail_rating_summary cascade;
drop table if exists public.post_reactions cascade;
drop table if exists public.posts cascade;
drop table if exists public.trail_ratings cascade;
drop table if exists public.follows cascade;
drop table if exists public.matches cascade;
drop table if exists public.match_requests cascade;
drop table if exists public.profile_preferences cascade;
drop table if exists public.safety_settings cascade;
drop table if exists public.profiles cascade;

-- =====================================================================
-- 1. PROFILES & USER SETTINGS
-- =====================================================================

create table public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  email                text,
  full_name            text,
  username             text,
  age                  integer check (age is null or (age >= 13 and age <= 120)),
  gender               text,
  phone                text,
  country_code         text,
  phone_number         text,
  avatar_url           text,
  bio                  text,
  weight_kg            numeric(5, 2),
  daily_steps_goal     integer default 10000,
  city                 text,
  onboarding_completed boolean not null default false,
  terms_accepted       boolean not null default false,
  terms_accepted_at    timestamptz,
  marketing_opt_in     boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint profiles_username_format_chk
    check (
      username is null or (
        length(trim(username)) between 3 and 20
        and username !~ '^_' 
        and username ~ '^[A-Za-z0-9_]+$'
      )
    ),
  constraint profiles_phone_number_digits_chk
    check (
      phone_number is null or phone_number ~ '^\d{7,15}$'
    )
);

create unique index profiles_username_lower_idx
  on public.profiles (lower(username))
  where username is not null;

create unique index profiles_phone_number_idx
  on public.profiles (phone_number)
  where phone_number is not null;

create table public.profile_preferences (
  profile_id               uuid primary key references public.profiles (id) on delete cascade,
  preferred_activities     text[]  not null default '{}',
  experience_level         text,
  preferred_times          text[]  not null default '{}',
  weekly_goal_km           numeric(6, 2),
  daily_steps_goal         integer,
  typical_pace             text,
  terrain_preferences      text[]  not null default '{}',
  group_size_preference    integer,
  buddy_gender_preference  text,
  audio_preference         text,
  motivations              text[]  not null default '{}',
  max_buddy_distance_km    numeric(5, 2) default 5,
  ai_coach_opt_in          boolean not null default true,
  push_notifications       boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create table public.safety_settings (
  profile_id              uuid primary key references public.profiles (id) on delete cascade,
  share_live_location     boolean not null default true,
  daylight_hours_only     boolean not null default false,
  verified_buddies_only   boolean not null default true,
  women_only_matching     boolean not null default false,
  profile_visibility      text    not null default 'Buddies only',
  share_route_history     boolean not null default false,
  auto_checkin_minutes    integer default 30,
  sos_shortcut_enabled    boolean not null default true,
  emergency_contact_name  text,
  emergency_contact_phone text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- =====================================================================
-- 2. TRAIL RATINGS & FEED
-- =====================================================================

create table public.trail_ratings (
  id         uuid primary key default gen_random_uuid(),
  route_id   text not null,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trail_ratings_unique_per_user unique (route_id, profile_id)
);

create index trail_ratings_route_id_idx on public.trail_ratings (route_id);

create or replace view public.trail_rating_summary as
  select
    route_id,
    round(avg(rating)::numeric, 2) as average_rating,
    count(*)                       as rating_count
  from public.trail_ratings
  group by route_id;

-- =====================================================================
-- 3. COMMUNITY POSTS & REACTIONS
-- =====================================================================

do $$ begin
  create type post_visibility as enum ('PUBLIC', 'PRIVATE');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type post_status as enum ('ACTIVE', 'COMPLETED', 'CANCELLED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type post_reaction as enum ('INTERESTED', 'NOT_INTERESTED');
exception when duplicate_object then null;
end $$;

create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  creator_id   uuid not null references public.profiles(id) on delete cascade,
  trail_id     uuid not null,
  title        text not null,
  description  text default '',
  scheduled_at timestamptz not null,
  visibility   post_visibility not null default 'PUBLIC',
  status       post_status not null default 'ACTIVE',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.post_reactions (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  reaction   post_reaction not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

-- =====================================================================
-- 4. SOCIAL FOLLOW GRAPH
-- =====================================================================

create table public.follows (
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

create index follows_follower_idx  on public.follows (follower_id, status);
create index follows_following_idx on public.follows (following_id, status);

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
      else                  f.follower_id  = auth.uid() and f.status = 'accepted'
    end
  order by f.created_at desc;
$$;

-- =====================================================================
-- 5. BUDDY MATCHING & PROXIMITY
-- =====================================================================

create table public.matches (
  id          uuid primary key default gen_random_uuid(),
  user_a      uuid not null references public.profiles (id) on delete cascade,
  user_b      uuid not null references public.profiles (id) on delete cascade,
  category    text not null default 'Walking'
                check (category in ('Walking', 'Jogging', 'Sprinting')),
  meet_lat    double precision not null,
  meet_lng    double precision not null,
  apart_km    double precision,
  status      text not null default 'active'
                check (status in ('active', 'completed', 'cancelled')),
  created_at  timestamptz not null default now(),
  constraint matches_distinct_users check (user_a <> user_b)
);

create index matches_user_a_idx on public.matches (user_a);
create index matches_user_b_idx on public.matches (user_b);

create table public.match_requests (
  profile_id  uuid primary key references public.profiles (id) on delete cascade,
  lat         double precision not null,
  lng         double precision not null,
  category    text not null default 'Walking'
                check (category in ('Walking', 'Jogging', 'Sprinting')),
  radius_km   double precision not null default 3 check (radius_km between 0.1 and 50),
  status      text not null default 'waiting'
                check (status in ('waiting', 'matched', 'cancelled')),
  match_id    uuid references public.matches (id) on delete set null,
  user_name   text,
  user_avatar text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '30 minutes'
);

create index match_requests_waiting_idx on public.match_requests (status, expires_at);
create index match_requests_lat_lng_idx on public.match_requests (lat, lng);

create or replace function public.haversine_km(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql
immutable
as $$
  select 2 * 6371 * asin(
    sqrt(
      sin(radians(lat2 - lat1) / 2) ^ 2 +
      cos(radians(lat1)) * cos(radians(lat2)) *
      sin(radians(lng2 - lng1) / 2) ^ 2
    )
  );
$$;

create or replace function public.find_or_create_match(
  p_lat       double precision,
  p_lng       double precision,
  p_category  text default 'Walking',
  p_radius_km double precision default 3,
  p_name      text default null,
  p_avatar    text default null
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  me        uuid := auth.uid();
  candidate public.match_requests;
  new_match public.matches;
  gap_km    double precision;
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  insert into public.match_requests as mr
    (profile_id, lat, lng, category, radius_km, status, match_id,
     user_name, user_avatar, created_at, expires_at)
  values
    (me, p_lat, p_lng, p_category, p_radius_km, 'waiting', null,
     p_name, p_avatar, now(), now() + interval '30 minutes')
  on conflict (profile_id) do update set
    lat = excluded.lat,
    lng = excluded.lng,
    category = excluded.category,
    radius_km = excluded.radius_km,
    status = 'waiting',
    match_id = null,
    user_name = coalesce(excluded.user_name, mr.user_name),
    user_avatar = coalesce(excluded.user_avatar, mr.user_avatar),
    created_at = now(),
    expires_at = now() + interval '30 minutes';

  select *
    into candidate
  from public.match_requests r
  where r.profile_id <> me
    and r.status = 'waiting'
    and r.expires_at > now()
    and r.category = p_category
    and public.haversine_km(p_lat, p_lng, r.lat, r.lng) <= least(p_radius_km, r.radius_km)
  order by public.haversine_km(p_lat, p_lng, r.lat, r.lng) asc
  limit 1
  for update skip locked;

  if candidate.profile_id is null then
    return null;
  end if;

  gap_km := public.haversine_km(p_lat, p_lng, candidate.lat, candidate.lng);

  insert into public.matches
    (user_a, user_b, category, meet_lat, meet_lng, apart_km, status)
  values
    (me, candidate.profile_id, p_category,
     (p_lat + candidate.lat) / 2,
     (p_lng + candidate.lng) / 2,
     gap_km, 'active')
  returning * into new_match;

  update public.match_requests
     set status = 'matched', match_id = new_match.id
   where profile_id in (me, candidate.profile_id);

  return new_match;
end;
$$;

create or replace function public.cancel_match_request()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.match_requests
     set status = 'cancelled'
   where profile_id = auth.uid()
     and status = 'waiting';
end;
$$;

-- =====================================================================
-- 6. STORAGE BUCKETS (AVATARS & TRAIL IMAGES)
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('trail-images', 'trail-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif']),
  ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

-- =====================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

alter table public.profiles            enable row level security;
alter table public.profile_preferences enable row level security;
alter table public.safety_settings     enable row level security;
alter table public.trail_ratings       enable row level security;
alter table public.posts               enable row level security;
alter table public.post_reactions      enable row level security;
alter table public.follows             enable row level security;
alter table public.matches             enable row level security;
alter table public.match_requests      enable row level security;

-- Profiles RLS
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Preferences RLS
drop policy if exists "prefs_select_own" on public.profile_preferences;
create policy "prefs_select_own" on public.profile_preferences for select using (auth.uid() = profile_id);

drop policy if exists "prefs_insert_own" on public.profile_preferences;
create policy "prefs_insert_own" on public.profile_preferences for insert with check (auth.uid() = profile_id);

drop policy if exists "prefs_update_own" on public.profile_preferences;
create policy "prefs_update_own" on public.profile_preferences for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- Safety Settings RLS
drop policy if exists "safety_select_own" on public.safety_settings;
create policy "safety_select_own" on public.safety_settings for select using (auth.uid() = profile_id);

drop policy if exists "safety_insert_own" on public.safety_settings;
create policy "safety_insert_own" on public.safety_settings for insert with check (auth.uid() = profile_id);

drop policy if exists "safety_update_own" on public.safety_settings;
create policy "safety_update_own" on public.safety_settings for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- Trail Ratings RLS
drop policy if exists "trail_ratings_select_all" on public.trail_ratings;
create policy "trail_ratings_select_all" on public.trail_ratings for select using (true);

drop policy if exists "trail_ratings_insert_own" on public.trail_ratings;
create policy "trail_ratings_insert_own" on public.trail_ratings for insert with check (auth.uid() = profile_id);

drop policy if exists "trail_ratings_update_own" on public.trail_ratings;
create policy "trail_ratings_update_own" on public.trail_ratings for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists "trail_ratings_delete_own" on public.trail_ratings;
create policy "trail_ratings_delete_own" on public.trail_ratings for delete using (auth.uid() = profile_id);

-- Posts & Reactions RLS
drop policy if exists "posts_select_public" on public.posts;
create policy "posts_select_public" on public.posts for select using (visibility = 'PUBLIC' and auth.role() = 'authenticated');

drop policy if exists "posts_select_private" on public.posts;
create policy "posts_select_private" on public.posts for select using (creator_id = auth.uid());

drop policy if exists "posts_insert" on public.posts;
create policy "posts_insert" on public.posts for insert with check (auth.role() = 'authenticated' and creator_id = auth.uid());

drop policy if exists "posts_update" on public.posts;
create policy "posts_update" on public.posts for update using (creator_id = auth.uid()) with check (creator_id = auth.uid());

drop policy if exists "posts_delete" on public.posts;
create policy "posts_delete" on public.posts for delete using (creator_id = auth.uid());

drop policy if exists "post_reactions_select" on public.post_reactions;
create policy "post_reactions_select" on public.post_reactions for select using (auth.role() = 'authenticated');

drop policy if exists "post_reactions_insert" on public.post_reactions;
create policy "post_reactions_insert" on public.post_reactions for insert with check (auth.role() = 'authenticated' and user_id = auth.uid());

drop policy if exists "post_reactions_update" on public.post_reactions;
create policy "post_reactions_update" on public.post_reactions for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "post_reactions_delete" on public.post_reactions;
create policy "post_reactions_delete" on public.post_reactions for delete using (user_id = auth.uid());

-- Follows RLS
drop policy if exists "follows_select_involved" on public.follows;
create policy "follows_select_involved" on public.follows for select using (auth.uid() in (follower_id, following_id));

drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own" on public.follows for insert with check (auth.uid() = follower_id);

drop policy if exists "follows_update_target" on public.follows;
create policy "follows_update_target" on public.follows for update using (auth.uid() = following_id) with check (auth.uid() = following_id);

drop policy if exists "follows_delete_involved" on public.follows;
create policy "follows_delete_involved" on public.follows for delete using (auth.uid() in (follower_id, following_id));

-- Matches & Requests RLS
drop policy if exists "matches_select_own" on public.matches;
create policy "matches_select_own" on public.matches for select using (auth.uid() in (user_a, user_b));

drop policy if exists "matches_update_own" on public.matches;
create policy "matches_update_own" on public.matches for update using (auth.uid() in (user_a, user_b)) with check (auth.uid() in (user_a, user_b));

drop policy if exists "match_requests_select_own" on public.match_requests;
create policy "match_requests_select_own" on public.match_requests for select using (auth.uid() = profile_id);

drop policy if exists "match_requests_insert_own" on public.match_requests;
create policy "match_requests_insert_own" on public.match_requests for insert with check (auth.uid() = profile_id);

drop policy if exists "match_requests_update_own" on public.match_requests;
create policy "match_requests_update_own" on public.match_requests for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists "match_requests_delete_own" on public.match_requests;
create policy "match_requests_delete_own" on public.match_requests for delete using (auth.uid() = profile_id);

-- Storage Objects RLS
drop policy if exists "Public read storage images" on storage.objects;
create policy "Public read storage images" on storage.objects for select using (bucket_id in ('trail-images', 'avatars'));

drop policy if exists "Users upload own storage images" on storage.objects;
create policy "Users upload own storage images" on storage.objects for insert to authenticated with check (bucket_id in ('trail-images', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users update own storage images" on storage.objects;
create policy "Users update own storage images" on storage.objects for update to authenticated using (bucket_id in ('trail-images', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete own storage images" on storage.objects;
create policy "Users delete own storage images" on storage.objects for delete to authenticated using (bucket_id in ('trail-images', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- 8. AUTOMATION TRIGGERS & REALTIME
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_trail_rating()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trail_ratings_touch on public.trail_ratings;
create trigger trail_ratings_touch
  before update on public.trail_ratings
  for each row execute function public.touch_trail_rating();

grant execute on function public.search_users(text, integer) to authenticated;
grant execute on function public.list_follow_connections(text) to authenticated;
grant execute on function public.is_following(uuid, uuid) to authenticated;
grant execute on function public.is_mutual_follow(uuid, uuid) to authenticated;
grant execute on function public.find_or_create_match(double precision, double precision, text, double precision, text, text) to authenticated;
grant execute on function public.cancel_match_request() to authenticated;

-- Realtime publication registration
do $$
declare
  t text;
begin
  foreach t in array array['matches', 'match_requests', 'follows'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

alter table public.matches replica identity full;
alter table public.follows replica identity full;

notify pgrst, 'reload schema';
