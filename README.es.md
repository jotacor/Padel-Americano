# 🎾 Padel Americano Manager

🌐 [English](README.md) · **Español**

App web para organizar torneos de pádel entre amigos o en el club: apuntas a los jugadores, la app hace los cruces, apuntas los resultados y la clasificación se actualiza sola. Funciona en el móvil, sin cuentas, y se puede compartir en directo (enlace para los jugadores y pantalla para la TV del club).

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)
![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?logo=docker)

## Características

- ✅ **Dos modos**: *Aleatorio* (todas las rondas preparadas al empezar) y *Liga* (una ronda cada vez; la gente puede entrar y salir)
- ✅ **Parejas rotativas o fijas**: con rotativas cambias de compañero cada ronda; con fijas juegas siempre con el mismo
- ✅ **Cruces automáticos**: todos juegan con y contra gente distinta; opcionalmente, partidos igualados por nivel o por clasificación
- ✅ **Las pistas que tengas**: eliges cuántas pistas hay (− / +); el resto descansa por turnos y **nadie descansa dos rondas seguidas**
- ✅ **Rotación de pistas**: cada jugador va pasando por pistas distintas
- ✅ **Resultados rápidos**: partidos a 11, 15 o 21 puntos (o libre); escribes un marcador y el otro se rellena solo (7 → 7-4)
- ✅ **Clasificación en directo**: victorias, puntos, diferencia (DIF) y puntos por partido
- ✅ **Final**: *Ronda final* rápida o *Playoff* (semifinales + final) entre los mejores
- ✅ **Rondas extra (+)** y **deshacer la última ronda** si aún no tiene resultados
- ✅ **Compartir**: enlace de solo lectura para los jugadores, pantalla de clasificación para la TV (se desplaza sola) y textos para pegar en WhatsApp ("Copiar ronda", "Copiar clasificación")
- ✅ **Guardar en archivo**: exporta e importa el torneo (`padel-liga-martes-2026-10-04-v3.yaml`)
- ✅ **En español** (inglés disponible), nombres siempre en mayúsculas, sin cuentas: todo se guarda en el propio móvil

## Cómo funciona

### Paso a paso

1. **Ajustes**: ponle nombre al torneo (opcional), apunta a los jugadores (mínimo 4) con su nivel (Bajo, Medio, Alto), elige el modo (Aleatorio o Liga), el tipo de parejas (rotativas o fijas), las pistas y los puntos por partido (PPP).
2. **Empezar**: en Aleatorio se crean todas las rondas; en Liga se genera la primera.
3. **Jugar**: en *Partidos* ves quién juega en cada pista; apunta los resultados al terminar.
4. **Siguiente ronda**: pasa con la flecha (Aleatorio) o pulsa "Generar ronda" (Liga).
5. **Terminar**: en *Tabla* puedes crear la Ronda final o un Playoff. Al acabar la final salen los campeones.

### Elegir modo

| | **Aleatorio** | **Liga** |
|---|---|---|
| **Rondas** | Todas preparadas al empezar | Una cada vez ("Generar ronda") |
| **Jugadores** | Fijos durante todo el torneo | Puedes añadir gente y marcar quién está o descansa antes de cada ronda |
| **Pistas** | Se eligen al empezar | Se pueden cambiar entre rondas |
| **Ideal para** | Grupo cerrado con tiempo para jugar todas las rondas | Sesiones abiertas: gente que llega tarde o se va antes, no sabes cuántas rondas habrá |

### Cómo se hacen los cruces

**Aleatorio, parejas rotativas (normal)**
- Cada jugador hace pareja **una vez con cada uno** de los demás y se enfrenta a todos un número parecido de veces. Nadie repite compañero.
- Número de rondas: jugadores − 1 (si son impares, tantas rondas como jugadores). Con 8 jugadores: 7 rondas.
- Con 8, 12 o 16 jugadores el calendario es perfecto: pareja con todos una vez y rival de todos exactamente dos veces.
- El nivel solo sirve para colocar a cada jugador en el calendario de forma que los partidos queden lo más igualados posible (con 8, 12 y 16 no cambia nada porque ya está todo equilibrado).

**Aleatorio + "Priorizar nivel inicial"**
- Cada ronda se forman partidos **igualados por nivel** (Bajo = 1, Medio = 2, Alto = 3; cada equipo suma sus dos jugadores).
- Los partidos salen más igualados, pero a cambio algunas parejas se repiten y otras nunca coinciden.

**Aleatorio, parejas fijas**
- **Todos contra todos**: cada pareja juega una vez contra cada otra pareja. Si hay un número impar de parejas, una descansa cada ronda.

**Liga**
- Antes de cada ronda se eligen los partidos entre los jugadores que están (activos). Primero juegan los que descansaron la ronda anterior y los que llevan menos partidos.
- Se evita repetir compañero y rival siempre que se pueda.
- Dos opciones para igualar los partidos (se pueden combinar):
  - **Priorizar nivel inicial** (activada por defecto): usa el nivel que pusiste a cada jugador para que los dos equipos queden igualados.
  - **Priorizar clasificación**: usa los resultados. Los que van arriba juegan con los que van arriba y los de abajo con los de abajo, y los equipos se igualan. Aun así se va rotando para jugar contra todos. Cuenta la proporción de puntos ganados, no el total, para no castigar a quien descansó o llegó tarde.
  - Con las dos: al principio manda el nivel y, según se juega, cada vez pesan más los resultados. Sin ninguna: solo rotación.
- **Liga con parejas fijas**: cada ronda juegan primero las parejas que menos han jugado, contra rivales de nivel parecido y sin repetir rival en lo posible. Si un miembro de la pareja no está, la pareja descansa entera. Se pueden formar parejas nuevas durante la liga.

### Pistas y descansos

- Tú eliges las pistas. En Aleatorio, por defecto, una pista por cada 4 jugadores.
- Si sobran jugadores, descansan por turnos. **Nadie descansa dos rondas seguidas**, salvo que descansen más jugadores de los que juegan (por ejemplo, 12 jugadores en 1 pista).
- En Aleatorio, si hay menos pistas que jugadores ÷ 4, los mismos partidos del calendario se reparten en más rondas.
- Los jugadores van cambiando de pista para no estar siempre en la misma.
- **Rondas extra (+)** en Aleatorio: añade rondas cuando quieras. Juegan primero quienes descansaron y quienes llevan menos partidos, evitando repetir parejas y rivales.

### Resultados

- **PPP (puntos por partido)**: 11, 15, 21 o Libre. Son impares para que no haya empates.
- Escribes el marcador de un equipo y el del otro se rellena solo (con PPP 11, escribes 7 → 7-4).
- Con PPP elegido, **no se puede pasar de ronda si algún resultado no suma los PPP** o está a medias. Los partidos en blanco sí se pueden dejar. Con "Libre" no se comprueba nada.
- En los partidos terminados, el equipo ganador sale en verde.
- **Deshacer ronda**: quita la última ronda si nadie ha apuntado resultados (por ejemplo, si llega alguien tarde en Liga). En Aleatorio solo se pueden deshacer las rondas extra y las finales.

### Clasificación

- Orden: **victorias → puntos totales → diferencia de puntos (DIF)**. Lo que cuenta primero es ganar el partido.
- También se muestra la media de puntos por partido (solo informativa).
- Con parejas fijas, la clasificación es por pareja.

### Terminar el torneo

En *Tabla*, apartado "Terminar el torneo":

**Ronda final rápida** (solo Aleatorio): una sola ronda.
- Parejas rotativas: **1º + 3º contra 2º + 4º** en la Pista 1; el resto juega en las otras pistas.
- Parejas fijas: 1ª pareja contra 2ª pareja.

**Playoff** (todos los modos): semifinales y final, sin partido por el 3º puesto. **El resto descansa.**
- Parejas rotativas: los **8 primeros** forman parejas equilibradas: 1º+8º, 2º+7º, 3º+6º y 4º+5º.
  - Semifinal 1: (1º+8º) contra (4º+5º)
  - Semifinal 2: (2º+7º) contra (3º+6º)
- Parejas fijas: las **4 primeras parejas**. Semifinal 1: 1ª contra 4ª. Semifinal 2: 2ª contra 3ª.
- Cuando terminan las dos semifinales, pulsa "Crear final": juegan las dos parejas ganadoras.
- En Liga solo entran los jugadores activos. Con una sola pista, cada semifinal va en una ronda.

Al terminar la final se muestran **Campeones** y **Subcampeones** en la app, en el enlace compartido y en la pantalla de la TV.

### Compartir

- **Compartir** crea un enlace fácil de recordar (`/game/bala-zapato`) para que los jugadores vean rondas y clasificación (solo lectura; abre en la ronda que se está jugando).
- **Clasificación para pantalla** (`/display/bala-zapato`): para la TV del club. Si la lista no cabe, baja despacio y vuelve arriba sola.
- Se actualiza solo con cada resultado. El enlace caduca 24 horas después del último cambio.
- **Copiar ronda / Copiar clasificación**: copia un texto para pegar en WhatsApp, por ejemplo `Pista 1: ANA-LUIS vs MARTA-JUAN (7-4)`.

### Guardar el torneo

- Todo se guarda en el propio móvil o navegador; no hace falta cuenta.
- **Exportar** descarga un archivo `.yaml` (por ejemplo `padel-liga-martes-2026-10-04-v3.yaml`: modo, nombre, fecha de inicio y versión). Cada exportación sube la versión.
- **Importar** carga un archivo para ver los resultados o seguir jugando.
- Idioma: español por defecto; inglés con el enlace de Ajustes o añadiendo `?lang=en` a la dirección.

---

## Para programadores

### Inicio rápido

**Requisitos previos:** Node.js 20.19+

```bash
npm install   # Instalar dependencias
npm run dev   # Vite + servidor de la API
```

Abre [http://localhost:3000](http://localhost:3000). Los enlaces de compartir, pantalla y espectador funcionan también en local.

### Desarrollo

```bash
npm run dev      # Vite (HMR, :3000) + servidor de la API (server/index.ts, :8788, se reinicia al cambiar); Ctrl-C detiene ambos
npm run dev:vite # Solo Vite (sin /api — compartir no funcionará)
npm test         # Tests unitarios (vitest)
npm run build    # Build de producción (dist/)
npm start        # Servidor de producción: dist/ + /api en :8788
```

`npm run dev` ([`scripts/dev.mjs`](scripts/dev.mjs)) ejecuta el servidor de la API y Vite redirige `/api` hacia él. Los torneos compartidos se guardan como ficheros JSON en `./data` (bórralo para reiniciar). Cambia el puerto de la API con `API_PORT=8789 npm run dev`; los argumentos extra pasan a Vite (`npm run dev -- --port 3001`).

### Estructura del proyecto

```
├── App.tsx              # Componente React principal (UI + estado)
├── GameViewer.tsx       # Visor de solo lectura (/game/:id)
├── LeaderboardDisplay.tsx # Clasificación para pantalla (/display/:id)
├── types.ts             # Interfaces TypeScript
├── components/          # Piezas de UI compartidas (modal de compartir, …)
├── hooks/               # useShareSync (compartir en directo), usePolling (visores), useAutoScroll (TV)
├── utils/
│   ├── scheduler.ts     # Calendario Whist/Berger, rondas de Liga, rondas extra, reparto en pistas
│   ├── classicSchedule.ts # Calendario de Aleatorio (sin descansos seguidos)
│   ├── ranking.ts       # Liga por clasificación
│   ├── fixedPairs.ts    # Parejas fijas
│   ├── playoff.ts       # Playoff (semifinales + final)
│   ├── leaderboard.ts   # Clasificación
│   └── tournamentFile.ts # Exportar/importar YAML + validación
├── server/              # Servidor Node (sin dependencias en ejecución)
│   ├── index.ts         # Entrada: PORT, DATA_DIR, DIST_DIR
│   ├── app.ts           # /api/game (crear/leer/actualizar/borrar compartidos) + ficheros estáticos con fallback SPA
│   ├── store.ts         # Un fichero JSON por torneo compartido en DATA_DIR/shares
│   ├── secret.ts        # Token de escritura (aleatorio, guardado con hash)
│   └── words.ts         # Palabras en español para IDs de compartir (p. ej. /game/bala-zapato)
├── index.tsx            # Punto de entrada React + rutas
├── index.html           # Esqueleto HTML + meta tags OG
├── scripts/dev.mjs      # Desarrollo local: Vite + servidor de la API
└── CLAUDE.md            # Contexto técnico detallado (algoritmos, convenciones)
```

### Despliegue

Un único contenedor Docker sirve todo (frontend + API) y guarda los torneos compartidos como ficheros en `/data`. Apunta tu dominio a él (p. ej. con el proxy de Cloudflare) y pon HTTPS delante.

**Docker Compose** (lo más sencillo):

```bash
docker compose up -d --build   # → http://localhost:8788
docker compose logs -f         # logs
docker compose down            # detener (los datos se conservan en el volumen padel-data; añade -v para borrarlo)
```

Opcional: `HOST_PORT=8080` (puerto del host, 8788 por defecto) en un archivo `.env` junto a `docker-compose.yml` (ignorado por git).

Imagen prediseñada: `docker pull jotacor/padelamericano:latest` (publicada por CI desde `main`). Portainer: crea un stack con `docker-compose.yml`, cambiando el volumen por una carpeta del host si lo prefieres (p. ej. `/mnt/pool/apps/padel:/data`).

**Docker simple:**

```bash
docker run -d --name padel -p 8788:8788 \
  -v padel-data:/data \
  jotacor/padelamericano:latest
```

Abre [http://localhost:8788](http://localhost:8788).

| Opción | Descripción |
|--------|-------------|
| `-v padel-data:/data` | Los torneos compartidos (`/data/shares/*.json`) sobreviven a reinicios; cada uno caduca 24 h después de su último cambio |
| `-e PORT` | Puerto interno (por defecto `8788`) |

**CI**: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) comprueba tipos, tests y build en cada push a `main`; [`.github/workflows/docker.yml`](.github/workflows/docker.yml) construye la imagen y publica `jotacor/padelamericano:latest` y `:<short-sha>` en Docker Hub. Requiere el secreto del repositorio `DOCKER_PASSWORD` (un token de acceso de Docker Hub).

### Contribuir

1. Crea una rama: `git checkout -b feature/tu-funcionalidad`
2. Haz cambios y pruébalos en local (`npm run dev`, `npm run typecheck`, `npm test`)
3. Fusiona tras revisarlo

### Licencia

MIT
