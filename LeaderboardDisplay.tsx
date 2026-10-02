import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Tournament, LeaderboardEntry } from './types';
import { 
  Trophy, 
  Award,
  Loader2, 
  Info,
  Users,
  Zap
} from 'lucide-react';
import { useI18n, LanguageSwitcher } from './i18n/I18nContext.tsx';
import { computeLeaderboard } from './utils/leaderboard.ts';

const SKILL_COLORS = {
  low: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700' },
  high: { bg: 'bg-rose-100', text: 'text-rose-700' },
};

const POLL_INTERVAL = 5000;

const LeaderboardDisplay: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchTournament = async () => {
    try {
      const response = await fetch(`/api/game/${id}`);
      if (!response.ok) {
        setError(response.status === 404 ? t('common.tournamentNotFound') : t('common.failedToLoad'));
        return;
      }
      const data = await response.json();
      setTournament(data.tournament);
      setError(null);
      setLastUpdated(new Date());
    } catch {
      setError(t('common.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournament();
    const interval = setInterval(fetchTournament, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [id]);

  const leaderboard = useMemo<LeaderboardEntry[]>(() => computeLeaderboard(tournament), [tournament]);

  const isFixed = tournament?.pairMode === 'fixed';
  // Skill per entry only makes sense per player
  const isEvent = tournament?.mode === 'event' && !isFixed;

  if (loading) {
    return (
      <div className="min-h-screen bg-purple-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-purple-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 text-center max-w-md">
          <Info className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-slate-800 mb-2">{error || t('common.notFound')}</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-950 font-inter antialiased">
      {/* Header */}
      <header className="bg-purple-900/50 border-b border-purple-800 px-4 md:px-6 py-3 md:py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="bg-purple-600 text-white p-2 rounded-lg md:rounded-xl">
              <Zap className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-base md:text-xl font-black text-white tracking-tight italic">
                AMERICANO<span className="text-purple-400">PADEL</span>
              </h1>
              <p className="text-purple-500 text-[9px] md:text-[10px] font-bold uppercase tracking-wider">{t('display.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="text-right">
              <div className="text-purple-500 text-[9px] md:text-[10px] font-bold uppercase tracking-wider">{t('common.rounds')}</div>
              <div className="text-xl md:text-2xl font-black text-white">{tournament.rounds.length}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Leaderboard */}
      <main className="max-w-4xl mx-auto px-3 md:px-6 py-4 md:py-6 pb-20">
        <div className="bg-purple-900/40 rounded-2xl md:rounded-3xl border border-purple-800/50 overflow-hidden">
          <div className="px-4 md:px-6 py-3 md:py-4 border-b border-purple-800/50 flex items-center justify-between">
            <h2 className="text-base md:text-lg font-black text-white flex items-center gap-2">
              <Award className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" /> {t('common.standings')}
            </h2>
            <div className="flex items-center gap-2">
              <Users className="w-3 h-3 md:w-4 md:h-4 text-purple-500" />
              <span className="text-purple-400 text-xs md:text-sm font-bold">{t(isFixed ? 'display.pairsCount' : 'display.playersCount', { n: leaderboard.length })}</span>
            </div>
          </div>

          {/* Mobile card layout */}
          <div className="md:hidden divide-y divide-purple-800/20">
            {leaderboard.map((entry, idx) => {
              const displayRank = idx;

              const getRankStyle = () => {
                const rank = displayRank;
                if (rank === 0) return 'bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/30';
                if (rank === 1) return 'bg-slate-300 text-slate-700';
                if (rank === 2) return 'bg-orange-400 text-white';
                return 'bg-purple-800/50 text-purple-400';
              };

              const player = tournament.players.find(p => p.id === entry.playerId);
              const skill = player?.skillLevel || 'medium';

              return (
                <div key={entry.playerId} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${getRankStyle()}`}>
                    {displayRank + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-black text-white text-sm italic uppercase truncate">{entry.playerName}</span>
                    </div>
                    {entry.playerNickname && (
                      <div className="text-purple-400 font-semibold text-[10px] truncate">"{entry.playerNickname}"</div>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-bold text-[10px]">
                        <span className="text-emerald-400">{t('common.wins', { n: entry.wins })}</span>
                        <span className="text-purple-700">-</span>
                        <span className="text-rose-400">{t('common.losses', { n: entry.losses })}</span>
                        <span className="text-purple-700">-</span>
                        <span className="text-purple-500">{t('common.ties', { n: entry.ties })}</span>
                      </span>
                      <span className="text-[9px] text-purple-500 font-bold">{t('display.gamesCount', { n: entry.matchesPlayed })}</span>
                      {isEvent && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase ${SKILL_COLORS[skill].bg} ${SKILL_COLORS[skill].text}`}>
                          {t(`skill.${skill}`)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-2xl text-white italic tracking-tighter leading-none">{entry.totalPoints}</span>
                    <div className="text-[8px] text-purple-500 font-bold uppercase">{t('common.pts')}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table layout */}
          <table className="hidden md:table w-full text-left">
            <thead>
              <tr className="text-[9px] font-black text-purple-500 uppercase tracking-widest border-b border-purple-800/30">
                <th className="px-6 py-3 w-16">#</th>
                <th className="px-6 py-3">{t(isFixed ? 'lb.pair' : 'common.player')}</th>
                {isEvent && <th className="px-4 py-3 text-center">{t('common.skill')}</th>}
                <th className="px-6 py-3 text-center">{t('display.record')}</th>
                <th className="px-6 py-3 text-center">{t('display.games')}</th>
                <th className="px-6 py-3 text-right">{t('common.points')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-800/20">
              {leaderboard.map((entry, idx) => {
                const displayRank = idx;
                
                const getRankStyle = () => {
                  const rank = displayRank;
                  if (rank === 0) return 'bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/30';
                  if (rank === 1) return 'bg-slate-300 text-slate-700';
                  if (rank === 2) return 'bg-orange-400 text-white';
                  return 'bg-purple-800/50 text-purple-400';
                };
                
                return (
                  <tr key={entry.playerId} className="transition-colors hover:bg-purple-800/20">
                    <td className="px-6 py-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${getRankStyle()}`}>
                        {displayRank + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-lg italic uppercase">{entry.playerName}</span>
                        {entry.playerNickname && (
                          <span className="text-purple-400 font-semibold text-sm">"{entry.playerNickname}"</span>
                        )}
                      </div>
                    </td>
                    {isEvent && (
                      <td className="px-4 py-4 text-center">
                        {(() => {
                          const player = tournament.players.find(p => p.id === entry.playerId);
                          const skill = player?.skillLevel || 'medium';
                          return (
                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${SKILL_COLORS[skill].bg} ${SKILL_COLORS[skill].text}`}>
                              {t(`skill.${skill}`)}
                            </span>
                          );
                        })()}
                      </td>
                    )}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1 font-black text-sm">
                        <span className="text-emerald-400">{t('common.wins', { n: entry.wins })}</span>
                        <span className="text-purple-700">-</span>
                        <span className="text-rose-400">{t('common.losses', { n: entry.losses })}</span>
                        <span className="text-purple-700">-</span>
                        <span className="text-purple-500">{t('common.ties', { n: entry.ties })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-purple-400 font-bold">{entry.matchesPlayed}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-3xl text-white italic tracking-tighter">{entry.totalPoints}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-purple-950/95 backdrop-blur-md border-t border-purple-800 px-4 md:px-6 py-2.5 md:py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-purple-400 text-[10px] md:text-xs font-bold">{t('display.liveUpdated', { time: lastUpdated.toLocaleTimeString(locale) })}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="dark" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardDisplay;
