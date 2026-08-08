// Generador dinámico de plantillas con medias ponderadas y curva de valoración de mercado hiperrealista EA FC 25 (OVR Inicial Máximo 91)
// v2.0: Añade campos FC IQ, Team Spirit, historial estadístico y sistema de Regens.
// Migrado a TypeScript (Fase 1): tipos conectados a js/types.ts, lógica intacta.

import type { AIManager, ManagerArchetypeId, PersonalityRole, Player, Position, RetiredLegend, Team } from '../types.js';

/**
 * v4.0 — Rol de Vestuario ALEATORIO según las características del jugador.
 * El DT ya no asigna roles a mano (se eliminó el selector de squadUI); cada
 * futbolista nace con el suyo según su perfil, con algo de azar para que
 * ninguna plantilla quede uniforme:
 *   - 👑 Capitán: veterano consolidado (≥30 y OVR alto) o peso pesado (25-29, OVR ≥ 80)
 *   - 🎓 El Mentor: veterano (≥30, OVR medio-alto) que guía a los jóvenes
 *   - ⭐ Joven Promesa: talento joven (≤22) con techo alto (potencial ≥ 80)
 *   - 🔥 El Rebelde: wildcard que puede salir en cualquier perfil (~8%)
 */
export function assignPersonalityRole(age: number, overall: number, potential: number): PersonalityRole | null {
  const r = Math.random();
  if (r >= 0.92) return 'rebel'; // wildcard: aparece en cualquier perfil
  if (age >= 30 && overall >= 82 && r < 0.5) return 'captain';
  if (age >= 30 && overall >= 74 && r < 0.35) return 'mentor';
  if (age <= 22 && potential >= 80 && r < 0.55) return 'youngStar';
  if (age >= 25 && overall >= 80 && r < 0.3) return 'captain';
  return null;
}

export function calculatePositionOvr(pos: Position, pac: number, sho: number, pas: number, dri: number, def: number, phy: number): number {
  let ovr = 70;
  if (pos === 'POR') {
    ovr = (def * 0.40) + (phy * 0.35) + (pas * 0.15) + (pac * 0.10);
  } else if (pos === 'DFC') {
    ovr = (def * 0.40) + (phy * 0.35) + (pac * 0.15) + (pas * 0.10);
  } else if (pos === 'LI' || pos === 'LD') {
    ovr = (pac * 0.30) + (def * 0.30) + (pas * 0.20) + (phy * 0.20);
  } else if (pos === 'MCD') {
    ovr = (def * 0.35) + (phy * 0.30) + (pas * 0.25) + (dri * 0.10);
  } else if (pos === 'MC') {
    ovr = (pas * 0.35) + (dri * 0.25) + (phy * 0.15) + (sho * 0.15) + (def * 0.10);
  } else if (pos === 'MCO') {
    ovr = (dri * 0.35) + (pas * 0.35) + (sho * 0.20) + (pac * 0.10);
  } else if (pos === 'EI' || pos === 'ED') {
    ovr = (pac * 0.40) + (dri * 0.30) + (sho * 0.15) + (pas * 0.15);
  } else if (pos === 'DC') {
    ovr = (sho * 0.40) + (pac * 0.25) + (phy * 0.20) + (dri * 0.15);
  } else {
    ovr = (pac + sho + pas + dri + def + phy) / 6;
  }
  // En EA FC / FIFA la media inicial máxima al comenzar temporada es 91
  return Math.max(50, Math.min(91, Math.round(ovr)));
}

export function calculatePlayerMarketValue(ovr: number, age: number, pot: number = ovr): number {
  const keypoints = [
    { ovr: 50, val: 300000 },
    { ovr: 60, val: 1200000 },
    { ovr: 68, val: 4500000 },
    { ovr: 74, val: 12000000 },
    { ovr: 78, val: 24000000 },
    { ovr: 82, val: 45000000 },
    { ovr: 86, val: 85000000 },
    { ovr: 89, val: 130000000 },
    { ovr: 91, val: 165000000 }, // OVR 91 Inicial ~ €165M - €185M
    { ovr: 93, val: 215000000 },
    { ovr: 94, val: 250000000 },
    { ovr: 95, val: 280000000 },
    { ovr: 99, val: 400000000 }
  ];

  let baseValue = 300000;
  // Índices siempre válidos (keypoints no está vacío y i < length-1): aserciones seguras
  if (ovr <= keypoints[0]!.ovr) {
    baseValue = keypoints[0]!.val;
  } else if (ovr >= keypoints[keypoints.length - 1]!.ovr) {
    baseValue = keypoints[keypoints.length - 1]!.val;
  } else {
    for (let i = 0; i < keypoints.length - 1; i++) {
      const p1 = keypoints[i]!;
      const p2 = keypoints[i + 1]!;
      if (ovr >= p1.ovr && ovr <= p2.ovr) {
        const ratio = (ovr - p1.ovr) / (p2.ovr - p1.ovr);
        baseValue = p1.val + ratio * (p2.val - p1.val);
        break;
      }
    }
  }

  let ageFactor = 1.0;
  if (age <= 20) ageFactor = 1.25;
  else if (age <= 23) ageFactor = 1.15;
  else if (age <= 27) ageFactor = 1.0;
  else if (age <= 30) ageFactor = 0.85;
  else if (age <= 33) ageFactor = 0.60;
  else if (age <= 35) ageFactor = 0.40;
  else ageFactor = 0.25;

  const potBonus = 1 + Math.max(0, pot - ovr) * 0.03;
  return Math.max(300000, Math.round(baseValue * ageFactor * potBonus));
}

export function calculatePlayerSalary(value: number, ovr: number): number {
  const weeklyWage = Math.round(value * 0.0018 + Math.pow(Math.max(0, ovr - 70), 2.2) * 150);
  return Math.max(1500, weeklyWage);
}

/** Semilla de estrella real (ajustada a EA FC 25: OVR inicial máx 91) */
interface StarPlayerSeed {
  teamId: string;
  name: string;
  pos: Position;
  age: number;
  pot: number;
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  val: number;
  sal: number;
}

// BASE DE DATOS DE ESTRELLAS REALES TOP MUNDIALES (Ajustadas a EA FC 25: OVR inicial máx 91)
const STAR_PLAYERS: StarPlayerSeed[] = [
  // REAL MADRID
  { teamId: 'real_madrid', name: 'Kylian Mbappé', pos: 'DC', age: 25, pot: 95, pac: 97, sho: 90, pas: 80, dri: 92, def: 36, phy: 78, val: 185000000, sal: 480000 },
  { teamId: 'real_madrid', name: 'Vinícius Júnior', pos: 'EI', age: 24, pot: 94, pac: 95, sho: 84, pas: 81, dri: 91, def: 29, phy: 69, val: 175000000, sal: 420000 },
  { teamId: 'real_madrid', name: 'Jude Bellingham', pos: 'MC', age: 21, pot: 94, pac: 80, sho: 86, pas: 85, dri: 88, def: 78, phy: 84, val: 170000000, sal: 400000 },
  { teamId: 'real_madrid', name: 'Federico Valverde', pos: 'MC', age: 26, pot: 90, pac: 88, sho: 82, pas: 84, dri: 84, def: 80, phy: 85, val: 120000000, sal: 300000 },
  { teamId: 'real_madrid', name: 'Rodrygo', pos: 'ED', age: 23, pot: 89, pac: 89, sho: 82, pas: 80, dri: 86, def: 31, phy: 64, val: 100000000, sal: 260000 },
  { teamId: 'real_madrid', name: 'Thibaut Courtois', pos: 'POR', age: 32, pot: 89, pac: 46, sho: 15, pas: 30, dri: 20, def: 89, phy: 86, val: 65000000, sal: 260000 },
  { teamId: 'real_madrid', name: 'Endrick', pos: 'DC', age: 18, pot: 91, pac: 87, sho: 76, pas: 68, dri: 80, def: 30, phy: 72, val: 45000000, sal: 100000 },

  // BARCELONA
  { teamId: 'barcelona', name: 'Lamine Yamal', pos: 'ED', age: 17, pot: 95, pac: 89, sho: 76, pas: 80, dri: 86, def: 32, phy: 60, val: 80000000, sal: 180000 },
  { teamId: 'barcelona', name: 'Pedri', pos: 'MC', age: 21, pot: 92, pac: 76, sho: 72, pas: 87, dri: 88, def: 68, phy: 66, val: 110000000, sal: 240000 },
  { teamId: 'barcelona', name: 'Robert Lewandowski', pos: 'DC', age: 36, pot: 88, pac: 72, sho: 89, pas: 79, dri: 82, def: 42, phy: 80, val: 35000000, sal: 300000 },
  { teamId: 'barcelona', name: 'Gavi', pos: 'MC', age: 20, pot: 90, pac: 76, sho: 68, pas: 79, dri: 83, def: 74, phy: 78, val: 75000000, sal: 160000 },
  { teamId: 'barcelona', name: 'Raphinha', pos: 'ED', age: 27, pot: 88, pac: 91, sho: 82, pas: 81, dri: 86, def: 52, phy: 73, val: 75000000, sal: 220000 },

  // MANCHESTER CITY
  { teamId: 'man_city', name: 'Erling Haaland', pos: 'DC', age: 24, pot: 94, pac: 89, sho: 92, pas: 65, dri: 80, def: 45, phy: 88, val: 180000000, sal: 450000 },
  { teamId: 'man_city', name: 'Rodri', pos: 'MCD', age: 28, pot: 93, pac: 66, sho: 76, pas: 86, dri: 84, def: 87, phy: 85, val: 165000000, sal: 360000 },
  { teamId: 'man_city', name: 'Kevin De Bruyne', pos: 'MC', age: 33, pot: 90, pac: 72, sho: 87, pas: 94, dri: 86, def: 65, phy: 74, val: 65000000, sal: 360000 },
  { teamId: 'man_city', name: 'Phil Foden', pos: 'MCO', age: 24, pot: 91, pac: 85, sho: 85, pas: 86, dri: 89, def: 56, phy: 62, val: 130000000, sal: 280000 },

  // BAYERN MÜNCHEN
  { teamId: 'bayern', name: 'Harry Kane', pos: 'DC', age: 31, pot: 90, pac: 69, sho: 92, pas: 84, dri: 83, def: 47, phy: 82, val: 90000000, sal: 340000 },
  { teamId: 'bayern', name: 'Jamal Musiala', pos: 'MCO', age: 21, pot: 93, pac: 85, sho: 79, pas: 82, dri: 90, def: 62, phy: 64, val: 135000000, sal: 260000 },
  { teamId: 'bayern', name: 'Leroy Sané', pos: 'ED', age: 28, pot: 86, pac: 92, sho: 82, pas: 79, dri: 86, def: 38, phy: 68, val: 55000000, sal: 200000 },

  // LIVERPOOL & ARSENAL
  { teamId: 'liverpool', name: 'Mohamed Salah', pos: 'ED', age: 32, pot: 89, pac: 89, sho: 87, pas: 82, dri: 88, def: 45, phy: 75, val: 75000000, sal: 320000 },
  { teamId: 'liverpool', name: 'Virgil van Dijk', pos: 'DFC', age: 33, pot: 89, pac: 72, sho: 60, pas: 71, dri: 72, def: 89, phy: 86, val: 45000000, sal: 260000 },
  { teamId: 'arsenal', name: 'Bukayo Saka', pos: 'ED', age: 22, pot: 91, pac: 86, sho: 82, pas: 82, dri: 87, def: 65, phy: 75, val: 125000000, sal: 240000 },
  { teamId: 'arsenal', name: 'Martin Ødegaard', pos: 'MCO', age: 25, pot: 90, pac: 77, sho: 81, pas: 89, dri: 88, def: 62, phy: 63, val: 115000000, sal: 250000 },
  { teamId: 'arsenal', name: 'Declan Rice', pos: 'MCD', age: 25, pot: 89, pac: 75, sho: 71, pas: 82, dri: 81, def: 85, phy: 86, val: 105000000, sal: 230000 },

  // INTER & ATLETICO
  { teamId: 'inter_milan', name: 'Lautaro Martínez', pos: 'DC', age: 27, pot: 90, pac: 82, sho: 87, pas: 76, dri: 84, def: 48, phy: 84, val: 115000000, sal: 280000 },
  { teamId: 'inter_milan', name: 'Nicolò Barella', pos: 'MC', age: 27, pot: 88, pac: 78, sho: 76, pas: 84, dri: 85, def: 79, phy: 82, val: 80000000, sal: 220000 },
  { teamId: 'atletico_madrid', name: 'Antoine Griezmann', pos: 'DC', age: 33, pot: 88, pac: 76, sho: 87, pas: 87, dri: 86, def: 58, phy: 72, val: 40000000, sal: 240000 },
  { teamId: 'atletico_madrid', name: 'Julián Álvarez', pos: 'DC', age: 24, pot: 88, pac: 84, sho: 85, pas: 78, dri: 83, def: 52, phy: 78, val: 90000000, sal: 200000 },

  // BAYER LEVERKUSEN & CHELSEA
  { teamId: 'leverkusen', name: 'Florian Wirtz', pos: 'MCO', age: 21, pot: 92, pac: 81, sho: 80, pas: 87, dri: 89, def: 54, phy: 65, val: 125000000, sal: 220000 },
  { teamId: 'chelsea', name: 'Cole Palmer', pos: 'MCO', age: 22, pot: 90, pac: 82, sho: 84, pas: 85, dri: 86, def: 48, phy: 66, val: 105000000, sal: 180000 },

  // INTER MIAMI & AL-NASSR
  { teamId: 'inter_miami', name: 'Lionel Messi', pos: 'ED', age: 37, pot: 88, pac: 78, sho: 89, pas: 90, dri: 91, def: 33, phy: 64, val: 35000000, sal: 500000 },
  { teamId: 'inter_miami', name: 'Luis Suárez', pos: 'DC', age: 37, pot: 82, pac: 68, sho: 86, pas: 78, dri: 79, def: 42, phy: 76, val: 7000000, sal: 110000 },
  { teamId: 'al_nassr', name: 'Cristiano Ronaldo', pos: 'DC', age: 39, pot: 86, pac: 77, sho: 88, pas: 75, dri: 80, def: 34, phy: 77, val: 20000000, sal: 1000000 },

  // ARGENTINA (BOCA & RIVER)
  { teamId: 'boca', name: 'Edinson Cavani', pos: 'DC', age: 37, pot: 79, pac: 70, sho: 82, pas: 68, dri: 74, def: 48, phy: 76, val: 3500000, sal: 35000 },
  { teamId: 'boca', name: 'Kevin Zenón', pos: 'MI', age: 23, pot: 83, pac: 81, sho: 74, pas: 76, dri: 78, def: 60, phy: 71, val: 12000000, sal: 25000 },
  { teamId: 'river', name: 'Franco Armani', pos: 'POR', age: 37, pot: 78, pac: 45, sho: 15, pas: 30, dri: 20, def: 78, phy: 75, val: 2500000, sal: 30000 },
  { teamId: 'river', name: 'Claudio Echeverri', pos: 'MCO', age: 18, pot: 88, pac: 83, sho: 71, pas: 75, dri: 82, def: 42, phy: 58, val: 18000000, sal: 25000 }
];

const FIRST_NAMES: string[] = ['Carlos', 'Mateo', 'Lucas', 'Gonzalo', 'Santiago', 'Nicolás', 'Joaquín', 'Enzo', 'Gabriel', 'Thiago', 'Felipe', 'Rodrigo', 'Lautaro', 'Julian', 'Alejandro', 'Diego', 'Sebastian', 'Marco', 'Bruno', 'Leo', 'Alex', 'David'];
const LAST_NAMES: string[] = ['Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Díaz', 'Álvarez', 'Romero', 'Sosa', 'Torres', 'Benítez', 'Silva', 'Santos', 'Oliveira', 'Costa', 'Pereira', 'Ferreira', 'García'];

const POSITIONS_NEEDED: Position[] = ['POR', 'POR', 'DFC', 'DFC', 'DFC', 'DFC', 'LD', 'LI', 'MCD', 'MC', 'MC', 'MCO', 'EI', 'ED', 'DC', 'DC', 'MI', 'MD', 'DFC', 'MC', 'DC', 'POR'];

// ═══════════════════════════════════════════════════════════════════════════
// v3.2 — JUGADORES REALES (extraídos de API-Football, season 2024)
// ═══════════════════════════════════════════════════════════════════════════

/** Registro de un jugador real extraído (scripts/extract_real_players.js) */
export interface RealPlayerRecord {
  name: string;
  /** Posición genérica de API-Football: Goalkeeper | Defender | Midfielder | Attacker */
  apiPos: string;
  age: number;
  nationality: string | null;
  number: number | null;
}

/** Caché de la base de jugadores reales (assets/data/real_players.json) */
let realPlayersCache: { dataSeason: number; players: Record<string, RealPlayerRecord[]> } | null = null;

/**
 * Carga asíncrona de la base de jugadores reales. La llama db.init() antes de
 * generar plantillas; si falla o no se ha llamado, generateTeamPlayers usa el
 * generador procedural como respaldo.
 */
export async function loadRealPlayers(): Promise<void> {
  if (realPlayersCache) return;
  try {
    const res = await fetch('./assets/data/real_players.json');
    realPlayersCache = await res.json();
  } catch {
    realPlayersCache = { dataSeason: 2024, players: {} };
  }
}

/** Devuelve la plantilla real de un equipo (vacía si no hay datos o no se cargó) */
export function getRealPlayers(teamId: string): RealPlayerRecord[] {
  return realPlayersCache ? (realPlayersCache.players[teamId] || []) : [];
}

/** Mapa de clase genérica API → posiciones del juego */
const API_POS_CANDIDATES: Record<string, Position[]> = {
  'Goalkeeper': ['POR'],
  'Defender': ['DFC', 'LI', 'LD'],
  'Midfielder': ['MCD', 'MC', 'MCO', 'MI', 'MD'],
  'Attacker': ['DC', 'EI', 'ED']
};

/**
 * Asigna la posición principal de un jugador real según su dorsal (estilo
 * fútbol) y, en su defecto, su clase genérica de API-Football.
 */
function pickRealPosition(rec: RealPlayerRecord): Position {
  if (rec.apiPos === 'Goalkeeper') return 'POR';
  if (rec.number != null) {
    if (rec.number >= 2 && rec.number <= 5) return 'DFC';
    if (rec.number >= 6 && rec.number <= 8) return 'MC';
    if (rec.number >= 9 && rec.number <= 11) return 'DC';
  }
  const candidates = API_POS_CANDIDATES[rec.apiPos] || ['MC'];
  return candidates[Math.floor(Math.random() * candidates.length)]!;
}

/**
 * Genera los 6 atributos (pac, sho, pas, dri, def, phy) para una posición y un
 * nivel objetivo. Compartido por el generador procedural y los jugadores reales.
 */
function generateAttributesForPosition(pos: Position, baseTarget: number): { pac: number; sho: number; pas: number; dri: number; def: number; phy: number } {
  let pac: number, sho: number, pas: number, dri: number, def: number, phy: number;
  if (pos === 'POR') {
    pac = 40 + Math.floor(Math.random() * 25);
    sho = 15; pas = 35 + Math.floor(Math.random() * 30); dri = 20;
    def = baseTarget + Math.floor(Math.random() * 6);
    phy = baseTarget + Math.floor(Math.random() * 6);
  } else if (pos === 'DFC') {
    pac = baseTarget - 10 + Math.floor(Math.random() * 12);
    sho = 40 + Math.floor(Math.random() * 20);
    pas = baseTarget - 15 + Math.floor(Math.random() * 10);
    dri = baseTarget - 15 + Math.floor(Math.random() * 10);
    def = Math.min(90, baseTarget + 6 + Math.floor(Math.random() * 5));
    phy = Math.min(90, baseTarget + 5 + Math.floor(Math.random() * 5));
  } else if (pos === 'DC' || pos === 'EI' || pos === 'ED') {
    pac = Math.min(92, baseTarget + 8);
    sho = Math.min(91, baseTarget + 6);
    pas = baseTarget - 10 + Math.floor(Math.random() * 10);
    dri = Math.min(91, baseTarget + 6);
    def = 30 + Math.floor(Math.random() * 20);
    phy = baseTarget - 5 + Math.floor(Math.random() * 10);
  } else {
    pac = baseTarget - 5 + Math.floor(Math.random() * 10);
    sho = baseTarget - 8 + Math.floor(Math.random() * 10);
    pas = Math.min(90, baseTarget + 6);
    dri = Math.min(90, baseTarget + 5);
    def = baseTarget - 10 + Math.floor(Math.random() * 15);
    phy = baseTarget - 5 + Math.floor(Math.random() * 10);
  }
  return { pac, sho, pas, dri, def, phy };
}

/**
 * Busca la semilla de estrella de un jugador real por APELLIDO y equipo
 * (los nombres de API-Football vienen abreviados: 'K. Mbappé' ↔ 'Kylian Mbappé').
 */
function starFor(teamId: string, realName: string): StarPlayerSeed | null {
  const normLast = (realName || '').split(' ').pop()?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
  if (!normLast) return null;
  return STAR_PLAYERS.find(s => {
    if (s.teamId !== teamId) return false;
    const starLast = s.name.split(' ').pop()?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
    return starLast === normLast;
  }) || null;
}

/**
 * Construye la plantilla (22 jugadores) de un equipo a partir de sus jugadores
 * reales: cada hueco de POSITIONS_NEEDED se llena con el real de la clase
 * adecuada (posición primaria exacta primero, clase genérica después); los
 * huecos sin candidato se completan con generados procedurales. Las estrellas
 * de STAR_PLAYERS conservan sus atributos artesanales.
 */
/** Entrada candidata para un hueco de plantilla: un real de la API (con su
 * posible semilla de estrella) o una estrella artesanal inyectada (r = null). */
interface SquadEntry {
  r: RealPlayerRecord | null;
  star: StarPlayerSeed | null;
  primary: Position;
  used: boolean;
}

function buildSquadFromRealPlayers(team: Team): Player[] | null {
  const reals = getRealPlayers(team.id);
  if (!reals || reals.length < 16) return null;

  const ageOffset = Math.max(0, 2026 - (realPlayersCache?.dataSeason || 2024));
  const targetOvr = team.overall || 72;

  const normLast = (name: string): string => (name || '').split(' ').pop()?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';

  const entries: SquadEntry[] = reals.map(r => ({
    r,
    star: starFor(team.id, r.name),
    primary: pickRealPosition(r),
    used: false
  }));

  // Garantizar la presencia de las estrellas artesanales del club aunque la
  // plantilla de la API no las incluya (p. ej. Cavani ya no estaba en el squad
  // 2024-25 de Boca). Se inyectan como entradas con atributos propios.
  STAR_PLAYERS.filter(s => s.teamId === team.id).forEach(s => {
    const alreadyPresent = entries.some(e => e.r && normLast(e.r.name) === normLast(s.name));
    if (!alreadyPresent) {
      entries.push({ r: null, star: s, primary: s.pos, used: false });
    }
  });

  const players: Player[] = [];
  let realIndex = 0;

  for (const slotPos of POSITIONS_NEEDED) {
    // Pase 1: estrellas en su posición natural (identidad del club)
    let chosen = entries.find(e => !e.used && e.star && e.primary === slotPos) || null;
    // Pase 2: posición primaria exacta
    if (!chosen) {
      chosen = entries.find(e => !e.used && e.primary === slotPos) || null;
    }
    // Pase 3: misma clase genérica (Defender/Midfielder/Attacker)
    if (!chosen) {
      chosen = entries.find(e => !e.used && e.r && (API_POS_CANDIDATES[e.r.apiPos] || []).includes(slotPos)) || null;
    }

    if (chosen) {
      chosen.used = true;
      players.push(buildRealPlayer(team, chosen, slotPos, ageOffset, targetOvr, realIndex++));
    } else {
      players.push(buildProceduralPlayer(team, slotPos, players.length));
    }
  }
  return players;
}

/** Construye el objeto Player de un jugador real en un hueco de la plantilla */
function buildRealPlayer(
  team: Team,
  entry: SquadEntry,
  slotPos: Position,
  ageOffset: number,
  targetOvr: number,
  index: number
): Player {
  const { r, star } = entry;
  // r es null solo cuando la entrada es una estrella inyectada (star no null)
  const pos = star ? star.pos : slotPos;
  const attrs = star
    ? { pac: star.pac, sho: star.sho, pas: star.pas, dri: star.dri, def: star.def, phy: star.phy }
    : generateAttributesForPosition(slotPos, Math.min(88, Math.max(58, targetOvr + Math.floor((Math.random() - 0.5) * 8))));

  const ovr = calculatePositionOvr(pos, attrs.pac, attrs.sho, attrs.pas, attrs.dri, attrs.def, attrs.phy);
  const age = Math.max(15, star ? star.age : r!.age + ageOffset);
  const pot = star
    ? star.pot
    : Math.min(94, Math.max(ovr, ovr + Math.floor((34 - age) / 2) + Math.floor(Math.random() * 4)));
  const value = star ? star.val : calculatePlayerMarketValue(ovr, age, pot);
  const salary = star ? star.sal : calculatePlayerSalary(value, ovr);

  return {
    id: `${team.id}_real_${index}`,
    // Las estrellas conservan su nombre completo artesanal (la API abrevia
    // como 'T. Courtois'); el resto mantiene el nombre real del dataset.
    name: star ? star.name : r!.name,
    pos,
    age,
    overall: ovr,
    potential: pot,
    pac: attrs.pac, sho: attrs.sho, pas: attrs.pas, dri: attrs.dri, def: attrs.def, phy: attrs.phy,
    value,
    salary,
    contractYears: 3 + Math.floor(Math.random() * 3),
    morale: 85 + Math.floor(Math.random() * 15),
    form: 75 + Math.floor(Math.random() * 20),
    appearances: 0,
    seasonGoals: 0,
    ratingAvg: 0,
    teamId: team.id,
    statsHistory: [],
    fcIqRole: null,
    personalityRole: assignPersonalityRole(age, ovr, pot),
    tacticalAffinity: {
      possession: 50 + Math.floor((Math.random() - 0.5) * 40),
      counterattack: 50 + Math.floor((Math.random() - 0.5) * 40),
      highPress: 50 + Math.floor((Math.random() - 0.5) * 40)
    },
    isRegen: false,
    regenOriginName: null,
    // La API no devuelve nacionalidad en /players/squads: se usa el país del
    // club como aproximación realista (la mayoría de plantillas son locales).
    country: (star ? (team.country || undefined) : (r!.nationality || team.country || undefined))
  };
}

/** Genera un jugador procedural para un hueco concreto (sin estrella) */
function buildProceduralPlayer(team: Team, pos: Position, index: number): Player {
  const targetOvr = team.overall || 72;
  const age = 18 + Math.floor(Math.random() * 16);
  const baseTarget = Math.min(88, Math.max(58, targetOvr + Math.floor((Math.random() - 0.5) * 8)));
  const attrs = generateAttributesForPosition(pos, baseTarget);
  const ovr = calculatePositionOvr(pos, attrs.pac, attrs.sho, attrs.pas, attrs.dri, attrs.def, attrs.phy);
  const pot = Math.min(94, Math.max(ovr, ovr + Math.floor((34 - age) / 2) + Math.floor(Math.random() * 4)));
  const fName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]!;
  const lName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]!;
  const value = calculatePlayerMarketValue(ovr, age, pot);
  const salary = calculatePlayerSalary(value, ovr);

  return {
    id: `${team.id}_gen_${index}`,
    name: `${fName} ${lName}`,
    pos,
    age,
    overall: ovr,
    potential: pot,
    pac: attrs.pac, sho: attrs.sho, pas: attrs.pas, dri: attrs.dri, def: attrs.def, phy: attrs.phy,
    value,
    salary,
    contractYears: 2 + Math.floor(Math.random() * 4),
    morale: 80 + Math.floor(Math.random() * 20),
    form: 70 + Math.floor(Math.random() * 25),
    appearances: 0,
    seasonGoals: 0,
    ratingAvg: 0,
    teamId: team.id,
    statsHistory: [],
    fcIqRole: null,
    personalityRole: assignPersonalityRole(age, ovr, pot),
    tacticalAffinity: {
      possession: 50 + Math.floor((Math.random() - 0.5) * 40),
      counterattack: 50 + Math.floor((Math.random() - 0.5) * 40),
      highPress: 50 + Math.floor((Math.random() - 0.5) * 40)
    },
    isRegen: false,
    regenOriginName: null
  };
}

/**
 * v4.0 — Garantiza cobertura de roles de vestuario por plantilla.
 * El azar de assignPersonalityRole puede dejar una plantilla sin Capitán o
 * sin Mentor aunque tenga veteranos aptos. Este post-proceso garantiza:
 *   - Capitán: si existe algún candidato apto, siempre lo hay (se prefiere a
 *     un jugador sin rol; si todos los candidatos son Mentores, el mejor
 *     asciende — la plantilla conserva al menos un Mentor).
 *   - Mentor: si hay ≥2 candidatos aptos, siempre lo hay; con un único
 *     candidato que ya es Capitán se respeta (un jugador no puede ser ambos).
 * Nunca duplica roles en un mismo jugador.
 */
export interface SquadRolePromotion {
  newCaptain: Player | null;
  newMentor:  Player | null;
}

export function ensureSquadRoles(squad: Player[]): SquadRolePromotion {
  const captainEligible = (p: Player): boolean =>
    (p.age >= 25 && p.overall >= 80) || (p.age >= 30 && p.overall >= 74);
  const mentorEligible = (p: Player): boolean =>
    p.age >= 30 && p.overall >= 74;
  const byOvrAge = (a: Player, b: Player): number =>
    (b.overall - a.overall) || (b.age - a.age);

  const capPool = squad.filter(captainEligible).sort(byOvrAge);
  const menPool = squad.filter(mentorEligible).sort(byOvrAge);
  const hasCaptain = squad.some(p => p.personalityRole === 'captain');
  const hasMentor  = squad.some(p => p.personalityRole === 'mentor');

  let newCaptain: Player | null = null;
  let newMentor:  Player | null = null;

  if (!hasCaptain && capPool.length > 0) {
    const c = capPool.find(p => p.personalityRole !== 'mentor') ?? capPool[0];
    if (c) { c.personalityRole = 'captain'; newCaptain = c; }
  }
  if (!hasMentor && menPool.length > 0) {
    // Preferir un candidato sin rol de capitán; solo demote al Capitán cuando
    // haya ≥2 candidatos, para que la plantilla conserve a su Capitán.
    const m = menPool.find(p => p.personalityRole !== 'captain')
      ?? (menPool.length >= 2 ? menPool[0] : null);
    if (m) { m.personalityRole = 'mentor'; newMentor = m; }
  }

  return { newCaptain, newMentor };
}

/**
 * Genera la plantilla de un equipo (22 jugadores): usa la plantilla REAL
 * extraída de API-Football cuando existe (con estrellas artesanales), y
 * cae al generador procedural (estrellas + aleatorios) en el resto.
 */
export function generateTeamPlayers(team: Team): Player[] {
  const realSquad = buildSquadFromRealPlayers(team);
  if (realSquad) {
    ensureSquadRoles(realSquad);
    return realSquad;
  }

  const players: Player[] = [];

  // Agregar estrellas predefinidas
  const stars = STAR_PLAYERS.filter(p => p.teamId === team.id);
  stars.forEach((star, index) => {
    const ovr = calculatePositionOvr(star.pos, star.pac, star.sho, star.pas, star.dri, star.def, star.phy);
    const val = calculatePlayerMarketValue(ovr, star.age, star.pot);
    const sal = calculatePlayerSalary(val, ovr);
    players.push({
      id: `${team.id}_star_${index}`,
      name: star.name,
      pos: star.pos,
      age: star.age,
      overall: ovr,
      potential: star.pot,
      pac: star.pac,
      sho: star.sho,
      pas: star.pas,
      dri: star.dri,
      def: star.def,
      phy: star.phy,
      value: val,
      salary: sal,
      contractYears: 3 + Math.floor(Math.random() * 3),
      morale: 85 + Math.floor(Math.random() * 15),
      form: 75 + Math.floor(Math.random() * 20),
      appearances: 0,
      seasonGoals: 0,
      ratingAvg: 0,
      teamId: team.id,
      statsHistory: [],
      fcIqRole: null,
      personalityRole: assignPersonalityRole(star.age, ovr, star.pot),
      tacticalAffinity: {
        possession: 50 + Math.floor((Math.random() - 0.5) * 40),
        counterattack: 50 + Math.floor((Math.random() - 0.5) * 40),
        highPress: 50 + Math.floor((Math.random() - 0.5) * 40)
      },
      isRegen: false,
      regenOriginName: null
    });
  });

  let count = players.length;
  for (let i = count; i < 22; i++) {
    players.push(buildProceduralPlayer(team, POSITIONS_NEEDED[i % POSITIONS_NEEDED.length]!, i));
  }

  ensureSquadRoles(players);
  return players;
}

// ───────────────────────────────────────────────────────────────────
// v2.0 — Generador de entrenadores IA para el Mercado de DTs
// ───────────────────────────────────────────────────────────────────

const MANAGER_FIRST_NAMES: string[] = [
  'Carlos', 'Diego', 'Marcelo', 'Roberto', 'Jorge', 'Andrés', 'Luis', 'Miguel',
  'Thomas', 'Oliver', 'Michael', 'James', 'Richard', 'David', 'John', 'Peter',
  'Antonio', 'Marco', 'Roberto', 'Fabio', 'Luca', 'Giovanni', 'Paolo', 'Andrea',
  'Pep', 'Jürgen', 'Carlo', 'Xabi', 'Zinedine', 'José', 'Simóne',
  'Lionel', 'Sebastian', 'Patrick', 'Philippe', 'Thierry'
];
const MANAGER_LAST_NAMES: string[] = [
  'Bianchi', 'Ortega', 'Fernández', 'Oliveira', 'Silva', 'Torres', 'Moreno',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Davies', 'Evans', 'Wilson',
  'Ferrari', 'Romano', 'Ricci', 'Conti', 'Costa', 'Esposito', 'Bianchi',
  'Scholz', 'Müller', 'Becker', 'Fischer', 'Wagner', 'Klein', 'Weber',
  'Dupont', 'Martin', 'Bernard', 'Petit', 'Girard'
];
const MANAGER_ARCHETYPES_LIST: ManagerArchetypeId[] = ['GUARDIOLA', 'KLOPP', 'SIMEONE', 'ANCELOTTI', 'XABI_ALONSO'];

/**
 * Genera un entrenador IA para un equipo dado.
 * @param teamId - ID del equipo
 * @param teamReputation - Reputación del equipo (30-100)
 */
// ───────────────────────────────────────────────────────────────────
// v2.0 — Fase 6A completa: Regens y reposición de plantillas
// ───────────────────────────────────────────────────────────────────

/** Posiciones posibles para un prospecto de reposición */
const PROSPECT_POSITIONS: Position[] = ['POR', 'DFC', 'LI', 'LD', 'MCD', 'MC', 'MCO', 'EI', 'ED', 'DC'];

/**
 * Construye un jugador joven (16-18 años) a partir de una semilla: posición,
 * media base, potencial y metadatos de regen. Comparte la generación de
 * atributos por posición de generateTeamPlayers.
 */
function generateFromSeed(teamId: string, seed: { pos: Position; baseOvr: number; potential: number; isRegen: boolean; originName: string | null }, index: number): Player {
  const pos = seed.pos;
  const target = Math.max(48, Math.min(82, seed.baseOvr));
  const age = 16 + Math.floor(Math.random() * 3); // 16-18 años

  let pac: number, sho: number, pas: number, dri: number, def: number, phy: number;
  if (pos === 'POR') {
    pac = 40 + Math.floor(Math.random() * 25);
    sho = 15; pas = 35 + Math.floor(Math.random() * 30); dri = 20;
    def = Math.min(88, target + Math.floor(Math.random() * 6));
    phy = Math.min(88, target + Math.floor(Math.random() * 6));
  } else if (pos === 'DFC') {
    pac = target - 8 + Math.floor(Math.random() * 12);
    sho = 40 + Math.floor(Math.random() * 20);
    pas = target - 12 + Math.floor(Math.random() * 10);
    dri = target - 12 + Math.floor(Math.random() * 10);
    def = Math.min(88, target + 6 + Math.floor(Math.random() * 5));
    phy = Math.min(88, target + 5 + Math.floor(Math.random() * 5));
  } else if (pos === 'DC' || pos === 'EI' || pos === 'ED') {
    pac = Math.min(90, target + 8);
    sho = Math.min(89, target + 6);
    pas = target - 8 + Math.floor(Math.random() * 10);
    dri = Math.min(89, target + 6);
    def = 30 + Math.floor(Math.random() * 20);
    phy = target - 4 + Math.floor(Math.random() * 10);
  } else {
    pac = target - 4 + Math.floor(Math.random() * 10);
    sho = target - 6 + Math.floor(Math.random() * 10);
    pas = Math.min(88, target + 6);
    dri = Math.min(88, target + 5);
    def = target - 8 + Math.floor(Math.random() * 15);
    phy = target - 4 + Math.floor(Math.random() * 10);
  }

  const ovr = calculatePositionOvr(pos, pac, sho, pas, dri, def, phy);
  const fName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]!;
  const lName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]!;
  const value = calculatePlayerMarketValue(ovr, age, seed.potential);
  const salary = calculatePlayerSalary(value, ovr);

  return {
    id: `${teamId}_regen_${index}_${Date.now()}`,
    name: `${fName} ${lName}`,
    pos,
    age,
    overall: ovr,
    potential: seed.potential,
    pac, sho, pas, dri, def, phy,
    value,
    salary,
    contractYears: 3 + Math.floor(Math.random() * 3),
    morale: 85 + Math.floor(Math.random() * 15),
    form: 75 + Math.floor(Math.random() * 20),
    appearances: 0,
    seasonGoals: 0,
    ratingAvg: 0,
    teamId,
    statsHistory: [],
    fcIqRole: null,
    personalityRole: assignPersonalityRole(age, ovr, seed.potential),
    tacticalAffinity: {
      possession: 50 + Math.floor((Math.random() - 0.5) * 40),
      counterattack: 50 + Math.floor((Math.random() - 0.5) * 40),
      highPress: 50 + Math.floor((Math.random() - 0.5) * 40)
    },
    isRegen: seed.isRegen,
    regenOriginName: seed.originName
  };
}

/**
 * Genera el REGEN de una leyenda retirada: un joven (16-18) con el mismo
 * puesto y potencial que la leyenda, que nace en el club de origen.
 * @param legend - Leyenda retirada (retiredLegends[])
 * @param teamId - Club donde nace el regen
 * @param index - Índice para el ID único
 */
export function generateRegenPlayer(legend: RetiredLegend, teamId: string, index = 0): Player {
  return generateFromSeed(teamId, {
    pos: legend.pos,
    // Un regen arranca muy por debajo del nivel de su leyenda (45-65 OVR)
    baseOvr: legend.originalOvr - 26 - Math.floor(Math.random() * 4),
    potential: legend.originalOvr, // puede alcanzar el nivel de la leyenda
    isRegen: true,
    originName: legend.name
  }, index);
}

/**
 * Genera un prospecto juvenil genérico (no regen) para reponer una plantilla
 * cuando se retira un jugador que no alcanzó el estatus de leyenda.
 * @param teamId - Club destino
 * @param index - Índice para el ID único
 */
export function generateYouthProspect(teamId: string, index = 0): Player {
  const pos = PROSPECT_POSITIONS[Math.floor(Math.random() * PROSPECT_POSITIONS.length)]!;
  return generateFromSeed(teamId, {
    pos,
    baseOvr: 52 + Math.floor(Math.random() * 8),
    potential: 70 + Math.floor(Math.random() * 9),
    isRegen: false,
    originName: null
  }, index);
}

export function generateAIManager(teamId: string, teamReputation = 60): AIManager {
  const fName = MANAGER_FIRST_NAMES[Math.floor(Math.random() * MANAGER_FIRST_NAMES.length)]!;
  const lName = MANAGER_LAST_NAMES[Math.floor(Math.random() * MANAGER_LAST_NAMES.length)]!;
  const archetype = MANAGER_ARCHETYPES_LIST[Math.floor(Math.random() * MANAGER_ARCHETYPES_LIST.length)]!;
  // La reputación del DT IA ronda la del equipo ± 15 puntos
  const reputation = Math.max(25, Math.min(95, teamReputation + Math.floor((Math.random() - 0.5) * 30)));
  return {
    name: `${fName} ${lName}`,
    archetype,
    reputation,
    isInterim: false,
    weeksInCharge: 0,
    teamId
  };
}
