// UI strings. `en` is the source of truth: every other language must define the same keys
// (enforced by the `Translations` type). Use `{name}` placeholders for interpolation.

export const LANGUAGES = {
  en: { label: 'EN', name: 'English', locale: 'en-US' },
  es: { label: 'ES', name: 'Español', locale: 'es-ES' },
} as const;

export type Language = keyof typeof LANGUAGES;

const en = {
  // Common
  'common.round': 'Round',
  'common.rounds': 'Rounds',
  'common.courts': 'Courts',
  'common.court': 'Court {n}',
  'common.finals': 'Finals',
  'common.done': 'Done',
  'common.vs': 'VS',
  'common.unknown': 'Unknown',
  'common.standings': 'Standings',
  'common.player': 'Player',
  'common.pts': 'pts',
  'common.points': 'Points',
  'common.refresh': 'Refresh',
  'common.notFound': 'Not Found',
  'common.tournamentNotFound': 'Tournament not found',
  'common.failedToLoad': 'Failed to load',
  'common.connectionError': 'Connection error',
  'common.playerNamePlaceholder': 'Player name...',
  'common.skillLabel': 'Skill:',
  'common.skill': 'Skill',
  'common.wins': '{n}W',
  'common.losses': '{n}L',
  'common.ties': '{n}T',
  'common.language': 'Language',
  'players.duplicateName': '"{name}" is already in the tournament.',

  // Skill levels
  'skill.low': 'Low',
  'skill.medium': 'Medium',
  'skill.high': 'High',

  // Championship
  'champ.round': 'Championship Round',
  'champ.results': 'Championship Results',
  'champ.champions': 'Champions',
  'champ.runnerUp': 'Runner Up',
  'champ.individualRankings': 'Individual Rankings',
  'champ.individualRankingsByPoints': 'Individual Rankings (by tournament points)',
  'champ.fourth': '4th',
  'champ.format': '1st + 3rd place vs 2nd + 4th place',
  'champ.formatPairs': '1st pair vs 2nd pair',
  'champ.create': 'Create Finals',

  // App — navigation & header
  'nav.setup': 'Setup',
  'nav.matches': 'Matches',
  'nav.scores': 'Scores',
  'header.tagline': 'Random Logic',
  'header.taglineLeague': 'Balanced Rounds',
  'header.whistTournament': 'Whist Tournament',
  'header.perfectBalance': 'Perfect Balance Active',
  'header.share': 'Share',
  'header.sharing': 'Sharing',

  // App — setup
  'setup.inProgressTitle': 'Tournament In Progress',
  'setup.inProgressBody': 'Players are locked while a tournament is active. End the current tournament to modify the roster.',
  'setup.endTournament': 'End Tournament',
  'setup.eventModeActive': 'League Mode Active — Add or toggle players between rounds',
  'setup.players': 'Players',
  'setup.noPlayers': 'No players added yet.',
  'setup.removePlayer': 'Remove player',
  'setup.activeTitle': 'Active — click to sit out',
  'setup.sittingOutTitle': 'Sitting out — click to activate',
  'setup.tournamentMode': 'Tournament Mode',
  'setup.classic': 'Random',
  'setup.event': 'League',
  'setup.pairing': 'Pairs',
  'setup.pairsRotating': 'Rotating',
  'setup.pairsFixed': 'Fixed',
  'setup.restingPerRound': '{n} rest each round',
  'setup.courtsUnused': 'Unused courts: {n}',
  'setup.fewerCourts': 'Fewer courts',
  'setup.moreCourts': 'More courts',
  'setup.prioritizeSkill': 'Prioritize initial skill',
  'setup.prioritizeSkillHint': 'More even matches; some partners may repeat',
  'setup.prioritizeSkillLeagueHint': 'Balance matches using the level set for each player',
  'setup.prioritizeRanking': 'Prioritize standings',
  'setup.prioritizeRankingHint': 'Each round is matched on results so far: even games, still playing everyone',
  'setup.prioritizeRankingFixedHint': 'Each round picks rivals from results so far, still playing everyone',
  'setup.pairs': 'Pairs',
  'pairs.title': 'Pairs ({n})',
  'pairs.hint': 'Tap the link icon on two players to pair them',
  'pairs.selected': 'Now pick {name}\'s partner',
  'pairs.pairWith': 'Pair up',
  'pairs.unpair': 'Unpair',
  'pairs.partnerOf': 'with {name}',
  'pairs.none': 'No pairs yet',
  'setup.tournamentInfo': 'Tournament Info',
  'setup.athletes': 'Athletes',
  'setup.active': 'Active',
  'setup.courtNames': 'Court Names',
  'setup.startEvent': 'START',
  'setup.generate': 'START',
  'setup.goToMatches': 'GO TO MATCHES',
  'setup.clearAll': 'Clear All Data',
  'setup.exportYaml': 'Export (YAML)',
  'setup.importYaml': 'Import',

  // App — rounds
  'rounds.generateFirst': 'Generate First Round',
  'rounds.generateNext': 'Generate Next Round',
  'rounds.eventSummary': '{active} active players • {courts} courts • {matchmaking}',
  'rounds.eventSummaryPairs': '{active} active pairs • {courts} courts • {matchmaking}',
  'matchmaking.skill': 'Skill-balanced matchmaking',
  'matchmaking.ranking': 'Standings-based matchmaking',
  'matchmaking.both': 'Matchmaking by skill and standings',
  'matchmaking.rotation': 'Rotation only (no balancing)',
  'rounds.generateRound': 'Generate Round {n}',
  'rounds.addRound': 'Add another round',
  'rounds.currentlyResting': 'Currently Resting',
  'rounds.readyTitle': 'Ready to Play',
  'rounds.readyBody': 'Generate the first round when your players are checked in. You can add or remove players between rounds.',

  // App — share modal
  'share.title': 'Share Tournament',
  'share.viewerLink': 'Viewer Link',
  'share.displayLink': 'Leaderboard Display',
  'share.disclaimer': 'Anyone with these links can view. Only you can modify scores and generate rounds.',
  'share.syncing': 'Syncing...',
  'share.synced': 'Live & Synced',
  'share.last': 'Last: {time}',
  'share.stop': 'Stop Sharing',

  // App — leaderboard
  'lb.sortedBy': 'Sorted by Pts → Wins → Diff',
  'lb.avg': '{n} avg',
  'lb.avgPerMatch': 'Avg {n} / Match',
  'lb.rank': 'Rank',
  'lb.athlete': 'Athlete',
  'lb.pair': 'Pair',
  'lb.record': 'Record (W-L-T)',
  'lb.totalPoints': 'Total Points',

  // App — alerts & confirms
  'alert.shareFailed': 'Failed to create shared game. Please try again.',
  'alert.minPlayers': 'You need at least 4 players.',
  'alert.minActivePlayers': 'Need at least 4 active players to generate a round.',
  'alert.minPairs': 'You need at least 2 pairs.',
  'alert.unpairedPlayers': 'Every player needs a partner: {names}',
  'alert.minActivePairs': 'Need at least 2 active pairs to generate a round.',
  'confirm.stopSharing': 'Stop sharing this tournament? Others will no longer be able to view it.',
  'confirm.endTournament': 'End tournament? Scores will be lost.',
  'confirm.clearAll': 'Clear ALL data? This will remove all players and tournament data.',
  'confirm.importReplace': 'Load tournament from file? The current tournament and players will be replaced.',
  'alert.importTooLarge': 'File is too large to be a tournament export.',
  'alert.importInvalidYaml': 'This file is not a valid tournament export (YAML).',
  'alert.importUnsupported': 'Unsupported file version "{format}". Update the app and try again.',
  'alert.importInvalidData': 'Invalid tournament file: {detail}',
  'alert.importReadFailed': 'Could not read the file.',

  // Tournament names
  'tournament.classicName': 'Americano - {date}',
  'tournament.leagueName': 'League - {date}',

  // Game viewer
  'viewer.loading': 'Loading tournament...',
  'viewer.notFoundOrExpired': 'Tournament not found or has expired',
  'viewer.failedToLoad': 'Failed to load tournament',
  'viewer.failedToConnect': 'Failed to connect to server',
  'viewer.expiredOrInvalid': 'This tournament may have expired or the link is invalid.',
  'viewer.createOwn': 'Create Your Own',
  'viewer.viewingLive': 'Viewing Live',
  'viewer.updated': 'Updated {time}',
  'viewer.resting': 'Resting',
  'viewer.avg': 'Avg {n}',
  'viewer.wlt': 'W-L-T',
  'viewer.liveEvery': 'Live updates every 5s',


  // Leaderboard display
  'display.subtitle': 'Live Leaderboard',
  'display.playersCount': '{n} players',
  'display.pairsCount': '{n} pairs',
  'display.games': 'Games',
  'display.gamesCount': '{n} games',
  'display.record': 'Record',
  'display.liveUpdated': 'Live • Updated {time}',
} as const;

export type TranslationKey = keyof typeof en;
type Translations = Record<TranslationKey, string>;

const es: Translations = {
  // Common
  'common.round': 'Ronda',
  'common.rounds': 'Rondas',
  'common.courts': 'Pistas',
  'common.court': 'Pista {n}',
  'common.finals': 'Final',
  'common.done': 'Terminado',
  'common.vs': 'VS',
  'common.unknown': 'Desconocido',
  'common.standings': 'Clasificación',
  'common.player': 'Jugador',
  'common.pts': 'pts',
  'common.points': 'Puntos',
  'common.refresh': 'Actualizar',
  'common.notFound': 'No encontrado',
  'common.tournamentNotFound': 'Torneo no encontrado',
  'common.failedToLoad': 'Error al cargar',
  'common.connectionError': 'Error de conexión',
  'common.playerNamePlaceholder': 'Nombre del jugador...',
  'common.skillLabel': 'Nivel:',
  'common.skill': 'Nivel',
  'common.wins': '{n}G',
  'common.losses': '{n}P',
  'common.ties': '{n}E',
  'common.language': 'Idioma',
  'players.duplicateName': '"{name}" ya está en el torneo.',

  // Skill levels
  'skill.low': 'Bajo',
  'skill.medium': 'Medio',
  'skill.high': 'Alto',

  // Championship
  'champ.round': 'Ronda Final',
  'champ.results': 'Resultados de la Final',
  'champ.champions': 'Campeones',
  'champ.runnerUp': 'Subcampeones',
  'champ.individualRankings': 'Clasificación Individual',
  'champ.individualRankingsByPoints': 'Clasificación Individual (por puntos del torneo)',
  'champ.fourth': '4º',
  'champ.format': '1º + 3º vs 2º + 4º',
  'champ.formatPairs': '1ª pareja vs 2ª pareja',
  'champ.create': 'Crear Final',

  // App — navigation & header
  'nav.setup': 'Ajustes',
  'nav.matches': 'Partidos',
  'nav.scores': 'Tabla',
  'header.tagline': 'Lógica Aleatoria',
  'header.taglineLeague': 'Rondas Equilibradas',
  'header.whistTournament': 'Torneo Whist',
  'header.perfectBalance': 'Equilibrio Aleatorio Activo',
  'header.share': 'Compartir',
  'header.sharing': 'Compartiendo',

  // App — setup
  'setup.inProgressTitle': 'Torneo en Curso',
  'setup.inProgressBody': 'Los jugadores están bloqueados mientras hay un torneo activo. Finaliza el torneo actual para modificar la lista.',
  'setup.endTournament': 'Finalizar Torneo',
  'setup.eventModeActive': 'Modo Liga activo — Añade o activa jugadores entre rondas',
  'setup.players': 'Jugadores',
  'setup.noPlayers': 'Aún no hay jugadores.',
  'setup.removePlayer': 'Eliminar jugador',
  'setup.activeTitle': 'Activo — pulsa para descansar',
  'setup.sittingOutTitle': 'Descansando — pulsa para activar',
  'setup.tournamentMode': 'Modo de Torneo',
  'setup.classic': 'Aleatorio',
  'setup.event': 'Liga',
  'setup.pairing': 'Parejas',
  'setup.pairsRotating': 'Rotativas',
  'setup.pairsFixed': 'Fijas',
  'setup.restingPerRound': 'Descansan {n} cada ronda',
  'setup.courtsUnused': 'Pistas sin usar: {n}',
  'setup.fewerCourts': 'Menos pistas',
  'setup.moreCourts': 'Más pistas',
  'setup.prioritizeSkill': 'Priorizar nivel inicial',
  'setup.prioritizeSkillHint': 'Partidos más igualados; algunas parejas pueden repetirse',
  'setup.prioritizeSkillLeagueHint': 'Equilibra los partidos según el nivel marcado a cada jugador',
  'setup.prioritizeRanking': 'Priorizar clasificación',
  'setup.prioritizeRankingHint': 'Cada ronda se empareja según los resultados: partidos igualados, sin dejar de jugar contra todos',
  'setup.prioritizeRankingFixedHint': 'Cada ronda elige rivales según los resultados, sin dejar de jugar contra todos',
  'setup.pairs': 'Parejas',
  'pairs.title': 'Parejas ({n})',
  'pairs.hint': 'Pulsa el icono de enlace en dos jugadores para emparejarlos',
  'pairs.selected': 'Ahora elige la pareja de {name}',
  'pairs.pairWith': 'Emparejar',
  'pairs.unpair': 'Deshacer pareja',
  'pairs.partnerOf': 'con {name}',
  'pairs.none': 'Aún no hay parejas',
  'setup.tournamentInfo': 'Info del Torneo',
  'setup.athletes': 'Jugadores',
  'setup.active': 'Activos',
  'setup.courtNames': 'Nombres de Pistas',
  'setup.startEvent': 'INICIAR',
  'setup.generate': 'INICIAR',
  'setup.goToMatches': 'IR A PARTIDOS',
  'setup.clearAll': 'Borrar Todos los Datos',
  'setup.exportYaml': 'Exportar (YAML)',
  'setup.importYaml': 'Importar',

  // App — rounds
  'rounds.generateFirst': 'Generar Primera Ronda',
  'rounds.generateNext': 'Generar Siguiente Ronda',
  'rounds.eventSummary': 'Jugadores activos: {active} • Pistas: {courts} • {matchmaking}',
  'rounds.eventSummaryPairs': 'Parejas activas: {active} • Pistas: {courts} • {matchmaking}',
  'matchmaking.skill': 'Emparejamiento equilibrado por nivel',
  'matchmaking.ranking': 'Emparejamiento por clasificación',
  'matchmaking.both': 'Emparejamiento por nivel y clasificación',
  'matchmaking.rotation': 'Solo rotación (sin equilibrar)',
  'rounds.generateRound': 'Generar Ronda {n}',
  'rounds.addRound': 'Añadir otra ronda',
  'rounds.currentlyResting': 'Descansando',
  'rounds.readyTitle': 'Listos para Jugar',
  'rounds.readyBody': 'Genera la primera ronda cuando los jugadores se hayan registrado. Puedes añadir o quitar jugadores entre rondas.',

  // App — share modal
  'share.title': 'Compartir Torneo',
  'share.viewerLink': 'Enlace para Espectadores',
  'share.displayLink': 'Pantalla de Clasificación',
  'share.disclaimer': 'Cualquiera con estos enlaces puede verlo. Solo tú puedes modificar resultados y generar rondas.',
  'share.syncing': 'Sincronizando...',
  'share.synced': 'En directo y sincronizado',
  'share.last': 'Última: {time}',
  'share.stop': 'Dejar de Compartir',

  // App — leaderboard
  'lb.sortedBy': 'Orden: Pts → Victorias → Dif',
  'lb.avg': '{n} media',
  'lb.avgPerMatch': 'Media {n} / Partido',
  'lb.rank': 'Pos.',
  'lb.athlete': 'Jugador',
  'lb.pair': 'Pareja',
  'lb.record': 'Balance (G-P-E)',
  'lb.totalPoints': 'Puntos Totales',

  // App — alerts & confirms
  'alert.shareFailed': 'No se pudo crear el torneo compartido. Inténtalo de nuevo.',
  'alert.minPlayers': 'Necesitas al menos 4 jugadores.',
  'alert.minActivePlayers': 'Se necesitan al menos 4 jugadores activos para generar una ronda.',
  'alert.minPairs': 'Necesitas al menos 2 parejas.',
  'alert.unpairedPlayers': 'Todos los jugadores necesitan pareja: {names}',
  'alert.minActivePairs': 'Se necesitan al menos 2 parejas activas para generar una ronda.',
  'confirm.stopSharing': '¿Dejar de compartir este torneo? Los demás ya no podrán verlo.',
  'confirm.endTournament': '¿Finalizar el torneo? Se perderán los resultados.',
  'confirm.clearAll': '¿Borrar TODOS los datos? Se eliminarán todos los jugadores y datos del torneo.',
  'confirm.importReplace': '¿Cargar el torneo desde el archivo? Se reemplazarán el torneo y los jugadores actuales.',
  'alert.importTooLarge': 'El archivo es demasiado grande para ser una exportación de torneo.',
  'alert.importInvalidYaml': 'Este archivo no es una exportación de torneo válida (YAML).',
  'alert.importUnsupported': 'Versión de archivo no soportada "{format}". Actualiza la app e inténtalo de nuevo.',
  'alert.importInvalidData': 'Archivo de torneo no válido: {detail}',
  'alert.importReadFailed': 'No se pudo leer el archivo.',

  // Tournament names
  'tournament.classicName': 'Americano - {date}',
  'tournament.leagueName': 'Liga - {date}',

  // Game viewer
  'viewer.loading': 'Cargando torneo...',
  'viewer.notFoundOrExpired': 'Torneo no encontrado o caducado',
  'viewer.failedToLoad': 'Error al cargar el torneo',
  'viewer.failedToConnect': 'No se pudo conectar con el servidor',
  'viewer.expiredOrInvalid': 'Es posible que este torneo haya caducado o que el enlace no sea válido.',
  'viewer.createOwn': 'Crea el Tuyo',
  'viewer.viewingLive': 'En Directo',
  'viewer.updated': 'Actualizado {time}',
  'viewer.resting': 'Descansan',
  'viewer.avg': 'Media {n}',
  'viewer.wlt': 'G-P-E',
  'viewer.liveEvery': 'Actualización cada 5s',


  // Leaderboard display
  'display.subtitle': 'Clasificación en Directo',
  'display.playersCount': 'Jugadores: {n}',
  'display.pairsCount': 'Parejas: {n}',
  'display.games': 'Partidos',
  'display.gamesCount': 'Partidos: {n}',
  'display.record': 'Balance',
  'display.liveUpdated': 'En directo • Actualizado {time}',
};

export const translations: Record<Language, Translations> = { en, es };

// Default court names ("Court 3", "Pista 3") in any supported language
const DEFAULT_COURT_RE = new RegExp(
  `^(${Object.values(translations).map(tr => tr['common.court'].replace(' {n}', '')).join('|')}) (\\d+)$`
);

/** Number in a default court name ("Pista 3" → 3), or null for custom names. */
export const defaultCourtNumber = (name: string): number | null => {
  const m = name.match(DEFAULT_COURT_RE);
  return m ? Number(m[2]) : null;
};
