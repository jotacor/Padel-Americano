import React, { useState } from 'react';
import { CalendarDays, Download, Ellipsis, Link2, Pencil, Play, Trash2, Trophy, Users } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.tsx';
import type { TournamentStatus, TournamentSummary } from '../../utils/tournamentSummary.ts';

interface Props {
  summary: TournamentSummary;
  status: TournamentStatus;
  date?: string; // ISO
  highlighted: boolean;
  onOpen: () => void;
  onRename: () => void;
  onExport: () => void;
  onDelete: () => void;
}

const STATUS_STYLE: Record<TournamentStatus, string> = {
  open: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  unfinished: 'bg-amber-50 text-amber-700 border-amber-200',
  finished: 'bg-slate-100 text-slate-600 border-slate-200',
};

const TournamentCard: React.FC<Props> = ({ summary: s, status, date, highlighted, onOpen, onRename, onExport, onDelete }) => {
  const { t, locale } = useI18n();
  const [showActions, setShowActions] = useState(false);
  const isLeague = s.mode === 'event';
  const progress = s.totalMatches ? s.matchesCompleted / s.totalMatches : 0;
  const statusLabel = { open: t('library.statusOpen'), unfinished: t('library.statusUnfinished'), finished: t('library.statusFinished') }[status];

  return (
    <div className={`bg-white rounded-3xl border p-5 md:p-6 shadow-sm transition-all ${highlighted ? 'border-emerald-400 ring-4 ring-emerald-100' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-black text-slate-900 text-lg leading-tight break-words min-w-0">{s.name}</h3>
        <span className={`shrink-0 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${STATUS_STYLE[status]}`}>{statusLabel}</span>
      </div>

      <div className="flex flex-wrap gap-2 mt-3 text-[11px] font-bold">
        <span className={`px-2 py-0.5 rounded-lg ${isLeague ? 'bg-purple-50 text-purple-700' : 'bg-indigo-50 text-indigo-700'}`}>
          {isLeague ? t('setup.event') : t('setup.classic')}
        </span>
        {s.pairMode === 'fixed' && (
          <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 flex items-center gap-1"><Link2 className="w-3 h-3" /> {t('setup.pairsFixed')}</span>
        )}
        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 flex items-center gap-1">
          <Users className="w-3 h-3" /> {s.pairs !== undefined ? t('library.pairs', { n: s.pairs }) : t('library.players', { n: s.players })}
        </span>
        {date && (
          <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 flex items-center gap-1">
            <CalendarDays className="w-3 h-3" /> {new Date(date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="text-xs font-bold text-slate-500">
          {t('library.progress', { played: s.roundsPlayed, rounds: s.totalRounds, done: s.matchesCompleted, total: s.totalMatches })}
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
          <div className={`h-full rounded-full ${isLeague ? 'bg-purple-500' : 'bg-indigo-500'}`} style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </div>

      {(s.champions || s.leader) && (
        <div className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-700">
          <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="truncate">
            {s.champions ? t('library.champions', { name: s.champions }) : t('library.leader', { name: s.leader ?? '', points: s.leaderPoints ?? 0 })}
          </span>
        </div>
      )}

      <div className="mt-5 flex items-center gap-2">
        <button
          onClick={onOpen}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm text-white transition-all active:scale-95 ${isLeague ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          <Play className="w-4 h-4" /> {status === 'open' ? t('library.continue') : t('library.open')}
        </button>
        <button
          onClick={() => setShowActions(v => !v)}
          aria-expanded={showActions}
          aria-label={t('library.more')}
          className={`p-3 rounded-2xl border transition-colors ${showActions ? 'bg-slate-100 border-slate-300' : 'border-slate-200 hover:bg-slate-50'}`}
        >
          <Ellipsis className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {showActions && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button onClick={onRename} className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50">
            <Pencil className="w-4 h-4" /> {t('library.rename')}
          </button>
          <button onClick={onExport} className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50">
            <Download className="w-4 h-4" /> {t('library.export')}
          </button>
          <button onClick={onDelete} className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50">
            <Trash2 className="w-4 h-4" /> {t('library.delete')}
          </button>
        </div>
      )}
    </div>
  );
};

export default TournamentCard;
