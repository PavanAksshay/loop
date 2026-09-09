import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  UserPlus,
  Check,
  Clock,
  X,
  Users,
  Loader2,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  UserCheck,
  UserX,
  MapPin,
  Flame,
} from "lucide-react";
import {
  FollowAnalytics,
  FollowConnection,
  FollowSuggestion,
  UserSearchResult,
  blockUser,
  bulkRespondFollowRequests,
  bulkUnfollow,
  getFollowAnalytics,
  getFollowSuggestions,
  listBlockedUsers,
  listFollowConnections,
  respondToFollowRequest,
  searchUsers,
  sendFollowRequest,
  subscribeToFollows,
  unblockUser,
  unfollowUser,
} from "../lib/db";

interface PeopleSearchProps {
  /** Signed-in user's profile id. Required for any follow action. */
  userId?: string;
  onNotify?: (message: string, tone?: "success" | "info" | "warn") => void;
}

type Tab = "search" | "requests" | "following" | "blocked";

const TABS: { key: Tab; label: string }[] = [
  { key: "search", label: "Find people" },
  { key: "requests", label: "Requests" },
  { key: "following", label: "Following" },
  { key: "blocked", label: "Blocked" },
];

export default function PeopleSearch({ userId, onNotify }: PeopleSearchProps) {
  const [tab, setTab] = useState<Tab>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<FollowSuggestion[]>([]);
  const [requests, setRequests] = useState<FollowConnection[]>([]);
  const [following, setFollowing] = useState<FollowConnection[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<FollowConnection[]>([]);
  const [analytics, setAnalytics] = useState<FollowAnalytics | null>(null);
  const [showAnalyticsDetails, setShowAnalyticsDetails] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Ids with an action in flight, so only that row shows a spinner. */
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // Bulk selection states
  const [selectedReqIds, setSelectedReqIds] = useState<Set<string>>(new Set());
  const [selectedFollowingIds, setSelectedFollowingIds] = useState<Set<string>>(new Set());

  // Block modal state
  const [userToBlock, setUserToBlock] = useState<{ id: string; username: string | null } | null>(null);

  const markPending = (id: string, on: boolean) =>
    setPendingIds((prev) => {
      const next = new Set(prev);
      on ? next.add(id) : next.delete(id);
      return next;
    });

  const friendlyError = (err: any) => {
    const msg = err?.message ?? "";
    if (/search_users|list_follow_connections|follows|block_user|get_follow_suggestions/.test(msg)) {
      return "Follow system feature isn't synced on the database yet — run supabase/migration_follows.sql.";
    }
    return msg || "Something went wrong.";
  };

  const refreshLists = useCallback(async () => {
    if (!userId) return;
    try {
      const [req, fol, blk, sug, ana] = await Promise.all([
        listFollowConnections("requests").catch(() => []),
        listFollowConnections("following").catch(() => []),
        listBlockedUsers().catch(() => []),
        getFollowSuggestions(6).catch(() => []),
        getFollowAnalytics().catch(() => null),
      ]);
      setRequests(req);
      setFollowing(fol);
      setBlockedUsers(blk);
      setSuggestions(sug);
      if (ana) setAnalytics(ana);
      setError(null);
    } catch (err: any) {
      setError(friendlyError(err));
    }
  }, [userId]);

  useEffect(() => {
    refreshLists();
  }, [refreshLists]);

  // Live real-time updates with context-aware toasts
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToFollows(userId, (event) => {
      refreshLists();
      if (event?.isIncomingRequest) {
        onNotify?.("🔔 You have a new follow request!", "info");
      } else if (event?.isAccepted) {
        onNotify?.("🎉 Someone accepted your follow request!", "success");
      } else if (event?.isDeclined) {
        onNotify?.("A follow request was declined.", "info");
      }
    });
    return unsub;
  }, [userId, refreshLists, onNotify]);

  // Debounced search
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setBusy(true);
      try {
        setResults(await searchUsers(q));
        setError(null);
      } catch (err: any) {
        setError(friendlyError(err));
      } finally {
        setBusy(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Handlers
  const handleFollow = async (target: UserSearchResult | FollowSuggestion) => {
    if (!userId) return;
    markPending(target.id, true);
    try {
      const status = "follow_status" in target ? target.follow_status : null;
      if (status === "pending" || status === "accepted") {
        await unfollowUser(userId, target.id);
        onNotify?.(
          status === "accepted" ? `Unfollowed @${target.username}` : "Request withdrawn",
          "info"
        );
      } else {
        await sendFollowRequest(userId, target.id);
        onNotify?.(`Request sent to @${target.username}`, "success");
      }
      if (query.trim().length >= 2) {
        setResults(await searchUsers(query));
      }
      refreshLists();
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      markPending(target.id, false);
    }
  };

  const handleRespond = async (req: FollowConnection, accept: boolean) => {
    markPending(req.follow_id, true);
    try {
      await respondToFollowRequest(req.follow_id, accept);
      onNotify?.(
        accept ? `You and @${req.username} are connected` : "Request declined",
        accept ? "success" : "info"
      );
      refreshLists();
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      markPending(req.follow_id, false);
    }
  };

  const handleUnfollow = async (conn: FollowConnection) => {
    if (!userId) return;
    markPending(conn.follow_id, true);
    try {
      await unfollowUser(userId, conn.id);
      onNotify?.(`Unfollowed @${conn.username}`, "info");
      refreshLists();
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      markPending(conn.follow_id, false);
    }
  };

  // Bulk Request Handlers
  const handleAcceptAll = async () => {
    if (requests.length === 0) return;
    setBusy(true);
    try {
      const ids = requests.map((r) => r.follow_id);
      await bulkRespondFollowRequests(ids, true);
      onNotify?.(`Accepted all ${ids.length} requests`, "success");
      setSelectedReqIds(new Set());
      refreshLists();
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDeclineAll = async () => {
    if (requests.length === 0) return;
    setBusy(true);
    try {
      const ids = requests.map((r) => r.follow_id);
      await bulkRespondFollowRequests(ids, false);
      onNotify?.(`Declined all ${ids.length} requests`, "info");
      setSelectedReqIds(new Set());
      refreshLists();
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleBulkRespondSelected = async (accept: boolean) => {
    if (selectedReqIds.size === 0) return;
    setBusy(true);
    try {
      const ids = Array.from(selectedReqIds);
      await bulkRespondFollowRequests(ids, accept);
      onNotify?.(
        `${accept ? "Accepted" : "Declined"} ${ids.length} selected request(s)`,
        accept ? "success" : "info"
      );
      setSelectedReqIds(new Set());
      refreshLists();
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  // Bulk Unfollow Handlers
  const handleBulkUnfollowSelected = async () => {
    if (!userId || selectedFollowingIds.size === 0) return;
    setBusy(true);
    try {
      const ids = Array.from(selectedFollowingIds);
      await bulkUnfollow(userId, ids);
      onNotify?.(`Unfollowed ${ids.length} users`, "info");
      setSelectedFollowingIds(new Set());
      refreshLists();
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  // Block & Unblock Handlers
  const handleConfirmBlock = async () => {
    if (!userToBlock) return;
    setBusy(true);
    try {
      await blockUser(userToBlock.id);
      onNotify?.(`Blocked @${userToBlock.username ?? "user"}`, "warn");
      setUserToBlock(null);
      refreshLists();
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleUnblock = async (conn: FollowConnection) => {
    markPending(conn.id, true);
    try {
      await unblockUser(conn.id);
      onNotify?.(`Unblocked @${conn.username}`, "info");
      refreshLists();
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      markPending(conn.id, false);
    }
  };

  /** Avatar + @username + name, shared by rows */
  const Identity = ({
    avatar,
    username,
    name,
    city,
  }: {
    avatar: string | null;
    username: string | null;
    name: string | null;
    city?: string | null;
  }) => (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      {avatar ? (
        <img
          src={avatar}
          alt={username ?? "user"}
          className="w-10 h-10 rounded-full object-cover border border-black/15 shrink-0 shadow-sm"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center shrink-0">
          <Users className="w-4 h-4 text-gray-500" />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-sm font-extrabold text-[var(--wb-text)] truncate flex items-center gap-1.5">
          <span>@{username ?? "unknown"}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 truncate">
          {name && <span className="truncate">{name}</span>}
          {city && (
            <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
              <MapPin className="w-2.5 h-2.5" />
              {city}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const smallBtn =
    "px-3 py-1.5 rounded-md text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50";

  return (
    <div className="w-full space-y-4">
      {/* Header & Title */}
      <div className="flex items-center justify-between pb-4 border-b border-black/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-black text-white flex items-center justify-center">
            <Users className="w-4 h-4 shrink-0" />
          </div>
          <div>
            <h3 className="font-headline text-lg font-extrabold text-[var(--wb-text)] tracking-tight">
              Community & Network
            </h3>
            <p className="text-xs text-gray-500 text-accent-serif">
              Connect by username to chat, share routes, and track live activity
            </p>
          </div>
        </div>

        {analytics && (
          <button
            onClick={() => setShowAnalyticsDetails((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-black/5 hover:bg-black/10 text-xs font-bold text-gray-700 transition-colors border border-black/10"
          >
            <TrendingUp className="w-3.5 h-3.5 text-black" />
            <span>Growth</span>
            {showAnalyticsDetails ? (
              <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            )}
          </button>
        )}
      </div>

      {/* Analytics Dashboard Metric Cards */}
      {analytics && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-md bg-black/[0.03] border border-black/10">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Followers
              </div>
              <div className="text-xl font-extrabold text-[var(--wb-text)] mt-0.5 flex items-center gap-2">
                <span>{analytics.followers_count}</span>
                {analytics.growth_week > 0 && (
                  <span className="text-[10px] font-bold text-black bg-black/10 px-1.5 py-0.5 rounded">
                    +{analytics.growth_week} this wk
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 rounded-md bg-black/[0.03] border border-black/10">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Following
              </div>
              <div className="text-xl font-extrabold text-[var(--wb-text)] mt-0.5">
                {analytics.following_count}
              </div>
            </div>

            <div className="p-3 rounded-md bg-black/[0.03] border border-black/10">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Mutual Friends
              </div>
              <div className="text-xl font-extrabold text-[var(--wb-text)] mt-0.5">
                {analytics.mutuals_count}
              </div>
            </div>

            <div className="p-3 rounded-md bg-black/[0.03] border border-black/10">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Pending
              </div>
              <div className="text-xl font-extrabold text-[var(--wb-text)] mt-0.5">
                {analytics.pending_count}
              </div>
            </div>
          </div>

          {/* Expanded 7-day Activity Breakdown */}
          {showAnalyticsDetails && analytics.history?.length > 0 && (
            <div className="p-4 rounded-md bg-black/[0.04] border border-black/10 space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                <span className="flex items-center gap-1.5">
                  7-Day Follower Activity
                </span>
                <span className="text-[11px] text-gray-500">
                  Total Monthly Growth: +{analytics.growth_month}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 pt-2 items-end h-16">
                {analytics.history.map((h, i) => {
                  const maxH = Math.max(...analytics.history.map((x) => x.followers), 1);
                  const barHeightPct = Math.max((h.followers / maxH) * 100, 15);
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 h-full justify-end">
                      <div className="text-[9px] font-bold text-gray-500">
                        {h.followers > 0 ? h.followers : ""}
                      </div>
                      <div
                        style={{ height: `${barHeightPct}%` }}
                        className={`w-full rounded-t-md transition-all ${
                          h.followers > 0 ? "bg-black" : "bg-black/10"
                        }`}
                      />
                      <div className="text-[8px] font-black text-gray-400 uppercase">
                        {h.date.split(" ")[1] ?? h.date}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-4 overflow-x-auto pb-1 border-b border-black/10 scrollbar-none">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pb-1.5 border-b-2 text-xs font-black uppercase tracking-wider transition-colors whitespace-nowrap ${
              tab === t.key
                ? "text-black border-black"
                : "text-gray-400 border-transparent hover:text-gray-700"
            }`}
          >
            {t.label}
            {t.key === "requests" && requests.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-black text-white text-[9px] font-black animate-pulse">
                {requests.length}
              </span>
            )}
            {t.key === "blocked" && blockedUsers.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-700 text-[9px]">
                {blockedUsers.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-400/40 text-red-700 text-[11px] font-semibold leading-relaxed">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!userId && (
        <p className="text-xs text-gray-500 py-4">Sign in to find and follow people.</p>
      )}

      {/* ---------------- SEARCH & DISCOVERY TAB ---------------- */}
      {tab === "search" && userId && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            {busy && (
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
            )}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search @username or display name…"
              className="w-full bg-black/5 border border-black/15 rounded-md pl-9 pr-9 py-2.5 text-sm text-[var(--wb-text)] placeholder:text-gray-400 focus:outline-none focus:border-black/40 transition-colors"
            />
          </div>

          {/* Suggestions ("People you may know") when query is empty */}
          {query.trim().length < 2 && suggestions.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <div className="text-xs font-black uppercase tracking-wider text-gray-500">
                  <span>People you may know</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {suggestions.map((sug) => {
                  const isPending = pendingIds.has(sug.id);
                  return (
                    <div
                      key={sug.id}
                      className="p-3 rounded-md bg-black/[0.02] border border-black/10 flex items-center justify-between gap-3 hover:bg-black/[0.04] transition-all"
                    >
                      <Identity
                        avatar={sug.avatar_url}
                        username={sug.username}
                        name={sug.full_name}
                        city={sug.city}
                      />
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {sug.mutual_count > 0 && (
                          <span className="text-[9px] font-bold text-gray-700 bg-black/5 px-1.5 py-0.5 rounded">
                            {sug.mutual_count} mutual{sug.mutual_count > 1 ? "s" : ""}
                          </span>
                        )}
                        <button
                          onClick={() => handleFollow(sug)}
                          disabled={isPending}
                          className={`${smallBtn} bg-black text-white hover:opacity-85`}
                        >
                          {isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span className="flex items-center gap-1">
                              <UserPlus className="w-3 h-3" /> Follow
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {query.trim().length >= 2 && !busy && results.length === 0 && !error && (
            <p className="text-xs text-gray-500 py-3">
              No one found matching “{query.trim()}”.
            </p>
          )}

          {/* Search results list */}
          <div className="divide-y divide-black/10">
            {results.map((u) => {
              const isPending = pendingIds.has(u.id);
              const label =
                u.follow_status === "accepted"
                  ? "Following"
                  : u.follow_status === "pending"
                  ? "Requested"
                  : "Follow";
              return (
                <div key={u.id} className="flex items-center gap-3 py-3">
                  <Identity
                    avatar={u.avatar_url}
                    username={u.username}
                    name={u.full_name}
                    city={u.city}
                  />
                  {u.follows_me && u.follow_status !== "accepted" && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 shrink-0">
                      Follows you
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleFollow(u)}
                      disabled={isPending}
                      className={`${smallBtn} ${
                        u.follow_status === "accepted"
                          ? "bg-black/5 text-gray-600 hover:bg-black/10"
                          : u.follow_status === "pending"
                          ? "bg-black/5 text-gray-500 hover:bg-black/10"
                          : "bg-black text-white hover:opacity-85"
                      }`}
                    >
                      {isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span className="flex items-center gap-1">
                          {u.follow_status === "accepted" ? (
                            <Check className="w-3 h-3" />
                          ) : u.follow_status === "pending" ? (
                            <Clock className="w-3 h-3" />
                          ) : (
                            <UserPlus className="w-3 h-3" />
                          )}
                          {label}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setUserToBlock({ id: u.id, username: u.username })}
                      title="Block user"
                      className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- INCOMING REQUESTS TAB ---------------- */}
      {tab === "requests" && userId && (
        <div className="space-y-3">
          {/* Bulk Action Controls */}
          {requests.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-black/[0.03] border border-black/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (selectedReqIds.size === requests.length) {
                      setSelectedReqIds(new Set());
                    } else {
                      setSelectedReqIds(new Set(requests.map((r) => r.follow_id)));
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-black"
                >
                  {selectedReqIds.size === requests.length ? (
                    <CheckSquare className="w-4 h-4 text-black" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                  <span>Select all ({requests.length})</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {selectedReqIds.size > 0 ? (
                  <>
                    <button
                      onClick={() => handleBulkRespondSelected(true)}
                      disabled={busy}
                      className={`${smallBtn} bg-black text-white hover:opacity-85`}
                    >
                      Accept Selected ({selectedReqIds.size})
                    </button>
                    <button
                      onClick={() => handleBulkRespondSelected(false)}
                      disabled={busy}
                      className={`${smallBtn} bg-black/5 text-gray-600 hover:bg-black/10`}
                    >
                      Decline Selected
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleAcceptAll}
                      disabled={busy}
                      className={`${smallBtn} bg-black text-white hover:opacity-85`}
                    >
                      Accept All
                    </button>
                    <button
                      onClick={handleDeclineAll}
                      disabled={busy}
                      className={`${smallBtn} bg-black/5 text-gray-600 hover:bg-black/10`}
                    >
                      Decline All
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="divide-y divide-black/10">
            {requests.length === 0 ? (
              <div className="py-8 text-center space-y-1">
                <UserCheck className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs text-gray-500 font-medium">No pending follow requests.</p>
              </div>
            ) : (
              requests.map((r) => {
                const isPending = pendingIds.has(r.follow_id);
                const isChecked = selectedReqIds.has(r.follow_id);
                return (
                  <div key={r.follow_id} className="flex items-center gap-3 py-3">
                    <button
                      onClick={() =>
                        setSelectedReqIds((prev) => {
                          const next = new Set(prev);
                          isChecked ? next.delete(r.follow_id) : next.add(r.follow_id);
                          return next;
                        })
                      }
                      className="p-1 text-gray-400 hover:text-black"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-black" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <Identity avatar={r.avatar_url} username={r.username} name={r.full_name} />
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleRespond(r, true)}
                        disabled={isPending || busy}
                        className={`${smallBtn} bg-black text-white hover:opacity-85`}
                      >
                        {isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span className="flex items-center gap-1">
                            <Check className="w-3 h-3" /> Accept
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => handleRespond(r, false)}
                        disabled={isPending || busy}
                        className={`${smallBtn} bg-black/5 text-gray-600 hover:bg-black/10`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ---------------- FOLLOWING TAB ---------------- */}
      {tab === "following" && userId && (
        <div className="space-y-3">
          {following.length > 0 && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.03] border border-black/10">
              <button
                onClick={() => {
                  if (selectedFollowingIds.size === following.length) {
                    setSelectedFollowingIds(new Set());
                  } else {
                    setSelectedFollowingIds(new Set(following.map((f) => f.id)));
                  }
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-black"
              >
                {selectedFollowingIds.size === following.length ? (
                  <CheckSquare className="w-4 h-4 text-black" />
                ) : (
                  <Square className="w-4 h-4 text-gray-400" />
                )}
                <span>Select all ({following.length})</span>
              </button>

              {selectedFollowingIds.size > 0 && (
                <button
                  onClick={handleBulkUnfollowSelected}
                  disabled={busy}
                  className={`${smallBtn} bg-red-600 text-white hover:bg-red-700`}
                >
                  Unfollow Selected ({selectedFollowingIds.size})
                </button>
              )}
            </div>
          )}

          <div className="divide-y divide-black/10">
            {following.length === 0 ? (
              <div className="py-8 text-center space-y-1">
                <Users className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs text-gray-500 font-medium">
                  You aren't following anyone yet. Find people by @username.
                </p>
              </div>
            ) : (
              following.map((f) => {
                const isChecked = selectedFollowingIds.has(f.id);
                return (
                  <div key={f.follow_id} className="flex items-center gap-3 py-3">
                    <button
                      onClick={() =>
                        setSelectedFollowingIds((prev) => {
                          const next = new Set(prev);
                          isChecked ? next.delete(f.id) : next.add(f.id);
                          return next;
                        })
                      }
                      className="p-1 text-gray-400 hover:text-black"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-black" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <Identity avatar={f.avatar_url} username={f.username} name={f.full_name} />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleUnfollow(f)}
                        disabled={pendingIds.has(f.follow_id)}
                        className={`${smallBtn} bg-black/5 text-gray-600 hover:bg-black/10`}
                      >
                        {pendingIds.has(f.follow_id) ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "Unfollow"
                        )}
                      </button>
                      <button
                        onClick={() => setUserToBlock({ id: f.id, username: f.username })}
                        title="Block user"
                        className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ---------------- BLOCKED TAB ---------------- */}
      {tab === "blocked" && userId && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
            <span>
              Blocked users cannot see your profile, follow you, or search for you. Unblocking
              restores search visibility.
            </span>
          </div>

          <div className="divide-y divide-black/10">
            {blockedUsers.length === 0 ? (
              <div className="py-8 text-center space-y-1">
                <ShieldCheck className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs text-gray-500 font-medium">No blocked users.</p>
              </div>
            ) : (
              blockedUsers.map((b) => (
                <div key={b.follow_id} className="flex items-center gap-3 py-3">
                  <Identity avatar={b.avatar_url} username={b.username} name={b.full_name} />
                  <button
                    onClick={() => handleUnblock(b)}
                    disabled={pendingIds.has(b.id)}
                    className={`${smallBtn} bg-black text-white hover:opacity-85 shrink-0`}
                  >
                    {pendingIds.has(b.id) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Unblock"
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Block Confirmation Dialog Modal */}
      {userToBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-lg p-6 shadow-xl space-y-4 border border-black/10">
            <div className="w-10 h-10 rounded-md bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="font-headline font-black text-lg text-[var(--wb-text)]">
                Block @{userToBlock.username ?? "user"}?
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                They will no longer be able to find your profile, follow you, or view your walks.
                Any existing follow connection will be severed.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setUserToBlock(null)}
                className="flex-1 py-2.5 rounded-md border border-black/15 text-xs font-bold text-gray-700 hover:bg-black/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBlock}
                disabled={busy}
                className="flex-1 py-2.5 rounded-md bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Block"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

