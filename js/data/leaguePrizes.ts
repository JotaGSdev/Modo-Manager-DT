/**
 * ============================================================================
 * PREMIOS POR LIGA REALISTAS (v3.9)
 * ============================================================================
 * El premio de campeón de liga era plano (€15M para CUALQUIER liga): no había
 * brecha económica entre el Brasileirão y la Liga 1. Esta tabla reproduce los
 * montos reales de CONMEBOL 2025-26 (fuente: prensa deportiva + Conmebol),
 * convertidos de USD a EUR (≈0.92, la moneda del juego):
 *
 *   Brasileirão   $10,000,000  →  €9.0M   (domina el mercado sudamericano)
 *   Uruguay       $ 1,000,000  →  €0.9M   (incluye subsidio anual Conmebol)
 *   Bolivia       $ 1,000,000  →  €0.9M   (financiado por Conmebol)
 *   Liga 1 (Perú) $   650,000  →  €0.6M
 *   Chile         $   600,000  →  €0.55M
 *   Argentina     $   500,000  →  €0.5M   (+70% recaudación de la final)
 *   Colombia      $   230,000  →  €0.21M
 *   Ecuador       $   230,000  →  €0.21M
 *   Paraguay      $   128,000  →  €0.12M
 *
 * Además se incluyen Europa (la brecha con Sudamérica que menciona la prensa)
 * y Norteamérica con montos aproximados reales. CONMEBOL también paga el gran
 * pozo: solo clasificar a la Fase de Grupos de la Libertadores asegura ~$3M
 * (más $340K por victoria) y el campeón embolsa $25M — la copa continental del
 * juego ya modela esos valores (CompetitionsEngine.processCupWeek).
 * ============================================================================
 */

/** Premio de campeón de liga (EUR) por ID de liga */
export const LEAGUE_CHAMPION_PRIZE_EUR: Record<string, number> = {
  // ── Sudamérica (CONMEBOL) ──────────────────────────────────────────────
  bra_1: 9_000_000, // Brasileirão: $10M — el gigante
  uru_1: 900_000,   // Campeonato Uruguayo: $1M (subsidio Conmebol)
  bol_1: 900_000,   // Primera División de Bolivia: $1M (financiado por Conmebol)
  per_1: 600_000,   // Liga 1 Te Apuesto: $650K
  chi_1: 550_000,   // Primera División de Chile: $600K
  arg_1: 500_000,   // Liga Profesional: $500K (+70% recaudación de la final)
  col_1: 210_000,   // Liga BetPlay: $230K
  ecu_1: 210_000,   // LigaPro: $230K
  par_1: 120_000,   // Primera División de Paraguay: $128K
  ven_1: 150_000,   // Liga FUTVE: aprox. (rango Paraguay-Colombia)

  // ── Europa (brecha con Sudamérica, aprox. reales 2024-25) ──────────────
  eng_1: 65_000_000, // Premier League ~$70M
  esp_1: 23_000_000, // LaLiga ~$25M
  ita_1: 23_000_000, // Serie A ~$25M
  ger_1: 18_000_000, // Bundesliga ~$20M
  fra_1: 14_000_000, // Ligue 1 ~$15M
  ned_1: 5_500_000,  // Eredivisie ~$6M
  por_1: 3_700_000,  // Primeira Liga ~$4M
  tur_1: 2_800_000,  // Süper Lig ~$3M
  sau_1: 14_000_000, // Saudi Pro League ~$15M
  eng_2: 2_500_000,  // EFL Championship (el ascenso es el verdadero premio)
  esp_2: 2_000_000,  // LaLiga Hypermotion
  ita_2: 2_000_000,  // Serie B
  ger_2: 2_000_000,  // 2. Bundesliga
  fra_2: 1_500_000,  // Ligue 2

  // ── Norte y Centroamérica ──────────────────────────────────────────────
  mex_1: 2_800_000,  // Liga MX ~$3M
  usa_1: 1_800_000,  // MLS ~$2M
  can_1: 800_000,    // Canadian Premier League
  crc_1: 400_000,    // Liga Promerica
  hon_1: 400_000,    // Liga Nacional de Honduras
  gtm_1: 400_000     // Liga Nacional de Guatemala
};

/** Fallback para ligas no tabuladas (segunda división o futuras) */
export const DEFAULT_LEAGUE_CHAMPION_PRIZE = 2_000_000;

/** Proporciones por puesto: campeón 100%, zona alta 50%, resto 20% */
const PRIZE_TOP4_RATIO = 0.5;
const PRIZE_REST_RATIO = 0.2;

/** Premio de campeón de liga (EUR) según el ID de la liga */
export function getLeagueChampionPrize(leagueId?: string): number {
  if (!leagueId) return DEFAULT_LEAGUE_CHAMPION_PRIZE;
  return LEAGUE_CHAMPION_PRIZE_EUR[leagueId] ?? DEFAULT_LEAGUE_CHAMPION_PRIZE;
}

/**
 * Premio por posición final en la liga (EUR):
 *   campeón → 100% · 2º-4º → 50% · resto → 20%
 */
export function getLeaguePrizeByRank(leagueId: string | undefined, rank: number): number {
  const champ = getLeagueChampionPrize(leagueId);
  if (rank <= 1) return champ;
  if (rank <= 4) return Math.round(champ * PRIZE_TOP4_RATIO);
  return Math.round(champ * PRIZE_REST_RATIO);
}

/**
 * Premio de la copa nacional por ronda (EUR). Escala con la riqueza de la
 * liga: en Brasil la Copa do Brasil paga más que la propia liga (~$14M vs
 * $10M), mientras que en una liga pequeña la copa reparte poco.
 *   ronda 4 (final) → ~1.3× el premio de campeón de liga
 */
export function getNationalCupRoundPrize(leagueId: string | undefined, roundIndex: number): number {
  return Math.round(getLeagueChampionPrize(leagueId) * 0.32 * roundIndex);
}

/** Información de la copa continental por región (coincide con CompetitionsEngine). */
export interface ContinentalCupInfo {
  name: string;
  /** Garantizado por jugar la Fase de Grupos (se paga una vez, gane o pierda). */
  groupEntryPrize: number;
  /** Por cada victoria en la Fase de Grupos. */
  groupWinPrize: number;
  /** Por cada victoria en Cuartos / Semifinal. */
  knockoutWinPrize: number;
  /** Por conquistar el título en la gran final. */
  finalPrize: number;
}

/**
 * Copa continental según la región del club, con el premio pagado POR ETAPAS
 * (v3.12) como en la realidad: el gran pozo sudamericano solo por jugar la
 * Fase de Grupos asegura ~$3M, cada victoria de grupo paga ~$340K y el
 * campeón embolsa $25M (valores reales CONMEBOL 2026 convertidos a EUR ≈0.92;
 * la UCL y la CONCACAF mantienen su jerarquía propia).
 */
export function getContinentalCupInfo(region?: string): ContinentalCupInfo {
  if (region === 'Europa') {
    return { name: 'UEFA Champions League', groupEntryPrize: 4_000_000, groupWinPrize: 3_500_000, knockoutWinPrize: 5_000_000, finalPrize: 35_000_000 };
  }
  if (region === 'Norteamérica') {
    return { name: 'Copa de Campeones de la CONCACAF', groupEntryPrize: 2_000_000, groupWinPrize: 1_800_000, knockoutWinPrize: 2_500_000, finalPrize: 15_000_000 };
  }
  // Copa CONMEBOL Libertadores: $3M por jugar grupos + $340K por victoria +
  // $25M por el título (la gran final). Los cuartos/semis pagan un bono menor.
  return { name: 'Copa CONMEBOL Libertadores', groupEntryPrize: 2_800_000, groupWinPrize: 310_000, knockoutWinPrize: 1_200_000, finalPrize: 25_000_000 };
}
