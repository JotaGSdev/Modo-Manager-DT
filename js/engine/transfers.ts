// Motor de Mercado de Fichajes y Negociaciones Estilo EA FC / FIFA por Pasos y Bloqueo de Ventana
// Migrado a TypeScript (Fase 1): tipos conectados a js/types.ts, lógica intacta.

import { db } from '../data/db.js';
import { getLeaguePrizeByRank } from '../data/leaguePrizes.js';

import type { ActionResult, Player, Position, SquadRole, Team } from '../types.js';

/** Criterio de ordenación del mercado (getMarketPlayers) */
export type MarketSortBy = 'ovr' | 'value' | 'age' | 'salary' | 'name';

/** Filtros del mercado de fichajes (getMarketPlayers) */
export interface MarketFilters {
  position?: Position | 'ALL';
  maxPrice?: number;
  minOvr?: number;
  maxAge?: number;
  name?: string;
  /** Filtro por liga del club propietario (opcional) */
  leagueId?: string;
  /** Criterio de ordenación (por defecto: OVR descendente) */
  sortBy?: MarketSortBy;
}

/** Entrada del mercado: jugador + club y estado de bloqueo */
export type MarketPlayer = Player & { teamName: string; isLocked: boolean };

export function isTransferWindowOpen(week: number): boolean {
  return (week >= 1 && week <= 4) || (week >= 19 && week <= 22);
}

// ───────────────────────────────────────────────────────────────────────────
// v3.2 — MERCADO DE FICHAJES IA (traspasos entre clubes rivales)
// ───────────────────────────────────────────────────────────────────────────

/** Grupos de posición para detectar necesidades y excedentes de plantilla IA */
const AI_POS_GROUPS: Record<string, Position[]> = {
  'GK': ['POR'],
  'DEF': ['DFC', 'LI', 'LD'],
  'MID': ['MCD', 'MC', 'MCO', 'MI', 'MD'],
  'ATK': ['DC', 'EI', 'ED']
};

/** Mínimos de plantilla por grupo (una plantilla equilibrada de 22) */
const AI_GROUP_MIN: Record<string, number> = { GK: 2, DEF: 6, MID: 6, ATK: 5 };

/** Tope superior del presupuesto IA: máximo múltiplo del presupuesto original */
const AI_BUDGET_CAP = 2.5;
/** Suelo de supervivencia: mínimo múltiplo del presupuesto original */
const AI_BUDGET_FLOOR = 0.4;

// ── v3.4: CONSECUENCIAS DURAS DE LA ECONOMÍA IA ────────────────────────────
/** Temporadas consecutivas en el suelo antes de activar consecuencias duras */
const AI_FLOOR_SEASONS_TRIGGER = 2;
/**
 * Zona de peligro: se considera "en el suelo" el presupuesto dentro del 25%
 * por encima del mínimo (los clubes al borde de la quiebra no esperan a
 * quedar clavados en el mínimo exacto para activar consecuencias).
 */
const AI_FLOOR_DANGER_ZONE = 1.25;
/**
 * Venta forzosa: venta desesperada, la estrella sale por 35%-60% de su valor
 * de mercado (no 55-75%: en una liga pequeña nadie podía pagar la cuota).
 */
const AI_FIRE_SALE_MIN = 0.35;
const AI_FIRE_SALE_MAX = 0.60;
/** El comprador puede destinar hasta el 80% de su presupuesto a la cuota */
const AI_FIRE_SALE_MAX_BUDGET_SHARE = 0.8;
/**
 * Mínimo que debe poder pagar el mejor postor (60% del precio pedido) para
 * cerrar la venta; si ni eso hay, el club recibe un inversor en su lugar.
 */
const AI_FIRE_SALE_MIN_AFFORD = 0.6;
/** Máx. de noticias de crisis por temporada en The Feed */
const AI_CRISIS_MAX_NEWS = 5;
/** Máx. de clubes con consecuencias de suelo por temporada */
const AI_FLOOR_MAX_ACTIONS = 4;
/** Inyección del inversor como múltiplo del presupuesto ORIGINAL del club */
const AI_INVESTOR_BOOST = 0.8;
/** OVR mínimo para considerar a un jugador "estrella" vendible en apuros */
const AI_STAR_MIN_OVR = 72;
/** Valor mínimo de mercado de una estrella vendible */
const AI_STAR_MIN_VALUE = 3_000_000;
/** Crisis crónica: sin cubrir la nómina 3+ temporadas también fuerza venta */
const AI_CRISIS_CHRONIC = 3;

/** Grupo de posición de un jugador (GK/DEF/MID/ATK) */
function aiGroupOf(pos: Position): string {
  for (const g of Object.keys(AI_POS_GROUPS)) {
    if (AI_POS_GROUPS[g]!.includes(pos)) return g;
  }
  return 'MID';
}

export class TransferEngine {
  /**
   * Verifica si las negociaciones con un jugador están bloqueadas en la ventana actual
   */
  static isPlayerLocked(playerId: string): boolean {
    const gameState = db.gameState!;
    if (!gameState.failedTransferPlayers) gameState.failedTransferPlayers = [];
    return gameState.failedTransferPlayers.includes(playerId);
  }

  /**
   * Bloquea a un jugador por negociación fallida hasta la siguiente ventana
   */
  static lockPlayerForCurrentWindow(playerId: string): void {
    const gameState = db.gameState!;
    if (!gameState.failedTransferPlayers) gameState.failedTransferPlayers = [];
    if (!gameState.failedTransferPlayers.includes(playerId)) {
      gameState.failedTransferPlayers.push(playerId);
    }
    db.saveGame();
  }

  /**
   * Resetea el bloqueo de negociaciones al abrir una nueva ventana (Semana 1 o Semana 19)
   *
   * v3.5: ya no guarda aquí. En el flujo de cierre de temporada
   * (processSeasonPlayerEvolution) el save final persiste el reset, y en el
   * parón de mitad de temporada el siguiente guardado lo hace. Evitar el
   * guardado intermedio reduce la serialización (el grueso del coste en
   * carreras largas) y hace atómica la transición de temporada.
   */
  static resetWindowLocks(): void {
    const gameState = db.gameState!;
    gameState.failedTransferPlayers = [];
  }

  /**
   * Mercado de fichajes entre clubes IA (v3.2): en cada ventana (verano =
   * fin de temporada, invierno = semana 19) los clubes rivales detectan
   * necesidades por posición y nivel, fichan a prescindibles de otros clubes
   * y renuevan sus plantillas con traspasos reales (además de regens y
   * cantera). Nunca toca la plantilla del DT.
   * @param window - 'summer' (fin de temporada) | 'winter' (semana 19)
   */
  static processAITransfers(transferWindow: 'summer' | 'winter' = 'summer'): void {
    const gameState = db.gameState;
    if (!gameState) return;
    const userTeamId = gameState.userTeamId;

    // Equipos IA con plantilla generada (fuera del control del DT)
    const aiTeams = Object.keys(db.players)
      .filter(tId => tId !== userTeamId && db.teams[tId] && Array.isArray(db.players[tId]) && db.players[tId]!.length >= 16)
      .map(tId => ({ team: db.teams[tId]!, squad: db.players[tId]! }))
      .sort(() => Math.random() - 0.5);

    if (aiTeams.length < 4) return;

    // ── 1) NECESIDADES por equipo: huecos numéricos o calidad muy baja ──
    const needs = new Map<string, Position[]>();
    for (const { team, squad } of aiTeams) {
      const level = team.overall || 70;
      const missing: Position[] = [];
      for (const g of Object.keys(AI_GROUP_MIN)) {
        const groupPlayers = squad.filter(p => AI_POS_GROUPS[g]!.includes(p.pos));
        const best = groupPlayers.reduce<Player | null>((acc, p) => (!acc || p.overall > acc.overall ? p : acc), null);
        if (groupPlayers.length < AI_GROUP_MIN[g]!) {
          // hueco numérico: pedir la posición más débil del grupo (o la primera)
          const weakest = groupPlayers.reduce<Player | null>((acc, p) => (!acc || p.overall < acc.overall ? p : acc), null);
          missing.push(weakest ? weakest.pos : AI_POS_GROUPS[g]![0]!);
        } else if (best && best.overall < level - 8 && Math.random() < 0.7) {
          // refuerzo de calidad: el mejor del grupo está muy por debajo del nivel
          missing.push(best.pos);
        }
      }
      if (missing.length > 0) needs.set(team.id, missing);
    }

    // ── 2) POOL DE VENDEDORES: suplentes y veteranos prescindibles ──
    interface SellerOffer { player: Player; fromTeamId: string; }
    const sellers: SellerOffer[] = [];
    for (const { team, squad } of aiTeams) {
      const level = team.overall || 70;
      const byGroup: Record<string, number> = {};
      squad.forEach(p => { const g = aiGroupOf(p.pos); byGroup[g] = (byGroup[g] || 0) + 1; });
      const bestOfGroup = new Map<string, Player>();
      squad.forEach(p => {
        const g = aiGroupOf(p.pos);
        const cur = bestOfGroup.get(g);
        if (!cur || p.overall > cur.overall) bestOfGroup.set(g, p);
      });

      squad.forEach((p, idx) => {
        const g = aiGroupOf(p.pos);
        const groupCount = byGroup[g] || 0;
        const minGroup = AI_GROUP_MIN[g]!;
        const surplus = groupCount > minGroup && p !== bestOfGroup.get(g);
        const veteranBelow = p.age >= 31 && p.overall < level;
        const bench = idx >= 11;
        const excessSquad = squad.length > 23 && idx >= 23;
        const youngTalent = p.age <= 24 && p.overall >= level + 2;
        const youngRegen = p.isRegen && p.age <= 21;
        const sellable = surplus || (veteranBelow && (bench || groupCount > minGroup)) || excessSquad;
        if (sellable && !youngTalent && !youngRegen) {
          sellers.push({ player: p, fromTeamId: team.id });
        }
      });
    }
    if (sellers.length === 0) return;

    // ── 3) MATCHMAKING comprador → vendedor ──
    const maxTransfers = transferWindow === 'summer' ? 26 : 16;
    const perBuyer = new Map<string, number>();
    const news: string[] = [];
    let executed = 0;

    // v3.5: índice de vendedores por posición. El filtro de candidatos se
    // ejecutaba por cada (comprador × necesidad) re-escaneando TODO el pool
    // (hasta ~10.000 vendedores en el universo completo → decenas de millones
    // de iteraciones por ventana). Agrupar por posición lo reduce ~12× sin
    // cambiar el resultado: el orden relativo dentro de cada posición es el
    // mismo que en `sellers`.
    const sellersByPos = new Map<Position, SellerOffer[]>();
    for (const s of sellers) {
      const list = sellersByPos.get(s.player.pos) || [];
      list.push(s);
      sellersByPos.set(s.player.pos, list);
    }

    for (const { team, squad } of aiTeams) {
      if (executed >= maxTransfers) break;
      const buyerNeeds = needs.get(team.id);
      if (!buyerNeeds || buyerNeeds.length === 0) continue;
      if (squad.length >= 25) continue;
      const budget = team.budget || 0;
      const level = team.overall || 70;
      if (budget <= 0) continue;

      const shuffledNeeds = [...buyerNeeds].sort(() => Math.random() - 0.5);
      for (const needPos of shuffledNeeds) {
        if (executed >= maxTransfers) break;
        if ((perBuyer.get(team.id) || 0) >= 3) break;
        if (squad.length >= 25) break;

        // Candidatos del mismo puesto y nivel acorde, con su cuota calculada.
        // Se excluye la propia plantilla del comprador (evita auto-traspasos).
        // El pool por posición (v3.5) evita re-escandear todos los vendedores.
        const candidates = (sellersByPos.get(needPos) || [])
          .filter(s => s.fromTeamId !== team.id && s.player.teamId === s.fromTeamId &&
                       s.player.overall >= level - 8 && s.player.overall <= level + 10)
          .map(s => ({ player: s.player, fromTeamId: s.fromTeamId, fee: Math.round(s.player.value * (0.85 + Math.random() * 0.3)) }))
          .filter(c => c.fee > 0 && c.fee <= budget * 0.65);
        // Mejor candidato: mayor OVR, penalizado por edad
        candidates.sort((a, b) => (b.player.overall - b.player.age * 0.15) - (a.player.overall - a.player.age * 0.15));
        const best = candidates[0];
        if (!best) continue;

        const { player, fromTeamId, fee } = best;
        const sellerSquad = db.players[fromTeamId];
        if (!sellerSquad || sellerSquad.length <= 16) continue;
        // El vendedor conserva el mínimo del grupo (no dejar plantillas rotas)
        const sellerGroup = aiGroupOf(player.pos);
        const sellerGroupCount = sellerSquad.filter(p => aiGroupOf(p.pos) === sellerGroup).length;
        if (sellerGroupCount <= AI_GROUP_MIN[sellerGroup]!) continue;

        const idx = sellerSquad.findIndex(p => p.id === player.id);
        if (idx === -1) continue;

        // ── EJECUTAR traspaso ──
        sellerSquad.splice(idx, 1);
        player.teamId = team.id;
        player.contractYears = 2 + Math.floor(Math.random() * 3);
        player.morale = Math.max(player.morale || 80, 88);
        player.appearances = 0;
        player.seasonGoals = 0;
        // Insertar en posición OVR descendente: el refuerzo entra en el XI
        // efectivo (slice(0,11) del motor) y sube la fuerza real del equipo
        // (un push simple lo enterraría al final del array, fuera del once).
        let insertIdx = squad.findIndex(p => p.overall < player.overall);
        if (insertIdx === -1) insertIdx = squad.length;
        squad.splice(insertIdx, 0, player);

        const buyerTeam = db.teams[team.id]!;
        const sellerTeam = db.teams[fromTeamId]!;
        buyerTeam.budget = Math.max(0, (buyerTeam.budget || 0) - fee);
        sellerTeam.budget = (sellerTeam.budget || 0) + fee;
        // Sincronizar el presupuesto en las copias de league.teams (igual que
        // updateAITeamOveralls hace con el OVR), para no dejar datos dispares.
        const syncBudget = (tId: string): void => {
          const teamRef = db.teams[tId];
          const leagueRef = db.leagues.find(l => l.id === teamRef?.leagueId);
          const leagueTeam = leagueRef?.teams.find(t => t.id === tId);
          if (teamRef && leagueTeam) leagueTeam.budget = teamRef.budget;
        };
        syncBudget(team.id);
        syncBudget(fromTeamId);

        perBuyer.set(team.id, (perBuyer.get(team.id) || 0) + 1);
        executed++;

        if (player.overall >= 78) {
          news.push(`🔁 ${buyerTeam.name} ficha a ${player.name} (${player.pos}, OVR ${player.overall}) por €${(fee / 1000000).toFixed(0)}M desde ${sellerTeam.name}.`);
        }
      }
    }

    // ── 4) NOTICIAS en The Feed (máx 8) + resumen en el log ──
    if (!Array.isArray(gameState.feedItems)) gameState.feedItems = [];
    news.slice(0, 8).forEach(text => {
      gameState.feedItems!.unshift({
        id: `ai_transfer_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        week: gameState.week,
        season: gameState.season,
        type: 'TRASPASO_IA',
        text,
        icon: '🔁',
        isRead: false,
        linkedPlayerId: null
      });
    });

    gameState.eventsLog.unshift({
      date: `Semana ${gameState.week}`,
      text: `🔁 MERCADO DE FICHAJES IA: ${executed} traspasos entre clubes rivales en la ventana de ${transferWindow === 'summer' ? 'verano' : 'invierno'}.`
    });

    // ── 3b) AGENTES LIBRES (v3.8): clubes con plantilla corta reponen con
    // jugadores sin contrato (más barato que un traspaso, sin club vendedor).
    const freeAgents = db.gameState?.freeAgents || [];
    if (freeAgents.length > 0) {
      const freeByPos = new Map<Position, Player[]>();
      for (const fa of freeAgents) {
        const list = freeByPos.get(fa.pos) || [];
        list.push(fa);
        freeByPos.set(fa.pos, list);
      }
      // v3.8.1: el mercado debe absorber las expiraciones (~540/temporada en
      // el universo completo); 20/10 dejaba que el pool se desbordara.
      const maxFreeSignings = transferWindow === 'summer' ? 120 : 60;
      let freeSigned = 0;
      for (const { team, squad } of aiTeams) {
        if (freeSigned >= maxFreeSignings) break;
        if (squad.length >= 22) continue;
        if (this.trySignFreeAgent(team, squad, freeByPos, news)) freeSigned++;
      }
    }

    // Recalcular el OVR de los equipos IA afectados (y sus copias en league.teams)
    db.updateAITeamOveralls();

    // Re-asegurar el tope de temporada: los traspasos de esta ventana (pagar
    // cuotas o cobrar ventas) pueden haber sacado presupuestos de la banda
    // [suelo, tope] anclada al presupuesto original. Se reajustan aquí para
    // que la economía IA nunca se dispare ni colapse.
    this.enforceAIBudgetLimits();
  }

  /**
   * v3.8 — Firma un agente libre para un club IA si hay necesidad y el
   * presupuesto lo permite. Devuelve true si se fichó. Usado por la ventana
   * de traspasos (processAITransfers) y por el refill de fin de temporada
   * (refillAISquads) para plantillas cortas.
   *
   * @param lenient En modo refill de emergencia: permite pagar la prima
   *   recortada al presupuesto disponible (un club casi en quiebra aún puede
   *   fichar a un libre barato para no quedarse sin once).
   */
  private static trySignFreeAgent(team: Team, squad: Player[], freeByPos: Map<Position, Player[]>, news: string[], lenient = false): boolean {
    const gs = db.gameState;
    if (!gs) return false;
    const level = team.overall || 70;
    const budget = team.budget || 0;
    if (budget <= 0) return false;

    // Necesidad: hueco numérico en un grupo, o refuerzo de élite cuando la
    // plantilla es corta y el peor jugador está muy por debajo del mercado.
    let needPos: Position | null = null;
    for (const g of Object.keys(AI_GROUP_MIN)) {
      const cnt = squad.filter(p => AI_POS_GROUPS[g]!.includes(p.pos)).length;
      if (cnt < AI_GROUP_MIN[g]!) {
        needPos = AI_POS_GROUPS[g]![0]!;
        break;
      }
    }
    if (!needPos && squad.length < 19) {
      const weakest = squad.reduce<Player | null>((acc, p) => (!acc || p.overall < acc.overall ? p : acc), null);
      const bestFree = [...(db.gameState?.freeAgents || [])].sort((a, b) => b.overall - a.overall)[0];
      if (weakest && bestFree && bestFree.overall > weakest.overall + 5) needPos = weakest.pos;
    }
    if (!needPos) return false;

    // El mejor libre de la posición que el club pueda pagar. No basta con el
    // top de la lista: el más caro puede quedar fuera de presupuesto mientras
    // un compañero más barato del mismo puesto sí cabe (bug v3.8.0: se rendía
    // sin probar alternativas asequibles). En modo refill (lenient) el nivel
    // se relaja a -30: el objetivo es reponer CUERPOS para no quedarse sin
    // once, no fichar refuerzos de calidad.
    const minLevel = lenient ? level - 30 : level - 10;
    const candidates = (freeByPos.get(needPos) || [])
      .slice()
      .sort((a, b) => b.overall - a.overall)
      .filter(c => c.overall >= minLevel);
    // Bug v3.8.1: freeByPos es una instantánea del pool — tras firmar al mejor
    // candidato, la siguiente llamada lo volvía a elegir (ya eliminado de
    // gs.freeAgents) y se rendía SIN probar al siguiente asequible. Cada equipo
    // solo podía firmar 1 y los demás se quedaban sin refuerzos. Ahora se
    // verifica que el candidato siga disponible durante la selección.
    let bestFree: Player | null = null;
    for (const c of candidates) {
      // v3.8.1: prima al 3% del valor en ventanas; en refill de emergencia 1%
      // (mínimo) — un libre se ficha sin traspaso y la prima alta limitaba
      // cuántos podía absorber cada club con presupuesto pequeño.
      const cost = Math.round(c.value * (lenient ? 0.01 : 0.03));
      const affordable = lenient ? cost <= Math.max(200000, budget) : cost <= budget;
      if (affordable && gs.freeAgents.some(p => p.id === c.id)) {
        bestFree = c;
        break;
      }
    }
    if (!bestFree) return false;

    const idx = gs.freeAgents.findIndex(p => p.id === bestFree!.id);
    if (idx === -1) return false;
    gs.freeAgents.splice(idx, 1);
    bestFree!.teamId = team.id;
    bestFree!.contractYears = 2 + Math.floor(Math.random() * 3);
    bestFree!.morale = Math.max(bestFree!.morale || 80, 88);
    bestFree!.appearances = 0;
    bestFree!.seasonGoals = 0;
    let insertIdx = squad.findIndex(p => p.overall < bestFree!.overall);
    if (insertIdx === -1) insertIdx = squad.length;
    squad.splice(insertIdx, 0, bestFree!);
    const signingCost = Math.min(Math.round(bestFree!.value * (lenient ? 0.01 : 0.03)), budget);
    team.budget = Math.max(0, budget - signingCost);
    const league = db.leagues.find(l => l.id === team.leagueId);
    const leagueTeam = league?.teams.find(t => t.id === team.id);
    if (leagueTeam) leagueTeam.budget = team.budget;
    if (bestFree!.overall >= 78) {
      news.push(`🕊️ ${team.name} firma al agente libre ${bestFree!.name} (${bestFree!.pos}, OVR ${bestFree!.overall}) sin pagar traspaso.`);
    }
    return true;
  }

  /**
   * v3.8 — REFILL DE FIN DE TEMPORADA: tras la salida a agentes libres, los
   * clubes IA con plantilla corta (< 16) reponen efectivos fichando libres.
   * Sin esto, un equipo que cae por debajo del mínimo quedaría fuera del
   * mercado de traspasos (filtro >= 16 de processAITransfers) y se hundiría.
   */
  static refillAISquads(): void {
    const gs = db.gameState;
    if (!gs) return;
    const userTeamId = gs.userTeamId;
    const freeAgents = gs.freeAgents || [];
    if (freeAgents.length === 0) return;

    const freeByPos = new Map<Position, Player[]>();
    for (const fa of freeAgents) {
      const list = freeByPos.get(fa.pos) || [];
      list.push(fa);
      freeByPos.set(fa.pos, list);
    }

    // Los equipos más cortos primero (prioridad a los que más lo necesitan)
    const shortTeams = Object.keys(db.players)
      .filter(tId => tId !== userTeamId && db.teams[tId] && Array.isArray(db.players[tId]) && db.players[tId]!.length < 20)
      .map(tId => ({ team: db.teams[tId]!, squad: db.players[tId]! }))
      .sort((a, b) => a.squad.length - b.squad.length);

    let signed = 0;
    const news: string[] = [];
    for (const { team, squad } of shortTeams) {
      if (signed >= 600) break;
      // v3.8.1: llenar hasta 20 (antes 18) — con ~450 expiraciones/temporada
      // y ~300 fichajes, llenar más por equipo reduce el drenaje neto.
      while (squad.length < 20 && signed < 600) {
        if (!this.trySignFreeAgent(team, squad, freeByPos, news, true)) break;
        signed++;
      }
    }
    if (signed === 0) return;

    if (!Array.isArray(gs.feedItems)) gs.feedItems = [];
    news.slice(0, 8).forEach(text => {
      gs.feedItems!.unshift({
        id: `ai_free_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        week: gs.week,
        season: gs.season,
        type: 'AGENTE_LIBRE',
        text,
        icon: '🕊️',
        isRead: false,
        linkedPlayerId: null
      });
    });
    if (gs.feedItems.length > 50) gs.feedItems = gs.feedItems.slice(0, 50);
    db.updateAITeamOveralls();
  }

  /**
   * Economía IA autosostenible (v3.3): al cerrar cada temporada, los clubes
   * rivales liquidan sus ingresos por resultados y pagan su masa salarial,
   * acotados por un TOPE DE TEMPORADA anclado al presupuesto original del
   * club (baseBudget): el presupuesto resultante queda entre AI_BUDGET_FLOOR
   * y AI_BUDGET_CAP veces su valor inicial.
   *
   * Modelo: los ingresos tienen dos patas —
   *   1) PREMIO DE LIGA REAL por puesto final (v3.10): la tabla de
   *      leaguePrizes.ts (CONMEBOL/Europa real) — el Brasileirão paga €9M de
   *      campeón, la Premier €65M y la Liga 1 solo €600K. Línea absoluta que
   *      crea la brecha real entre ligas ricas y pobres.
   *   2) Ingresos comerciales que escalan con la masa salarial anual
   *      (salarios semanales × semanas de temporada), el proxy del tamaño
   *      del club. Un multiplicador según los RESULTADOS decide la tendencia:
   *        campeón      → 1.55× (crece hasta el tope)
   *        zona alta    → 1.35×
   *        media tabla  → 1.15×
   *        zona baja    → 0.95× (pierde un poco → vende)
   *        fondo/desc.  → 0.75× (apenas cubre la nómina → encoge al suelo)
   *   A eso se suman la taquilla por reputación (±0.13) y premios de copa
   *   (+0..0.15 para los clubes de más prestigio). Así el mercado de fichajes
   *   IA (processAITransfers) se financia solo, los clubes bien dirigidos
   *   crecen, los malos venden y encogen, y ningún presupuesto se dispara ni
   *   colapsa con las décadas de simulación. Nunca toca la economía del DT.
   *
   * v3.4 — CONSECUENCIAS DURAS: este mismo cierre mantiene la salud
   * económica de cada club (AIClubHealth persistido): temporadas seguidas en
   * el suelo y sin cubrir la nómina. Los clubes que pasan N temporadas en el
   * suelo venden a su estrella (venta forzosa con descuento a un comprador
   * con necesidad) o reciben un inversor, y los que no cubren su masa
   * salarial entran en crisis visible en The Feed.
   *
   * La tabla de posiciones del juego llega ORDENADA al cierre de temporada
   * (índice = puesto final), por lo que el multiplicador por resultados es
   * exacto para la liga del usuario; las ligas externas estiman el puesto
   * por OVR + ruido.
   */
  static processAISeasonFinances(): void {
    const gs = db.gameState;
    if (!gs) return;
    const userTeamId = gs.userTeamId;

    // Puesto final (1-based) de la liga simulada del DT
    const positionByTeam = new Map<string, number>();
    (gs.standings || []).forEach((s, i) => positionByTeam.set(s.teamId, i + 1));

    let totalIncome = 0;
    let totalPrizes = 0;
    let count = 0;

    // ── v3.4: SEGUIMIENTO DE SALUD ECONÓMICA (suelo + crisis) ────────────
    // Se registra por club cuántas temporadas consecutivas lleva pegado al
    // suelo (presupuesto = AI_BUDGET_FLOOR) y cuántas sin cubrir su masa
    // salarial. Es la base de las consecuencias duras que se aplican al
    // final: venta forzosa de la estrella o inversor para los del suelo, y
    // crisis visible en The Feed para los que no pagan la nómina.
    const health = db.aiClubHealth;
    /** Clubes que entran/agravan crisis este cierre (a anunciar en el Feed) */
    const crisisClubs: { team: Team; wages: number; crisisSeasons: number }[] = [];
    /** Clubes con N temporadas seguidas en el suelo (aplicar consecuencia) */
    const floorClubs: { team: Team; roster: Player[] }[] = [];

    // Ranking estimado por liga externa (sin tabla simulada), calculado UNA
    // vez por liga: misma tirada de ruido para todos sus clubes, así la tabla
    // estimada es una permutación coherente (y se evita ~un sort por club).
    const estimatedByLeague = new Map<string, Map<string, number>>();

    for (const tId in db.teams) {
      if (tId === userTeamId) continue; // el DT gestiona su propio club
      const team = db.teams[tId];
      const roster = db.players[tId];
      if (!team || !Array.isArray(roster) || roster.length < 11) continue;

      const base = team.baseBudget || team.budget || 10_000_000;
      const league = db.leagues.find(l => l.id === team.leagueId);
      const numTeams = league?.teams?.length ?? 20;

      // Masa salarial anual = salarios semanales × semanas de la temporada
      const seasonWeeks = Math.max(30, (numTeams - 1) * 2);
      const wages = roster.reduce((s, p) => s + (p.salary || 0), 0) * seasonWeeks;

      // Puesto final real (liga simulada) o estimado por OVR + ruido (externas)
      let position = positionByTeam.get(tId);
      if (!position) {
        const leagueId = team.leagueId || '';
        let est = estimatedByLeague.get(leagueId);
        if (!est) {
          const ranked = [...(league?.teams ?? [])]
            .map(t => ({ id: t.id, score: (t.overall || 70) + Math.random() * 4 }))
            .sort((a, b) => b.score - a.score);
          est = new Map<string, number>();
          ranked.forEach((r, i) => est!.set(r.id, i + 1));
          estimatedByLeague.set(leagueId, est);
        }
        position = est.get(tId) ?? Math.floor(numTeams / 2) + 1;
      }

      // Multiplicador de ingresos sobre la masa salarial según la posición:
      // solo los de arriba superan su nómina (crecen), el medio apenas la
      // cubre y el fondo pierde dinero (vende y encoge hacia el suelo).
      const zone = position / numTeams;
      let resultFactor = 1.15;
      if (position === 1) resultFactor = 1.55;
      else if (zone <= 0.2) resultFactor = 1.35;
      else if (zone <= 0.6) resultFactor = 1.15;
      else if (zone <= 0.85) resultFactor = 0.95;
      else resultFactor = 0.75;
      // Taquilla por reputación (los grandes llenan el estadio) ±0.13
      const gateFactor = (team.reputation - 60) / 300;
      // Premios de copa: más opciones cuanto mayor es la reputación (+0..0.15)
      const cupFactor = Math.random() < 0.08 + team.reputation / 500 ? Math.random() * 0.15 : 0;

      // v3.10 — PREMIO DE LIGA REAL por puesto final (tabla CONMEBOL/Europa):
      // antes TODO escalaba por masa salarial y no existía brecha entre el
      // Brasileirão (€9M de campeón) y la Liga 1 (€600K) o la Premier (€65M).
      // Ahora el premio de liga es una línea ABSOLUTA por posición: los clubes
      // de ligas ricas ingresan su pozo real y los de ligas pobres, el suyo.
      const leaguePrize = getLeaguePrizeByRank(team.leagueId, position);

      const income = wages * (resultFactor + gateFactor + cupFactor) + leaguePrize;
      totalPrizes += leaguePrize;

      // Balance + tope de temporada anclado al presupuesto original
      let next = (team.budget || base) + income - wages;
      next = Math.round(Math.max(base * AI_BUDGET_FLOOR, Math.min(base * AI_BUDGET_CAP, next)));
      team.budget = next;

      // Sincronizar el presupuesto en la copia de league.teams (mismo patrón
      // que processAITransfers y updateAITeamOveralls usan para el presupuesto
      // y el OVR), para no dejar datos dispares entre las dos referencias.
      const leagueTeam = league?.teams.find(t => t.id === tId);
      if (leagueTeam) leagueTeam.budget = next;

      // ── v3.4: actualizar salud económica del club ───────────────────────
      const h = health[tId] || (health[tId] = { floorSeasons: 0, crisisSeasons: 0, lastStarSaleSeason: 0, lastInvestorSeason: 0 });
      const atFloor = next <= base * AI_BUDGET_FLOOR * AI_FLOOR_DANGER_ZONE + 1; // +1 absorbe el redondeo
      const missedPayroll = income < wages;
      h.floorSeasons = atFloor ? h.floorSeasons + 1 : 0;
      h.crisisSeasons = missedPayroll ? h.crisisSeasons + 1 : 0;
      // Consecuencia dura: N temporadas en la zona de peligro del suelo O
      // crisis crónica (3+ temporadas sin cubrir la nómina) — en ambos casos
      // el club está abocado a vender su estrella o recibir un inversor.
      if ((atFloor && h.floorSeasons >= AI_FLOOR_SEASONS_TRIGGER) || h.crisisSeasons >= AI_CRISIS_CHRONIC) {
        floorClubs.push({ team, roster });
      }
      // Noticia de crisis al ENTRAR (1ª temporada) y al AGRAVARSE (cada 3)
      if (missedPayroll && (h.crisisSeasons === 1 || h.crisisSeasons % 3 === 0)) {
        crisisClubs.push({ team, wages, crisisSeasons: h.crisisSeasons });
      }

      totalIncome += income;
      count++;
    }

    if (count > 0) {
      gs.eventsLog.unshift({
        date: `Temporada ${gs.season}`,
        text: `💰 ECONOMÍA IA: ${count} clubes rivales liquidaron ingresos por resultados por €${(totalIncome / 1000000).toFixed(0)}M (€${(totalPrizes / 1000000).toFixed(0)}M en premios de liga por puesto final, según el país). El mercado de fichajes IA se financia solo.`
      });
    }

    // ═════════════════════════════════════════════════════════════════════
    // v3.4 — CONSECUENCIAS DURAS DE LA ECONOMÍA IA
    // ═════════════════════════════════════════════════════════════════════
    // 1) CRISIS VISIBLE EN THE FEED: los clubes que no cubren su masa
    //    salarial entran en crisis (noticia en The Feed), con escalada cada 3
    //    temporadas consecutivas. Solo los más destacados para no saturar.
    if (!Array.isArray(gs.feedItems)) gs.feedItems = [];
    crisisClubs.sort(() => Math.random() - 0.5).slice(0, AI_CRISIS_MAX_NEWS).forEach(({ team, wages, crisisSeasons }) => {
      const text = crisisSeasons === 1
        ? `💸 CRISIS FINANCIERA: ${team.name} no cubre su masa salarial (€${(wages / 1000000).toFixed(0)}M anuales). El club vive al día y deberá vender.`
        : `💸 CRISIS AGRAVADA: ${team.name} acumula ${crisisSeasons} temporadas sin cubrir su nómina. Su estrella podría salir en el próximo mercado.`;
      gs.feedItems!.unshift({
        id: `ai_crisis_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        week: gs.week,
        season: gs.season,
        type: 'CRISIS_FINANCIERA',
        text,
        icon: '💸',
        isRead: false,
        linkedPlayerId: null
      });
    });

    // 2) SUELO: tras AI_FLOOR_SEASONS_TRIGGER temporadas seguidas con el
    //    presupuesto pegado al suelo, el club VENDE A SU ESTRELLA (venta
    //    forzosa con descuento, el comprador paga y el club sanea sus
    //    cuentas) o, si no tiene estrella vendible ni comprador, RECIBE UN
    //    INVERSOR que inyecta capital para reflotarlo.
    let starSales = 0;
    let investors = 0;
    for (const { team, roster } of floorClubs.sort(() => Math.random() - 0.5).slice(0, AI_FLOOR_MAX_ACTIONS)) {
      const h = health[team.id] || (health[team.id] = { floorSeasons: 0, crisisSeasons: 0, lastStarSaleSeason: 0, lastInvestorSeason: 0 });
      const base = team.baseBudget || team.budget || 10_000_000;

      // Estrella = mejor jugador por OVR con valor de mercado real. Si no hay
      // estrella vendible, o venderla rompería la plantilla, se va al inversor.
      const star = roster.reduce<Player | null>((acc, p) => (!acc || p.overall > acc.overall ? p : acc), null);
      const starGroup = star ? aiGroupOf(star.pos) : '';
      const starGroupCount = star ? roster.filter(p => aiGroupOf(p.pos) === starGroup).length : 0;
      const sellable = Boolean(
        star && star.overall >= AI_STAR_MIN_OVR && star.value >= AI_STAR_MIN_VALUE &&
        roster.length > 16 && starGroupCount > AI_GROUP_MIN[starGroup]!
      );

      const asking = sellable && star ? Math.round(star.value * (AI_FIRE_SALE_MIN + Math.random() * (AI_FIRE_SALE_MAX - AI_FIRE_SALE_MIN))) : 0;
      const deal = sellable && star && asking > 0 ? this.findFireSaleBuyer(team, star, asking) : null;

      if (deal && star) {
        // ── VENTA FORZOSA de la estrella ──
        const buyerTeam = deal.team;
        const fee = deal.fee;
        const idx = roster.findIndex(p => p.id === star.id);
        if (idx !== -1) roster.splice(idx, 1);
        star.teamId = buyerTeam.id;
        star.contractYears = 2 + Math.floor(Math.random() * 3);
        star.morale = Math.max(star.morale || 80, 88);
        star.appearances = 0;
        star.seasonGoals = 0;
        const buyerSquad = db.players[buyerTeam.id] || [];
        let insertIdx = buyerSquad.findIndex(p => p.overall < star.overall);
        if (insertIdx === -1) insertIdx = buyerSquad.length;
        buyerSquad.splice(insertIdx, 0, star);

        buyerTeam.budget = Math.max(0, (buyerTeam.budget || 0) - fee);
        team.budget = (team.budget || 0) + fee;
        const syncBudget = (tId: string): void => {
          const teamRef = db.teams[tId];
          const leagueRef = db.leagues.find(l => l.id === teamRef?.leagueId);
          const leagueTeam = leagueRef?.teams.find(t => t.id === tId);
          if (teamRef && leagueTeam) leagueTeam.budget = teamRef.budget;
        };
        syncBudget(team.id);
        syncBudget(buyerTeam.id);

        h.floorSeasons = 0; // el dinero de la venta le da aire
        h.lastStarSaleSeason = gs.season;
        starSales++;

        gs.feedItems!.unshift({
          id: `ai_firesale_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
          week: gs.week,
          season: gs.season,
          type: 'TRASPASO_IA',
          text: `🔥 VENTA FORZOSA: ${team.name} vende a su estrella ${star.name} (${star.pos}, OVR ${star.overall}) por €${(fee / 1000000).toFixed(0)}M para sanear sus cuentas.`,
          icon: '🔥',
          isRead: false,
          linkedPlayerId: star.id
        });
      } else {
        // ── INVERSOR: inyección de capital para reflotar el club ──
        const injection = Math.round(base * AI_INVESTOR_BOOST);
        team.budget = Math.min(base * AI_BUDGET_CAP, (team.budget || base) + injection);
        const league = db.leagues.find(l => l.id === team.leagueId);
        const leagueTeam = league?.teams.find(t => t.id === team.id);
        if (leagueTeam) leagueTeam.budget = team.budget;

        h.floorSeasons = 0;
        h.lastInvestorSeason = gs.season;
        investors++;

        gs.feedItems!.unshift({
          id: `ai_investor_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
          week: gs.week,
          season: gs.season,
          type: 'INVERSOR_IA',
          text: `💼 INVERSOR: un fondo de inversión inyecta €${(injection / 1000000).toFixed(0)}M en ${team.name} tras ${AI_FLOOR_SEASONS_TRIGGER}+ temporadas al borde de la quiebra.`,
          icon: '💼',
          isRead: false,
          linkedPlayerId: null
        });
      }
    }

    if (starSales + investors > 0) {
      gs.eventsLog.unshift({
        date: `Temporada ${gs.season}`,
        text: `🚨 CLUBES EN EL SUELO: ${starSales} vendieron a su estrella (venta forzosa) y ${investors} recibieron un inversor para reflotar.`
      });
    }

    // Mantener el mismo tope FIFO de 50 ítems que generateFeedItem (los
    // unshifts inline de esta sección no pasan por ese método).
    if (gs.feedItems.length > 50) gs.feedItems.length = 50;
  }

  /**
   * Busca un comprador IA para una venta forzosa (v3.4): un club rival (nunca
   * el vendedor ni el del DT) para el que la estrella sea una MEJORA o tape un
   * hueco en su grupo de posición, con plantilla con margen (<25) y que pueda
   * pagar al menos el 60% del precio pedido (venta desesperada). Prefiere
   * compradores de la misma liga (ventas domésticas típicas en apuros) y, en
   * igualdad, al más rico. Devuelve la cuota NEGOCIADA: el vendedor acepta lo
   * que el mejor postor puede pagar (hasta el 80% de su presupuesto, sin
   * superar el precio pedido). Si nadie puede pagar ni el 60%, no hay venta
   * (el club recibe un inversor en su lugar).
   */
  private static findFireSaleBuyer(sellerTeam: Team, star: Player, asking: number): { team: Team; fee: number } | null {
    const gs = db.gameState;
    if (!gs) return null;
    const group = aiGroupOf(star.pos);
    const candidates = Object.keys(db.teams)
      .filter(tId => tId !== sellerTeam.id && tId !== gs.userTeamId)
      .map(tId => db.teams[tId])
      .filter((t): t is Team => Boolean(
        t && Array.isArray(db.players[t.id]) && (db.players[t.id]!.length < 25) && (t.budget || 0) >= asking * AI_FIRE_SALE_MIN_AFFORD
      ))
      .filter(t => {
        const squad = db.players[t.id]!;
        const groupPlayers = squad.filter(p => aiGroupOf(p.pos) === group);
        const best = groupPlayers.reduce<Player | null>((acc, p) => (!acc || p.overall > acc.overall ? p : acc), null);
        return groupPlayers.length < AI_GROUP_MIN[group]! || (Boolean(best) && best!.overall < star.overall);
      })
      .sort((a, b) => {
        const sameLeagueA = a.leagueId === sellerTeam.leagueId ? 1 : 0;
        const sameLeagueB = b.leagueId === sellerTeam.leagueId ? 1 : 0;
        return (sameLeagueB - sameLeagueA) || ((b.budget || 0) - (a.budget || 0));
      });
    const buyer = candidates[0];
    if (!buyer) return null;
    const fee = Math.min(asking, Math.round((buyer.budget || 0) * AI_FIRE_SALE_MAX_BUDGET_SHARE));
    if (fee <= 0) return null;
    return { team: buyer, fee };
  }

  /**
   * Re-asegura el tope de temporada de los presupuestos IA (v3.3): los
   * traspasos —pagar cuotas como comprador o cobrar ventas como vendedor—
   * pueden empujar el presupuesto fuera de la banda [AI_BUDGET_FLOOR,
   * AI_BUDGET_CAP] anclada al presupuesto original del club. Se ejecuta al
   * final de cada ventana de fichajes para que la banda nunca se rompa.
   */
  static enforceAIBudgetLimits(): void {
    const gs = db.gameState;
    if (!gs) return;
    for (const tId in db.teams) {
      if (tId === gs.userTeamId) continue;
      const team = db.teams[tId];
      if (!team || !Array.isArray(db.players[tId])) continue;
      const base = team.baseBudget || team.budget || 10_000_000;
      const clamped = Math.round(Math.max(base * AI_BUDGET_FLOOR, Math.min(base * AI_BUDGET_CAP, team.budget || base)));
      if (clamped !== team.budget) {
        team.budget = clamped;
        const league = db.leagues.find(l => l.id === team.leagueId);
        const leagueTeam = league?.teams.find(t => t.id === tId);
        if (leagueTeam) leagueTeam.budget = clamped;
      }
    }
  }

  /**
   * v3.8 — Agentes libres: jugadores sin contrato que pueden ficharse sin
   * pagar traspaso, cualquier semana del año (el mercado de traspasos solo
   * abre en ventanas, pero los libres siempre están disponibles).
   */
  static getFreeAgents(filters: MarketFilters = {}): MarketPlayer[] {
    const pool = db.gameState?.freeAgents || [];
    const normalize = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const market: MarketPlayer[] = [];
    pool.forEach(p => {
      let match = true;
      if (filters.position && filters.position !== 'ALL' && p.pos !== filters.position) match = false;
      if (filters.minOvr && p.overall < filters.minOvr) match = false;
      if (filters.maxAge && p.age > filters.maxAge) match = false;
      if (filters.name && !normalize(p.name).includes(normalize(filters.name))) match = false;
      if (match) {
        market.push({ ...p, teamName: 'Agente Libre', isLocked: this.isPlayerLocked(p.id) });
      }
    });
    const sortBy: MarketSortBy = filters.sortBy || 'ovr';
    return market.sort((a, b) => {
      if (sortBy === 'value') return b.value - a.value;
      if (sortBy === 'age') return a.age - b.age;
      if (sortBy === 'salary') return b.salary - a.salary;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return b.overall - a.overall;
    });
  }

  /**
   * Obtiene los jugadores disponibles en el mercado
   */
  static getMarketPlayers(filters: MarketFilters = {}): MarketPlayer[] {
    const market: MarketPlayer[] = [];
    const userTeamId = db.gameState!.userTeamId;
    // Búsqueda por nombre sin sensibilidad a acentos (estilo FIFA): 'mbappe'
    // encuentra 'Kylian Mbappé', 'vini' encuentra 'Vinícius Júnior', etc.
    // Hoisteada fuera del bucle: evita recrear el closure por cada jugador.
    const normalize = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    for (const teamId in db.teams) {
      if (teamId === userTeamId) continue;
      if (filters.leagueId && db.teams[teamId]?.leagueId !== filters.leagueId) continue;
      const players = db.getTeamPlayers(teamId);
      players.forEach(p => {
        let match = true;
        if (filters.position && filters.position !== 'ALL' && p.pos !== filters.position) match = false;
        if (filters.maxPrice && p.value > filters.maxPrice) match = false;
        if (filters.minOvr && p.overall < filters.minOvr) match = false;
        if (filters.maxAge && p.age > filters.maxAge) match = false;
        if (filters.name && !normalize(p.name).includes(normalize(filters.name))) match = false;

        if (match) {
          market.push({
            ...p,
            teamName: db.teams[teamId]?.name || 'Club Libre',
            isLocked: this.isPlayerLocked(p.id)
          });
        }
      });
    }

    const sortBy: MarketSortBy = filters.sortBy || 'ovr';
    return market.sort((a, b) => {
      if (sortBy === 'value') return b.value - a.value;
      if (sortBy === 'age') return a.age - b.age;
      if (sortBy === 'salary') return b.salary - a.salary;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return b.overall - a.overall;
    });
  }

  /**
   * Evalúa la Oferta de Traspaso enviada al Club Vendedor (Paso 1)
   */
  static evaluateClubOffer(player: Player, fee: number, sellOnPct = 0): ActionResult {
    const gameState = db.gameState!;

    if (!isTransferWindowOpen(gameState.week)) {
      return { success: false, reason: 'El mercado de fichajes está cerrado.' };
    }

    if (this.isPlayerLocked(player.id)) {
      return { success: false, reason: 'Las negociaciones con este jugador o club se han roto en esta ventana.' };
    }

    if (fee > gameState.budget) {
      return { success: false, reason: 'Presupuesto de traspasos insuficiente.' };
    }

    // Ponderación de aceptación del club según valor de mercado y cláusulas
    const minAcceptableFee = player.value * 0.95;
    const bonusFromClause = (sellOnPct / 100) * player.value * 0.15;
    const totalEffectiveOffer = fee + bonusFromClause;

    if (totalEffectiveOffer >= minAcceptableFee) {
      return {
        success: true,
        message: `¡ACUERDO CON EL CLUB! ${db.teams[player.teamId]?.name || 'El club'} ha aceptado la oferta de €${(fee / 1000000).toFixed(1)}M. Procediendo a acordar condiciones con el jugador.`
      };
    } else {
      // Romper negociación para esta ventana estilo EA FC
      this.lockPlayerForCurrentWindow(player.id);
      return {
        success: false,
        breakNegotiation: true,
        reason: `🔒 NEGOCIACIÓN ROTA: El club consideró la oferta insultante (€${(fee / 1000000).toFixed(1)}M vs €${(player.value / 1000000).toFixed(1)}M valor de mercado). Se han cerrado las conversaciones hasta la próxima ventana de fichajes.`
      };
    }
  }

  /**
   * Evalúa el Contrato del Jugador y Representante (Paso 2)
   */
  static evaluateContractOffer(player: Player, transferFee: number, role: SquadRole, contractYears: number, wage: number, signingBonus = 0): ActionResult {
    const gameState = db.gameState!;

    if (wage > gameState.wageBudget) {
      return { success: false, reason: 'Presupuesto salarial insuficiente.' };
    }

    // Expectativas del jugador
    const expectedWage = Math.round(player.salary * (player.overall >= 82 ? 1.25 : 1.10));
    let score = 50;

    // Rol en plantilla
    if (role === 'Crucial' && player.overall >= 80) score += 20;
    else if (role === 'Titular Habitual') score += 15;
    else if (role === 'Rotación' && player.overall < 78) score += 10;
    else if (role === 'Prospecto' && player.age <= 20) score += 15;

    // Salario
    if (wage >= expectedWage) score += 30;
    else if (wage >= expectedWage * 0.85) score += 15;
    else score -= 25;

    // Prima de fichaje
    if (signingBonus >= player.value * 0.05) score += 15;

    if (score >= 60) {
      // ¡Fichaje Exitoso!
      gameState.budget -= transferFee;
      gameState.wageBudget -= wage;

      // v3.8: agente libre (teamId === '') → no hay club vendedor ni fee que
      // pagar; solo se quita del pool. Si tiene club, se le saca de su plantilla.
      if (player.teamId) {
        const sellerPlayers = db.getTeamPlayers(player.teamId);
        const idx = sellerPlayers.findIndex(p => p.id === player.id);
        if (idx !== -1) sellerPlayers.splice(idx, 1);
      } else if (gameState.freeAgents) {
        const faIdx = gameState.freeAgents.findIndex(p => p.id === player.id);
        if (faIdx !== -1) gameState.freeAgents.splice(faIdx, 1);
      }

      player.teamId = gameState.userTeamId;
      player.salary = wage;
      player.contractYears = contractYears;
      player.squadRole = role;

      db.getTeamPlayers(gameState.userTeamId).push(player);

      gameState.eventsLog.unshift({
        date: `Semana ${gameState.week}`,
        text: `📝 FICHAJE OFICIAL: ${player.name} se une al equipo firmando por ${contractYears} años con salario de €${(wage / 1000).toFixed(0)}K/sem.${transferFee > 0 ? '' : ' (Agente libre: sin coste de traspaso)'}`
      });

      db.saveGame();

      return {
        success: true,
        message: `¡FICHAJE COMPLETADO! ${player.name} estampó su firma en el contrato por ${contractYears} temporadas.`
      };
    } else {
      // Romper negociación estilo EA FC
      this.lockPlayerForCurrentWindow(player.id);
      return {
        success: false,
        breakNegotiation: true,
        reason: `🔒 NEGOCIACIÓN ROTA: El representante y el jugador rechazaron las condiciones de rol (${role}) o salario (€${(wage / 1000).toFixed(0)}K vs €${(expectedWage / 1000).toFixed(0)}K exigidos). No aceptarán más ofertas en esta ventana.`
      };
    }
  }
}
