import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Check, X, Search, Swords, UserX, Shield, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import type { Friendship, FriendRequest, PublicAthlete } from '../types';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChallengeFriend?: (friend: Friendship) => void;
  onFriendsUpdated?: () => void;
}

export default function FriendsModal({
  isOpen,
  onClose,
  onChallengeFriend,
  onFriendsUpdated,
}: FriendsModalProps) {
  const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicAthlete[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchFriendsAndRequests = async () => {
    setLoading(true);
    try {
      const [fRes, rRes]: any[] = await Promise.all([
        api.getFriends().catch(() => ({ data: [] })),
        api.getFriendRequests().catch(() => ({ data: [] })),
      ]);
      setFriends(fRes?.data || []);
      setRequests(rRes?.data || []);
    } catch (err) {
      console.error('Failed to load friends/requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFriendsAndRequests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setMessage(null);
    try {
      const res: any = await api.searchAthletes(searchQuery.trim());
      setSearchResults(res?.data || []);
      if ((res?.data || []).length === 0) {
        setMessage('No athletes found matching "' + searchQuery + '"');
      }
    } catch (err: any) {
      setMessage(err.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (athlete: PublicAthlete) => {
    setActionLoading(athlete.userId);
    try {
      await api.sendFriendRequest(athlete.userId);
      setSearchResults((prev) =>
        prev.map((a) => (a.userId === athlete.userId ? { ...a, hasPendingRequest: true } : a))
      );
      setMessage(`Friend request sent to ${athlete.name}!`);
    } catch (err: any) {
      alert(err.message || 'Failed to send request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRespondRequest = async (requestId: string, action: 'accept' | 'decline') => {
    setActionLoading(requestId);
    try {
      await api.respondFriendRequest(requestId, action);
      await fetchFriendsAndRequests();
      if (onFriendsUpdated) onFriendsUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to respond to request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFriend = async (friendId: string, name: string) => {
    if (!confirm(`Remove ${name} from your friends list?`)) return;
    setActionLoading(friendId);
    try {
      await api.removeFriend(friendId);
      await fetchFriendsAndRequests();
      if (onFriendsUpdated) onFriendsUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to remove friend');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="card-glass border border-white/10 w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan/15 border border-cyan/30 flex items-center justify-center text-cyan">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">Athletes & Friends</h2>
              <p className="text-xs text-slate-400">Connect, compare stats, and challenge friends</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-surface hover:bg-surface/80 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 pb-2 border-b border-white/5 flex gap-2">
          <button
            onClick={() => setTab('friends')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              tab === 'friends'
                ? 'bg-cyan text-obsidian shadow-glow-sm'
                : 'bg-surface/50 text-slate-400 hover:text-white'
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setTab('requests')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer relative ${
              tab === 'requests'
                ? 'bg-cyan text-obsidian shadow-glow-sm'
                : 'bg-surface/50 text-slate-400 hover:text-white'
            }`}
          >
            Requests {requests.length > 0 && `(${requests.length})`}
            {requests.length > 0 && (
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 ml-1" />
            )}
          </button>
          <button
            onClick={() => setTab('search')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              tab === 'search'
                ? 'bg-cyan text-obsidian shadow-glow-sm'
                : 'bg-surface/50 text-slate-400 hover:text-white'
            }`}
          >
            <Search size={12} />
            <span>Find Athletes</span>
          </button>
        </div>

        {/* Info / Success message */}
        {message && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl bg-cyan/10 border border-cyan/20 text-xs text-cyan flex items-center gap-2">
            <Check size={13} className="flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="space-y-2">
              <div className="card skeleton h-16" />
              <div className="card skeleton h-16" />
            </div>
          ) : tab === 'friends' ? (
            friends.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <Users size={36} className="mx-auto text-slate-500" />
                <h3 className="text-sm font-bold text-white">No Friends Yet</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Find teammates and rivals to challenge in live camera battles!
                </p>
                <button
                  onClick={() => setTab('search')}
                  className="btn btn-primary btn-sm mx-auto flex items-center gap-1.5"
                >
                  <Search size={14} />
                  <span>Search Athletes</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {friends.map((f) => (
                  <div
                    key={f.friendshipId}
                    className="card p-3.5 flex items-center justify-between border border-white/5 hover:border-white/15 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-hero p-0.5 shadow-glow-sm">
                        <div className="w-full h-full bg-obsidian rounded-[14px] flex items-center justify-center text-sm font-black text-white">
                          {f.friendName?.[0]?.toUpperCase() || 'A'}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white tracking-tight">{f.friendName}</h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span className="text-amber-400 font-semibold">{f.friendRankTier || 'Bronze'}</span>
                          <span>•</span>
                          <span className="tabular-nums">{f.friendPoints ?? 0} RP</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onChallengeFriend && (
                        <button
                          onClick={() => {
                            onClose();
                            onChallengeFriend(f);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Swords size={12} />
                          <span>Challenge</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveFriend(f.friendId, f.friendName)}
                        disabled={actionLoading === f.friendId}
                        className="p-1.5 rounded-lg bg-surface hover:bg-rose-500/20 text-slate-500 hover:text-rose-300 transition cursor-pointer"
                        title="Remove friend"
                      >
                        <UserX size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : tab === 'requests' ? (
            requests.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Check size={36} className="mx-auto text-slate-600" />
                <h3 className="text-sm font-bold text-white">No Pending Requests</h3>
                <p className="text-xs text-slate-400">
                  When other athletes send you friend requests, they will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {requests.map((r) => (
                  <div
                    key={r.requestId}
                    className="card p-3.5 flex items-center justify-between border border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-surface flex items-center justify-center text-white font-black text-sm">
                        {r.senderName?.[0]?.toUpperCase() || 'A'}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{r.senderName}</h4>
                        <span className="text-[10px] text-slate-400">
                          Sent {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRespondRequest(r.requestId, 'accept')}
                        disabled={actionLoading === r.requestId}
                        className="px-2.5 py-1.5 rounded-xl bg-neon text-obsidian text-xs font-bold transition shadow-glow-sm cursor-pointer flex items-center gap-1"
                      >
                        <Check size={12} />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => handleRespondRequest(r.requestId, 'decline')}
                        disabled={actionLoading === r.requestId}
                        className="px-2 py-1.5 rounded-xl bg-surface hover:bg-surface/80 text-slate-400 hover:text-white text-xs font-medium transition cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Search Tab */
            <div className="space-y-3">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by athlete name or username..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-white/10 text-white text-xs focus:border-cyan focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  className="btn btn-primary btn-sm px-4 font-bold flex items-center gap-1"
                >
                  <span>{searching ? 'Searching...' : 'Search'}</span>
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="space-y-2 mt-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Matching Athletes
                  </span>
                  {searchResults.map((a) => (
                    <div
                      key={a.userId}
                      className="card p-3 flex items-center justify-between border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-sm font-bold text-white">
                          {a.name?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-white">{a.name}</h4>
                            {a.rankTier && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20">
                                {a.rankTier}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {a.collegeName || 'SportX Athlete'} • L{a.level || 1}
                          </div>
                        </div>
                      </div>

                      {a.isFriend ? (
                        <span className="text-[10px] font-bold text-cyan px-2 py-1 rounded bg-cyan/10 border border-cyan/20">
                          Friend
                        </span>
                      ) : a.hasPendingRequest ? (
                        <span className="text-[10px] font-bold text-slate-400 px-2 py-1 rounded bg-surface border border-white/5">
                          Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(a)}
                          disabled={actionLoading === a.userId}
                          className="btn btn-secondary btn-sm px-2.5 py-1 text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <UserPlus size={12} />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
