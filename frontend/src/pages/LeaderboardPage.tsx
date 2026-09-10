import { useState, useEffect } from 'react';
import { api } from '../services/api';
import LeaderboardRow from '../components/LeaderboardRow';
import type { LeaderboardEntry } from '../types';

export default function LeaderboardPage() {
  const [boardType, setBoardType] = useState<'global' | 'college'>('college');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetcher = boardType === 'global' ? api.getGlobalLeaderboard : api.getCollegeLeaderboard;

    fetcher()
      .then((r: any) => setEntries(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [boardType]);

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="page-header">
        <h1 className="text-white">Leaderboard</h1>
        <p className="text-sm mt-1">See how you stack up against others.</p>
      </div>

      <div className="px-5 mt-5">
        <div className="flex bg-surface rounded-lg p-1">
          {(['college', 'global'] as const).map(t => (
            <button
              key={t}
              onClick={() => setBoardType(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${
                boardType === t ? 'bg-card border border-white/10 text-white shadow-md' : 'text-muted'
              }`}
            >
              {t === 'college' ? '🎓 My College' : '🌍 Global'}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeleton h-[60px] w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🏆</span>
            <p>No leaderboard data yet.</p>
          </div>
        ) : (
          <div className="card px-4 py-2">
            {entries.map((entry, index) => (
              <LeaderboardRow key={entry.userId} entry={entry} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
