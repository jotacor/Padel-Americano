// Common, friendly Spanish nouns for memorable share IDs (`bala-zapato`).
// Rules: lowercase ASCII, 3-7 letters, no ñ/accents, no slang/double meanings, no duplicates.
export const WORDS: readonly string[] = [
  // Comida
  'pan', 'sopa', 'arroz', 'queso', 'uva', 'pera', 'kiwi', 'mango', 'coco', 'fresa',
  'cereza', 'ciruela', 'lima', 'naranja', 'manzana', 'tomate', 'patata', 'cebolla', 'ajo', 'oliva',
  'miel', 'nata', 'flan', 'tarta', 'galleta', 'churro', 'paella', 'pasta', 'pizza', 'salsa',
  'perejil', 'canela', 'cacao', 'nuez', 'tapa', 'bocata', 'pomelo', 'fideo', 'lenteja', 'trigo',
  'avena', 'harina', 'yogur', 'batido', 'zumo', 'tostada', 'helado', 'chicle', 'crema', 'natilla',
  'pastel', 'polo', 'mora', 'menta', 'laurel', 'tomillo', 'romero',
  // Naturaleza
  'sol', 'luna', 'mar', 'lago', 'monte', 'nube', 'lluvia', 'nieve', 'viento', 'rayo',
  'trueno', 'playa', 'arena', 'isla', 'bosque', 'selva', 'prado', 'campo', 'roca', 'piedra',
  'ola', 'marea', 'cielo', 'cometa', 'planeta', 'valle', 'colina', 'cueva', 'duna', 'costa',
  'cabo', 'pino', 'roble', 'olivo', 'palmera', 'cactus', 'flor', 'rosa', 'lirio', 'girasol',
  'hoja', 'rama', 'semilla', 'musgo', 'hierba', 'brisa', 'niebla', 'aurora', 'hielo', 'fuego',
  'chispa', 'llama', 'brasa', 'humo', 'tierra', 'barro', 'coral', 'perla', 'cristal', 'oro',
  'plata', 'cobre', 'hierro', 'bronce', 'jade', 'orilla', 'glaciar', 'pradera', 'oasis', 'sierra',
  // Animales
  'gato', 'perro', 'pato', 'loro', 'oso', 'lobo', 'zorro', 'tigre', 'puma', 'lince',
  'mono', 'koala', 'panda', 'cebra', 'jirafa', 'camello', 'ballena', 'pulpo', 'medusa', 'gamba',
  'erizo', 'ardilla', 'conejo', 'liebre', 'tortuga', 'rana', 'grillo', 'abeja', 'hormiga', 'pez',
  'sardina', 'trucha', 'caballo', 'oveja', 'gallo', 'pollo', 'lechuza', 'cuervo', 'paloma', 'gaviota',
  'canguro', 'castor', 'nutria', 'morsa', 'bisonte', 'alce', 'ciervo', 'corzo', 'gacela', 'lagarto',
  'iguana', 'caracol', 'cigarra', 'canario', 'pavo', 'cisne', 'garza', 'potro', 'ternero',
  // Objetos
  'mesa', 'silla', 'vaso', 'taza', 'plato', 'cuchara', 'tenedor', 'cazo', 'olla', 'llave',
  'puerta', 'ventana', 'cama', 'libro', 'papel', 'tijera', 'regla', 'mochila', 'maleta',
  'bolso', 'gorra', 'gorro', 'bufanda', 'guante', 'zapato', 'bota', 'camisa', 'falda', 'abrigo',
  'cinta', 'lazo', 'anillo', 'collar', 'reloj', 'espejo', 'peine', 'cepillo', 'jarra', 'botella',
  'cesta', 'caja', 'sobre', 'carta', 'sello', 'mapa', 'globo', 'farol', 'vela', 'abanico',
  'tambor', 'flauta', 'piano', 'campana', 'timbre', 'bala', 'llavero', 'tiza',
  // Transporte y lugares
  'bici', 'moto', 'coche', 'tren', 'barco', 'cohete', 'velero', 'canoa', 'balsa', 'ancla',
  'remo', 'faro', 'puente', 'torre', 'casa', 'choza', 'tienda', 'plaza', 'calle', 'parque',
  'huerto', 'granja', 'molino', 'fuente', 'pozo', 'banco', 'kiosco', 'museo', 'teatro', 'cine',
  'mercado', 'escuela', 'patio', 'terraza', 'tejado', 'muelle', 'puerto', 'aldea', 'barrio',
  // Deporte y padel
  'pala', 'red', 'pista', 'saque', 'volea', 'raqueta', 'pelota', 'gol', 'meta', 'copa',
  'trofeo', 'medalla', 'dorsal', 'silbato', 'equipo', 'partido', 'torneo', 'punto', 'rebote', 'bandeja',
  'remate', 'carrera', 'salto', 'podio',
  // Musica y fiesta
  'ritmo', 'tango', 'rumba', 'jota', 'nota', 'canto', 'eco', 'coro', 'baile', 'fiesta',
  'feria', 'magia', 'disco', 'radio', 'verbena',
];

const randomInt = (n: number): number => crypto.getRandomValues(new Uint32Array(1))[0] % n;

/** Two different random words, e.g. `bala-zapato`; `withNumber` appends 2-99 (`bala-zapato-7`) */
export function randomWordId(withNumber = false): string {
  const a = randomInt(WORDS.length);
  const b = (a + 1 + randomInt(WORDS.length - 1)) % WORDS.length; // always != a
  const id = `${WORDS[a]}-${WORDS[b]}`;
  return withNumber ? `${id}-${2 + randomInt(98)}` : id;
}
