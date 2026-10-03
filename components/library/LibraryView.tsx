import React, { useMemo, useState } from 'react';
import { AlertTriangle, FolderOpen, Plus, Search, Upload } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useLibrary } from '../../hooks/useLibrary.ts';
import { describeTournament, tournamentStatus, type TournamentStatus, type TournamentSummary } from '../../utils/tournamentSummary.ts';
import { nameKey } from '../../utils/playerNames.ts';
import type { Tournament } from '../../types.ts';
import TournamentCard from './TournamentCard.tsx';

interface Props {
  current: Tournament | null;
  highlightId: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
  onImport: () => void;
  onRename: (id: string) => void;
  onExport: (id: string) => void;
  onDelete: (id: string) => void;
}

type Filter = 'all' | 'unfinished' | 'finished';
interface Row { id: string; summary: TournamentSummary; status: TournamentStatus; date?: string }

const LibraryView: React.FC<Props> = ({ current, highlightId, onOpen, onNew, onImport, onRename, onExport, onDelete }) => {
  const { t } = useI18n();
  const { entries, unavailable, saveFailed } = useLibrary();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = [];
    // The open tournament: live summary (the saved copy lags behind by the autosave delay)
    if (current) {
      const summary = describeTournament(current);
      list.push({ id: current.id, summary, status: 'open', date: current.createdAt });
    }
    (entries ?? []).filter(e => e.id !== current?.id).forEach(e => list.push({
      id: e.id, summary: e.summary, status: tournamentStatus(e.summary, false), date: e.summary.createdAt ?? e.savedAt,
    }));
    return list;
  }, [entries, current]);

  const q = nameKey(query);
  const visible = rows.filter(r =>
    (filter === 'all' || (filter === 'finished' ? r.status === 'finished' : r.status !== 'finished')) &&
    (!q || nameKey(r.summary.name).includes(q))
  );

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: t('library.filterAll') },
    { id: 'unfinished', label: t('library.filterUnfinished') },
    { id: 'finished', label: t('library.filterFinished') },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
          <FolderOpen className="w-7 h-7 text-indigo-500" /> {t('library.title', { n: rows.length })}
        </h2>
        <div className="flex gap-2">
          <button onClick={onNew} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 active:scale-95 transition-all">
            <Plus className="w-4 h-4" /> {t('library.new')}
          </button>
          <button onClick={onImport} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold text-sm hover:bg-slate-50 active:scale-95 transition-all">
            <Upload className="w-4 h-4" /> {t('library.import')}
          </button>
        </div>
      </div>

      {(unavailable || saveFailed) && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-sm font-medium">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
          {unavailable ? t('library.unavailable') : t('library.saveFailed')}
        </div>
      )}

      {rows.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl">
            {filters.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={`flex-1 sm:flex-none whitespace-nowrap px-2 sm:px-3 py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase sm:tracking-wider transition-all ${filter === f.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('library.search')}
              className="flex-1 min-w-0 py-2.5 bg-transparent outline-none text-base md:text-sm font-medium"
            />
          </label>
        </div>
      )}

      {entries === null ? null : rows.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-10 text-center">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium mb-6">{t('library.empty')}</p>
          <div className="flex justify-center gap-3">
            <button onClick={onNew} className="px-5 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700">{t('library.prepare')}</button>
            <button onClick={onImport} className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50">{t('library.import')}</button>
          </div>
        </div>
      ) : visible.length === 0 ? (
        <p className="text-center text-slate-500 font-medium py-10">{t('library.noResults')}</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {visible.map(r => (
            <TournamentCard
              key={r.id}
              summary={r.summary}
              status={r.status}
              date={r.date}
              highlighted={r.id === highlightId}
              onOpen={() => onOpen(r.id)}
              onRename={() => onRename(r.id)}
              onExport={() => onExport(r.id)}
              onDelete={() => onDelete(r.id)}
            />
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <p className="text-center text-[11px] font-bold uppercase tracking-widest text-slate-400">{rows.length === 1 ? t('library.onDeviceOne') : t('library.onDevice', { n: rows.length })}</p>
      )}
    </div>
  );
};

export default LibraryView;
