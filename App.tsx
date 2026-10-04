import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Player, Tournament, LeaderboardEntry, Pair, PairMode } from './types.ts';
import { generateAmericanoSchedule, generateAdditionalRound, generateChampionshipRound, generateEventRound, generateSkillBalancedSchedule, packRounds } from './utils/scheduler.ts';
import { useI18n, LanguageLink } from './i18n/I18nContext.tsx';
import type { TranslationKey } from './i18n/translations.ts';
import { cleanName, isNameTaken, upperNames, withUpperNames } from './utils/playerNames.ts';
import { applyScoreInput, DEFAULT_POINTS, POINTS_OPTIONS, scoreSumMismatch, type Side } from './utils/scoring.ts';
import { useShareSync } from './hooks/useShareSync.ts';
import { liveRoundIndex } from './utils/rounds.ts';
import ShareModal from './components/ShareModal.tsx';
import { roundText, standingsText } from './utils/shareText.ts';
import { copyText, newId } from './utils/browser.ts';
import { generateFixedPairsSchedule, generateFixedPairsRound, generateFixedPairsChampionship, pairKey } from './utils/fixedPairs.ts';
import { computeLeaderboard, pairOfEntry } from './utils/leaderboard.ts';
import { generateRankedRound, leagueMatchmaking, playerStrengths } from './utils/ranking.ts';
import { 
  Users, 
  Trophy, 
  Layout, 
  Settings, 
  Plus, 
  Trash2, 
  Play, 
  ChevronRight, 
  ChevronLeft,
  Trash,
  Info,
  Award,
  ShieldCheck,
  Zap,
  Share2,
  Check,
  Loader2,
  Link as LinkIcon,
  UserPlus,
  UserMinus,
  Minus,
  Shuffle,
  Link2,
  Unlink,
  Download,
  Copy,
  Upload
} from 'lucide-react';

const SKILL_COLORS = {
  low: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', card: 'bg-emerald-50 border-emerald-200 hover:border-emerald-300' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', card: 'bg-amber-50 border-amber-200 hover:border-amber-300' },
  high: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500', card: 'bg-rose-50 border-rose-200 hover:border-rose-300' },
};

const MAX_COURTS = 10;

/**
 * Saved setup + open tournament, read once to initialize state (not in an effect: React StrictMode runs
 * effects twice in dev, so the save effects would overwrite the storage with empty state before loading).
 */
const readSavedState = () => {
  const parseSaved = <T,>(key: string): T | null => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : null;
    } catch (e) {
      console.error(`Ignoring corrupted ${key}`, e); // must not leave a blank screen
      return null;
    }
  };
  const get = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
  try { localStorage.removeItem('padel_court_names'); } catch { /* court names were removed */ }
  const players = parseSaved<Player[]>('padel_players');
  const pairs = parseSaved<Pair[]>('padel_pairs');
  const rawTournament = parseSaved<Tournament>('padel_tournament');
  const tournament = rawTournament && Array.isArray(rawTournament.players) && Array.isArray(rawTournament.rounds) ? withUpperNames(rawTournament) : null;
  const points = get('padel_points_per_match');
  const classicCourts = parseInt(get('padel_classic_courts') ?? '');
  return {
    players: Array.isArray(players) ? upperNames(players) : [],
    tournament,
    eventMode: tournament ? tournament.mode === 'event' : get('padel_event_mode') === 'true',
    eventNumCourts: tournament?.numCourts || parseInt(get('padel_event_courts') ?? '') || 4,
    classicCourts: classicCourts > 0 ? classicCourts : null,
    setupPoints: points === 'free' ? null : parseInt(points ?? '') > 0 ? parseInt(points!) : DEFAULT_POINTS,
    pairMode: (tournament?.pairMode ?? (get('padel_pair_mode') === 'fixed' ? 'fixed' : 'rotating')) as PairMode,
    pairs: tournament?.pairs ?? (Array.isArray(pairs) ? pairs : []),
    prioritizeSkill: get('padel_prioritize_skill') === 'true',
    leagueSkill: get('padel_league_prioritize_skill') !== 'false',
    leagueRanking: get('padel_prioritize_ranking') === 'true',
  };
};

const App: React.FC = () => {
  const { t, locale, courtLabel } = useI18n();
  const [saved] = useState(readSavedState);
  const [activeTab, setActiveTab] = useState<'setup' | 'rounds' | 'leaderboard'>(saved.tournament ? 'rounds' : 'setup');
  const [players, setPlayers] = useState<Player[]>(saved.players);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [newPlayerSkill, setNewPlayerSkill] = useState<'low' | 'medium' | 'high'>('medium');
  const [tournament, setTournament] = useState<Tournament | null>(saved.tournament);
  const shareSync = useShareSync(tournament);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  
  // League ("event") mode
  const [eventMode, setEventMode] = useState(saved.eventMode);
  const [eventNumCourts, setEventNumCourts] = useState(saved.eventNumCourts);
  // Random: courts the club gives us; null = all that fit (players ÷ 4)
  const [classicCourts, setClassicCourts] = useState<number | null>(saved.classicCourts);
  // Matches to a fixed points total (null = free scoring); the open tournament's value wins
  const [setupPoints, setSetupPoints] = useState<number | null>(saved.setupPoints);

  // Pairs: rotating (Americano) or fixed (manager picks partners)
  const [pairMode, setPairMode] = useState<PairMode>(saved.pairMode);
  const [pairs, setPairs] = useState<Pair[]>(saved.pairs);
  const [pairingWith, setPairingWith] = useState<string | null>(null);
  // Random + rotating: trade perfect Whist rotation for skill-even matches
  const [prioritizeSkill, setPrioritizeSkill] = useState(saved.prioritizeSkill);
  // League matchmaking: declared skill (default, legacy behavior) and/or current standings
  const [leagueSkill, setLeagueSkill] = useState(saved.leagueSkill);
  const [leagueRanking, setLeagueRanking] = useState(saved.leagueRanking);
  
  // Live sharing (KV, 24 h after the last update)
  const [showShareModal, setShowShareModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  

  const isEvent = eventMode || tournament?.mode === 'event';
  const isFixed = (tournament?.pairMode ?? pairMode) === 'fixed';
  const minForFinals = isFixed ? 2 : 4;
  
  // Theme classes
  const tc = {
    primary: isEvent ? 'bg-purple-600' : 'bg-indigo-600',
    primaryHover: isEvent ? 'hover:bg-purple-700' : 'hover:bg-indigo-700',
    primaryText: isEvent ? 'text-purple-600' : 'text-indigo-600',
    primaryLight: isEvent ? 'bg-purple-50' : 'bg-indigo-50',
    primaryBorder: isEvent ? 'border-purple-200' : 'border-indigo-200',
    activeTab: isEvent ? 'text-purple-600 bg-purple-50' : 'text-indigo-600 bg-indigo-50',
    focusBorder: isEvent ? 'focus:border-purple-600' : 'focus:border-indigo-600',
    shadow: isEvent ? 'shadow-purple-100' : 'shadow-indigo-100',
  };

  // Calculate number of courts based on mode
  const maxClassicCourts = Math.floor((tournament?.players ?? players).length / 4);
  const numCourts = isEvent ? eventNumCourts
    : tournament ? (tournament.numCourts ?? maxClassicCourts)
    : Math.min(classicCourts ?? maxClassicCourts, maxClassicCourts);

  useEffect(() => {
    localStorage.setItem('padel_players', JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    if (tournament) localStorage.setItem('padel_tournament', JSON.stringify(tournament));
  }, [tournament]);

  useEffect(() => {
    localStorage.setItem('padel_event_mode', eventMode.toString());
  }, [eventMode]);

  useEffect(() => {
    localStorage.setItem('padel_event_courts', eventNumCourts.toString());
  }, [eventNumCourts]);

  useEffect(() => {
    if (classicCourts) localStorage.setItem('padel_classic_courts', String(classicCourts));
    else localStorage.removeItem('padel_classic_courts');
    // 'free' is stored explicitly: absent means the default (11)
    localStorage.setItem('padel_points_per_match', setupPoints ? String(setupPoints) : 'free');
  }, [classicCourts, setupPoints]);

  useEffect(() => {
    localStorage.setItem('padel_pair_mode', pairMode);
    localStorage.setItem('padel_prioritize_skill', String(prioritizeSkill));
    localStorage.setItem('padel_league_prioritize_skill', String(leagueSkill));
    localStorage.setItem('padel_prioritize_ranking', String(leagueRanking));
    localStorage.setItem('padel_pairs', JSON.stringify(pairs));
  }, [pairMode, pairs, prioritizeSkill, leagueSkill, leagueRanking]);

  const startSharing = async () => {
    if (!tournament) return;
    if (await shareSync.start(tournament)) setShowShareModal(true);
    else alert(t('alert.shareFailed'));
  };

  const stopSharing = async () => {
    if (!window.confirm(t('confirm.stopSharing'))) return;
    await shareSync.end();
  };

  // The link expired (24 h without updates) or this device lost write access
  useEffect(() => {
    if (!shareSync.ended) return;
    alert(t(shareSync.ended === 'expired' ? 'alert.shareExpired' : 'alert.shareRevoked'));
    shareSync.dismissEnded();
  }, [shareSync.ended]);

  const addPlayer = () => {
    const name = cleanName(newPlayerName);
    if (!name) return;
    if (isNameTaken(name, [...players, ...(tournament?.players ?? [])])) {
      setNameError(t('players.duplicateName', { name }));
      return;
    }
    const newPlayer: Player = {
      id: newId(),
      name,
      skillLevel: newPlayerSkill,
      ...(isEvent && { isActive: true }),
    };
    setPlayers(prev => [...prev, newPlayer]);
    
    // If tournament is running in event mode, add player to tournament too
    if (tournament && tournament.mode === 'event') {
      setTournament(prev => prev ? {
        ...prev,
        players: [...prev.players, newPlayer],
      } : prev);
    }
    
    setNewPlayerName('');
    setNameError(null);
  };

  const removePlayer = (id: string) => {
    if (tournament?.mode === 'event') {
      // In event mode, just deactivate instead of removing
      togglePlayerActive(id);
      return;
    }
    setPlayers(players.filter(p => p.id !== id));
    setPairs(prev => prev.filter(pair => !pair.includes(id)));
    if (pairingWith === id) setPairingWith(null);
  };

  const togglePlayerActive = (id: string) => {
    // Fixed pairs join and sit out together
    const partner = isFixed ? partnerOf(id) : null;
    const ids = new Set(partner ? [id, partner] : [id]);
    const active = !(players.find(p => p.id === id)?.isActive !== false);
    const apply = (list: Player[]) => list.map(p => ids.has(p.id) ? { ...p, isActive: active } : p);
    setPlayers(apply);
    if (tournament?.mode === 'event') {
      setTournament(prev => prev ? { ...prev, players: apply(prev.players) } : prev);
    }
  };

  // Fixed pairs. After a League starts, new pairs can still be formed from unpaired players
  const currentPairs = tournament?.pairs ?? pairs;
  const canEditPairs = !tournament || tournament.mode === 'event';
  const partnerOf = (id: string): string | null => {
    const pair = currentPairs.find(p => p.includes(id));
    return pair ? (pair[0] === id ? pair[1] : pair[0]) : null;
  };
  const pairHasPlayed = (pair: Pair) => !!tournament?.rounds.some(r =>
    r.matches.some(m => pairKey(m.teamA) === pairKey(pair) || pairKey(m.teamB) === pairKey(pair)));
  const updatePairs = (fn: (prev: Pair[]) => Pair[]) => {
    setPairs(fn);
    if (tournament) setTournament(prev => prev ? { ...prev, pairs: fn(prev.pairs ?? []) } : prev);
  };
  const selectForPair = (id: string) => {
    if (!pairingWith) return setPairingWith(id);
    if (pairingWith !== id) updatePairs(prev => [...prev, [pairingWith, id]]);
    setPairingWith(null);
  };
  const unpair = (pair: Pair) => updatePairs(prev => prev.filter(p => pairKey(p) !== pairKey(pair)));

  const startTournament = () => {
    if (players.length < 4) return alert(t('alert.minPlayers'));
    const fixed = pairMode === 'fixed';
    const tournamentPairs = pairs.filter(pair => pair.every(id => players.some(p => p.id === id)));
    if (fixed) {
      if (tournamentPairs.length < 2) return alert(t('alert.minPairs'));
      const unpaired = players.filter(p => !tournamentPairs.some(pair => pair.includes(p.id)));
      // League lets unpaired players wait for a partner; Random needs everyone paired up front
      if (!eventMode && unpaired.length) return alert(t('alert.unpairedPlayers', { names: unpaired.map(p => p.name).join(', ') }));
    }
    const pairFields = { pairMode, ...(fixed && { pairs: tournamentPairs }) };
    
    let tournamentPlayers = [...players];
    
    // In event mode, mark all players as active
    if (eventMode) {
      tournamentPlayers = tournamentPlayers.map(p => ({ ...p, isActive: true }));
      setPlayers(tournamentPlayers);
    }
    
    if (eventMode) {
      // Event mode: start with no rounds, generate on demand
      setTournament({
        id: newId(),
        name: t('tournament.leagueName', { date: new Date().toLocaleDateString(locale) }),
        players: tournamentPlayers,
        rounds: [],
        isStarted: true,
        mode: 'event',
        ...(setupPoints && { pointsPerMatch: setupPoints }),
        createdAt: new Date().toISOString(),
        numCourts: eventNumCourts,
        ...pairFields,
        prioritizeSkill: leagueSkill,
        ...(leagueRanking && { prioritizeRanking: true }),
      });
    } else {
      const balanced = !fixed && prioritizeSkill;
      const fullSchedule = fixed
        ? generateFixedPairsSchedule(tournamentPairs)
        : balanced ? generateSkillBalancedSchedule(tournamentPlayers) : generateAmericanoSchedule(tournamentPlayers);
      // Fewer courts than players ÷ 4: same matches spread over more rounds
      const rounds = packRounds(fullSchedule, numCourts, tournamentPlayers.map(p => p.id));
      setTournament({
        id: newId(),
        name: t('tournament.classicName', { date: new Date().toLocaleDateString(locale) }),
        players: tournamentPlayers,
        rounds,
        isStarted: true,
        mode: 'classic',
        ...(setupPoints && { pointsPerMatch: setupPoints }),
        createdAt: new Date().toISOString(),
        numCourts,
        ...pairFields,
        ...(balanced && { prioritizeSkill: true }),
      });
    }
    setPairingWith(null);
    setCurrentRoundIndex(0);
    setActiveTab('rounds');
  };


  const resetTournament = async () => {
    if (window.confirm(t('confirm.endTournament'))) {
      await shareSync.end();
      setTournament(null);
      localStorage.removeItem('padel_tournament');
      setActiveTab('setup');
    }
  };

  const clearAllData = async () => {
    if (window.confirm(t('confirm.clearAll'))) {
      await shareSync.end();
      setTournament(null);
      setPlayers([]);
      setEventMode(false);
      setPairMode('rotating');
      setPairs([]);
      setPrioritizeSkill(false);
      setLeagueSkill(true);
      setLeagueRanking(false);
      setClassicCourts(null);
      setSetupPoints(DEFAULT_POINTS);
      localStorage.removeItem('padel_tournament');
      localStorage.removeItem('padel_players');
      localStorage.removeItem('padel_share_state');
      localStorage.removeItem('padel_event_mode');
      localStorage.removeItem('padel_event_courts');
      localStorage.removeItem('padel_classic_courts');
      localStorage.removeItem('padel_pair_mode');
      localStorage.removeItem('padel_pairs');
      localStorage.removeItem('padel_prioritize_skill');
      localStorage.removeItem('padel_league_prioritize_skill');
      localStorage.removeItem('padel_prioritize_ranking');
      setActiveTab('setup');
    }
  };

  // YAML lib lazy-loaded: only needed on export/import
  const loadTournamentFile = () => import('./utils/tournamentFile.ts');
  const exportTournament = async () => {
    if (!tournament) return;
    const { bumpExportMeta, serializeTournament, exportFilename } = await loadTournamentFile();
    const updated = bumpExportMeta(tournament);
    setTournament(updated);
    const url = URL.createObjectURL(new Blob([serializeTournament(updated)], { type: 'application/yaml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFilename(updated);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importFileRef = useRef<HTMLInputElement>(null);
  const importTournament = async (file: File) => {
    let text: string;
    try {
      text = await file.text();
    } catch {
      return alert(t('alert.importReadFailed'));
    }
    const { parseTournamentFile } = await loadTournamentFile();
    const result = parseTournamentFile(text);
    if ('error' in result) {
      console.error('Import failed:', result.error, result.detail);
      if (result.error === 'tooLarge') return alert(t('alert.importTooLarge'));
      if (result.error === 'unsupportedFormat') return alert(t('alert.importUnsupported', { format: result.detail ?? '' }));
      if (result.error === 'invalidData') return alert(t('alert.importInvalidData', { detail: result.detail ?? '' }));
      return alert(t('alert.importInvalidYaml'));
    }
    if ((tournament || players.length > 0) && !window.confirm(t('confirm.importReplace'))) return;
    await shareSync.end();
    const imported = withUpperNames(result.tournament);
    setTournament(imported);
    setPlayers(imported.players);
    setEventMode(imported.mode === 'event');
    if (imported.numCourts) {
      if (imported.mode === 'event') setEventNumCourts(imported.numCourts);
      else setClassicCourts(imported.numCourts);
    }
    setPairMode(imported.pairMode ?? 'rotating');
    setPairs(imported.pairs ?? []);
    if (imported.mode === 'event') {
      const mm = leagueMatchmaking(imported);
      setLeagueSkill(mm.skill);
      setLeagueRanking(mm.ranking);
    } else {
      setPrioritizeSkill(!!imported.prioritizeSkill);
    }
    setPairingWith(null);
    // Resume at the first round with unfinished matches
    setCurrentRoundIndex(liveRoundIndex(imported));
    const anyScored = imported.rounds.some(r => r.matches.some(m => m.isCompleted));
    setActiveTab(anyScored ? 'leaderboard' : 'rounds');
  };

  const addRound = () => {
    if (!tournament) return;
    const newRoundIndex = tournament.rounds.length;
    
    const fixed = tournament.pairMode === 'fixed';
    if (tournament.mode === 'event') {
      const activePlayers = tournament.players.filter(p => p.isActive !== false);
      const activeIds = new Set(activePlayers.map(p => p.id));
      const activePairs = (tournament.pairs ?? []).filter(pair => pair.every(id => activeIds.has(id)));
      if (fixed ? activePairs.length < 2 : activePlayers.length < 4) {
        return alert(t(fixed ? 'alert.minActivePairs' : 'alert.minActivePlayers'));
      }
      const nc = tournament.numCourts || Math.floor(activePlayers.length / 4);
      // Strengths re-evaluated every round from the results so far (when ranking is prioritized)
      const mm = leagueMatchmaking(tournament);
      const strengths = playerStrengths(tournament.players, tournament.rounds, mm);
      const strength = (id: string) => strengths.get(id) ?? 2;
      const newRound = fixed
        ? generateFixedPairsRound(activePairs, tournament.players, tournament.rounds, newRoundIndex, nc, { strength, ranked: mm.ranking })
        : mm.ranking
        ? generateRankedRound(activePlayers, tournament.players, tournament.rounds, newRoundIndex, nc, strength)
        : generateEventRound(activePlayers, tournament.players, tournament.rounds, newRoundIndex, nc, p => strength(p.id));
      setTournament({
        ...tournament,
        rounds: [...tournament.rounds, newRound],
      });
    } else {
      const nc = tournament.numCourts ?? Math.floor(tournament.players.length / 4);
      const newRound = fixed
        ? generateFixedPairsRound(tournament.pairs ?? [], tournament.players, tournament.rounds, newRoundIndex, nc)
        : tournament.prioritizeSkill
        ? generateEventRound(tournament.players, tournament.players, tournament.rounds, newRoundIndex, nc)
        : generateAdditionalRound(tournament.players, tournament.rounds, newRoundIndex, nc);
      setTournament({
        ...tournament,
        rounds: [...tournament.rounds, newRound]
      });
    }
    setCurrentRoundIndex(newRoundIndex);
  };

  const addChampionshipRound = () => {
    if (!tournament || leaderboard.length < minForFinals) return;
    const newRoundIndex = tournament.rounds.length;
    const newRound = isFixed
      ? generateFixedPairsChampionship(
        leaderboard.map(e => pairOfEntry(tournament, e)).filter((p): p is Pair => !!p),
        newRoundIndex,
        tournament.numCourts ?? Math.floor(tournament.players.length / 4)
      )
      : generateChampionshipRound(
        tournament.players,
        leaderboard,
        tournament.rounds,
        newRoundIndex,
        tournament.numCourts
      );
    setTournament({
      ...tournament,
      rounds: [...tournament.rounds, newRound]
    });
    setCurrentRoundIndex(newRoundIndex);
    setActiveTab('rounds');
  };

  // Side the organizer typed last in each match: the other one may be auto-filled (applyScoreInput)
  const lastTypedSide = useRef<Record<string, Side>>({});
  const updateScore = (roundIdx: number, matchId: string, team: Side, score: string) => {
    if (!tournament) return;
    const newRounds = tournament.rounds.map((r, ri) => ri === roundIdx ? {
      ...r, matches: r.matches.map(m => m.id === matchId
        ? { ...m, ...applyScoreInput(m, team, score, tournament.pointsPerMatch, lastTypedSide.current[matchId]) }
        : m)
    } : r);
    lastTypedSide.current[matchId] = team;
    setTournament({ ...tournament, rounds: newRounds });
  };

  /** Enter in a score → next empty score on the page (or close the keyboard) */
  const focusNextScore = (current: HTMLInputElement) => {
    const inputs = [...document.querySelectorAll<HTMLInputElement>('input[data-score]')];
    const next = inputs.slice(inputs.indexOf(current) + 1).find(i => i.value === '');
    if (next) next.focus();
    else current.blur();
  };

  const pointsPerMatch = tournament ? tournament.pointsPerMatch ?? null : setupPoints;
  const setPointsPerMatch = (n: number | null) => {
    setSetupPoints(n);
    if (tournament) setTournament({ ...tournament, pointsPerMatch: n ?? undefined });
  };

  const renderOption = (checked: boolean, onChange: (v: boolean) => void, label: TranslationKey, hint: TranslationKey) => (
    <label className="flex items-start gap-3 cursor-pointer group mt-4">
      <div className={`w-6 h-6 shrink-0 rounded-lg border-2 flex items-center justify-center transition-all ${checked ? `${tc.primary} border-transparent` : 'border-slate-600 group-hover:border-slate-500'}`}>
        {checked && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <span>
        <span className="block text-slate-300 font-bold text-sm">{t(label)}</span>
        <span className="block text-slate-500 text-xs font-medium mt-0.5">{t(hint)}</span>
      </span>
    </label>
  );

  const PlayerName = ({ name, baseClass, inline = false }: { name: string, baseClass: string, inline?: boolean }) =>
    inline ? <span className={baseClass}>{name}</span> : <div className={baseClass}>{name}</div>;

  const getPlayer = (id: string) => tournament?.players.find(p => p.id === id);

  const leaderboard = useMemo<LeaderboardEntry[]>(() => computeLeaderboard(tournament), [tournament]);

  const matchmaking = tournament ? leagueMatchmaking(tournament) : null;
  const matchmakingKey: TranslationKey = !matchmaking ? 'matchmaking.skill'
    : matchmaking.skill && matchmaking.ranking ? 'matchmaking.both' : matchmaking.ranking ? 'matchmaking.ranking'
    : matchmaking.skill ? 'matchmaking.skill' : 'matchmaking.rotation';
  const isPerfect = tournament && tournament.mode !== 'event' && !isFixed && !tournament.prioritizeSkill && [8, 12, 16].includes(tournament.players.length);

  // Active players for event mode
  const activePlayers = players.filter(p => p.isActive !== false);
  const activePairs = currentPairs.filter(pair => pair.every(id => activePlayers.some(p => p.id === id)));
  // Courts: the club decides, not the player count
  const setLeagueCourts = (n: number) => {
    setEventNumCourts(n);
    if (tournament?.mode === 'event') setTournament({ ...tournament, numCourts: n });
  };
  const playable = isEvent ? (isFixed ? activePairs.length * 2 : activePlayers.length) : (tournament?.players ?? players).length;
  const usedCourts = Math.min(numCourts, Math.floor(playable / 4));
  const courtsHint = !playable ? null
    : numCourts > usedCourts ? t('setup.courtsUnused', { n: numCourts - usedCourts })
    : playable > usedCourts * 4 ? t('setup.restingPerRound', { n: playable - usedCourts * 4 })
    : null;
  // Random before start: full schedule (N−1 rounds, N if odd; pairs for fixed) spread over the chosen courts
  const estimatedClassicRounds = (() => {
    const n = isFixed ? currentPairs.length : players.length;
    const fullRounds = n > 1 ? (n % 2 === 0 ? n - 1 : n) : 0;
    const perRound = isFixed ? Math.floor(n / 2) : Math.floor(n / 4);
    return numCourts && perRound > numCourts ? Math.ceil(fullRounds * perRound / numCourts) : fullRounds;
  })();
  const renderStepper = (value: number, min: number, max: number, onChange: (n: number) => void) => (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={t('setup.fewerCourts')}
        className="w-9 h-9 rounded-xl border-2 border-slate-700 text-slate-300 hover:border-slate-500 disabled:opacity-30 disabled:hover:border-slate-700 flex items-center justify-center">
        <Minus className="w-4 h-4" strokeWidth={3} />
      </button>
      <span className="w-10 text-center text-3xl md:text-4xl font-black tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={t('setup.moreCourts')}
        className="w-9 h-9 rounded-xl border-2 border-slate-700 text-slate-300 hover:border-slate-500 disabled:opacity-30 disabled:hover:border-slate-700 flex items-center justify-center">
        <Plus className="w-4 h-4" strokeWidth={3} />
      </button>
    </div>
  );
  const currentRoundComplete = tournament?.rounds[tournament.rounds.length - 1]?.matches.every(m => m.isCompleted) ?? true;

  /** Text (round line-up, standings) on the clipboard, to paste wherever you like */
  const copyToClipboard = async (text: string, done: TranslationKey) => {
    if (!(await copyText(text))) return void window.prompt('', text);
    setToast(t(done));
    setTimeout(() => setToast(null), 2500);
  };
  const copyRound = (text: string) => copyToClipboard(text, 'share.roundCopied');
  const copyStandings = (text: string) => copyToClipboard(text, 'share.standingsCopied');
  const textCtx = { t, courtLabel, locale };
  // Keyboard navigation for rounds
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!tournament || activeTab !== 'rounds') return;
      if (e.target instanceof HTMLInputElement) return;
      
      if (e.key === 'ArrowLeft' && currentRoundIndex > 0) {
        setCurrentRoundIndex(i => i - 1);
      } else if (e.key === 'ArrowRight' && currentRoundIndex < tournament.rounds.length - 1) {
        setCurrentRoundIndex(i => i + 1);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tournament, activeTab, currentRoundIndex]);

  return (
    <div className="min-h-screen bg-[#fcfdfe] pb-24 md:pb-6 md:pl-24 font-inter antialiased">
      <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-0 md:w-24 bg-white/90 backdrop-blur-md border-t md:border-t-0 md:border-r border-slate-200 z-50 flex md:flex-col justify-around md:justify-center items-center py-2 md:py-4 md:space-y-12">
        {[
          { tab: 'setup', icon: Settings, label: t('nav.setup') },
          { tab: 'rounds', icon: Layout, label: t('nav.matches'), disabled: !tournament },
          { tab: 'leaderboard', icon: Trophy, label: t('nav.scores'), disabled: !tournament }
        ].map(item => (
          <button 
            key={item.tab}
            disabled={item.disabled}
            onClick={() => setActiveTab(item.tab as any)}
            className={`flex flex-col items-center gap-1 p-2 md:p-3 rounded-2xl transition-all ${activeTab === item.tab ? tc.activeTab + ' shadow-sm' : 'text-slate-400 hover:text-slate-600'} ${item.disabled ? 'opacity-20' : 'active:scale-90'}`}
          >
            <item.icon className="w-6 h-6 md:w-7 md:h-7" strokeWidth={activeTab === item.tab ? 2.5 : 2} />
            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        <header className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <div className="flex items-center gap-3 mb-2">
                <div className={`${tc.primary} text-white p-2 md:p-2.5 rounded-xl md:rounded-2xl shadow-xl ${tc.shadow}`}>
                  <Zap className="w-6 h-6 md:w-7 md:h-7" fill="currentColor" />
                </div>
                <h1 className="text-3xl md:text-4xl font-[900] text-slate-900 tracking-tight italic">
                  PADEL<span className={tc.primaryText}>AMERICANO</span>
                </h1>
              </div>
              <p className="text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.3em] pl-1">{isEvent ? t('header.taglineLeague') : t('header.tagline')}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 self-center md:self-auto">
          {isPerfect && (
              <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 px-4 py-2 md:px-6 md:py-3 rounded-2xl md:rounded-[1.5rem] border border-emerald-100 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <div className="flex flex-col">
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest leading-none mb-1">{t('header.whistTournament')}</span>
                <span className="text-xs md:text-sm font-bold leading-none">{t('header.perfectBalance')}</span>
              </div>
            </div>
          )}
            {tournament && (
              <button
                onClick={() => shareSync.share ? setShowShareModal(true) : startSharing()}
                disabled={shareSync.creating}
                className={`relative flex items-center gap-2 px-4 py-2 md:px-5 md:py-3 rounded-2xl font-bold transition-all active:scale-95 ${
                  shareSync.share
                    ? `${tc.primaryLight} ${tc.primaryText} border ${tc.primaryBorder}` 
                    : `${tc.primary} text-white shadow-lg`
                }`}
              >
                {shareSync.creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : shareSync.share ? (
                  <LinkIcon className="w-4 h-4" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                <span className="text-sm">{shareSync.share ? t('header.sharing') : t('header.share')}</span>
                {shareSync.share && shareSync.status === 'retrying' && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-white" title={t('share.retrying')} />
                )}
              </button>
            )}
          </div>
        </header>

        {activeTab === 'setup' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="lg:col-span-2 bg-white rounded-3xl md:rounded-[3rem] shadow-sm border border-slate-200 p-6 md:p-10 relative overflow-hidden">
              {/* Tournament in progress overlay - only for classic mode */}
              {tournament && tournament.mode !== 'event' && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6">
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 md:p-8 text-center max-w-md">
                    <ShieldCheck className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h3 className="text-xl font-black text-slate-800 mb-2">{t('setup.inProgressTitle')}</h3>
                    <p className="text-slate-600 text-sm mb-4">{t('setup.inProgressBody')}</p>
                    <button onClick={resetTournament} className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-xl font-bold transition-all">
                      {t('setup.endTournament')}
                    </button>
                  </div>
                </div>
              )}

              {/* Event mode banner when tournament is running */}
              {tournament?.mode === 'event' && (
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                  <span className="text-purple-700 font-bold text-sm">{t('setup.eventModeActive')}</span>
                </div>
              )}

              <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-6 md:mb-8 flex items-center gap-3"><Users className={`w-5 h-5 md:w-6 md:h-6 ${tc.primaryText}`} /> {t('setup.players')}</h2>
              
              {/* Player input */}
              <div className="flex flex-col gap-3 mb-6">
                <div className="flex gap-2 md:gap-4">
                  <input type="text" value={newPlayerName} onChange={(e) => { setNewPlayerName(e.target.value); setNameError(null); }} onKeyDown={(e) => e.key === 'Enter' && addPlayer()} placeholder={t('common.playerNamePlaceholder')} disabled={!!tournament && tournament.mode !== 'event'} aria-invalid={!!nameError} aria-describedby={nameError ? 'player-name-error' : undefined} className={`flex-1 min-w-0 bg-slate-50 border-2 ${nameError ? 'border-rose-300' : 'border-slate-100'} rounded-2xl md:rounded-3xl px-4 md:px-8 py-4 md:py-5 focus:outline-none ${nameError ? 'focus:border-rose-400' : tc.focusBorder} font-bold text-base md:text-lg disabled:opacity-50`} />
                  <button onClick={addPlayer} disabled={!!tournament && tournament.mode !== 'event'} className={`${tc.primary} text-white px-6 md:px-8 rounded-2xl md:rounded-3xl shadow-lg transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed`}><Plus className="w-6 h-6 md:w-8 md:h-8" strokeWidth={3} /></button>
                </div>
                {nameError && (
                  <p id="player-name-error" role="alert" className="px-2 text-sm font-bold text-rose-500">{nameError}</p>
                )}
                
                {/* Skill level selector (balances matches in both modes) */}
                <div className="flex flex-wrap items-center gap-3 px-1">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{t('common.skillLabel')}</span>
                  {(['low', 'medium', 'high'] as const).map(level => (
                    <button
                      key={level}
                      onClick={() => setNewPlayerSkill(level)}
                      className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                        newPlayerSkill === level
                          ? `${SKILL_COLORS[level].bg} ${SKILL_COLORS[level].text} border-2 ${SKILL_COLORS[level].border}`
                          : 'bg-slate-50 text-slate-400 border-2 border-transparent hover:border-slate-200'
                      }`}
                    >
                      {t(`skill.${level}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fixed pairs */}
              {isFixed && (
                <div className="mb-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm md:text-base font-black text-slate-700 flex items-center gap-2">
                      <Link2 className={`w-4 h-4 ${tc.primaryText}`} /> {t('pairs.title', { n: currentPairs.length })}
                    </h3>
                    {canEditPairs && (
                      <span className={`text-xs font-bold ${pairingWith ? tc.primaryText : 'text-slate-400'}`}>
                        {pairingWith ? t('pairs.selected', { name: players.find(p => p.id === pairingWith)?.name ?? '' }) : t('pairs.hint')}
                      </span>
                    )}
                  </div>
                  {currentPairs.length === 0 ? (
                    <div className="py-4 text-center text-sm text-slate-300 font-bold italic border-2 border-dashed border-slate-100 rounded-2xl">{t('pairs.none')}</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {currentPairs.map(pair => {
                        const [a, b] = pair.map(id => players.find(p => p.id === id));
                        return (
                          <div key={pairKey(pair)} className={`flex items-center justify-between gap-2 rounded-2xl border-2 ${tc.primaryBorder} ${tc.primaryLight} px-4 py-3`}>
                            <span className="font-black text-slate-800 truncate">{a?.name} & {b?.name}</span>
                            {canEditPairs && !pairHasPlayed(pair) && (
                              <button onClick={() => unpair(pair)} title={t('pairs.unpair')} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-white shrink-0">
                                <Unlink className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Player list — card tinted by skill level; grows with the page (no inner scroll) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-2 md:gap-3">
                {players.length === 0 ? (
                  <div className="col-span-full py-16 md:py-20 text-center border-4 border-dashed border-slate-100 rounded-2xl md:rounded-[3rem] text-slate-300 font-black italic">{t('setup.noPlayers')}</div>
                ) : players.map((p, idx) => {
                  const skill = p.skillLevel ?? 'medium';
                  const colors = SKILL_COLORS[skill];
                  const partnerId = isFixed ? partnerOf(p.id) : null;
                  const inactive = tournament?.mode === 'event' && p.isActive === false;
                  return (
                  <div key={p.id} className={`flex items-center gap-3 border-2 rounded-2xl pl-2 pr-2 py-2 transition-all group ${colors.card} ${
                    pairingWith === p.id ? `ring-2 ring-offset-1 ${isEvent ? 'ring-purple-400' : 'ring-indigo-400'}` : ''
                  } ${inactive ? 'opacity-40 grayscale' : ''}`}>
                    <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center font-black text-sm text-white ${colors.dot}`}>{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <PlayerName name={p.name} baseClass="block truncate font-black text-slate-800 text-base md:text-lg leading-tight" inline />
                      <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                        <span className={`text-[10px] font-black uppercase tracking-wider shrink-0 ${colors.text}`}>{t(`skill.${skill}`)}</span>
                        {partnerId && (
                          <span className="text-[10px] font-bold text-slate-500 truncate">
                            · {t('pairs.partnerOf', { name: players.find(x => x.id === partnerId)?.name ?? '' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center shrink-0">
                      {isFixed && canEditPairs && !partnerId && (
                        <button
                          onClick={() => selectForPair(p.id)}
                          title={t('pairs.pairWith')}
                          className={`p-2 rounded-xl transition-all ${pairingWith === p.id ? `${tc.primary} text-white` : 'text-slate-400 hover:text-slate-700 hover:bg-white/70'}`}
                        >
                          <Link2 className="w-5 h-5" />
                        </button>
                      )}
                      {tournament?.mode === 'event' ? (
                        <button
                          onClick={() => togglePlayerActive(p.id)}
                          className={`p-2 rounded-xl transition-all hover:bg-white/70 ${p.isActive !== false ? 'text-emerald-600' : 'text-slate-400'}`}
                          title={p.isActive !== false ? t('setup.activeTitle') : t('setup.sittingOutTitle')}
                        >
                          {p.isActive !== false ? <UserPlus className="w-5 h-5" /> : <UserMinus className="w-5 h-5" />}
                        </button>
                      ) : !tournament ? (
                        <button onClick={() => removePlayer(p.id)} title={t('setup.removePlayer')} className="p-2 rounded-xl text-slate-400/70 hover:text-rose-500 hover:bg-white/70 transition-all"><Trash2 className="w-5 h-5" /></button>
                      ) : null}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* Right panel */}
            <div className={`${isEvent ? 'bg-purple-950' : 'bg-slate-900'} rounded-3xl md:rounded-[3rem] p-6 md:p-10 text-white shadow-2xl space-y-6 md:space-y-8 flex flex-col justify-between`}>
              <div className="space-y-6">
                {/* Mode selector - only before tournament starts */}
                {!tournament && (
                  <div>
                    <h3 className="text-slate-500 font-black uppercase text-[9px] md:text-[10px] tracking-widest mb-3">{t('setup.tournamentMode')}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setEventMode(false)}
                        className={`p-3 rounded-xl text-sm font-bold transition-all text-center ${
                          !eventMode
                            ? 'bg-white/10 border-2 border-white/20 text-white'
                            : 'border-2 border-transparent text-slate-500 hover:border-white/10'
                        }`}
                      >
                        <Zap className="w-5 h-5 mx-auto mb-1" />
                        {t('setup.classic')}
                      </button>
                      <button
                        onClick={() => setEventMode(true)}
                        className={`p-3 rounded-xl text-sm font-bold transition-all text-center ${
                          eventMode
                            ? 'bg-purple-600/30 border-2 border-purple-400/40 text-purple-300'
                            : 'border-2 border-transparent text-slate-500 hover:border-white/10'
                        }`}
                      >
                        <Trophy className="w-5 h-5 mx-auto mb-1" />
                        {t('setup.event')}
                      </button>
                    </div>
                    <h3 className="text-slate-500 font-black uppercase text-[9px] md:text-[10px] tracking-widest mt-5 mb-3">{t('setup.pairing')}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {(['rotating', 'fixed'] as const).map(mode => {
                        const Icon = mode === 'rotating' ? Shuffle : Link2;
                        return (
                          <button
                            key={mode}
                            onClick={() => { setPairMode(mode); setPairingWith(null); }}
                            className={`p-3 rounded-xl text-sm font-bold transition-all text-center ${
                              pairMode === mode
                                ? (isEvent ? 'bg-purple-600/30 border-2 border-purple-400/40 text-purple-300' : 'bg-white/10 border-2 border-white/20 text-white')
                                : 'border-2 border-transparent text-slate-500 hover:border-white/10'
                            }`}
                          >
                            <Icon className="w-5 h-5 mx-auto mb-1" />
                            {t(mode === 'rotating' ? 'setup.pairsRotating' : 'setup.pairsFixed')}
                          </button>
                        );
                      })}
                    </div>
                    {!eventMode && pairMode === 'rotating' && renderOption(prioritizeSkill, setPrioritizeSkill, 'setup.prioritizeSkill', 'setup.prioritizeSkillHint')}
                    {eventMode && (
                      <>
                        {renderOption(leagueSkill, setLeagueSkill, 'setup.prioritizeSkill', 'setup.prioritizeSkillLeagueHint')}
                        {renderOption(leagueRanking, setLeagueRanking, 'setup.prioritizeRanking', pairMode === 'fixed' ? 'setup.prioritizeRankingFixedHint' : 'setup.prioritizeRankingHint')}
                      </>
                    )}
                  </div>
                )}
                
                <h3 className="text-slate-500 font-black uppercase text-[9px] md:text-[10px] tracking-widest">{t('setup.tournamentInfo')}</h3>
                <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">{t('setup.athletes')}</span><span className="text-3xl md:text-4xl font-black">{players.length}</span></div>
                {isFixed && (
                  <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">{t('setup.pairs')}</span><span className="text-3xl md:text-4xl font-black">{currentPairs.length}</span></div>
                )}
                
                {isEvent && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold">{t('setup.active')}</span>
                    <span className="text-3xl md:text-4xl font-black text-emerald-400">{activePlayers.length}</span>
                  </div>
                )}
                <div className="space-y-2 pb-6 md:pb-8 border-b border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold">{t('common.courts')}</span>
                    {/* League: changeable any time (next rounds); Random: until the schedule is generated */}
                    {isEvent
                      ? renderStepper(numCourts, 1, MAX_COURTS, setLeagueCourts)
                      : !tournament
                      ? renderStepper(numCourts, maxClassicCourts ? 1 : 0, maxClassicCourts, v => setClassicCourts(v >= maxClassicCourts ? null : v))
                      : <span className="text-3xl md:text-4xl font-black">{numCourts}</span>}
                  </div>
                  {courtsHint && <p className="text-right text-slate-500 text-xs font-medium">{courtsHint}</p>}
                  <div className="flex justify-between items-center pt-4">
                    <span className="text-slate-400 font-bold">{t('setup.pointsPerMatch')}</span>
                    <select
                      value={pointsPerMatch ?? ''}
                      onChange={(e) => setPointsPerMatch(e.target.value ? Number(e.target.value) : null)}
                      className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-base font-black text-white outline-none focus:border-slate-500"
                    >
                      {[...new Set([...POINTS_OPTIONS, ...(pointsPerMatch ? [pointsPerMatch] : [])])].sort((a, b) => a - b).map(n => <option key={n} value={n}>{n}</option>)}
                      <option value="">{t('setup.pointsFree')}</option>
                    </select>
                  </div>
                  {(tournament || !isEvent) && (
                    <div className="flex justify-between items-center pt-4">
                      <span className="text-slate-400 font-bold">{t('common.rounds')}</span>
                      <span className="text-3xl md:text-4xl font-black">{tournament ? tournament.rounds.length : estimatedClassicRounds}</span>
                    </div>
                  )}
                </div>
                
              </div>
              <div className="space-y-4">
                {!tournament ? (
                  <button onClick={startTournament} disabled={players.length < 4} className={`w-full ${tc.primary} ${tc.primaryHover} disabled:bg-slate-800 text-white py-5 md:py-6 rounded-2xl md:rounded-[2rem] font-black text-lg md:text-xl lg:text-lg xl:text-xl whitespace-nowrap flex items-center justify-center gap-3 transition-all active:scale-95`}>
                    <Play className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" />
                    {eventMode ? t('setup.startEvent') : t('setup.generate')}
                  </button>
                ) : (
                  <button onClick={() => setActiveTab('rounds')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 md:py-6 rounded-2xl md:rounded-[2rem] font-black text-lg md:text-xl flex items-center justify-center gap-3 transition-all active:scale-95"><Layout className="w-5 h-5 md:w-6 md:h-6" /> {t('setup.goToMatches')}</button>
                )}
                {tournament && <button onClick={resetTournament} className="w-full text-slate-500 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 py-2"><Trash className="w-3 h-3" /> {t('setup.endTournament')}</button>}
                {(players.length > 0 && !tournament) && (
                  <button onClick={clearAllData} className="w-full text-rose-400 hover:text-rose-300 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 py-2 transition-colors">
                    <Trash2 className="w-3 h-3" /> {t('setup.clearAll')}
                  </button>
                )}
                <div className="flex justify-center gap-6">
                  {tournament && (
                    <button onClick={exportTournament} className="text-slate-400 hover:text-slate-200 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 py-2 transition-colors">
                      <Download className="w-3 h-3" /> {t('setup.exportYaml')}
                    </button>
                  )}
                  <button onClick={() => importFileRef.current?.click()} className="text-slate-400 hover:text-slate-200 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 py-2 transition-colors">
                    <Upload className="w-3 h-3" /> {t('setup.importYaml')}
                  </button>
                  <LanguageLink className="text-slate-400 hover:text-slate-200" />
                  <input
                    ref={importFileRef}
                    type="file"
                    accept=".yaml,.yml"
                    className="hidden"
                    data-testid="import-file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) importTournament(file);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rounds' && tournament && (
          <div className="space-y-6 md:space-y-10">
            {/* Event mode: Generate Next Round button */}
            {tournament.mode === 'event' && (tournament.rounds.length === 0 || currentRoundComplete) && (
              <div className={`bg-gradient-to-r ${isEvent ? 'from-purple-50 to-violet-50 border-purple-200' : 'from-indigo-50 to-blue-50 border-indigo-200'} rounded-3xl p-6 md:p-8 border flex flex-col md:flex-row items-center justify-between gap-4`}>
                <div className="text-center md:text-left">
                  <h3 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2 justify-center md:justify-start">
                    <Zap className={`w-5 h-5 ${isEvent ? 'text-purple-500' : 'text-indigo-500'}`} />
                    {tournament.rounds.length === 0 ? t('rounds.generateFirst') : t('rounds.generateNext')}
                  </h3>
                  <p className="text-slate-600 text-sm mt-1">
                    {isFixed
                      ? t('rounds.eventSummaryPairs', { active: activePairs.length, courts: tournament.numCourts ?? eventNumCourts, matchmaking: t(matchmakingKey) })
                      : t('rounds.eventSummary', { active: activePlayers.length, courts: tournament.numCourts ?? eventNumCourts, matchmaking: t(matchmakingKey) })}
                  </p>
                </div>
                <button 
                  onClick={addRound}
                  disabled={isFixed ? activePairs.length < 2 : activePlayers.length < 4}
                  className={`${tc.primary} ${tc.primaryHover} disabled:bg-slate-300 text-white px-6 py-3 rounded-2xl font-black transition-all active:scale-95 flex items-center gap-2`}
                >
                  <Play className="w-5 h-5" fill="currentColor" /> {t('rounds.generateRound', { n: tournament.rounds.length + 1 })}
                </button>
              </div>
            )}

            {tournament.rounds.length > 0 ? (
              <>
                <div className="bg-white rounded-[2rem] md:rounded-[4rem] shadow-sm border border-slate-200 p-6 md:p-10 flex items-center justify-between">
                  <button disabled={currentRoundIndex === 0} onClick={() => setCurrentRoundIndex(i => i - 1)} className="p-3 md:p-6 rounded-xl md:rounded-[2rem] text-slate-300 hover:text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-0"><ChevronLeft className="w-8 h-8 md:w-12 md:h-12" strokeWidth={3} /></button>
                  <div className="text-center">
                    {tournament.rounds[currentRoundIndex]?.matches.some(m => m.id.includes('championship')) ? (
                      <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-4 py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest inline-flex items-center gap-1 mb-2">
                        <Trophy className="w-3 h-3 md:w-4 md:h-4" /> {t('champ.round')}
                      </div>
                    ) : (
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] text-slate-400 block mb-1">{t('common.round')}</span>
                    )}
                    <div className="text-4xl md:text-7xl font-black text-slate-900 flex items-center justify-center gap-2">
                      {currentRoundIndex + 1}<span className="text-slate-300 text-base md:text-2xl font-bold">/ {tournament.rounds.length}</span>
                      {tournament.pointsPerMatch && (
                        <span className="ml-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] md:text-xs font-black uppercase tracking-wider">{t('rounds.toPoints', { n: tournament.pointsPerMatch })}</span>
                      )}
                      {currentRoundIndex === tournament.rounds.length - 1 && tournament.mode !== 'event' && (
                        <button 
                          onClick={addRound} 
                          className={`ml-2 p-2 md:p-3 rounded-xl ${tc.primaryLight} hover:opacity-80 ${tc.primaryText} transition-all`}
                          title={t('rounds.addRound')}
                        >
                          <Plus className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  </div>
                  <button disabled={currentRoundIndex === tournament.rounds.length - 1} onClick={() => setCurrentRoundIndex(i => i + 1)} className="p-3 md:p-6 rounded-xl md:rounded-[2rem] text-slate-300 hover:text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-0"><ChevronRight className="w-8 h-8 md:w-12 md:h-12" strokeWidth={3} /></button>
                </div>
                <div className="flex justify-center gap-6 -mt-2 md:-mt-4">
                  <button onClick={() => copyRound(roundText(tournament, currentRoundIndex, textCtx))} className="flex items-center gap-2 text-slate-400 hover:text-emerald-600 font-bold text-[10px] md:text-xs uppercase tracking-widest py-2 transition-colors">
                    <Copy className="w-3.5 h-3.5" /> {t('share.copyRound')}
                  </button>
                </div>
                <div className="grid gap-4 md:gap-8">
                  {(tournament.rounds[currentRoundIndex]?.matches || [])
                    .slice()
                    .sort((a, b) => a.courtIndex - b.courtIndex)
                    .map((match) => {
                    const teamAWon = match.isCompleted && match.scoreA !== null && match.scoreB !== null && match.scoreA > match.scoreB;
                    const teamBWon = match.isCompleted && match.scoreA !== null && match.scoreB !== null && match.scoreB > match.scoreA;
                    const winnerTextClass = "text-emerald-600";
                    const winnerInputClass = "!border-emerald-400 !bg-emerald-50 text-emerald-700";
                    const p1a = getPlayer(match.teamA[0]);
                    const p2a = getPlayer(match.teamA[1]);
                    const p1b = getPlayer(match.teamB[0]);
                    const p2b = getPlayer(match.teamB[1]);
                    return (
                      <div key={match.id} className="bg-white rounded-3xl md:rounded-[4rem] shadow-sm border border-slate-200 overflow-hidden">
                        <div className={`px-6 md:px-12 py-3 md:py-5 border-b flex justify-between items-center font-black text-[9px] md:text-[10px] uppercase tracking-widest ${match.id.includes('championship') ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 text-yellow-700' : 'bg-slate-50/50 border-slate-100 text-slate-400'}`}>
                          <span className="flex items-center gap-2">
                            {match.id.includes('championship') && <Trophy className="w-4 h-4 text-yellow-500" />}
                            {match.id.includes('championship') ? t('common.finals') : courtLabel(match.courtIndex)}
                          </span>
                          {match.isCompleted && <span className="text-emerald-500 flex items-center gap-1"><ShieldCheck size={12}/> {t('common.done')}</span>}
                        </div>
                        <div className="p-6 md:p-14 flex flex-col md:grid md:grid-cols-7 items-center gap-6 md:gap-8">
                          <div className="w-full md:col-span-2 text-center md:text-right space-y-3 md:space-y-4 pr-1">
                            <PlayerName name={p1a?.name || t('common.unknown')} baseClass={`text-xl md:text-3xl font-[900] tracking-tight italic ${teamAWon ? winnerTextClass : 'text-slate-900'}`} />
                            <PlayerName name={p2a?.name || t('common.unknown')} baseClass={`text-xl md:text-3xl font-[900] tracking-tight italic ${teamAWon ? winnerTextClass : 'text-slate-900'}`} />
                          </div>
                          <div className="w-full md:col-span-3 flex items-center justify-center gap-4 md:gap-6">
                            <input
                              type="text" inputMode="numeric" pattern="[0-9]*" maxLength={3} enterKeyHint="next" autoComplete="off" data-score
                              aria-label={t('rounds.scoreFor', { team: [p1a, p2a].map(p => p?.name ?? '?').join(' & ') })}
                              value={match.scoreA ?? ''}
                              onChange={(e) => updateScore(currentRoundIndex, match.id, 'A', e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); focusNextScore(e.currentTarget); } }}
                              className={`w-16 h-16 md:w-28 md:h-28 text-center text-3xl md:text-5xl font-black bg-slate-50 border-2 md:border-4 border-slate-100 rounded-2xl md:rounded-[2.5rem] ${tc.focusBorder} focus:bg-white transition-all outline-none ${teamAWon ? winnerInputClass : ''}`}
                              placeholder="0"
                            />
                            <span className="text-slate-200 font-black italic text-sm md:text-xl shrink-0">{t('common.vs')}</span>
                            <input
                              type="text" inputMode="numeric" pattern="[0-9]*" maxLength={3} enterKeyHint="next" autoComplete="off" data-score
                              aria-label={t('rounds.scoreFor', { team: [p1b, p2b].map(p => p?.name ?? '?').join(' & ') })}
                              value={match.scoreB ?? ''}
                              onChange={(e) => updateScore(currentRoundIndex, match.id, 'B', e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); focusNextScore(e.currentTarget); } }}
                              className={`w-16 h-16 md:w-28 md:h-28 text-center text-3xl md:text-5xl font-black bg-slate-50 border-2 md:border-4 border-slate-100 rounded-2xl md:rounded-[2.5rem] ${tc.focusBorder} focus:bg-white transition-all outline-none ${teamBWon ? winnerInputClass : ''}`}
                              placeholder="0"
                            />
                          </div>
                          <div className="w-full md:col-span-2 text-center md:text-left space-y-3 md:space-y-4 pl-1">
                            <PlayerName name={p1b?.name || t('common.unknown')} baseClass={`text-xl md:text-3xl font-[900] tracking-tight italic ${teamBWon ? winnerTextClass : 'text-slate-900'}`} />
                            <PlayerName name={p2b?.name || t('common.unknown')} baseClass={`text-xl md:text-3xl font-[900] tracking-tight italic ${teamBWon ? winnerTextClass : 'text-slate-900'}`} />
                          </div>
                        </div>
                        {scoreSumMismatch(match, tournament.pointsPerMatch) !== null && (
                          <p className="-mt-3 mb-4 md:-mt-8 md:mb-8 text-center text-xs font-bold text-amber-600">
                            {t('rounds.sumWarning', { sum: scoreSumMismatch(match, tournament.pointsPerMatch) ?? 0, total: tournament.pointsPerMatch ?? 0 })}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {tournament.rounds[currentRoundIndex]?.byes.length > 0 && (
                  <div className="bg-amber-50/50 rounded-3xl p-6 md:p-10 border border-amber-100">
                    <h3 className="text-amber-700 font-black text-[10px] md:text-[12px] uppercase tracking-widest mb-4 md:mb-6 flex items-center gap-2"><Info className="w-4 h-4 md:w-5 md:h-5"/> {t('rounds.currentlyResting')}</h3>
                    <div className="flex flex-wrap gap-2 md:gap-3">
                      {tournament.rounds[currentRoundIndex].byes.map(id => {
                        const player = getPlayer(id);
                        return (
                        <div key={id} className="bg-white px-4 py-2 md:px-6 md:py-4 rounded-xl md:rounded-2xl shadow-sm border border-amber-200">
                            <PlayerName name={player?.name || ''} baseClass="font-black text-sm md:text-xl" inline />
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-3xl p-12 md:p-20 text-center border border-slate-200">
                <div className={`${tc.primary} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                  <Play className="w-8 h-8 text-white" fill="currentColor" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-3">{t('rounds.readyTitle')}</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  {t('rounds.readyBody')}
                </p>
              </div>
            )}
          </div>
        )}

        {showShareModal && shareSync.share && (
          <ShareModal
            share={shareSync.share}
            status={shareSync.status}
            lastSynced={shareSync.lastSynced}
            onClose={() => setShowShareModal(false)}
            onStop={stopSharing}
            onRetry={shareSync.retry}
            primaryClass={tc.primary}
            primaryText={tc.primaryText}
          />
        )}

        {activeTab === 'leaderboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
            {/* Final Standings - shows after championship is complete (classic mode only) */}
            {tournament?.mode !== 'event' && (() => {
              const championshipRound = tournament?.rounds.find(r => 
                r.matches.some(m => m.id.includes('championship'))
              );
              const championshipMatch = championshipRound?.matches.find(m => m.id.includes('championship'));
              
              if (!championshipMatch?.isCompleted || championshipMatch.scoreA === null || championshipMatch.scoreB === null) {
                return null;
              }
              
              const teamAWon = championshipMatch.scoreA > championshipMatch.scoreB;
              const winningTeam = teamAWon ? championshipMatch.teamA : championshipMatch.teamB;
              const runnerUpTeam = teamAWon ? championshipMatch.teamB : championshipMatch.teamA;
              const winningScore = teamAWon ? championshipMatch.scoreA : championshipMatch.scoreB;
              const losingScore = teamAWon ? championshipMatch.scoreB : championshipMatch.scoreA;
              
              const getPlayerStats = (id: string) => leaderboard.find(e => e.playerId === id);
              const getChampPlayer = (id: string) => tournament?.players.find(p => p.id === id);
              const getPlayerNameStr = (id: string) => {
                const p = getChampPlayer(id);
                return p ? p.name : t('common.unknown');
              };
              
              const allFinalists = [...winningTeam, ...runnerUpTeam]
                .map(id => ({ id, name: getPlayerNameStr(id), stats: getPlayerStats(id) }))
                .sort((a, b) => (b.stats?.totalPoints || 0) - (a.stats?.totalPoints || 0));
              
              const placeLabels = ['🥇', '🥈', '🥉', t('champ.fourth')];
              
              return (
                <div className="bg-gradient-to-r from-yellow-100 via-amber-50 to-yellow-100 rounded-3xl md:rounded-[3rem] p-6 md:p-8 border-2 border-yellow-300 shadow-lg">
                  <h3 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2 justify-center mb-6">
                    <Trophy className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" /> {t('champ.results')}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl p-5 text-white text-center shadow-lg">
                      <div className="text-3xl mb-2">🏆</div>
                      <div className="text-xs font-black uppercase tracking-widest opacity-80 mb-2">{t('champ.champions')}</div>
                      <div className="font-black text-xl md:text-2xl italic">
                        {getPlayerNameStr(winningTeam[0])} & {getPlayerNameStr(winningTeam[1])}
                      </div>
                      <div className="text-2xl font-black mt-2">{winningScore}</div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-slate-300 to-slate-400 rounded-2xl p-5 text-slate-700 text-center shadow-lg">
                      <div className="text-3xl mb-2">🥈</div>
                      <div className="text-xs font-black uppercase tracking-widest opacity-70 mb-2">{t('champ.runnerUp')}</div>
                      <div className="font-black text-xl md:text-2xl italic">
                        {getPlayerNameStr(runnerUpTeam[0])} & {getPlayerNameStr(runnerUpTeam[1])}
                      </div>
                      <div className="text-2xl font-black mt-2">{losingScore}</div>
                    </div>
                  </div>
                  
                  {!isFixed && (
                    <div className="border-t-2 border-yellow-300 pt-5">
                      <div className="text-xs font-black uppercase tracking-widest text-slate-500 text-center mb-4">
                        {t('champ.individualRankingsByPoints')}
                      </div>
                      <div className="grid grid-cols-4 gap-2 md:gap-3">
                        {allFinalists.map((entry, idx) => (
                          <div key={entry.id} className="bg-white/60 rounded-xl p-3 text-center">
                            <div className="text-lg md:text-2xl">{placeLabels[idx]}</div>
                            <div className="font-black text-sm md:text-base italic truncate mt-1">
                              {entry.name}
                            </div>
                            <div className="text-xs text-slate-500 font-bold">
                              {entry.stats?.totalPoints || 0} {t('common.pts')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            
            {/* Championship Round Button - classic mode only */}
            {tournament?.mode !== 'event' && leaderboard.length >= minForFinals && !tournament?.rounds.some(r => r.matches.some(m => m.id.includes('championship'))) && (
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-3xl md:rounded-[3rem] p-6 md:p-8 border border-yellow-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-left">
                  <h3 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2 justify-center md:justify-start">
                    <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" /> {t('champ.round')}
                  </h3>
                  <p className="text-slate-600 text-sm mt-1">
                    {t(isFixed ? 'champ.formatPairs' : 'champ.format')}
                  </p>
                </div>
                <button 
                  onClick={addChampionshipRound}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-2xl font-black transition-all active:scale-95 flex items-center gap-2"
                >
                  <Zap className="w-5 h-5" /> {t('champ.create')}
                </button>
              </div>
            )}
            
            <div className="bg-white rounded-3xl md:rounded-[4rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 md:px-12 py-5 md:py-8 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg md:text-2xl font-black text-slate-800 flex items-center gap-2 md:gap-3"><Award className="w-5 h-5 md:w-7 md:h-7 text-yellow-500" /> {t('common.standings')}</h2>
                <div className="flex flex-col items-end gap-1">
                  <span className="hidden md:inline text-slate-400 text-xs font-black uppercase tracking-widest italic text-right">{t('lb.sortedBy')}</span>
                  {tournament && (
                    <button
                      onClick={() => copyStandings(standingsText(tournament, leaderboard, textCtx, shareSync.share?.shareUrl))}
                      className="flex items-center gap-2 text-slate-400 hover:text-emerald-600 font-bold text-[10px] md:text-xs uppercase tracking-widest py-1 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" /> {t('share.copyStandings')}
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile card layout */}
              <div className="md:hidden divide-y divide-slate-100">
                {leaderboard.map((entry, idx) => {
                  const displayRank = idx;
                  
                  const getRankStyle = () => {
                    const rank = displayRank;
                    if (rank === 0) return 'bg-yellow-400 text-white shadow-lg';
                    if (rank === 1) return 'bg-slate-200 text-slate-600';
                    if (rank === 2) return 'bg-orange-300 text-white';
                    return 'bg-slate-100 text-slate-400';
                  };

                  const player = tournament?.players.find(p => p.id === entry.playerId);
                  const skill = player?.skillLevel || 'medium';

                  return (
                    <div key={entry.playerId} className="flex items-center gap-3 px-4 py-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${getRankStyle()}`}>
                        {displayRank + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-black text-slate-900 text-sm italic uppercase truncate">{entry.playerName}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-bold text-[10px]">
                            <span className="text-emerald-500">{t('common.wins', { n: entry.wins })}</span>
                            <span className="text-slate-300">-</span>
                            <span className="text-rose-400">{t('common.losses', { n: entry.losses })}</span>
                            <span className="text-slate-300">-</span>
                            <span className="text-slate-400">{t('common.ties', { n: entry.ties })}</span>
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold">{t('lb.avg', { n: entry.avgPoints })}</span>
                          {!isFixed && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase ${SKILL_COLORS[skill].bg} ${SKILL_COLORS[skill].text}`}>
                              {t(`skill.${skill}`)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-2xl tracking-tighter text-slate-900 italic leading-none">{entry.totalPoints}</span>
                        <div className="text-[8px] text-slate-400 font-bold uppercase">{t('common.pts')}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table layout */}
              <div className="hidden md:block overflow-x-auto overflow-y-hidden no-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/30 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-12 py-8">{t('lb.rank')}</th>
                      <th className="px-12 py-8">{t(isFixed ? 'lb.pair' : 'lb.athlete')}</th>
                      {!isFixed && <th className="px-8 py-8 text-center">{t('common.skill')}</th>}
                      <th className="px-12 py-8 text-center">{t('lb.record')}</th>
                      <th className="px-12 py-8 text-right">{t('lb.totalPoints')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {leaderboard.map((entry, idx) => {
                      const displayRank = idx;
                      
                      const getRankStyle = () => {
                        const rank = displayRank;
                        if (rank === 0) return 'bg-yellow-400 text-white shadow-lg';
                        if (rank === 1) return 'bg-slate-200 text-slate-600';
                        if (rank === 2) return 'bg-orange-300 text-white';
                        return 'text-slate-400';
                      };
                      
                      return (
                        <tr key={entry.playerId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-12 py-10">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${getRankStyle()}`}>
                              {displayRank + 1}
                            </div>
                          </td>
                          <td className="px-12 py-10">
                            <div className="flex items-center gap-2">
                              <PlayerName name={entry.playerName} baseClass="font-black text-slate-900 text-2xl italic uppercase" inline />
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">{t('lb.avgPerMatch', { n: entry.avgPoints })}</div>
                          </td>
                          {!isFixed && (
                            <td className="px-8 py-10 text-center">
                              {(() => {
                                const player = tournament?.players.find(p => p.id === entry.playerId);
                                const skill = player?.skillLevel || 'medium';
                                return (
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${SKILL_COLORS[skill].bg} ${SKILL_COLORS[skill].text}`}>
                                    {t(`skill.${skill}`)}
                                  </span>
                                );
                              })()}
                            </td>
                          )}
                          <td className="px-12 py-10 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1 font-black text-base">
                              <span className="text-emerald-500">{t('common.wins', { n: entry.wins })}</span>
                              <span className="text-slate-200">-</span>
                              <span className="text-rose-400">{t('common.losses', { n: entry.losses })}</span>
                              <span className="text-slate-200">-</span>
                              <span className="text-slate-400">{t('common.ties', { n: entry.ties })}</span>
                            </div>
                          </td>
                          <td className="px-12 py-10 text-right">
                            <span className="font-black text-6xl tracking-tighter text-slate-900 italic leading-none">{entry.totalPoints}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {toast && (
          <div role="status" className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-xl z-[110]">
            {toast}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
