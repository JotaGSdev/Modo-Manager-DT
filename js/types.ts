/**
 * ============================================================================
 * ENTRENADOR LEYENDA - TIPOS DE DOMINIO (types.ts)
 * ============================================================================
 * Fase 0 de la migración a TypeScript: contratos de datos del juego.
 *
 * Este archivo es la FUENTE ÚNICA DE VERDAD de las formas de datos:
 * - Player, Team, GameState y todos sus sub-objetos.
 * - Union types que reemplazan los "magic strings" (posiciones, estilos,
 *   roles FC IQ, formaciones...).
 * - Arrays `as const` reutilizables en runtime por los motores futuros.
 *
 * Reglas:
 * - NO importa nada del juego (se mantiene libre de ciclos y dependencias).
 * - No toca lógica: solo tipos y constantes de dominio.
 * - Los campos opcionales (?) son SOLO los que el código actual crea en
 *   runtime de forma condicional (matchExp, squadRole, potRange, etc.).
 * ============================================================================
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. VALORES DE DOMINIO (reemplazan los magic strings)
// ═══════════════════════════════════════════════════════════════════════════

/** Posiciones de jugador usadas en todo el juego */
export const POSITIONS = ['POR', 'DFC', 'LI', 'LD', 'MCD', 'MC', 'MCO', 'MI', 'MD', 'EI', 'ED', 'DC'] as const;
export type Position = (typeof POSITIONS)[number];

/** Estilos de juego del DT (tactics.style y arquetipos) */
export const PLAY_STYLES = ['Tiki-Taka', 'Gegenpressing', 'Presión Alta', 'Catenaccio', 'Contraataque', 'Juego por Bandas'] as const;
export type PlayStyle = (typeof PLAY_STYLES)[number];

/** Formaciones disponibles en el pizarrón táctico */
export const FORMATION_IDS = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2'] as const;
export type FormationId = (typeof FORMATION_IDS)[number];

/** Arquetipos de DT asignables (gameState.managerArchetype y clubPhilosophy) */
export const MANAGER_ARCHETYPE_IDS = ['GUARDIOLA', 'KLOPP', 'SIMEONE', 'ANCELOTTI', 'XABI_ALONSO'] as const;
export type ManagerArchetypeId = (typeof MANAGER_ARCHETYPE_IDS)[number];

/** Roles FC IQ disponibles por posición (tactics.js FC_IQ_ROLES) */
export const FC_IQ_ROLES = {
  POR: ['Goalkeeper', 'Sweeper Keeper'],
  DFC: ['Stopper', 'Ball-Playing CB', 'Libero'],
  LI: ['Full Back', 'Inverted Wingback', 'Overlapping FB'],
  LD: ['Full Back', 'Inverted Wingback', 'Overlapping FB'],
  MCD: ['Anchor', 'Deep-Lying PM', 'Box-to-Box'],
  MC: ['Playmaker', 'Box-to-Box', 'Mezzala'],
  MCO: ['Enganche', 'Shadow Striker', 'Deep Forward'],
  MI: ['Wide Midfielder', 'Half Winger', 'Box-to-Box'],
  MD: ['Wide Midfielder', 'Half Winger', 'Box-to-Box'],
  EI: ['Inside Forward', 'Winger', 'Half Winger'],
  ED: ['Inside Forward', 'Winger', 'Half Winger'],
  DC: ['Target Forward', 'Box Crasher', 'False 9', 'Poacher']
} as const satisfies Record<Position, readonly string[]>;

/** Unión de todos los nombres de rol FC IQ */
export type FCIQRole =
  | 'Goalkeeper' | 'Sweeper Keeper'
  | 'Stopper' | 'Ball-Playing CB' | 'Libero'
  | 'Full Back' | 'Inverted Wingback' | 'Overlapping FB'
  | 'Anchor' | 'Deep-Lying PM' | 'Box-to-Box'
  | 'Playmaker' | 'Mezzala'
  | 'Enganche' | 'Shadow Striker' | 'Deep Forward'
  | 'Wide Midfielder' | 'Half Winger'
  | 'Inside Forward' | 'Winger'
  | 'Target Forward' | 'Box Crasher' | 'False 9' | 'Poacher';

/** Roles de personalidad del vestuario (teamSpirit.js) */
export const PERSONALITY_ROLES = ['captain', 'youngStar', 'rebel', 'mentor'] as const;
export type PersonalityRole = (typeof PERSONALITY_ROLES)[number];

/** Órdenes tácticas de los Momentos de Tensión (matchEngine.js) */
export const TACTICAL_ORDERS = ['PRESSING', 'LOW_BLOCK', 'COUNTER'] as const;
export type TacticalOrder = (typeof TACTICAL_ORDERS)[number];

/** Frecuencia de eventos narrativos configurable al crear carrera */
export const EVENT_FREQUENCIES = ['off', 'baja', 'normal', 'alta'] as const;
export type EventFrequency = (typeof EVENT_FREQUENCIES)[number];

/** Rol en plantilla asignado al fichar (transfers.js) */
export const SQUAD_ROLES = ['Crucial', 'Titular Habitual', 'Rotación', 'Prospecto'] as const;
export type SquadRole = (typeof SQUAD_ROLES)[number];

/** Regiones del mundo para el sistema de cantera y ligas */
export type Region = 'Sudamérica' | 'Europa' | 'Norteamérica' | 'Centroamérica' | 'Asia' | (string & {});

/** Tipos de noticia de The Feed */
export type FeedType =
  | 'RUMOR_SALIDA' | 'FILTRACIÓN_SALARIAL' | 'CRISIS_FINANCIERA' | 'DERECHOS_TV'
  | 'CAMBIO_DT' | 'OFERTA_DT_JUGADOR' | 'AGENTE_EXIGE' | 'RIVAL_SONDEA' | 'DESCONTENTO'
  | (string & {}); // tolera tipos nuevos sin perder autocompletado

/** Estados de avance en fases de copa */
export type CupPhaseStatus = 'PENDIENTE' | 'CLASIFICADO' | 'VICTORIA' | 'ELIMINADO' | 'DERROTA' | 'CAMPEÓN';

/** Estados del contrato laboral del DT */
export const CONTRACT_STATUSES = ['ACTIVO', 'EN_RIESGO', 'RENOVADO', 'FINALIZADO', 'DESPEDIDO'] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

/** Tipos de bonus aplicables por eventos narrativos (eventsEngine.js) */
export type EventBonusType =
  | 'morale' | 'tactical' | 'board' | 'budget' | 'spirit'
  | 'freeze_budget' | 'unfreeze_budget' | 'tv_rights';

/** Resultado de evaluaciones de motor (fichaje, mejora, etc.) */
export type ActionResult = { success: boolean; message?: string; reason?: string; [key: string]: unknown };

// ═══════════════════════════════════════════════════════════════════════════
// 2. JUGADORES Y CANTERA
// ═══════════════════════════════════════════════════════════════════════════

/** Afinidad táctica del jugador con estilos de juego (0-100) */
export interface TacticalAffinity {
  possession: number;
  counterattack: number;
  highPress: number;
}

/** Snapshot estadístico de una temporada (db.processSeasonPlayerEvolution) */
export interface StatsHistoryEntry {
  season: number;
  goals: number;
  appearances: number;
  ratingAvg: number;
  ovr: number;
}

/**
 * Futbolista de una plantilla (teamData.js generateTeamPlayers).
 * Campos opcionales: los que se crean en runtime (matchExp por el MatchEngine,
 * squadRole al fichar, etc.).
 */
export interface Player {
  id: string;
  name: string;
  pos: Position;
  age: number;
  overall: number; // 50-91 inicial (capa EA FC), puede crecer en runtime
  potential: number;
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  value: number;
  salary: number;
  contractYears: number;
  morale: number; // 0-100
  form: number; // 0-100
  appearances: number;
  seasonGoals: number;
  ratingAvg: number;
  teamId: string;
  statsHistory: StatsHistoryEntry[];
  fcIqRole: FCIQRole | null;
  personalityRole: PersonalityRole | null;
  tacticalAffinity: TacticalAffinity;
  isRegen: boolean;
  regenOriginName: string | null;
  /** EXP acumulada de partido (awardInSeasonPlayerEXP) — creado en runtime */
  matchExp?: number;
  /** Rol asignado al fichar — creado en runtime */
  squadRole?: SquadRole;
  /** Campos presentes solo en juveniles de la cantera */
  country?: string;
  region?: string;
  potRange?: string;
  promotionCost?: number;
}

/** Prospecto de la cantera (youthAcademy.js) */
export interface YouthProspect extends Player {
  country: string;
  region: string;
  potRange: string;
  promotionCost: number;
}

/** Entrada de la tabla de goleadores (Pichichi) */
export interface TopScorer {
  playerId: string;
  name: string;
  teamName: string;
  goals: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. EQUIPOS, LIGAS Y ENTRENADORES IA
// ═══════════════════════════════════════════════════════════════════════════

/** Equipo (leagues.json + campos enriquecidos por db.init) */
export interface Team {
  id: string;
  name: string;
  short: string;
  budget: number;
  wageBudget?: number;
  reputation: number;
  overall: number;
  colors: [string, string];
  stadium: string;
  /** Enriquecidos por DatabaseManager.init */
  leagueId?: string;
  country?: string;
  region?: string;
  /** Filosofía táctica exigida por el club (comparada con managerArchetype) */
  philosophy?: string;
}

/** Liga (leagues.json) */
export interface League {
  id: string;
  name: string;
  country: string;
  region: string;
  tier: number;
  reputation: number;
  teams: Team[];
}

/** DT IA del mercado de entrenadores (managerMarketEngine.js) */
export interface AIManager {
  name: string;
  archetype: ManagerArchetypeId;
  reputation: number;
  isInterim: boolean;
  weeksInCharge: number;
  teamId: string;
  /** Semana límite del interinato (asignado en runtime) */
  interimUntilWeek?: number;
}

/** Estado del mercado de DTs IA dentro de GameState */
export interface ManagerMarketState {
  aiManagers: Record<string, AIManager>;
  lastRotationWeek: number;
}

/** Oferta de empleo (contracts.js generateJobOffers) */
export interface ClubJobOffer {
  type: 'CLUB';
  teamId: string;
  teamName: string;
  leagueId: string;
  country: string;
  budget: number;
  reputation: number;
  contractDuration: number;
  salary: number;
}

/** Oferta de selección nacional (contracts.js generateJobOffers) */
export interface NationalTeamJobOffer {
  type: 'NATIONAL_TEAM';
  teamId: string;
  teamName: string;
  country: string;
  targetTournament: string;
  contractDuration: number;
  salary: number;
  description: string;
}

/** Oferta del mercado de DTs (managerMarketEngine.js generateManagerJobOffers) */
export interface ManagerMarketJobOffer {
  teamId: string;
  teamName: string;
  country: string;
  teamReputation: number;
  philosophyMatch: boolean;
  situation: 'interim_vacancy' | 'regular';
  offerBudget: number;
  contractYears: number;
  reason: string;
  urgencyLabel: string | null;
}

export type JobOffer = ClubJobOffer | NationalTeamJobOffer | ManagerMarketJobOffer;

/** Entrada del palmarés (trophyRoom.js y competitionsEngine.js) */
export interface Trophy {
  /** Solo lo generan los motores de palmarés; las copas crean {title, season} */
  id?: string;
  title: string;
  season: string;
  runnerUp?: string;
  date?: string;
}

/** Leyenda retirada para el sistema de Regens */
export interface RetiredLegend {
  name: string;
  pos: Position;
  originalOvr: number;
  potential: number;
  originTeamId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. SUB-ESTADOS DE LA PARTIDA (GameState)
// ═══════════════════════════════════════════════════════════════════════════

/** Fila de la tabla de posiciones */
export interface Standing {
  teamId: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

/** Configuración táctica actual del DT */
export interface TacticsConfig {
  formation: FormationId;
  mentality: string; // 'Ofensiva' | 'Equilibrada' | 'Defensiva'...
  style: PlayStyle;
  defensiveLine: string; // 'Alta' | 'Media' | 'Baja'
  passingStyle: string; // 'Corto' | 'Largo'
}

/** Habilidades tácticas del DT y su EXP */
export interface ManagerTactics {
  archetype: ManagerArchetypeId;
  exp: number;
  skillLevels: { skill1: number; skill2: number }; // 1-10
}

/** Bonos acumulados por eventos/decisiones que afectan el próximo partido */
export interface MatchBonus {
  moraleBonus: number;
  tacticalBonus: number;
  penaltyBonus: number;
}

/** Contador financiero de la temporada */
export interface Finances {
  ticketRevenue: number;
  weeklyWageTotal: number;
  playerSales: number;
  playerPurchases: number;
  leaguePrize: number;
  balance: number;
  budgetAtSeasonStart: number;
}

/** Fase de una competición de copa (carrusel del dashboard) */
export interface CupPhase {
  phaseIndex: number;
  week: number;
  phaseName: string;
  cupName: string;
  status: CupPhaseStatus;
  score: string;
  rivalName: string;
}

/** Noticia de The Feed */
export interface FeedItem {
  id: string;
  week: number;
  season: number;
  type: FeedType;
  text: string;
  icon: string;
  isRead: boolean;
  linkedPlayerId: string | null;
}

/** Entrada del log de eventos de la partida */
export interface LogEntry {
  date: string;
  text: string;
}

/** Fila del reporte de evolución de fin de temporada */
export interface EvolutionReportEntry {
  name: string;
  pos: Position;
  age: number;
  oldOvr: number;
  newOvr: number;
  delta: number;
}

/** Año registrado en el historial multi-club de la carrera */
export interface CareerHistoryEntry {
  season: number;
  club: string;
  leagueRank: number;
  isTitleWon: boolean;
  mvpPlayer: string;
  budgetStart: number;
  budgetEnd: number;
  playersIn: string[];
  playersOut: string[];
  winStreak: number;
  classicWins: number;
  cupPhase: string;
}

/** Contrato laboral del DT (contracts.js) */
export interface ManagerContract {
  teamId: string;
  teamName: string;
  startYear: number;
  duration: number;
  yearsRemaining: number;
  targetPosition: number;
  sportingScore: number;
  fanSatisfaction: number;
  financialBalance: number;
  boardConfidence: number;
  renewalChance: number;
  status: ContractStatus;
  /** KPI de fidelidad táctica (evaluado en runtime) */
  tacticalFidelity?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. ESTADO GLOBAL DE LA PARTIDA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estado completo de la carrera activa (db.js newCareer/loadGame).
 * Es la estructura más grande del juego; todos sus campos son obligatorios
 * para eliminar los `|| default` silenciosos en el código.
 */
export interface GameState {
  // ── Identidad del DT ────────────────────────────────────────────────────
  managerName: string;
  managerCountry: string;
  managerAge: number;
  managerArchetype: ManagerArchetypeId;
  clubPhilosophy: string;
  tacticalFidelityWeeks: number;

  // ── Equipo y liga ───────────────────────────────────────────────────────
  userTeamId: string;
  userLeagueId: string;

  // ── Presupuesto dual ────────────────────────────────────────────────────
  budget: number;
  wageBudget: number;
  transferBudgetLocked: boolean;
  lockedBudgetAmount: number;

  // ── Reputación y puntuación ─────────────────────────────────────────────
  reputation: number;
  managerScore: number;

  // ── Tiempo ──────────────────────────────────────────────────────────────
  season: number;
  week: number;
  maxWeeks: number;
  isCareerFinished: boolean;

  // ── Fichajes ────────────────────────────────────────────────────────────
  failedTransferPlayers: string[];

  // ── Competiciones ───────────────────────────────────────────────────────
  standings: Standing[];
  topScorers: TopScorer[];
  trophies: Trophy[];
  nationalCupProgress?: CupPhase[];
  continentalCupProgress?: CupPhase[];

  // ── Tácticas ────────────────────────────────────────────────────────────
  tactics: TacticsConfig;
  managerTactics: ManagerTactics;
  matchBonus: MatchBonus;

  // ── Team Spirit (0-100, afecta el OVR efectivo) ─────────────────────────
  teamSpirit: number;

  // ── Ojeadores y cantera ─────────────────────────────────────────────────
  scoutLevel: number; // 1-5
  youthAcademy: YouthProspect[];
  youthTournamentPlayed?: boolean;

  // ── Mercado de entrenadores IA ──────────────────────────────────────────
  managerMarket: ManagerMarketState;
  enableManagerMarket: boolean;

  // ── The Feed ────────────────────────────────────────────────────────────
  feedItems: FeedItem[];

  // ── Seguimiento multiliga ───────────────────────────────────────────────
  watchedLeagues: string[];
  externalStandings: Record<string, { standings: Standing[]; topScorers: TopScorer[] }>;

  // ── Regens ──────────────────────────────────────────────────────────────
  retiredLegends: RetiredLegend[];
  enableRegens: boolean;

  // ── Configuración de eventos ────────────────────────────────────────────
  eventFrequency: EventFrequency;
  seasonEventsCount?: number;

  // ── Log y finanzas ──────────────────────────────────────────────────────
  eventsLog: LogEntry[];
  finances: Finances;

  // ── Historial de carrera ────────────────────────────────────────────────
  careerHistory: CareerHistoryEntry[];
  winStreak: number;
  currentStreak: number;
  bestWinStreak: number;
  classicWins: number;
  seasonPlayersIn: string[];
  seasonPlayersOut: string[];
  cupPhaseReached: string;
  lastSeasonEvolutionReport?: EvolutionReportEntry[];

  // ── Contratos del DT ───────────────────────────────────────────────────
  /** Contrato con el club (inicializado por ContractEngine) */
  contract?: ManagerContract;
  /** Cargo de seleccionador nacional asumido (contractUI.js) */
  nationalTeamContract?: {
    teamId: string;
    teamName: string;
    startYear: number;
  };
}

/** Formato completo de guardado en localStorage */
export interface SaveData {
  gameState: GameState;
  players: Record<string, Player[]>;
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. DOMINIO DE PARTIDOS (MatchEngine / penaltyEngine)
// ═══════════════════════════════════════════════════════════════════════════

/** Tipos de evento emitidos por el MatchEngine tick a tick */
export type MatchEventType =
  | 'start'
  | 'goal_home'
  | 'goal_away'
  | 'shot_home'
  | 'shot_away'
  | 'end'
  | 'tension_moment';

/** Opción de decisión en un Momento de Tensión */
export interface TensionOption {
  id: TacticalOrder;
  label: string;
  desc: string;
  /** LOW_BLOCK solo define awayShotBonus/homePossessionBonus: todos opcionales */
  effect: { homeShotBonus?: number; awayShotBonus?: number; homePossessionBonus?: number };
}

/** Evento de partido (feed de la simulación minuto a minuto) */
export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  text: string;
  scorerName?: string;
  team?: string;
  title?: string;
  description?: string;
  options?: TensionOption[];
}

/** Resultado de simulateFullMatch() */
export interface MatchResult {
  homeScore: number;
  awayScore: number;
  homeXG: number;
  awayXG: number;
  homeShots: number;
  awayShots: number;
  homePossession: number;
  events: MatchEvent[];
}

/** Bonus por enfrentamiento táctico (matriz TACTICAL_MATCHUP_MATRIX) */
export interface MatchupBonus {
  bonusXG: number;
  possession: number;
  desc?: string;
}

/**
 * Estilos que participan en la matriz táctica (todos los del juego menos
 * 'Presión Alta', que se normaliza a 'Gegenpressing').
 */
export type MatchupStyle =
  | 'Tiki-Taka'
  | 'Gegenpressing'
  | 'Catenaccio'
  | 'Juego por Bandas'
  | 'Contraataque';

/** Resultado de ProbabilityEngine.calculateMatchProbabilities() */
export interface MatchProbabilities {
  homeXG: number;
  awayXG: number;
  homePossession: number;
}

/** Contraoferta de un club rival (ProbabilityEngine.generateRivalCounterOffer) */
export interface RivalCounterOffer {
  rivalName: string;
  offerAmount: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. EVENTOS NARRATIVOS (eventsEngine.js)
// ═══════════════════════════════════════════════════════════════════════════

/** Opción de decisión dentro de un evento narrativo */
export interface EventOption {
  label: string;
  bonusType: EventBonusType;
  bonusVal: number | string;
  cost?: number;
}

/** Evento narrativo listo para renderizar en modal */
export interface GameEvent {
  id: string;
  rarity: 'COMÚN' | 'ESPECIAL' | 'RARO' | 'ÉPICO' | 'LEGENDARIO' | 'ÚNICO';
  rarityColor: string;
  category: string;
  title: string;
  description: string;
  optionA: EventOption;
  optionB: EventOption;
}
