import { supabase } from "./supabase";

/* ------------------------------------------------------------------ */
/*  Row shapes — mirror supabase/schema.sql                            */
/* ------------------------------------------------------------------ */

export interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  age: number | null;
  gender: string | null;
  phone: string | null;
  country_code: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  weight_kg: number | null;
  daily_steps_goal: number | null;
  city: string | null;
  bio: string | null;
  onboarding_completed: boolean;
  terms_accepted: boolean;
  terms_accepted_at: string | null;
  marketing_opt_in: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProfilePreferencesRow {
  /** FK to profiles.id — the pre-existing tables key on profile_id, not user_id. */
  profile_id: string;
  preferred_activities: string[];
  experience_level: string | null;
  preferred_times: string[];
  weekly_goal_km: number | null;
  daily_steps_goal: number | null;
  typical_pace: string | null;
  terrain_preferences: string[];
  /** INTEGER in the DB — a head-count, not a label. See GROUP_SIZE_TO_COUNT. */
  group_size_preference: number | null;
  buddy_gender_preference: string | null;
  audio_preference: string | null;
  motivations: string[];
  max_buddy_distance_km: number | null;
  ai_coach_opt_in: boolean;
  push_notifications: boolean;
}

export interface SafetySettingsRow {
  /** FK to profiles.id — the pre-existing tables key on profile_id, not user_id. */
  profile_id: string;
  share_live_location: boolean;
  daylight_hours_only: boolean;
  verified_buddies_only: boolean;
  women_only_matching: boolean;
  profile_visibility: string;
  share_route_history: boolean;
  auto_checkin_minutes: number | null;
  sos_shortcut_enabled: boolean;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

export const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;
export const PHONE_DIGITS_PATTERN = /^\d{7,15}$/;

export function normalizeUsername(input: string): string {
  return input.trim().replace(/\s+/g, "");
}

export function validateUsername(input: string): string | null {
  if (!input || !input.trim()) return "Username is required.";
  if (/\s/.test(input)) {
    return "invalid username, no spaces are allowed";
  }
  const normalized = input.trim();
  if (normalized.length < 3 || normalized.length > 20) {
    return "Username must be between 3 and 20 characters.";
  }
  if (normalized.startsWith("_")) {
    return "Username cannot start with an underscore.";
  }
  if (!USERNAME_PATTERN.test(normalized)) {
    return "Username can only contain letters, numbers, and underscores.";
  }
  return null;
}

export function normalizePhoneNumber(input: string): string {
  return input.replace(/\s+/g, "").replace(/[^\d]/g, "");
}

export function validatePhoneNumber(input: string): string | null {
  const normalized = normalizePhoneNumber(input);
  if (!normalized) return null;
  if (!PHONE_DIGITS_PATTERN.test(normalized)) {
    return "Phone number must contain only digits and be between 7 and 15 digits long.";
  }
  return null;
}

export async function isUsernameAvailable(username: string, currentUserId?: string): Promise<boolean> {
  const normalized = normalizeUsername(username);
  if (!normalized) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", normalized)
    .limit(1);

  if (error) throw error;
  return !(data ?? []).some((row: { id: string }) => row.id !== currentUserId);
}

export async function isPhoneNumberAvailable(phoneNumber: string, currentUserId?: string): Promise<boolean> {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone_number", normalized)
    .limit(1);

  if (error) throw error;
  return !(data ?? []).some((row: { id: string }) => row.id !== currentUserId);
}

/* ------------------------------------------------------------------ */
/*  profiles                                                           */
/* ------------------------------------------------------------------ */

/**
 * Reads the signed-in user's profile row. Returns null when the row does not
 * exist yet (fresh Google sign-in that has not reached the personal-info step).
 */
export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as ProfileRow) ?? null;
}

/** Creates the profile row immediately after a successful Google sign-in. */
export async function ensureProfile(user: {
  id: string;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
}): Promise<ProfileRow> {
  const existing = await fetchProfile(user.id);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email ?? null,
      full_name: user.fullName ?? null,
      username: null,
      avatar_url: user.avatarUrl ?? null,
      onboarding_completed: false,
      terms_accepted: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ProfileRow;
}

/** Upserts any subset of the profile columns (used by every onboarding step). */
export async function saveProfile(
  userId: string,
  patch: Partial<Omit<ProfileRow, "id">>
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, ...patch, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as ProfileRow;
}

/* ------------------------------------------------------------------ */
/*  profile_preferences                                                */
/* ------------------------------------------------------------------ */

export async function saveProfilePreferences(
  userId: string,
  prefs: Omit<ProfilePreferencesRow, "profile_id">
): Promise<ProfilePreferencesRow> {
  const { data, error } = await supabase
    .from("profile_preferences")
    .upsert(
      { profile_id: userId, ...prefs, updated_at: new Date().toISOString() },
      { onConflict: "profile_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as ProfilePreferencesRow;
}

export async function fetchProfilePreferences(
  userId: string
): Promise<ProfilePreferencesRow | null> {
  const { data, error } = await supabase
    .from("profile_preferences")
    .select("*")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as ProfilePreferencesRow) ?? null;
}

/* ------------------------------------------------------------------ */
/*  safety_settings                                                    */
/* ------------------------------------------------------------------ */

export async function saveSafetySettings(
  userId: string,
  settings: Omit<SafetySettingsRow, "profile_id">
): Promise<SafetySettingsRow> {
  const { data, error } = await supabase
    .from("safety_settings")
    .upsert(
      { profile_id: userId, ...settings, updated_at: new Date().toISOString() },
      { onConflict: "profile_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as SafetySettingsRow;
}

export async function fetchSafetySettings(
  userId: string
): Promise<SafetySettingsRow | null> {
  const { data, error } = await supabase
    .from("safety_settings")
    .select("*")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as SafetySettingsRow) ?? null;
}

/* ------------------------------------------------------------------ */
/*  Auth helpers                                                       */
/* ------------------------------------------------------------------ */

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/*  trail_ratings                                                      */
/* ------------------------------------------------------------------ */

export interface TrailRatingSummary {
  route_id: string;
  average_rating: number;
  rating_count: number;
}

/** Community average + count per trail, keyed by route id. */
export async function fetchTrailRatingSummaries(): Promise<
  Record<string, { average: number; count: number }>
> {
  const { data, error } = await supabase
    .from("trail_rating_summary")
    .select("route_id, average_rating, rating_count");

  if (error) throw error;

  const out: Record<string, { average: number; count: number }> = {};
  (data as TrailRatingSummary[] | null)?.forEach((r) => {
    out[r.route_id] = {
      average: Number(r.average_rating) || 0,
      count: Number(r.rating_count) || 0,
    };
  });
  return out;
}

/** The signed-in user's own ratings, keyed by route id. */
export async function fetchMyTrailRatings(
  userId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("trail_ratings")
    .select("route_id, rating")
    .eq("profile_id", userId);

  if (error) throw error;

  const out: Record<string, number> = {};
  (data as { route_id: string; rating: number }[] | null)?.forEach((r) => {
    out[r.route_id] = r.rating;
  });
  return out;
}

/** Adds or updates this user's rating for a trail (1-5). */
export async function saveTrailRating(
  userId: string,
  routeId: string,
  rating: number
): Promise<void> {
  const { error } = await supabase
    .from("trail_ratings")
    .upsert(
      { profile_id: userId, route_id: routeId, rating },
      { onConflict: "route_id,profile_id" }
    );
  if (error) throw error;
}

/** Removes this user's rating for a trail (tapping the same star again). */
export async function deleteTrailRating(
  userId: string,
  routeId: string
): Promise<void> {
  const { error } = await supabase
    .from("trail_ratings")
    .delete()
    .eq("profile_id", userId)
    .eq("route_id", routeId);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/*  Proximity buddy matching                                           */
/*                                                                     */
/*  Two users near each other tap "Find a buddy"; the Postgres matcher  */
/*  pairs them and hands both the SAME meeting point to walk to.        */
/*  See supabase/migration_buddy_matching.sql.                          */
/* ------------------------------------------------------------------ */

export type MatchCategory = "Walking" | "Jogging";

export interface MatchRow {
  id: string;
  user_a: string;
  user_b: string;
  category: MatchCategory;
  /** The shared spot both users walk to (midpoint between them). */
  meet_lat: number;
  meet_lng: number;
  /** How far apart the pair were when matched, in km. */
  apart_km: number | null;
  status: "active" | "completed" | "cancelled";
  created_at: string;
}

/**
 * Registers the caller's search and tries to pair them immediately.
 *
 * Returns the match when someone was waiting nearby, or `null` when the
 * search is live but unpaired — in that case the caller should wait on
 * subscribeToMatches(), which fires the moment another user matches them.
 */
export async function requestMatch(opts: {
  lat: number;
  lng: number;
  category?: MatchCategory;
  radiusKm?: number;
  userName?: string;
  userAvatar?: string;
}): Promise<MatchRow | null> {
  const { data, error } = await supabase.rpc("find_or_create_match", {
    p_lat: opts.lat,
    p_lng: opts.lng,
    p_category: opts.category ?? "Walking",
    p_radius_km: opts.radiusKm ?? 3,
    p_name: opts.userName ?? null,
    p_avatar: opts.userAvatar ?? null,
  });

  if (error) throw error;
  // The RPC returns a single row, or null while still waiting.
  const row = Array.isArray(data) ? data[0] : data;
  return (row as MatchRow) ?? null;
}

/** Stops the caller's active search. */
export async function cancelMatchRequest(): Promise<void> {
  const { error } = await supabase.rpc("cancel_match_request");
  if (error) throw error;
}

/** The caller's current active match, if any. */
export async function fetchActiveMatch(userId: string): Promise<MatchRow | null> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "active")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as MatchRow) ?? null;
}

/** Marks a match finished (both met up) or cancelled (someone bailed). */
export async function updateMatchStatus(
  matchId: string,
  status: "completed" | "cancelled"
): Promise<void> {
  const { error } = await supabase
    .from("matches")
    .update({ status })
    .eq("id", matchId);
  if (error) throw error;
}

/**
 * Live match notifications. Fires when a match involving `userId` is
 * created or changes — this is how the user who was *waiting* finds out
 * they've been paired, without polling.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToMatches(
  userId: string,
  onMatch: (match: MatchRow) => void
): () => void {
  const channel = supabase
    .channel(`walkbuddy-matches-${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "matches" },
      (payload) => {
        const row = payload.new as MatchRow | undefined;
        if (!row) return;
        // Realtime has no per-user filter for OR conditions, so screen here.
        if (row.user_a === userId || row.user_b === userId) onMatch(row);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/* ------------------------------------------------------------------ */
/*  Social graph — follow by @username                                 */
/*                                                                     */
/*  Discovery goes through security-definer RPCs, not direct table      */
/*  reads: profiles is select-own-only, so a plain query would return   */
/*  nothing, and loosening that policy would expose email/phone/DOB.    */
/*  See supabase/migration_follows.sql.                                 */
/* ------------------------------------------------------------------ */

export type FollowStatus = "pending" | "accepted" | "declined" | "blocked";

/** A person returned by user search, with my relationship to them. */
export interface UserSearchResult {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  /** My outgoing follow state toward them; null when we have no link. */
  follow_status: FollowStatus | null;
  /** True when they already follow me. */
  follows_me: boolean;
}

export interface FollowConnection {
  follow_id: string;
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  status: FollowStatus;
  created_at: string;
}

export interface FollowSuggestion {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  mutual_count: number;
  mutual_sample_usernames: string[];
}

export interface FollowAnalytics {
  followers_count: number;
  following_count: number;
  mutuals_count: number;
  pending_count: number;
  growth_week: number;
  growth_month: number;
  history: Array<{
    date: string;
    followers: number;
  }>;
}

export interface FollowRealtimePayload {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  isIncomingRequest?: boolean;
  isAccepted?: boolean;
  isDeclined?: boolean;
  isUnfollowed?: boolean;
  otherUserId?: string;
}

/** Search people by @username or display name. Needs 2+ characters. */
export async function searchUsers(
  query: string,
  limit = 20
): Promise<UserSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const { data, error } = await supabase.rpc("search_users", {
    p_query: q,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as UserSearchResult[];
}

/**
 * Sends (or re-sends) a follow request. Upserting on the unique pair means
 * re-requesting after a decline reopens the same row rather than erroring.
 */
export async function sendFollowRequest(
  myId: string,
  targetId: string
): Promise<void> {
  const { error } = await supabase.from("follows").upsert(
    {
      follower_id: myId,
      following_id: targetId,
      status: "pending",
      responded_at: null,
    },
    { onConflict: "follower_id,following_id" }
  );
  if (error) throw error;
}

/**
 * Accept or decline an incoming request. RLS only lets the *target* of the
 * request call this, so a requester cannot approve themselves.
 */
export async function respondToFollowRequest(
  followId: string,
  accept: boolean
): Promise<void> {
  const { error } = await supabase
    .from("follows")
    .update({
      status: accept ? "accepted" : "declined",
      responded_at: new Date().toISOString(),
    })
    .eq("id", followId);
  if (error) throw error;
}

/**
 * Bulk accept or decline incoming follow requests atomically.
 */
export async function bulkRespondFollowRequests(
  followIds: string[],
  accept: boolean
): Promise<number> {
  if (followIds.length === 0) return 0;
  const { data, error } = await supabase.rpc("bulk_respond_follow_requests", {
    p_follow_ids: followIds,
    p_accept: accept,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

/** Unfollow someone, or withdraw a request I sent. */
export async function unfollowUser(myId: string, targetId: string): Promise<void> {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", myId)
    .eq("following_id", targetId);
  if (error) throw error;
}

/** Bulk unfollow multiple target IDs. */
export async function bulkUnfollow(myId: string, targetIds: string[]): Promise<void> {
  if (targetIds.length === 0) return;
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", myId)
    .in("following_id", targetIds);
  if (error) throw error;
}

/** Remove a follower (delete their accepted follow on me). */
export async function removeFollower(myId: string, followerId: string): Promise<void> {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", myId);
  if (error) throw error;
}

/** Block a user — isolates privacy and removes reverse connections. */
export async function blockUser(targetId: string): Promise<void> {
  const { error } = await supabase.rpc("block_user", {
    p_target_id: targetId,
  });
  if (error) throw error;
}

/** Unblock a previously blocked user. */
export async function unblockUser(targetId: string): Promise<void> {
  const { error } = await supabase.rpc("unblock_user", {
    p_target_id: targetId,
  });
  if (error) throw error;
}

/** List blocked users for unblocking and privacy settings. */
export async function listBlockedUsers(): Promise<FollowConnection[]> {
  return listFollowConnections("blocked");
}

/**
 * People I follow / who follow me / requests awaiting my response /
 * requests I've sent / blocked users.
 */
export async function listFollowConnections(
  kind: "followers" | "following" | "requests" | "sent" | "blocked" = "following"
): Promise<FollowConnection[]> {
  const { data, error } = await supabase.rpc("list_follow_connections", {
    p_kind: kind,
  });
  if (error) throw error;
  return (data ?? []) as FollowConnection[];
}

/** Get smart 2nd-degree follow suggestions ("People you may know"). */
export async function getFollowSuggestions(
  limit = 10
): Promise<FollowSuggestion[]> {
  const { data, error } = await supabase.rpc("get_follow_suggestions", {
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as FollowSuggestion[];
}

/** Get follower & following growth analytics and sparkline trend data. */
export async function getFollowAnalytics(): Promise<FollowAnalytics> {
  const { data, error } = await supabase.rpc("get_follow_analytics");
  if (error) throw error;
  return (data ?? {
    followers_count: 0,
    following_count: 0,
    mutuals_count: 0,
    pending_count: 0,
    growth_week: 0,
    growth_month: 0,
    history: [],
  }) as FollowAnalytics;
}

/** True when I follow them AND they follow me — the gate for chat. */
export async function isMutualFollow(a: string, b: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_mutual_follow", {
    p_a: a,
    p_b: b,
  });
  if (error) throw error;
  return Boolean(data);
}

/**
 * Live follow updates — an incoming request or an acceptance appears
 * without a refresh. Passes rich contextual events to subscriber.
 */
export function subscribeToFollows(
  userId: string,
  onChange: (payload?: FollowRealtimePayload) => void
): () => void {
  const channel = supabase
    .channel(`loop-follows-${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "follows" },
      (payload) => {
        const oldRow = payload.old as any;
        const newRow = payload.new as any;
        const row = newRow ?? oldRow;
        if (!row) return;

        const isMeFollower = row.follower_id === userId;
        const isMeTarget = row.following_id === userId;

        if (!isMeFollower && !isMeTarget) return;

        let eventInfo: FollowRealtimePayload = {
          eventType: payload.eventType as any,
          otherUserId: isMeFollower ? row.following_id : row.follower_id,
        };

        if (payload.eventType === "INSERT") {
          if (isMeTarget && row.status === "pending") {
            eventInfo.isIncomingRequest = true;
          }
        } else if (payload.eventType === "UPDATE") {
          if (isMeFollower && newRow?.status === "accepted" && oldRow?.status !== "accepted") {
            eventInfo.isAccepted = true;
          } else if (isMeFollower && newRow?.status === "declined") {
            eventInfo.isDeclined = true;
          }
        } else if (payload.eventType === "DELETE") {
          eventInfo.isUnfollowed = true;
        }

        onChange(eventInfo);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
