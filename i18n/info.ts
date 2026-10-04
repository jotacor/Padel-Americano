// "Info" tab: what an organizer needs to run a tournament (modes, variants, pairing, rests, scoring,
// standings, finals). Plain language, no algorithm jargon — keep it in line with README "How it works".
// Same sections and items in every language (checked by i18n/info.test.ts). `**text**` = bold.
import type { Language } from './translations.ts';

export interface InfoSection {
  title: string;
  items: string[];
}

const es: InfoSection[] = [
  {
    title: 'Paso a paso',
    items: [
      '**Ajustes**: nombre del torneo (opcional), jugadores (mínimo 4), modo, variante, tipo de parejas, pistas y puntuación.',
      '**Iniciar**: en Americano se preparan todas las rondas; en Liga se genera la primera.',
      '**Partidos**: quién juega en cada pista. Apunta los resultados al terminar cada partido.',
      '**Siguiente ronda**: con la flecha (Americano) o con "Generar ronda" (Liga).',
      '**Tabla**: clasificación en directo. Desde aquí se crea la Ronda final o el Playoff.',
    ],
  },
  {
    title: 'Americano o Liga',
    items: [
      '**Americano**: todas las rondas preparadas al empezar. Los jugadores no cambian durante el torneo. Ideal para un grupo cerrado con tiempo para jugar todas las rondas.',
      '**Liga**: una ronda cada vez. Puedes añadir jugadores y marcar quién está o descansa antes de cada ronda, y cambiar las pistas entre rondas. Ideal si la gente llega tarde, se va antes o no sabes cuántas rondas habrá.',
    ],
  },
  {
    title: 'Clásico o Por nivel',
    items: [
      '**Clásico**: todos juegan los mismos partidos, con y contra todos. No se usa el nivel. Ideal si todos tienen un nivel parecido.',
      '**Por nivel**: cada ronda se forman partidos igualados según el nivel (Bajo, Medio, Alto). Algunas parejas y rivales pueden repetirse. Nadie descansa dos rondas seguidas.',
      'En Liga Por nivel puedes marcar **Priorizar clasificación**: además del nivel, los que van arriba juegan con los de arriba y los de abajo con los de abajo, sin dejar de rotar.',
    ],
  },
  {
    title: 'Parejas rotativas o fijas',
    items: [
      '**Rotativas**: cambias de compañero cada ronda. La clasificación es individual.',
      '**Fijas**: tú formas las parejas (icono de enlace en dos jugadores) y juegan siempre juntas. La clasificación es por pareja.',
    ],
  },
  {
    title: 'Cómo se hacen los cruces',
    items: [
      '**Americano Clásico, rotativas**: cada jugador hace pareja con cada uno como mucho una vez y todos juegan el mismo número de partidos. Con 8, 9, 12, 13, 16, 17, 20, 21… jugadores hace pareja con todos; con 8, 12 y 16 además se enfrenta a todos exactamente dos veces.',
      '**Americano Clásico, fijas**: todos contra todos; cada pareja juega una vez contra cada otra.',
      '**Americano Por nivel**: partidos igualados por nivel en cada ronda; con fijas, rivales de nivel parecido.',
      '**Liga Clásico**: liga normal de todos contra todos. Si falta alguien, juegan los presentes con los enfrentamientos que aún no han jugado.',
      '**Liga Por nivel**: cada ronda se emparejan los jugadores activos por nivel (y por clasificación si lo marcas). Primero juegan quienes descansaron y quienes llevan menos partidos.',
    ],
  },
  {
    title: 'Pistas y descansos',
    items: [
      'Eliges las pistas: 4 por defecto, hasta 10. Si sobran pistas se indica cuántas quedan sin usar.',
      'Si sobran jugadores, descansan por turnos y se indica cuántos descansan cada ronda.',
      'En las variantes **Por nivel** nadie descansa dos rondas seguidas (salvo que descansen más de los que juegan).',
      'En las variantes **Clásico** manda el calendario: con todas las pistas no pasa; con menos pistas, solo si no hay otra forma de que todos jueguen con y contra todos.',
      'Con menos pistas que jugadores ÷ 4, el Americano Clásico reparte los mismos partidos en más rondas.',
      'Los jugadores van cambiando de pista para no estar siempre en la misma.',
    ],
  },
  {
    title: 'Puntuación y resultados',
    items: [
      '**11p, 15p, 21p**: partidos a esos puntos (impares, sin empates). Escribes el marcador de un equipo y el otro se rellena solo (a 11: 7 → 7-4).',
      '**3 sets**: al mejor de 3, sets de tenis (6-0 a 6-4, 7-5 o 7-6). Si una pareja gana los dos primeros, el tercero no se juega.',
      'No se puede pasar de ronda si algún resultado no es válido (no suma, sets imposibles o a medias). Los partidos en blanco sí se pueden dejar.',
      '**Deshacer ronda**: quita la última ronda si nadie ha apuntado resultados (útil si llega alguien tarde en Liga). En Americano solo las rondas extra y las finales.',
      '**Rondas extra (+)** en Americano: añade rondas cuando quieras; juegan primero quienes descansaron y quienes llevan menos partidos.',
    ],
  },
  {
    title: 'Clasificación',
    items: [
      'Orden: **victorias → puntos → diferencia (DIF)**. Lo primero es ganar el partido.',
      'Con 3 sets, después de las victorias cuentan los sets ganados y la diferencia de sets.',
      'También se muestra la media por partido (solo informativa).',
    ],
  },
  {
    title: 'Terminar el torneo',
    items: [
      '**Ronda final rápida** (Americano): una ronda; 1º+3º contra 2º+4º en la Pista 1 y el resto juega en las otras pistas. Con fijas, 1ª pareja contra 2ª.',
      '**Playoff** (todos los modos): semifinales y final, sin 3er puesto; el resto descansa. Rotativas: los 8 primeros en parejas 1º+8º, 2º+7º, 3º+6º, 4º+5º (Semifinal 1: 1º+8º contra 4º+5º; Semifinal 2: 2º+7º contra 3º+6º). Fijas: 4 primeras parejas, 1ª contra 4ª y 2ª contra 3ª.',
      'Al terminar las semifinales pulsa "Crear final". Al acabar la final se muestran campeones y subcampeones.',
      '**Finalizar torneo** (en Ajustes) cierra el torneo actual. Exporta antes si quieres guardarlo.',
    ],
  },
  {
    title: 'Compartir y guardar',
    items: [
      '**Compartir**: enlace de solo lectura para los jugadores y "Clasificación para pantalla" para la TV (se desplaza sola si no cabe). Caduca 24 horas después del último cambio.',
      '**Copiar ronda / Copiar clasificación**: texto para pegar en WhatsApp.',
      '**Exportar / Importar**: guarda el torneo en un archivo y cárgalo más tarde. Todo se guarda en el propio móvil, sin cuentas.',
    ],
  },
  {
    title: 'Consejos',
    items: [
      'Grupo de nivel parecido y tiempo para todas las rondas → **Americano Clásico**. Con 8, 12 o 16 jugadores el calendario es perfecto.',
      'Niveles muy distintos → **Por nivel**: partidos más igualados.',
      'Gente que llega y se va → **Liga**: marca quién está antes de cada ronda.',
      'Poco tiempo al final → **Ronda final rápida**; con tiempo para dos rondas → **Playoff**.',
      'Al acabar, **Exporta** el torneo si quieres guardarlo: Finalizar torneo lo borra del móvil.',
    ],
  },
];

const en: InfoSection[] = [
  {
    title: 'Step by step',
    items: [
      '**Setup**: tournament name (optional), players (at least 4), mode, variant, pairs, courts and scoring.',
      '**Start**: Americano prepares every round; League creates the first one.',
      '**Matches**: who plays on each court. Enter the scores when each match ends.',
      '**Next round**: with the arrow (Americano) or "Generate round" (League).',
      '**Scores**: live standings. The Final round or the Playoff is created here.',
    ],
  },
  {
    title: 'Americano or League',
    items: [
      '**Americano**: every round prepared at the start. Players don\'t change during the tournament. Best for a closed group with time to play every round.',
      '**League**: one round at a time. Add players and mark who is in or sitting out before each round, and change courts between rounds. Best if people arrive late, leave early or you don\'t know how many rounds there will be.',
    ],
  },
  {
    title: 'Classic or By skill',
    items: [
      '**Classic**: everyone plays the same matches, with and against everyone. Skill is not used. Best if everyone has a similar level.',
      '**By skill**: every round matches are balanced by skill (Low, Medium, High). Some partners and opponents may repeat. Nobody sits out two rounds in a row.',
      'In League By skill you can tick **Prioritize standings**: besides skill, top players play with top players and bottom with bottom, while still rotating.',
    ],
  },
  {
    title: 'Rotating or fixed pairs',
    items: [
      '**Rotating**: a new partner every round. Standings are individual.',
      '**Fixed**: you form the pairs (link icon on two players) and they always play together. Standings are per pair.',
    ],
  },
  {
    title: 'How matches are made',
    items: [
      '**Americano Classic, rotating**: every player partners each other player at most once and everyone plays the same number of matches. With 8, 9, 12, 13, 16, 17, 20, 21… players everyone partners everyone; with 8, 12 and 16 everyone also faces everyone exactly twice.',
      '**Americano Classic, fixed**: round robin; each pair plays every other pair once.',
      '**Americano By skill**: matches balanced by skill every round; with fixed pairs, opponents of similar level.',
      '**League Classic**: a normal league, everyone against everyone. If someone is missing, those present play the matchups they haven\'t played yet.',
      '**League By skill**: every round the active players are matched by skill (and standings if ticked). Those who sat out and those with fewer matches play first.',
    ],
  },
  {
    title: 'Courts and rests',
    items: [
      'You choose the courts: 4 by default, up to 10. Spare courts are shown as unused.',
      'Extra players sit out in turn; it shows how many rest each round.',
      'In the **By skill** variants nobody sits out two rounds in a row (unless more rest than play).',
      'In the **Classic** variants the schedule comes first: with all courts it doesn\'t happen; with fewer courts only if there\'s no other way for everyone to play with and against everyone.',
      'With fewer courts than players ÷ 4, Americano Classic spreads the same matches over more rounds.',
      'Players move around courts so they aren\'t always on the same one.',
    ],
  },
  {
    title: 'Scoring and results',
    items: [
      '**11p, 15p, 21p**: matches to those points (odd, no ties). Type one team\'s score and the other fills in (to 11: 7 → 7-4).',
      '**3 sets**: best of 3, tennis sets (6-0 to 6-4, 7-5 or 7-6). If a team wins the first two, the third isn\'t played.',
      'You can\'t move to the next round if a score isn\'t valid (doesn\'t add up, impossible sets or half entered). Blank matches are allowed.',
      '**Undo round**: removes the last round if nobody has entered scores (handy if someone arrives late in a League). In Americano only extra rounds and finals.',
      '**Extra rounds (+)** in Americano: add rounds any time; those who sat out and those with fewer matches play first.',
    ],
  },
  {
    title: 'Standings',
    items: [
      'Order: **wins → points → difference (DIFF)**. Winning the match comes first.',
      'With 3 sets, after wins it\'s sets won and set difference.',
      'Average per match is also shown (for information only).',
    ],
  },
  {
    title: 'Finishing the tournament',
    items: [
      '**Quick final round** (Americano): one round; 1st+3rd vs 2nd+4th on Court 1 and everyone else plays on the other courts. Fixed pairs: 1st pair vs 2nd.',
      '**Playoff** (every mode): semifinals and final, no 3rd place; everyone else rests. Rotating: the top 8 in teams 1st+8th, 2nd+7th, 3rd+6th, 4th+5th (Semifinal 1: 1st+8th vs 4th+5th; Semifinal 2: 2nd+7th vs 3rd+6th). Fixed: top 4 pairs, 1st vs 4th and 2nd vs 3rd.',
      'When the semifinals are over press "Create final". When the final ends, champions and runners-up are shown.',
      '**End tournament** (in Setup) closes the current tournament. Export first if you want to keep it.',
    ],
  },
  {
    title: 'Sharing and saving',
    items: [
      '**Share**: read-only link for the players and "Leaderboard display" for the TV (scrolls by itself if it doesn\'t fit). Expires 24 hours after the last change.',
      '**Copy round / Copy standings**: text to paste in WhatsApp.',
      '**Export / Import**: save the tournament to a file and load it later. Everything stays on the device, no accounts.',
    ],
  },
  {
    title: 'Tips',
    items: [
      'Similar level and time for every round → **Americano Classic**. With 8, 12 or 16 players the schedule is perfect.',
      'Very different levels → **By skill**: more even matches.',
      'People coming and going → **League**: mark who is in before each round.',
      'Little time left → **Quick final round**; time for two rounds → **Playoff**.',
      'When you finish, **Export** the tournament if you want to keep it: End tournament removes it from the device.',
    ],
  },
];

export const INFO: Record<Language, InfoSection[]> = { es, en };
