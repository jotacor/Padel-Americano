// "Info" tab: a short user manual for the organizer, in the order a tournament is run.
// Only what's needed to run it well; no algorithm details. Same structure in every language
// (checked by i18n/info.test.ts). `**text**` = bold.
import type { Language } from './translations.ts';

export type InfoBlock =
  | { kind: 'p'; text: string }
  | { kind: 'steps'; items: string[] } // numbered, in order
  | { kind: 'list'; items: string[] }
  | { kind: 'choose'; rows: [string, string][] }; // situation → what to pick

export interface InfoSection {
  title: string;
  blocks: InfoBlock[];
}

const es: InfoSection[] = [
  {
    title: '¿Qué formato elijo?',
    blocks: [
      {
        kind: 'choose',
        rows: [
          ['Grupo cerrado y quieres que todos se enfrenten a todos', '**Americano · Clásico**'],
          ['Niveles muy distintos y quieres partidos igualados', '**Americano · Por nivel**'],
          ['La gente llega tarde, se va antes o juegas varias jornadas', '**Liga**'],
          ['Las parejas vienen hechas y juegan siempre juntas', 'Parejas **Fijas**'],
        ],
      },
    ],
  },
  {
    title: 'Preparar el torneo',
    blocks: [
      {
        kind: 'steps',
        items: [
          'En **Ajustes**, apunta a los jugadores. El nivel (Bajo, Medio, Alto) solo se pide en las variantes Por nivel.',
          'Elige **modo** (Americano o Liga), **variante** (Clásico o Por nivel) y **parejas** (Rotativas o Fijas). Con Fijas, une a cada pareja con el icono de enlace.',
          'Pon las **pistas** que tienes. Si sobran jugadores, descansan por turnos.',
          'Elige la **puntuación**: 11p, 15p o 21p (gana quien llega a 6, 8 u 11), o 3 sets.',
          'Pulsa **Iniciar**.',
        ],
      },
    ],
  },
  {
    title: 'Durante el torneo',
    blocks: [
      {
        kind: 'list',
        items: [
          'En **Partidos** ves quién juega en cada pista. Apunta el resultado al acabar: a puntos, escribe el marcador del perdedor y el ganador se rellena solo; a 3 sets, apunta los juegos de cada set.',
          'Pasa a la siguiente ronda con la flecha (Americano) o con **Generar ronda** (Liga). Si algún resultado está mal o a medias, no te deja pasar; los partidos sin jugar se pueden dejar en blanco.',
          'En **Liga**, antes de cada ronda marca en Ajustes quién está y quién no. Puedes añadir jugadores y cambiar las pistas.',
          '¿Te has equivocado al crear una ronda? **Deshacer ronda** la quita mientras no tenga resultados (en Americano, solo las rondas añadidas y las finales).',
          '¿Sobra tiempo en Americano? El botón **+** añade una ronda más.',
        ],
      },
    ],
  },
  {
    title: 'Clasificación',
    blocks: [
      { kind: 'p', text: 'En **Tabla**. Manda quien más partidos gana; si empatan, quien más puntos (o sets) suma, y después la diferencia (DIF).' },
    ],
  },
  {
    title: 'Terminar',
    blocks: [
      {
        kind: 'list',
        items: [
          '**Ronda final** (Americano): una sola ronda, 1º y 3º contra 2º y 4º. Para acabar rápido.',
          '**Playoff**: semifinales y final con los 8 mejores (o las 4 mejores parejas). Necesita dos rondas más.',
          'Ambos aparecen en **Partidos**, en la última ronda. Al crearlos, las rondas anteriores quedan cerradas. Los campeones salen en **Tabla**.',
          '**Finalizar torneo** (Ajustes) lo borra del móvil: **Exporta** antes si quieres guardarlo.',
        ],
      },
    ],
  },
  {
    title: 'Compartir',
    blocks: [
      {
        kind: 'list',
        items: [
          '**Compartir** crea un enlace para que los jugadores sigan el torneo y otro para la TV del club. Se actualizan solos.',
          '**Copiar ronda** y **Copiar clasificación** copian un texto para pegar en WhatsApp.',
        ],
      },
    ],
  },
  {
    title: 'Bueno saber',
    blocks: [
      {
        kind: 'list',
        items: [
          'En **Clásico** (rotativas) hay unas la mitad de rondas que jugadores: todos se enfrentan a todos, nadie repite compañero y todos juegan lo mismo (±1 partido).',
          'En **Por nivel** nadie descansa dos rondas seguidas, pero alguna pareja puede repetirse.',
          'Con pocas pistas para tanta gente, algunos descansarán más a menudo: es inevitable.',
        ],
      },
    ],
  },
];

const en: InfoSection[] = [
  {
    title: 'Which format?',
    blocks: [
      {
        kind: 'choose',
        rows: [
          ['A closed group and everyone should face everyone', '**Americano · Classic**'],
          ['Very different levels and you want even matches', '**Americano · By skill**'],
          ['People arrive late, leave early, or you play several sessions', '**League**'],
          ['Pairs come ready-made and always play together', '**Fixed** pairs'],
        ],
      },
    ],
  },
  {
    title: 'Setting up',
    blocks: [
      {
        kind: 'steps',
        items: [
          'In **Setup**, add the players. Skill (Low, Medium, High) is only asked for in the By skill variants.',
          'Pick the **mode** (Americano or League), **variant** (Classic or By skill) and **pairs** (Rotating or Fixed). With Fixed, link each pair with the link icon.',
          'Set the **courts** you have. Extra players sit out in turn.',
          'Pick the **scoring**: 11p, 15p or 21p (first to 6, 8 or 11 wins), or 3 sets.',
          'Press **Start**.',
        ],
      },
    ],
  },
  {
    title: 'During the tournament',
    blocks: [
      {
        kind: 'list',
        items: [
          '**Matches** shows who plays on each court. Enter the result when it ends: with points, type the loser\'s score and the winner fills in; with 3 sets, enter the games of each set.',
          'Move to the next round with the arrow (Americano) or **Generate round** (League). If a result is wrong or half entered, it won\'t let you; unplayed matches can stay blank.',
          'In a **League**, before each round mark in Setup who is in and who isn\'t. You can add players and change courts.',
          'Created a round by mistake? **Undo round** removes it while it has no results (in Americano, only added rounds and finals).',
          'Time left in Americano? The **+** button adds one more round.',
        ],
      },
    ],
  },
  {
    title: 'Standings',
    blocks: [
      { kind: 'p', text: 'In **Scores**. Most wins goes first; on a tie, most points (or sets), then the difference (DIFF).' },
    ],
  },
  {
    title: 'Finishing',
    blocks: [
      {
        kind: 'list',
        items: [
          '**Final round** (Americano): a single round, 1st and 3rd vs 2nd and 4th. To finish quickly.',
          '**Playoff**: semifinals and final with the top 8 (or the top 4 pairs). Needs two more rounds.',
          'Both appear in **Matches**, on the last round. Once created, earlier rounds are closed. The champions show in **Scores**.',
          '**End tournament** (Setup) removes it from the device: **Export** first if you want to keep it.',
        ],
      },
    ],
  },
  {
    title: 'Sharing',
    blocks: [
      {
        kind: 'list',
        items: [
          '**Share** creates a link for the players to follow the tournament and another for the club TV. They update by themselves.',
          '**Copy round** and **Copy standings** copy a text to paste in WhatsApp.',
        ],
      },
    ],
  },
  {
    title: 'Good to know',
    blocks: [
      {
        kind: 'list',
        items: [
          'In **Classic** (rotating) there are about half as many rounds as players: everyone faces everyone, nobody repeats a partner and everyone plays the same (±1 match).',
          'In **By skill** nobody sits out two rounds in a row, but a partnership may repeat.',
          'With few courts for many players, some will rest more often: it can\'t be avoided.',
        ],
      },
    ],
  },
];

export const INFO: Record<Language, InfoSection[]> = { es, en };
