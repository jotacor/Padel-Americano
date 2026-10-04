# 🎾 Padel Americano Manager

🌐 [English](README.md) · **Español**

Una app web moderna para organizar torneos de **Pádel Americano** — el formato social en el que los jugadores rotan de pareja en cada ronda para que todos jueguen con y contra personas distintas.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)
![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?logo=docker)

## Características

### Torneo base
- ✅ **Parejas fijas** — Opcional en ambos modos: tú eliges las parejas, solo rotan los rivales
- ✅ **Dos modos** — *Aleatorio* (todas las rondas generadas de antemano, lógica Whist) y *Liga* (rondas de una en una, equilibradas por nivel, los jugadores pueden entrar/descansar entre rondas)
- ✅ **Emparejamiento por clasificación** — Opción de Liga: cada ronda vuelve a elegir parejas y rivales según los resultados, sin dejar de jugar contra todos
- ✅ **Calendario inteligente** — Calendarios "Whist" matemáticamente óptimos para 8, 12 y 16 jugadores
- ✅ **Rotación de pistas** — El algoritmo hace que los jugadores roten por distintas pistas en cada ronda
- ✅ **Pistas a elegir** — Usa las pistas que te deje el club (− / +), en ambos modos y con cualquier número de jugadores; el resto descansa por turnos y nadie descansa dos rondas seguidas (siempre que no descansen más de los que juegan)
- ✅ **Nombres en mayúsculas** — Los nombres de los jugadores siempre se muestran en mayúsculas
- ✅ **Marcador en vivo** — Introduce los resultados por ronda y ve la clasificación actualizarse en tiempo real
- ✅ **Puntos por partido** — Partidos a 11, 15 o 21 puntos (impares: sin empates; 11 por defecto, o libre): escribes un marcador y el otro se rellena (13 → 8); teclado numérico, Enter salta al siguiente marcador; aviso si un resultado no suma
- ✅ **Ganadores resaltados** — En los partidos terminados, el equipo ganador aparece en verde

### Gestión flexible del torneo
- ✅ **Deshacer una ronda** — Quita la última ronda mientras nadie haya apuntado resultados (¿alguien llegó tarde? deshaz y genera otra)
- ✅ **Añadir rondas bajo demanda** — Botón "+" para ampliar el torneo con una rotación justa de jugadores
- ✅ **Ronda de campeonato** — Crea la final: 1.º+3.º vs 2.º+4.º clasificado
- ✅ **Resultados del campeonato** — Muestra el equipo ganador, el subcampeón y la clasificación individual
- ✅ **Configuración bloqueada** — Los jugadores quedan bloqueados al empezar el torneo (evita accidentes)

### Compartir
- ✅ **Copiar ronda y clasificación** — "Copiar ronda" y "Copiar clasificación" dejan el texto en el portapapeles (`ANA-LUIS vs MARTA-JUAN`) para pegarlo donde quieras
- ✅ **Enlaces para compartir** — Comparte con los espectadores mediante una URL fácil de recordar (`/game/bala-zapato`) y una clasificación para pantalla (TV) (`/display/bala-zapato`) que se desplaza sola si la lista no cabe
- ✅ **Sincronización en tiempo real** — Los resultados se sincronizan con el servidor, los espectadores ven las actualizaciones automáticamente
- ✅ **Visualización de solo lectura** — Los espectadores pueden ver rondas y resultados sin poder editar
- ✅ **Limpieza automática** — Los enlaces compartidos caducan 24 horas después del último cambio
- ✅ **Sincronización fiable** — Reintenta con mala cobertura y avisa si el enlace no está al día; el visor abre en la ronda que se está jugando

### Experiencia de usuario
- ✅ **Mobile-first** — Diseño adaptable que funciona genial en el móvil junto a las pistas
- ✅ **Navegación con teclado** — Teclas de flecha para moverte entre rondas
- ✅ **En español** — Español por defecto; inglés disponible con un enlace discreto en Ajustes y en el visor, o con `?lang=en` en cualquier URL (p. ej. la pantalla de TV)
- ✅ **Sin cuenta** — Los datos se quedan en el dispositivo (localStorage)
- ✅ **Exportar / Importar (YAML)** — Guarda un torneo en un archivo `.yaml` legible y cárgalo más tarde para ver resultados o seguir jugando; cada exportación incrementa un `revision` y añade una entrada a un registro `history` dentro del archivo
- ✅ **Desempates** — Ordenado por partidos ganados → puntos totales → diferencia de puntos (columna extra: puntos por partido)

## Inicio rápido

**Requisitos previos:** Node.js 20.19+

```bash
# Instalar dependencias
npm install

# Iniciar el servidor de desarrollo (Vite + servidor de la API)
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador. Los enlaces de compartir, pantalla y espectador funcionan también en local.

## Cómo funciona

### Flujo del torneo

1. **Configuración** — Añade jugadores con un nivel (mínimo 4; 8/12/16 para un equilibrio Whist "perfecto"), elige un modo y la modalidad de parejas
2. **Configurar pistas** — Elige cuántas pistas tienes (Pista 1, 2, 3…)
3. **Empezar** — *Aleatorio* crea todas las rondas de entrada; *Liga* las genera de una en una
4. **Jugar** — Navega por las rondas e introduce los resultados tras cada partido
5. **Ampliar** — Añade más rondas con el botón "+" si hay tiempo
6. **Finales** — Crea la ronda de campeonato a partir de la clasificación
7. **Resultados** — Consulta los equipos campeones y la clasificación individual

### Modos de torneo

| | **Aleatorio** (por defecto) | **Aleatorio + "Priorizar nivel inicial"** | **Liga** |
|---|---|---|---|
| **Rondas** | Todas generadas al inicio (N−1, o N si es impar; más si hay menos pistas) | Todas generadas al inicio (mismo número) | Una a una ("Generar ronda N") |
| **Parejas** | Rotación Whist / Berger: cada uno forma pareja con todos una vez | Elegidas en cada ronda para equilibrar el nivel | Elegidas en cada ronda para equilibrar el nivel |
| **Nivel** | Solo decide quién ocupa cada hueco del calendario. Sin efecto con 8/12/16 (toda asignación está igual de equilibrada); ayuda con otros tamaños | Criterio principal: grupos de 4 y reparto de equipos lo más igualados posible | Nivel inicial y/o clasificación, ver [Emparejamiento en Liga](#emparejamiento-en-liga) |
| **Repeticiones** | Ninguna: sin parejas repetidas, rivales repartidos de forma uniforme | Algunas parejas se repiten, otras nunca coinciden (8 jugadores: ~7 de 28 parejas) | Se evitan en lo posible (penalizadas, no prohibidas) |
| **Equilibrio de partidos** (8 jugadores, niveles mixtos) | Diferencia media de nivel por partido ≈ 1,36 | ≈ 0,64 | Similar a "Priorizar nivel inicial" |
| **Plantilla** | Bloqueada al empezar | Bloqueada al empezar | Añade jugadores y alterna activo/descanso entre rondas |
| **Quién juega** | Fijado por el calendario (los descansos rotan) | Primero quienes han jugado menos partidos | Primero quienes han jugado menos partidos, solo jugadores activos |
| **Pistas** | Tú eliges (por defecto jugadores ÷ 4). Con menos pistas → el mismo calendario repartido en más rondas (se mantienen las garantías de parejas/rivales mientras nadie tenga que descansar dos rondas seguidas), los jugadores descansan por turnos | Igual que Aleatorio | Tú eliges (4 por defecto), modificable entre rondas; los jugadores sobrantes descansan |
| **Rondas extra (+)** | Rotación justa evitando repeticiones, rivales igualados por nivel | Mismo algoritmo que Liga | Botón de siguiente ronda |
| **Finales** | 1.º+3.º vs 2.º+4.º | 1.º+3.º vs 2.º+4.º | — |
| **Ideal para** | Grupo cerrado con tiempo para el calendario completo | Grupo de nivel mixto donde importan más los partidos igualados que conocer a todos | Sesiones abiertas donde la gente llega/se va, número de rondas desconocido |

Los niveles cuentan como Bajo = 1, Medio = 2, Alto = 3 (el nivel de un equipo es la suma de ambos jugadores).

#### Emparejamiento en Liga

Dos opciones en la configuración de Liga, combinables:

| | **Priorizar nivel inicial** (activada por defecto) | **Priorizar clasificación** |
|---|---|---|
| **Se basa en** | Nivel marcado a cada jugador (Bajo/Medio/Alto) | Resultados hasta el momento, recalculados antes de cada ronda |
| **Grupos de 4** | Niveles mezclados, equipos lo más igualados posible | Fuerza parecida (los de arriba con los de arriba, estilo Mexicano), equipos lo más igualados posible |
| **Repeticiones** | Se evitan parejas/rivales repetidos en lo posible | Se permiten contra rivales de nivel parecido, pero el coste crece (al cuadrado) cuanto más se adelanta un rival respecto al que menos has enfrentado, más una penalización en las dos últimas rondas → todos siguen jugando contra todos |
| **Parejas fijas** | Rivales con nivel de pareja parecido | Rivales por clasificación: las parejas parecidas coinciden más |

- **Fuerza según la clasificación** = percentil de puntos ganados por punto jugado (no puntos totales, para no penalizar descansos ni llegadas tardías), en la misma escala 1–3 que el nivel.
- **Ambas activadas**: al principio cuenta el nivel inicial y los resultados van pesando más según se juega (los resultados pesan n/(n+2) tras n partidos). **Solo clasificación**: todos empiezan iguales. **Ninguna**: solo rotación.
- Simulado (ambas opciones vs solo nivel, 12–30 jugadores, 2–5 pistas, 10 rondas): parejas rotativas → 6–18% menos diferencia de nivel por partido cuando cada jugador juega ≥8 partidos (sin diferencia con pocos partidos), menos parejas repetidas, cobertura de rivales igual o mejor. Parejas fijas → ~5–15% menos diferencia, cobertura a ≤6 puntos de solo nivel.

**Parejas fijas** (opcional en ambos modos, *Parejas: Fijas*): tú formas las parejas y solo rotan los rivales.

| | **Aleatorio + Parejas fijas** | **Liga + Parejas fijas** |
|---|---|---|
| **Calendario** | Todos contra todos: cada pareja se enfrenta a cada otra pareja una vez | Una ronda cada vez: primero las parejas que menos han jugado, evitando rivales repetidos y equilibrando el nivel de las parejas (o la clasificación, ver arriba) |
| **Requisitos** | Todos los jugadores deben tener pareja | Los jugadores sin pareja esperan; se pueden formar parejas nuevas durante la liga |
| **Descanso** | Una pareja descansa por ronda si el número de parejas es impar | Una pareja descansa junta (alternar a un miembro alterna a ambos) |
| **Clasificación / Finales** | Por pareja; final 1.ª vs 2.ª pareja (3.ª vs 4.ª en la pista siguiente) | Por pareja |

### Algoritmo de calendario

El modo *Aleatorio* (parejas rotativas) usa la lógica de **torneo Whist**:

| Jugadores | Rondas | Pistas | Equilibrio |
|-----------|--------|--------|------------|
| 8 | 7 | 2 | Pareja con todos una vez, rival de todos dos veces |
| 12 | 11 | 3 | Pareja con todos una vez, rival de todos dos veces |
| 16 | 15 | 4 | Pareja con todos una vez, rival de todos dos veces |
| Otros | N-1 | Varía | Rotación con tabla de Berger (pareja con todos una vez) |

**Rotación de pistas**: Los jugadores rotan automáticamente entre pistas en cada ronda — el algoritmo registra el historial de pistas y optimiza las asignaciones.

**Rondas adicionales**: Al añadir rondas bajo demanda, el algoritmo:
- Prioriza a los jugadores que han jugado menos partidos
- Evita emparejamientos recientes de pareja/rival
- Gestiona los descansos con un número impar de jugadores

## Desarrollo

```bash
npm run dev      # Vite (HMR, :3000) + servidor de la API (server/index.ts, :8788, se reinicia al cambiar); Ctrl-C detiene ambos
npm run dev:vite # Solo Vite (sin /api — compartir no funcionará)
npm test         # Tests unitarios (vitest)
npm run build    # Build de producción (dist/)
npm start        # Servidor de producción: dist/ + /api en :8788
```

`npm run dev` ([`scripts/dev.mjs`](scripts/dev.mjs)) ejecuta el servidor de la API y Vite redirige `/api` hacia él. Los torneos compartidos se guardan como ficheros JSON en `./data` (bórralo para reiniciar). Cambia el puerto de la API con `API_PORT=8789 npm run dev`; los argumentos extra pasan a Vite (`npm run dev -- --port 3001`).

## Estructura del proyecto

```
├── App.tsx              # Componente React principal (UI + estado)
├── GameViewer.tsx       # Visor de solo lectura para torneos compartidos
├── types.ts             # Interfaces TypeScript
├── components/          # Piezas de UI compartidas (modal de compartir, …)
├── hooks/               # useShareSync (compartir en directo), usePolling (visores)
├── utils/
│   ├── scheduler.ts     # Calendario del torneo + rondas adicionales
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
└── CLAUDE.md            # Archivo de contexto para agentes de IA
```

## Despliegue

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

Hace falta HTTPS para copiar al portapapeles fuera de localhost: usa un proxy inverso o el proxy de Cloudflare delante del contenedor.

**CI** ([`.github/workflows/docker.yml`](.github/workflows/docker.yml)): cada push a `main` construye la imagen y publica `jotacor/padelamericano:latest` y `:<short-sha>` en Docker Hub (las PR no lo activan). Requiere el secreto del repositorio `DOCKER_PASSWORD` (un token de acceso de Docker Hub).

## Contribuir

1. Crea una rama de funcionalidad: `git checkout -b feature/tu-funcionalidad`
2. Haz cambios y pruébalos en local (`npm run dev`, `npm test`)
3. Abre una PR — el CI comprueba tipos, tests y build
4. Fusiona tras la revisión

## Licencia

MIT
