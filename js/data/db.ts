/**
 * ============================================================================
 * ENTRENADOR LEYENDA - GESTOR BASE DE DATOS Y ESTADO GLOBAL (db.js)
 * ============================================================================
 * Este módulo es el NÚCLEO Y FUENTE ÚNICA DE VERDAD (Single Source of Truth) del juego.
 * Administra:
 * 1. Carga inicial de ligas y equipos desde ./assets/data/leagues.json.
 * 2. Generación y almacenamiento de futbolistas por equipo (teamData.ts).
 * 3. Estado completo de la partida activa (`this.gameState`).
 * 4. Persistencia automática en `localStorage` (clave: `entrenador_leyenda_save`).
 * 5. Avance y envejecimiento de temporada (`processSeasonPlayerEvolution`).
 * 6. Historial de carrera multi-club durante las 25 temporadas máximas de juego.
 *
 * VERSIÓN 2.0 — Añade: Manager Market IA, The Feed, Team Spirit, FC IQ Roles,
 * Presupuesto Dual, Seguimiento Multiliga, Histórico por Jugador, Regens, Eventos Avanzados.
 *
 * Migrado a TypeScript (Fase 1): `gameState` cumple la interfaz GameState de
 * js/types.ts; las migraciones de saves antiguos quedan validadas por tipos.
 */

import { generateTeamPlayers, calculatePositionOvr, calculatePlayerMarketValue, calculatePlayerSalary, generateRegenPlayer, generateYouthProspect, loadRealPlayers, getRealPlayers } from './teamData.js';
import { TransferEngine } from '../engine/transfers.js';
import { ContractEngine } from '../engine/contracts.js';
import { ManagerMarketEngine } from '../engine/managerMarketEngine.js';
import { TacticsEngine } from '../engine/tactics.js';
import { TeamSpiritEngine } from '../engine/teamSpirit.js';

import type { AIClubHealth, CompactPlayer, CompactStatsHistory, EvolutionReportEntry, FormationId, GameState, League, ManagerArchetype, NewCareerOptions, Player, RetiredLegend, SaveData, Standing, StatsHistoryEntry } from '../types.js';

// ── v3.5: TOPES DE RETENCIÓN DEL SAVE ──────────────────────────────────────
// El save crecía sin límite (histórico por jugador, log de eventos y registro
// de leyendas), inflando la serialización en carreras largas: con ~11.000
// jugadores, cada temporada añade ~0,7MB de statsHistory y el JSON de 24
// temporadas superaba los 20MB, haciendo inviable auditar el juego completo.
// Estos topes acotan el estado persistido: el histórico de jugadores se
// recorta en su origen (processSeasonPlayerEvolution) y el resto en saveGame,
// el punto único por el que pasa todo guardado.
/** Máx. de temporadas de histórico retenidas por jugador (tabla del inspector) */
const MAX_STATS_HISTORY = 10;
/** Máx. de entradas del log de eventos (FIFO, se conservan las más recientes) */
const MAX_EVENTS_LOG = 300;
/** Máx. de leyendas retiradas en el registro (solo alimentan regens de la temporada) */
const MAX_RETIRED_LEGENDS = 300;
/** Máx. de ítems de The Feed (mismo tope que EventsEngine.generateFeedItem) */
const MAX_FEED_ITEMS = 50;
/** Tope de agentes libres en el mercado (v3.8): se recorta en saveGame.
 * 200 era insuficiente (el exceso se DESCARTABA) y el recorte global por OVR
 * dejaba al pool sin porteros ni laterales. El tope debe absorber una
 * temporada entera de expiraciones del universo completo (~450+): con 1200
 * se descartaban ~170/temporada. 1800 (150 por posición) cubre el pico. */
const MAX_FREE_AGENTS = 1800;
/** Posiciones para el recorte balanceado del pool de agentes libres */
const FREE_AGENT_POSITIONS = ['POR', 'DFC', 'LI', 'LD', 'MCD', 'MC', 'MCO', 'MI', 'MD', 'EI', 'ED', 'DC'] as const;

// ── v3.7: CLAVES Y CHECKSUM DEL SAVE ───────────────────────────────────────
// El save principal vive en SAVE_KEY con su checksum FNV-1a en una clave
// paralela (SAVE_CHECK_KEY). Antes de cada sobrescritura, el save vigente se
// promueve al slot de autoguardado (SAVE_BACKUP_KEY + su checksum) si es
// válido, de modo que un save corrupto o truncado siempre pueda recuperarse.
const SAVE_KEY = 'entrenador_leyenda_save';
const SAVE_CHECK_KEY = 'entrenador_leyenda_save_checksum';
const SAVE_BACKUP_KEY = 'entrenador_leyenda_save_backup';
const SAVE_BACKUP_CHECK_KEY = 'entrenador_leyenda_save_backup_checksum';

/**
 * Hash FNV-1a de 32 bits (en base 36) sin dependencias: detecta JSON
 * truncado, escrituras parciales o ediciones externas. No es criptográfico,
 * pero es rápido (~40ms para 6MB) y suficiente para la integridad del save.
 */
function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

class DatabaseManager {
  /** Lista de ligas cargadas */
  leagues: League[];

  /** Diccionario de equipos por ID */
  teams: Record<string, import('../types.js').Team>;

  /** Diccionario de plantillas por ID de equipo */
  players: Record<string, Player[]>;

  /** Objeto con el estado global de la partida del usuario */
  gameState: GameState | null;

  /** Flag de carga completada */
  isLoaded: boolean;

  /** Flag para prevenir guardados concurrentes */
  isSaving: boolean;

  /**
   * Salud económica de los clubes IA (v3.4): temporadas consecutivas en el
   * suelo y en crisis, para las consecuencias duras (venta de estrella,
   * inversor y crisis en The Feed). Se persiste en SaveData.aiClubHealth.
   */
  aiClubHealth: Record<string, AIClubHealth>;

  constructor() {
    this.leagues = [];
    this.teams = {};
    this.players = {};
    this.gameState = null;
    this.isLoaded = false;
    this.isSaving = false;
    this.aiClubHealth = {};
  }

  /**
   * Carga asíncrona de las ligas desde el archivo JSON local.
   */
  async init(): Promise<void> {
    if (this.isLoaded) return;
    try {
      const response = await fetch('./assets/data/leagues.json');
      this.leagues = await response.json() as League[];

      // Cargar la base de jugadores reales (assets/data/real_players.json) ANTES
      // de la primera generación de plantillas: generateTeamPlayers la consulta
      // de forma síncrona vía getRealPlayers() (con caché en memoria).
      await loadRealPlayers();

      this.leagues.forEach(league => {
        league.teams.forEach(team => {
          this.teams[team.id] = {
            ...team,
            leagueId: league.id,
            country: league.country,
            region: league.region,
            // Ancla del tope económico IA: el presupuesto original del club
            // (el que trae leagues.json) es la referencia inmutable sobre la
            // que processAISeasonFinances acota los ingresos por resultados.
            baseBudget: team.budget
          };
        });
      });

      this.isLoaded = true;
    } catch (e) {
      console.error('Error cargando base de datos de ligas:', e);
    }
  }

  /**
   * Obtiene o genera la plantilla completa de futbolistas para un equipo dado.
   * Limita la media inicial máxima a 91 OVR (estándar EA FC / FIFA).
   * @param teamId - ID del equipo
   * @returns Lista de jugadores del equipo
   */
  getTeamPlayers(teamId: string): Player[] {
    if (!this.players[teamId]) {
      const team = this.teams[teamId];
      if (team) {
        this.players[teamId] = generateTeamPlayers(team);
      } else {
        this.players[teamId] = [];
      }
    }

    const roster = this.players[teamId]!;
    roster.forEach(p => {
      if (p.overall > 91) {
        p.overall = 91;
      }
      const expectedValue = calculatePlayerMarketValue(p.overall, p.age, p.potential || p.overall);
      // Revalorar hacia ARRIBA cuando un jugador 80+ vale menos del 40% de su
      // valor esperado, y hacia ABAJO cuando su valor quedó estancado por encima
      // del 150% (veteranos que conservan valores de pico y salarios disparados).
      if (!p.value || p.value > expectedValue * 1.5 || (p.overall >= 80 && p.value < expectedValue * 0.4)) {
        p.value = expectedValue;
        p.salary = calculatePlayerSalary(p.value, p.overall);
      }
    });

    return roster;
  }

  /**
   * Busca un jugador por su ID único en todas las plantillas cargadas.
   * @param playerId - ID del jugador
   */
  getPlayerById(playerId: string): Player | null {
    for (const teamId in this.players) {
      const roster = this.players[teamId];
      if (!roster) continue;
      const p = roster.find(player => player.id === playerId);
      if (p) return p;
    }
    // v3.8: los agentes libres no están en ninguna plantilla, pero el
    // inspector y el wizard de fichaje deben poder resolverlos por ID.
    if (this.gameState?.freeAgents) {
      const fa = this.gameState.freeAgents.find(player => player.id === playerId);
      if (fa) return fa;
    }
    return null;
  }

  /**
   * Inicializa un nuevo estado de carrera de 25 temporadas para el DT.
   * @param userTeamId - ID del equipo seleccionado
   * @param managerName - Nombre del entrenador
   * @param managerCountry - Nacionalidad del entrenador
   * @param managerAge - Edad actual del entrenador (30 a 65)
   * @param managerArchetype - Arquetipo táctico elegido
   * @param options - Opciones configurables (mercado DT, regens, frecuencia de eventos)
   * @returns Estado inicial creado
   */
  newCareer(
    userTeamId: string,
    managerName = 'Director Técnico',
    managerCountry = 'Argentina',
    managerAge = 35,
    managerArchetype: ManagerArchetype = 'GUARDIOLA',
    options: NewCareerOptions = {}
  ): GameState | null {
    const userTeam = this.teams[userTeamId];
    if (!userTeam) return null;

    const userLeague = this.leagues.find(l => l.id === userTeam.leagueId) || this.leagues[0];
    if (userLeague && userLeague.teams) {
      userLeague.teams.forEach(t => this.getTeamPlayers(t.id));
    }

    const leagueStandings: Standing[] = (userLeague && userLeague.teams) ? userLeague.teams.map(t => ({
      teamId: t.id,
      name: t.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0
    })) : [];

    const numTeams = (userLeague && userLeague.teams) ? userLeague.teams.length : 20;
    const computedMaxWeeks = (numTeams - 1) * 2;

    this.gameState = {
      // ── Identidad del DT ──────────────────────────────────────────────────
      managerName: managerName,
      managerCountry: managerCountry,
      managerAge: managerAge || 35,
      managerArchetype: managerArchetype,
      clubPhilosophy: userTeam.philosophy || managerArchetype, // filosofía exigida por el club
      tacticalFidelityWeeks: 0, // semanas consecutivas con estilo correcto

      // ── Equipo y liga ─────────────────────────────────────────────────────
      userTeamId: userTeamId,
      userLeagueId: userTeam.leagueId || '',

      // ── Presupuesto dual ─────────────────────────────────────────────────
      budget: userTeam.budget,
      wageBudget: userTeam.wageBudget || Math.round((userTeam.budget || 0) * 0.3),
      transferBudgetLocked: false,   // true cuando hay crisis financiera activa
      lockedBudgetAmount: 0,         // monto congelado en crisis

      // ── Reputación y puntuación ───────────────────────────────────────────
      reputation: userTeam.reputation,
      managerScore: 500,

      // ── Tiempo ───────────────────────────────────────────────────────────
      season: 2026,
      week: 1,
      maxWeeks: computedMaxWeeks,
      isCareerFinished: false,

      // ── Fichajes ─────────────────────────────────────────────────────────
      failedTransferPlayers: [],

      // ── Competiciones ────────────────────────────────────────────────────
      standings: leagueStandings,
      topScorers: [],
      trophies: [],

      // ── Tácticas ─────────────────────────────────────────────────────────
      tactics: {
        formation: '4-3-3',
        mentality: 'Ofensiva',
        style: managerArchetype === 'GUARDIOLA' ? 'Tiki-Taka' : (managerArchetype === 'XABI_ALONSO' ? 'Contraataque' : 'Presión Alta'),
        defensiveLine: 'Alta',
        passingStyle: 'Corto'
      },
      managerTactics: {
        archetype: managerArchetype,
        exp: 500,
        skillLevels: { skill1: 1, skill2: 1 }
      },
      matchBonus: {
        moraleBonus: 0,
        tacticalBonus: 0,
        penaltyBonus: 0
      },

      // ── Team Spirit ──────────────────────────────────────────────────────
      teamSpirit: 50,  // 0-100, afecta el OVR efectivo en simulación

      // ── Ojeadores ────────────────────────────────────────────────────────
      scoutLevel: 1,
      youthAcademy: [],

      // ── Mercado de Entrenadores IA ────────────────────────────────────────
      managerMarket: {
        aiManagers: {},     // { teamId: { name, archetype, reputation, isInterim, weeksInCharge } }
        lastRotationWeek: 0
      },
      enableManagerMarket: options.enableManagerMarket !== false, // activo por defecto

      // ── The Feed (red social de noticias) ────────────────────────────────
      feedItems: [],  // [{ id, week, season, type, text, icon, isRead, linkedPlayerId? }]

      // ── Seguimiento Multiliga ─────────────────────────────────────────────
      watchedLeagues: [],      // hasta 5 IDs de liga
      externalStandings: {},   // { leagueId: { standings: [], topScorers: [] } }

      // ── Regens ───────────────────────────────────────────────────────────
      retiredLegends: [],       // [{ name, pos, originalOvr, potential, teamId }]
      enableRegens: options.enableRegens !== false, // activo por defecto

      // ── Agentes libres (v3.8) ─────────────────────────────────────────────
      freeAgents: [],            // jugadores sin contrato tras expirar su vínculo
      freeAgencyGrace: false,    // solo partidas migradas reciben el año de gracia

      // ── Configuración de eventos ──────────────────────────────────────────
      eventFrequency: options.eventFrequency || 'normal', // 'off'|'baja'|'normal'|'alta'

      // ── Log de eventos y finanzas ─────────────────────────────────────────
      eventsLog: [
        { date: '01/08/2026', text: `¡Bienvenido a ${userTeam.name}! El consejo directivo espera luchar por los primeros puestos esta temporada.` }
      ],
      finances: {
        ticketRevenue: 0,
        weeklyWageTotal: 0,
        playerSales: 0,
        playerPurchases: 0,
        leaguePrize: 0,
        balance: 0,
        budgetAtSeasonStart: userTeam.budget
      },

      // ── Historial de carrera ──────────────────────────────────────────────
      careerHistory: [],
      winStreak: 0,
      currentStreak: 0,
      bestWinStreak: 0,
      classicWins: 0,
      seasonPlayersIn: [],
      seasonPlayersOut: [],
      cupPhaseReached: 'Fase de Grupos'
    };

    if (this.gameState.enableManagerMarket) {
      ManagerMarketEngine.initAIManagers();
    }

    // XI real unificado: la plantilla generada viene por grupos de posición
    // (POR, POR, DFC...) — se reordena una vez para que el top 11 sea el XI.
    this.healUserTeamXI();

    this.saveGame();
    return this.gameState;
  }

  /**
   * Procesa la transición de fin de temporada:
   * 1. Aumenta +1 año de edad a todos los jugadores y reduce -1 año de sus contratos.
   * 2. Evoluciona o degrada medias según la edad.
   * 3. Registra el resumen en `careerHistory[]` para el palmarés multi-club.
   * 4. Reinicia tabla de posiciones, goles y contadores de la liga.
   * 5. Incrementa el año de la temporada (`season++`).
   */
  processSeasonPlayerEvolution(): void {
    if (!this.gameState) return;

    // Verificar si se alcanzaron las 25 temporadas (2026 - 2050)
    if (this.gameState.season >= 2050) {
      this.gameState.isCareerFinished = true;
      this.gameState.eventsLog.unshift({
        date: `Año 2051`,
        text: `🏆 ¡CARRERA FINALIZADA! Has completado tu trayectoria profesional de 25 años como Director Técnico.`
      });
      this.saveGame();
      return;
    }

    const userTeamEvolutionReport: EvolutionReportEntry[] = [];
    const userTeamId = this.gameState.userTeamId;

    // Leyendas registradas ANTES de esta evolución (para detectar las nuevas)
    const retiredCountBefore = (this.gameState.retiredLegends || []).length;

    // 1. EVOLUCIÓN, ENVEJECIMIENTO (+1 AÑO) Y DECREMENTO DE CONTRATOS (-1 AÑO) EN TODOS LOS EQUIPOS
    for (const tId in this.players) {
      const roster = this.players[tId];
      if (!Array.isArray(roster) || roster.length === 0) continue;

        // Jugadores cuyo contrato YA estaba vencido al inicio de la evolución
        // (tuvieron una temporada completa para renovar; salen libres).
        const expiredIds = new Set<string>();
        roster.forEach(p => {
          const appearances = p.appearances || 0;
          const oldOvr = p.overall || 70;
          let deltaOvr = 0;

          if (p.age < 23) {
            if (appearances >= 12) deltaOvr = 3 + Math.floor(Math.random() * 3);
            else deltaOvr = 1 + Math.floor(Math.random() * 2);
          } else if (p.age >= 23 && p.age <= 28) {
            if (appearances >= 15 && p.overall < (p.potential || 90)) deltaOvr = 1 + Math.floor(Math.random() * 2);
            else deltaOvr = Math.random() < 0.4 ? 1 : 0;
          } else if (p.age >= 29 && p.age <= 32) {
            deltaOvr = -1;
          } else if (p.age >= 33) {
            deltaOvr = - (2 + Math.floor(Math.random() * 3));
          }

          // Aplicar incremento/decremento a los atributos individuales según la posición
          if (deltaOvr > 0) {
            const boost = deltaOvr;
            if (['EI', 'ED', 'DC'].includes(p.pos)) {
              p.pac = Math.min(99, (p.pac || 70) + Math.ceil(boost * 0.8));
              p.sho = Math.min(99, (p.sho || 70) + Math.ceil(boost * 0.9));
              p.dri = Math.min(99, (p.dri || 70) + Math.ceil(boost * 0.7));
            } else if (['MCO', 'MC', 'MI', 'MD'].includes(p.pos)) {
              p.pas = Math.min(99, (p.pas || 70) + Math.ceil(boost * 0.9));
              p.dri = Math.min(99, (p.dri || 70) + Math.ceil(boost * 0.8));
              p.sho = Math.min(99, (p.sho || 70) + Math.ceil(boost * 0.6));
            } else if (['DFC', 'MCD', 'LI', 'LD'].includes(p.pos)) {
              p.def = Math.min(99, (p.def || 70) + Math.ceil(boost * 0.9));
              p.phy = Math.min(99, (p.phy || 70) + Math.ceil(boost * 0.8));
              p.pac = Math.min(99, (p.pac || 70) + Math.ceil(boost * 0.5));
            } else {
              p.def = Math.min(99, (p.def || 70) + Math.ceil(boost * 0.9));
              p.phy = Math.min(99, (p.phy || 70) + Math.ceil(boost * 0.9));
            }
          } else if (deltaOvr < 0) {
            const drop = Math.abs(deltaOvr);
            p.pac = Math.max(35, (p.pac || 70) - Math.ceil(drop * 1.2));
            p.phy = Math.max(35, (p.phy || 70) - Math.ceil(drop * 1.0));
            p.sho = Math.max(35, (p.sho || 70) - Math.ceil(drop * 0.5));
            p.dri = Math.max(35, (p.dri || 70) - Math.ceil(drop * 0.5));
          }

          // Recalcular media general (OVR)
          p.overall = calculatePositionOvr(p.pos, p.pac, p.sho, p.pas, p.dri, p.def, p.phy);
          const newOvr = p.overall;
          const actualDelta = newOvr - oldOvr;

          if (tId === userTeamId) {
            userTeamEvolutionReport.push({
              name: p.name,
              pos: p.pos,
              age: p.age + 1,
              oldOvr: oldOvr,
              newOvr: newOvr,
              delta: actualDelta
            });
          }

          p.age++;
          const currentContract = p.contractYears !== undefined ? p.contractYears : 3;

          // v3.8 — RENOVACIÓN IA: los clubes rivales renuevan a sus jugadores
          // con 1 año restante (los que expiran al cierre de ESTA temporada).
          // Un jugador en su último año aún tiene margen para acordar antes de
          // quedar libre; la probabilidad cae con la edad y con la brecha entre
          // su nivel y el del club.
          if (tId !== userTeamId && currentContract === 1) {
            const clubLevel = this.teams[tId]?.overall || 70;
            // v3.8.1: renovación generosa — en FM los clubes renuevan a sus
            // jugadores de 30-34 (solo los 35+ o los muy por debajo del nivel
            // del club quedan libres). Con curvas duras expiraban ~1.100/
            // temporada y el mercado de libres no podía absorberlos (drenaje
            // del universo completo). Piso 0.25: hasta un veterano tiene
            // margen de quedarse.
            let renewChance = 0.94;
            if (p.age > 30) renewChance -= 0.05 * (p.age - 30);
            if (p.age > 35) renewChance -= 0.15;
            if (p.overall < clubLevel - 8) renewChance -= 0.2;
            renewChance = Math.max(0.25, Math.min(0.97, renewChance));
            if (Math.random() < renewChance) {
              p.contractYears = 2 + Math.floor(Math.random() * 3); // 2-4 años
              p.salary = Math.round(p.salary * (1.04 + Math.random() * 0.08));
            }
          }
          // wasExpired: el contrato YA estaba en 0 al inicio de esta evolución
          // (el DT recibió la alerta la temporada pasada). Estos salen libres.
          const wasExpired = currentContract === 0;
          if (wasExpired) {
            if (this.gameState!.freeAgencyGrace) {
              // Migración v3.8 (año de gracia): renueva el vínculo vencido un
              // año más para que las partidas antiguas no pierdan plantillas
              // enteras de golpe al activar el nuevo mecanismo.
              p.contractYears = 2;
            } else {
              expiredIds.add(p.id);
            }
          }
          // IMPORTANTE (bug v3.8.1): el decremento usa el valor ACTUAL de
          // contractYears, no currentContract — si la renovación (o la gracia)
          // acaba de re-fijar el contrato a 2-4 años, el -1 debe aplicarse
          // sobre ese nuevo valor. Antes se sobrescribía con (currentContract-1)
          // y anulaba la renovación: todo jugador en su último año terminaba en
          // 0 y el universo entero expiraba en ~4 temporadas.
          p.contractYears = Math.max(0, p.contractYears - 1);

          // ── Snapshot de estadísticas históricas (Fase 5B) ────────────────
          if (!Array.isArray(p.statsHistory)) p.statsHistory = [];
          p.statsHistory.push({
            season: this.gameState!.season,
            goals: p.seasonGoals || 0,
            appearances: p.appearances || 0,
            ratingAvg: p.ratingAvg || 0,
            ovr: p.overall
          });
          // v3.5: acotar el histórico en su ORIGEN — es el mayor contribuyente
          // del peso del save (~11.000 jugadores × entradas de temporada).
          // 10 temporadas bastan para la tabla del inspector y el save queda
          // acotado (crecía ~0,7MB por temporada sin este tope).
          if (p.statsHistory.length > MAX_STATS_HISTORY) {
            p.statsHistory = p.statsHistory.slice(-MAX_STATS_HISTORY);
          }

          p.appearances = 0;
          p.seasonGoals = 0;
          p.ratingAvg = 0;

          // ── Detección de leyendas retiradas para sistema de Regens (Fase 6A) ──
          if (p.age > 38 && this.gameState!.enableRegens) {
            if (!this.gameState!.retiredLegends) this.gameState!.retiredLegends = [];
            // Dedup por nombre + equipo (los nombres generados se repiten entre plantillas)
            const alreadyRetired = this.gameState!.retiredLegends.some(r => r.name === p.name && r.originTeamId === p.teamId);
            if (!alreadyRetired && p.overall >= 75) {
              this.gameState!.retiredLegends.push({
                name: p.name,
                pos: p.pos,
                originalOvr: p.overall,
                potential: Math.round(p.overall * 0.8),
                originTeamId: p.teamId
              });
            }
          }

          if (p.contractYears === 0 && tId === userTeamId) {
            this.gameState!.eventsLog.unshift({
              date: `Temporada ${this.gameState!.season + 1}`,
              text: `⚠️ ALERTA DE CONTRATO: El contrato de ${p.name} ha vencido (0 años restantes). ¡Renueva su vínculo en el Inspector de Jugador!`
            });
          }
        });

        // ── AGENTES LIBRES (v3.8) ────────────────────────────────────────────
        // Los jugadores con contrato ya vencido (0 años al inicio de esta
        // evolución) tuvieron una temporada completa para renovar. Si no lo
        // hicieron, quedan libres y abandonan la plantilla. Los que se retiran
        // este año no cuentan (cuelgan los botines, no van al mercado).
        const retiring = roster.filter(p => p.age >= 39);
        const expiredToFree = roster.filter(p => !retiring.includes(p) && expiredIds.has(p.id));
        if (expiredToFree.length > 0) {
          if (!this.gameState!.freeAgents) this.gameState!.freeAgents = [];
          expiredToFree.forEach(p => {
            const idx = roster.indexOf(p);
            if (idx !== -1) roster.splice(idx, 1);
            p.teamId = '';
            p.morale = Math.max(p.morale || 80, 85);
            this.gameState!.freeAgents.push(p);
          });
          const topFree = [...expiredToFree].sort((a, b) => b.overall - a.overall)[0];
          if (tId === userTeamId) {
            this.gameState!.eventsLog.unshift({
              date: `Temporada ${this.gameState!.season + 1}`,
              text: `🕊️ AGENTES LIBRES: ${expiredToFree.map(p => p.name).join(', ')} dejaron el club al expirar su contrato sin renovar. Búscalos en el mercado (sin traspaso).`
            });
          } else if (topFree && topFree.overall >= 78) {
            // Noticia en The Feed solo para estrellas que quedan libres
            if (!Array.isArray(this.gameState!.feedItems)) this.gameState!.feedItems = [];
            this.gameState!.feedItems.unshift({
              id: `free_agent_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
              week: this.gameState!.week,
              season: this.gameState!.season,
              type: 'AGENTE_LIBRE',
              text: `🕊️ ${topFree.name} (${topFree.pos}, OVR ${topFree.overall}) quedó como agente libre al expirar su contrato con ${this.teams[tId]?.name || 'su club'}.`,
              icon: '🕊️',
              isRead: false,
              linkedPlayerId: topFree.id
            });
            if (this.gameState!.feedItems.length > MAX_FEED_ITEMS) {
              this.gameState!.feedItems = this.gameState!.feedItems.slice(0, MAX_FEED_ITEMS);
            }
          }
          // Tope del pool: recorte BALANCEADO por posición (el global por OVR
          // dejaba sin porteros/laterales al pool y los equipos no podían
          // reponerlos). El mercado no debe hinchar el save sin límite.
          this.trimFreeAgents();
        }

        // ── JUBILACIONES Y REGENS (Fase 6A completa) ──────────────────────────
        // Los jugadores de 39+ años (edad post-incremento, la misma que usa el
        // registro de leyendas) cuelgan los botines y abandonan la plantilla.
        if (retiring.length > 0) {
          retiring.forEach(p => {
            const idx = roster.indexOf(p);
            if (idx !== -1) roster.splice(idx, 1);
          });

          // 1 regen por cada leyenda retirada del club ESTA temporada + un
          // prospecto genérico por cada retiro sin estatus de leyenda.
          const newTeamLegends = (this.gameState!.retiredLegends || [])
            .slice(retiredCountBefore)
            .filter((l): l is RetiredLegend => l.originTeamId === tId);
          newTeamLegends.forEach((legend, i) => roster.push(generateRegenPlayer(legend, tId, i)));
          for (let i = newTeamLegends.length; i < retiring.length; i++) {
            roster.push(generateYouthProspect(tId, i));
          }

          if (tId === userTeamId) {
            this.gameState!.eventsLog.unshift({
              date: `Temporada ${this.gameState!.season + 1}`,
              text: `👋 JUBILACIONES: ${retiring.map(p => p.name).join(', ')} cuelgan los botines. ${newTeamLegends.length > 0 ? `Nacen ${newTeamLegends.length} regen(s) del vivero de leyendas.` : 'La cantera repone efectivos.'}`
            });
          }
        }
    }

    // v3.8 — REFILL DE PLANTILLAS CORTAS: los clubes IA que quedaron por
    // debajo de 16 efectivos (por expiración de contratos y retiros) reponen
    // con agentes libres. Sin esto quedarían fuera del mercado de traspasos.
    TransferEngine.refillAISquads();
    // v3.8.1 — JUBILACIÓN DE AGENTES LIBRES: los veteranos de 35+ sin club
    // cuelgan los botines (en el fútbol real, un jugador libre de 35 años se
    // retira en vez de saturar el mercado). Evita que el pool se llene de
    // veteranos que ningún club ficha por su OVR en declive.
    if (this.gameState.freeAgents && this.gameState.freeAgents.length > 0) {
      const retiringFAs = this.gameState.freeAgents.filter(p => p.age >= 35);
      if (retiringFAs.length > 0) {
        const retiredNames = new Set(retiringFAs.map(p => p.id));
        this.gameState.freeAgents = this.gameState.freeAgents.filter(p => !retiredNames.has(p.id));
      }
    }
    // El año de gracia de migración solo aplica a la primera evolución.
    this.gameState.freeAgencyGrace = false;

    // Aumentar edad de canteranos en la academia
    if (this.gameState.youthAcademy) {
      this.gameState.youthAcademy.forEach(y => y.age++);
    }
    this.gameState.lastSeasonEvolutionReport = userTeamEvolutionReport;

    // 2. REINICIAR TABLA DE POSICIONES
    if (this.gameState.standings) {
      this.gameState.standings.forEach(s => {
        s.played = 0;
        s.won = 0;
        s.drawn = 0;
        s.lost = 0;
        s.gf = 0;
        s.ga = 0;
        s.gd = 0;
        s.points = 0;
      });
    }

    // 3. REINICIAR TABLA DE GOLEADORES Y BLOQUEOS DE FICHAJES
    this.gameState.topScorers = [];
    this.gameState.youthTournamentPlayed = false;
    this.gameState.seasonEventsCount = 0;
    TransferEngine.resetWindowLocks();

    // 4. PROCESAR VÍNCULO CONTRACTUAL DEL DT (-1 AÑO)
    ContractEngine.processContractYearEnd();

    // 5. GUARDAR HISTORIAL DE TEMPORADA EN careerHistory[]
    const userTeamForHistory = this.teams[this.gameState.userTeamId];
    const userStandingForHistory = this.gameState.standings ? this.gameState.standings.find(s => s.teamId === userTeamId) : null;
    const championStanding = this.gameState.standings[0];
    const squadForHistory = this.players[this.gameState.userTeamId] || [];
    const topScorerHistory = [...squadForHistory].sort((a, b) => (b.seasonGoals || 0) - (a.seasonGoals || 0))[0];

    this.gameState.careerHistory.push({
      season: this.gameState.season,
      club: userTeamForHistory ? userTeamForHistory.name : 'Desconocido',
      leagueRank: userStandingForHistory ? (this.gameState.standings.indexOf(userStandingForHistory) + 1) : 0,
      isTitleWon: Boolean(userStandingForHistory && championStanding && championStanding.teamId === this.gameState.userTeamId),
      mvpPlayer: topScorerHistory ? `${topScorerHistory.name} (${topScorerHistory.seasonGoals || 0} goles)` : 'N/A',
      budgetStart: this.gameState.finances ? this.gameState.finances.budgetAtSeasonStart || this.gameState.budget : this.gameState.budget,
      budgetEnd: this.gameState.budget,
      playersIn: this.gameState.seasonPlayersIn ? [...this.gameState.seasonPlayersIn] : [],
      playersOut: this.gameState.seasonPlayersOut ? [...this.gameState.seasonPlayersOut] : [],
      winStreak: this.gameState.bestWinStreak || 0,
      classicWins: this.gameState.classicWins || 0,
      cupPhase: this.gameState.cupPhaseReached || 'No clasificado'
    });

    // 6. REINICIAR CONTADORES FINANCIEROS Y ESTADÍSTICOS DE LA TEMPORADA
    if (this.gameState.finances) {
      this.gameState.finances.budgetAtSeasonStart = this.gameState.budget;
      this.gameState.finances.ticketRevenue = 0;
      this.gameState.finances.weeklyWageTotal = 0;
      this.gameState.finances.playerSales = 0;
      this.gameState.finances.playerPurchases = 0;
      this.gameState.finances.leaguePrize = 0;
    }
    this.gameState.bestWinStreak = 0;
    this.gameState.currentStreak = 0;
    this.gameState.classicWins = 0;
    this.gameState.seasonPlayersIn = [];
    this.gameState.seasonPlayersOut = [];
    this.gameState.cupPhaseReached = 'Fase de Grupos';

    // Reset de los bonus de partido acumulados por eventos de la temporada
    // (sin esto, moraleBonus/tacticalBonus crecen sin tope a lo largo de la
    // carrera y el equipo del DT se vuelve imbatible frente a la IA).
    if (this.gameState.matchBonus) {
      this.gameState.matchBonus.moraleBonus = 0;
      this.gameState.matchBonus.tacticalBonus = 0;
      this.gameState.matchBonus.penaltyBonus = 0;
    }

    // 7. AVANZAR AÑO Y SEMANA
    this.gameState.season++;
    this.gameState.week = 1;
    this.gameState.eventsLog.unshift({
      date: `Temporada ${this.gameState.season}`,
      text: `🔄 ¡Nueva Temporada ${this.gameState.season}/${this.gameState.season + 1}! Se han reiniciado las posiciones, victorias y mercado de fichajes.`
    });

    // Sincronizar OVR del equipo con la plantilla evolucionada y reparar el XI
    // por si se retiró algún titular (p. ej. el portero).
    this.updateUserTeamOverall();
    this.healUserTeamXI();

    // ── v3.3: ECONOMÍA IA AUTOSOSTENIBLE ───────────────────────────────────
    // Al cerrar la temporada, los clubes rivales liquidan ingresos por
    // resultados (premio de liga por puesto final, taquilla y copas) y pagan
    // su masa salarial, acotados por un tope anclado a su presupuesto original
    // (baseBudget). Se ejecuta ANTES de la ventana de verano para que el
    // mercado de fichajes IA (abajo) gaste ese dinero y se financie solo.
    // La tabla de posiciones aún conserva el orden final de la temporada
    // (índice = puesto), así que el premio por posición es exacto.
    TransferEngine.processAISeasonFinances();

    // ── v3.2: MERCADO DE FICHAJES IA (ventana de VERANO) ──────────────────
    // Al abrir la nueva temporada, los clubes rivales fichan y venden entre sí
    // para renovar sus plantillas con traspasos reales (además de regens y
    // cantera). Nunca toca la plantilla del DT.
    TransferEngine.processAITransfers('summer');

    this.saveGame();
  }

  /**
   * Guarda el estado actual en localStorage y notifica a la interfaz global.
   */
  saveGame(): void {
    if (!this.gameState || this.isSaving) return;
    this.isSaving = true;
    try {
      // Persistir la economía IA (v3.3): los presupuestos rivales acumulados
      // por ingresos y traspasos sobreviven al guardado/recarga. El presupuesto
      // del DT ya vive en gameState.budget, así que se excluye su club.
      const aiBudgets: Record<string, number> = {};
      for (const tId in this.teams) {
        if (tId === this.gameState.userTeamId) continue;
        const team = this.teams[tId];
        if (team && team.baseBudget !== undefined && team.budget !== undefined) {
          aiBudgets[tId] = team.budget;
        }
      }
      // ── v3.5: ACOTAR LOS ARRAYS DE CRECIMIENTO CONTINUO ──────────────────
      // saveGame es el punto único por el que pasa todo guardado: recortar
      // aquí garantiza que el JSON nunca crezca sin límite con las temporadas,
      // vengan las entradas de donde vengan (el histórico de jugadores ya se
      // recorta en su origen, processSeasonPlayerEvolution).
      if (this.gameState.eventsLog.length > MAX_EVENTS_LOG) {
        this.gameState.eventsLog = this.gameState.eventsLog.slice(0, MAX_EVENTS_LOG);
      }
      // v3.8: tope del pool de agentes libres (recorte balanceado por posición).
      this.trimFreeAgents();
      if ((this.gameState.retiredLegends || []).length > MAX_RETIRED_LEGENDS) {
        this.gameState.retiredLegends = this.gameState.retiredLegends!.slice(-MAX_RETIRED_LEGENDS);
      }
      if (this.gameState.feedItems.length > MAX_FEED_ITEMS) {
        this.gameState.feedItems.length = MAX_FEED_ITEMS;
      }

      // ── v3.6: COMPACTAR EL HISTÓRICO DE JUGADORES ────────────────────────
      // statsHistory es el grueso del peso del save con el universo completo
      // (~7MB en objetos JSON para ~11.000 jugadores × 10 temporadas). Se
      // persiste como tuplas [season, goals, apps, rating, ovr] (~2.6× más
      // pequeñas) y loadGame las expande de vuelta a StatsHistoryEntry. La
      // forma EN MEMORIA no cambia: lógica y UI siguen usando objetos.
      const playersForSave: Record<string, CompactPlayer[]> = {};
      for (const tId in this.players) {
        const roster = this.players[tId];
        if (!Array.isArray(roster)) continue;
        playersForSave[tId] = roster.map(p => ({
          ...p,
          statsHistory: (p.statsHistory || []).map(h => [h.season, h.goals, h.appearances, h.ratingAvg, h.ovr] as CompactStatsHistory)
        }));
      }

      const saveObj: SaveData = {
        gameState: this.gameState,
        players: playersForSave,
        aiBudgets,
        aiClubHealth: this.aiClubHealth
      };
      const json = JSON.stringify(saveObj);
      const hash = fnv1a(json);

      // ── v3.7: PROMOVER EL SAVE VIGENTE AL AUTOGUARDADO ───────────────────
      // Antes de sobrescribir, el save principal actual pasa al slot de
      // autoguardado SOLO si es válido (checksum correcto; sin checksum se
      // acepta por compatibilidad con saves antiguos), para no pisar un buen
      // autoguardado con datos corruptos. Con el universo completo, main +
      // backup pueden exceder la cuota de localStorage: el autoguardado
      // falla en silencio y el save principal continúa igual.
      const current = localStorage.getItem(SAVE_KEY);
      if (current) {
        const currentCheck = localStorage.getItem(SAVE_CHECK_KEY);
        const currentValid = !currentCheck || fnv1a(current) === currentCheck;
        if (currentValid) {
          try {
            localStorage.setItem(SAVE_BACKUP_KEY, current);
            if (currentCheck) localStorage.setItem(SAVE_BACKUP_CHECK_KEY, currentCheck);
          } catch { /* cuota: no cabe el autoguardado; sigue el principal */ }
        }
      }

      localStorage.setItem(SAVE_KEY, json);
      localStorage.setItem(SAVE_CHECK_KEY, hash);

      if (typeof window !== 'undefined' && typeof window.updateGlobalUI === 'function') {
        window.updateGlobalUI();
      }
    } catch (e) {
      console.error('Error al guardar partida:', e);
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Recalcula dinámicamente el OVR general del equipo del usuario según la media de sus 11 titulares
   */
  updateUserTeamOverall(): void {
    if (!this.gameState || !this.gameState.userTeamId) return;
    const squad = this.getTeamPlayers(this.gameState.userTeamId);
    if (!squad || squad.length === 0) return;

    const top11 = squad.slice(0, 11);
    const avgOvr = Math.round(top11.reduce((sum, p) => sum + (p.overall || 70), 0) / top11.length);
    // La racha puede ser negativa (rachas de derrotas): bonificación acotada ±3
    const streakBonus = Math.max(-3, Math.min(3, Math.floor((this.gameState.currentStreak || 0) / 3)));

    const userTeam = this.teams[this.gameState.userTeamId];
    if (userTeam) {
      userTeam.overall = Math.min(99, Math.max(40, avgOvr + streakBonus));
    }
  }

  /**
   * v3.8 — Recorta el pool de agentes libres con recorte BALANCEADO POR
   * POSICIÓN: el recorte global por OVR dejaba al pool sin porteros ni
   * laterales (casi todos los OVR altos son atacantes/medios), y los clubes
   * no podían reponer esos puestos → plantillas incompletas y drenaje.
   * Se conservan los mejores N por posición y el hueco restante se rellena
   * con los mejores libres sobrantes.
   */
  private trimFreeAgents(): void {
    const fas = this.gameState?.freeAgents;
    if (!fas || fas.length <= MAX_FREE_AGENTS) return;
    const perPos = Math.max(10, Math.floor(MAX_FREE_AGENTS / FREE_AGENT_POSITIONS.length));
    const kept: Player[] = [];
    const used = new Set<string>();
    for (const pos of FREE_AGENT_POSITIONS) {
      const posPlayers = fas.filter(p => p.pos === pos).sort((a, b) => b.overall - a.overall).slice(0, perPos);
      posPlayers.forEach(p => used.add(p.id));
      kept.push(...posPlayers);
    }
    // Rellenar el cupo restante con los mejores sobrantes (por si alguna
    // posición no llega a su tope y quedan libres de valor en otras).
    const rest = fas.filter(p => !used.has(p.id)).sort((a, b) => b.overall - a.overall);
    kept.push(...rest.slice(0, Math.max(0, MAX_FREE_AGENTS - kept.length)));
    this.gameState!.freeAgents = kept;
  }

  /**
   * Recalcula el OVR general de los equipos IA según la media de su XI real
   * (para que la liga no quede con ratings estáticos mientras sus plantillas
   * envejecen, se retiran y reciben regens/prospectos). Solo toca plantillas
   * ya generadas en memoria; no fuerza la generación de equipos sin roster.
   */
  updateAITeamOveralls(): void {
    const gs = this.gameState;
    if (!gs) return;
    for (const tId in this.teams) {
      if (tId === gs.userTeamId) continue;
      const roster = this.players[tId];
      const team = this.teams[tId];
      if (!team || !Array.isArray(roster) || roster.length < 11) continue;
      const top11 = roster.slice(0, 11);
      const avg = Math.round(top11.reduce((sum, p) => sum + (p.overall || 70), 0) / 11);
      team.overall = Math.min(99, Math.max(40, avg));

      // Sincronizar también la copia del equipo dentro de league.teams
      // (db.init crea una copia enriquecida; sin esto la vista de liga mostraría
      // un OVR estático distinto al que usa el motor de partidos).
      const league = this.leagues.find(l => l.id === team.leagueId);
      if (league) {
        const leagueTeam = league.teams.find(t => t.id === tId);
        if (leagueTeam) leagueTeam.overall = team.overall;
      }
    }
  }

  /**
   * Sistemas semanales globales que deben ejecutarse al avanzar cada jornada:
   * 1. Drift de Team Spirit según la racha de resultados recientes.
   * 2. Rotación del mercado de DTs (despidos cada 4 semanas + contrataciones en ventanas).
   * 3. Sincronización del OVR del equipo del usuario Y de los equipos IA con sus XIs reales.
   * Lo llaman dashboardUI (simulación de bloques) y matchUI (partido en vivo).
   */
  weeklyHousekeeping(): void {
    const gs = this.gameState;
    if (!gs) return;

    TeamSpiritEngine.applyWeeklyDrift();

    if (gs.enableManagerMarket && gs.managerMarket) {
      // Despidos y evaluaciones del mercado de DTs cada 4 semanas
      if (gs.week >= 8 && gs.week % 4 === 0) {
        ManagerMarketEngine.evaluateAIManagerSackings(gs.week);
      }
      // Los interinos contratan DT definitivo en las ventanas de fichajes
      if (gs.week === 1 || gs.week === 19) {
        ManagerMarketEngine.processManagerHirings();
      }
    }

    // Ventana de INVIERNO (semana 19): mercado de fichajes entre clubes IA
    if (gs.week === 19) {
      TransferEngine.processAITransfers('winter');
    }

    this.updateUserTeamOverall();
    this.updateAITeamOveralls();
  }

  /**
   * Cambio COMPLETO de club del DT (estilo carrera multi-club EA FC):
   * 1. Mueve al DT al nuevo equipo y actualiza presupuesto/reputación.
   * 2. Reconstruye la tabla de posiciones y el calendario (maxWeeks) de la nueva liga.
   * 3. Genera las plantillas de los rivales de la nueva liga si faltan.
   * 4. Ajusta la táctica a la filosofía del nuevo club (gestión y distribución).
   * 5. Reinicia marcadores de temporada (goleadores, copas, rachas) y el vínculo directivo.
   * 6. Libera el puesto en el mercado de DTs IA y repara el XI del nuevo club.
   * @param teamId - ID del club destino
   */
  changeClub(teamId: string): GameState | null {
    const gs = this.gameState;
    if (!gs) return null;
    const newTeam = this.teams[teamId];
    if (!newTeam) return null;
    if (teamId === gs.userTeamId) return gs;

    const oldTeamId = gs.userTeamId;
    const oldTeamName = this.teams[oldTeamId]?.name || 'Desconocido';

    // 1. Identidad, presupuesto dual y reputación del nuevo club
    gs.userTeamId = teamId;
    gs.userLeagueId = newTeam.leagueId || '';
    gs.budget = newTeam.budget;
    gs.wageBudget = newTeam.wageBudget || Math.round((newTeam.budget || 0) * 0.3);
    gs.reputation = newTeam.reputation;

    // 2. Nueva liga: tabla de posiciones + calendario
    const newLeague = this.leagues.find(l => l.id === gs.userLeagueId) || this.leagues[0];
    if (newLeague && newLeague.teams && newLeague.teams.length > 0) {
      const numTeams = newLeague.teams.length;
      gs.maxWeeks = (numTeams - 1) * 2;
      gs.standings = newLeague.teams.map(t => ({
        teamId: t.id,
        name: t.name,
        played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0
      }));
      // 3. Asegurar plantillas generadas para los rivales de la nueva liga
      newLeague.teams.forEach(t => this.getTeamPlayers(t.id));
    } else {
      gs.maxWeeks = 38;
      gs.standings = [];
    }

    // 4. La filosofía del NUEVO club pasa a ser la exigencia directiva del DT
    //    SIEMPRE (aunque coincida con su arquetipo: es el requisito del club
    //    actual, no el del anterior). tacticalFidelityWeeks se recalcula desde 0.
    gs.clubPhilosophy = newTeam.philosophy || gs.managerArchetype;
    gs.tacticalFidelityWeeks = 0;

    // 5. Reset de marcadores de temporada (no tocar finanzas ni trophies)
    gs.topScorers = [];
    gs.cupPhaseReached = 'Fase de Grupos';
    gs.currentStreak = 0;
    gs.winStreak = 0;
    gs.bestWinStreak = 0;
    gs.classicWins = 0;
    gs.failedTransferPlayers = [];
    // El nuevo club no hereda crisis financieras del anterior (presupuesto dual)
    gs.transferBudgetLocked = false;
    gs.lockedBudgetAmount = 0;
    gs.teamSpirit = Math.min(65, Math.max(45, gs.teamSpirit || 50));

    // 6. Vínculo directivo con el nuevo club + liberar plaza en el mercado DT
    ContractEngine.startClubContract(teamId, 3);
    if (gs.managerMarket && gs.managerMarket.aiManagers) {
      delete gs.managerMarket.aiManagers[teamId];
      // El club abandonado NO puede quedarse sin DT: el mercado de DTs solo
      // procesa equipos con técnico o interino, así que sin esto la plaza
      // quedaría vacante para siempre. Se designa un interino de inmediato.
      if (!gs.managerMarket.aiManagers[oldTeamId]) {
        ManagerMarketEngine.assignInterimManager(oldTeamId, gs.week);
      }
    }
    // Poblar el mercado de DTs de la NUEVA liga (initAIManagers solo corre en
    // newCareer; sin esto los rivales de la nueva liga no tendrían técnico IA).
    if (gs.enableManagerMarket && gs.managerMarket) {
      ManagerMarketEngine.initAIManagers();
    }

    // Reparar el XI del nuevo club (orden POR-DFC-MC-DC) y sincronizar su OVR
    this.healUserTeamXI();
    this.updateUserTeamOverall();

    gs.eventsLog.unshift({
      date: `Semana ${gs.week}`,
      text: `✍️ NUEVO DESAFÍO PROFESIONAL: Has dejado ${oldTeamName} para dirigir a ${newTeam.name}. El consejo directivo fija un objetivo temporal para tu contrato.`
    });

    this.saveGame();
    return gs;
  }

  /**
   * Carga la partida guardada desde localStorage e inicializa defaults faltantes.
   * @returns True si se cargó con éxito
   */
  loadGame(): boolean {
    const dataStr = localStorage.getItem(SAVE_KEY);
    if (!dataStr) return false;
    try {
      const parsed = JSON.parse(dataStr) as SaveData;
      this.gameState = parsed.gameState;

      // ── v3.6: EXPANDIR EL HISTÓRICO COMPRIMIDO ───────────────────────────
      // El save persiste statsHistory como tuplas [season, goals, apps,
      // rating, ovr]; aquí se expanden de vuelta a objetos StatsHistoryEntry
      // (la forma en memoria). Se detecta el formato por el primer elemento:
      // un array = tupla compacta (v3.6+); un objeto = save anterior que ya
      // venía en el formato en memoria (se deja tal cual).
      const parsedPlayers = parsed.players || {};
      this.players = {};
      for (const tId in parsedPlayers) {
        this.players[tId] = (parsedPlayers[tId] || []).map(p => {
          const hist = p.statsHistory || [];
          const expanded: StatsHistoryEntry[] = (hist.length > 0 && Array.isArray(hist[0]))
            ? (hist as unknown as CompactStatsHistory[]).map(([season, goals, appearances, ratingAvg, ovr]) => ({ season, goals, appearances, ratingAvg, ovr }))
            : (hist as unknown as StatsHistoryEntry[]);
          return { ...p, statsHistory: expanded } as Player;
        });
      }

      if (this.gameState) {
        // ── Guards de migración para saves anteriores a v2.0 ────────────────
        if (!this.gameState.standings) this.gameState.standings = [];
        if (!this.gameState.topScorers) this.gameState.topScorers = [];
        if (!this.gameState.trophies) this.gameState.trophies = [];
        if (!this.gameState.youthAcademy) this.gameState.youthAcademy = [];
        if (!this.gameState.eventsLog) this.gameState.eventsLog = [];
        if (!this.gameState.scoutLevel) this.gameState.scoutLevel = 1;
        if (!this.gameState.matchBonus) this.gameState.matchBonus = { moraleBonus: 0, tacticalBonus: 0, penaltyBonus: 0 };
        if (!this.gameState.tactics) this.gameState.tactics = { formation: '4-3-3', mentality: 'Ofensiva', style: 'Tiki-Taka', defensiveLine: 'Alta', passingStyle: 'Corto' };
        if (!this.gameState.finances) this.gameState.finances = { ticketRevenue: 0, weeklyWageTotal: 0, playerSales: 0, playerPurchases: 0, leaguePrize: 0, balance: 0, budgetAtSeasonStart: 0 };
        if (!this.gameState.careerHistory) this.gameState.careerHistory = [];
        if (this.gameState.winStreak === undefined) this.gameState.winStreak = 0;
        if (this.gameState.currentStreak === undefined) this.gameState.currentStreak = 0;
        if (this.gameState.bestWinStreak === undefined) this.gameState.bestWinStreak = 0;
        if (this.gameState.classicWins === undefined) this.gameState.classicWins = 0;
        if (!this.gameState.seasonPlayersIn) this.gameState.seasonPlayersIn = [];
        if (!this.gameState.seasonPlayersOut) this.gameState.seasonPlayersOut = [];
        if (!this.gameState.cupPhaseReached) this.gameState.cupPhaseReached = 'Fase de Grupos';

        // ── Migración v2.0: Nuevos campos ────────────────────────────────────
        if (this.gameState.teamSpirit === undefined) this.gameState.teamSpirit = 50;
        if (!this.gameState.feedItems) this.gameState.feedItems = [];
        if (!this.gameState.watchedLeagues) this.gameState.watchedLeagues = [];
        if (!this.gameState.externalStandings) this.gameState.externalStandings = {};
        if (!this.gameState.retiredLegends) this.gameState.retiredLegends = [];
        // ── Migración v3.8: Agentes libres ──────────────────────────────────
        if (!this.gameState.freeAgents) {
          this.gameState.freeAgents = [];
          // Partida creada antes de v3.8: el mecanismo anterior nunca expulsaba
          // a nadie, así que habrá muchos contratos en 0 años. Un año de gracia
          // renueva esos vínculos en la primera evolución en lugar de purgar.
          this.gameState.freeAgencyGrace = true;
        }
        if (!this.gameState.managerMarket) this.gameState.managerMarket = { aiManagers: {}, lastRotationWeek: 0 };
        if (this.gameState.enableManagerMarket === undefined) this.gameState.enableManagerMarket = true;
        if (this.gameState.enableRegens === undefined) this.gameState.enableRegens = true;
        if (!this.gameState.eventFrequency) this.gameState.eventFrequency = 'normal';
        if (this.gameState.transferBudgetLocked === undefined) this.gameState.transferBudgetLocked = false;
        if (this.gameState.lockedBudgetAmount === undefined) this.gameState.lockedBudgetAmount = 0;
        if (!this.gameState.clubPhilosophy) this.gameState.clubPhilosophy = this.gameState.managerArchetype;
        if (this.gameState.tacticalFidelityWeeks === undefined) this.gameState.tacticalFidelityWeeks = 0;
        if (!this.gameState.wageBudget) this.gameState.wageBudget = Math.round((this.gameState.budget || 0) * 0.3);
        if (!this.gameState.finances.budgetAtSeasonStart) this.gameState.finances.budgetAtSeasonStart = this.gameState.budget;

        // ── Migración v2.0: Nuevos campos por jugador ────────────────────────
        for (const tId in this.players) {
          (this.players[tId] || []).forEach(p => {
            if (!Array.isArray(p.statsHistory)) p.statsHistory = [];
            if (!p.fcIqRole) p.fcIqRole = null;
            if (!p.personalityRole) p.personalityRole = null;
            if (!p.tacticalAffinity) p.tacticalAffinity = { possession: 50, counterattack: 50, highPress: 50 };
            if (p.isRegen === undefined) p.isRegen = false;
            if (!p.regenOriginName) p.regenOriginName = null;
            if (p.ratingAvg === undefined) p.ratingAvg = 0;
          });
        }

        // ── Migración v3.2: Plantillas con JUGADORES REALES ───────────────────
        // Los saves anteriores guardaron plantillas 100% procedurales. Si hay
        // data real (assets/data/real_players.json) para un equipo y su plantilla
        // guardada aún no contiene reales ('{teamId}_real_*'), se regenera UNA vez.
        // El equipo del usuario sin data real (p. ej. Liga 1 de Perú) no se toca.
        for (const tId in this.teams) {
          const roster = this.players[tId];
          if (!Array.isArray(roster) || roster.length === 0) continue;
          if (getRealPlayers(tId).length === 0) continue;
          const alreadyReal = roster.some(p => p.id.startsWith(`${tId}_real_`));
          if (alreadyReal) continue;
          this.players[tId] = generateTeamPlayers(this.teams[tId]!);
        }

        // ── Migración v3.3: ECONOMÍA IA PERSISTIDA ────────────────────────────
        // Restaurar los presupuestos rivales guardados (acumulados por ingresos
        // y traspasos entre sesiones), re-clampados a la banda [0.4×, 2.5×] del
        // presupuesto original por si un save antiguo/corrupto trae valores
        // fuera de rango. Saves anteriores a v3.3 (sin aiBudgets) quedan en el
        // presupuesto base de leagues.json, como antes de la feature.
        if (parsed.aiBudgets) {
          for (const tId in parsed.aiBudgets) {
            const team = this.teams[tId];
            if (!team || tId === this.gameState.userTeamId) continue;
            const base = team.baseBudget || team.budget || 10_000_000;
            const savedBudget = parsed.aiBudgets[tId];
            if (typeof savedBudget !== 'number' || !isFinite(savedBudget)) continue;
            team.budget = Math.round(Math.max(base * 0.4, Math.min(base * 2.5, savedBudget)));
            const league = this.leagues.find(l => l.id === team.leagueId);
            const leagueTeam = league?.teams.find(t => t.id === tId);
            if (leagueTeam) leagueTeam.budget = team.budget;
          }
        }

        // ── Migración v3.4: SALUD ECONÓMICA IA PERSISTIDA ────────────────────
        // Restaurar el seguimiento multi-temporada de los clubes en el suelo o
        // en crisis (temporadas consecutivas) que alimenta las consecuencias
        // duras. Saves anteriores a v3.4 (sin aiClubHealth) parten de cero, es
        // decir, los clubes necesitan N temporadas desde la carga para volver a
        // activar consecuencias (mismo comportamiento que antes de la feature).
        this.aiClubHealth = {};
        if (parsed.aiClubHealth) {
          for (const tId in parsed.aiClubHealth) {
            const h = parsed.aiClubHealth[tId];
            if (!h || typeof h !== 'object') continue;
            const num = (v: unknown, d: number): number => (typeof v === 'number' && isFinite(v) ? Math.max(0, Math.floor(v)) : d);
            this.aiClubHealth[tId] = {
              floorSeasons: num(h.floorSeasons, 0),
              crisisSeasons: num(h.crisisSeasons, 0),
              lastStarSaleSeason: num(h.lastStarSaleSeason, 0),
              lastInvestorSeason: num(h.lastInvestorSeason, 0)
            };
          }
        }

        // ── Migración v3.5: ACOTAR ARRAYS DE CRECIMIENTO CONTINUO ────────────
        // Saves de carreras largas acumulan histórico ilimitado por jugador,
        // log de eventos y registro de leyendas, inflando la serialización en
        // cada carga/guardado. Se recortan aquí con los mismos topes que
        // aplica saveGame (el histórico de jugadores se vuelve a recortar en
        // cada evolución de temporada).
        for (const tId in this.players) {
          (this.players[tId] || []).forEach(p => {
            if (Array.isArray(p.statsHistory) && p.statsHistory.length > MAX_STATS_HISTORY) {
              p.statsHistory = p.statsHistory.slice(-MAX_STATS_HISTORY);
            }
          });
        }
        if (this.gameState.eventsLog.length > MAX_EVENTS_LOG) {
          this.gameState.eventsLog = this.gameState.eventsLog.slice(0, MAX_EVENTS_LOG);
        }
        if ((this.gameState.retiredLegends || []).length > MAX_RETIRED_LEGENDS) {
          this.gameState.retiredLegends = this.gameState.retiredLegends!.slice(-MAX_RETIRED_LEGENDS);
        }

        // XI real unificado: repara una sola vez las partidas guardadas cuyo
        // top 11 es inválido (0 o 2+ porteros), para que la vista de tácticas
        // coincida con el XI que juega el motor. Si el DT ya dejó un XI válido
        // (1 portero), se respeta su alineación.
        this.healUserTeamXI();

        this.updateUserTeamOverall();

        const userTeam = this.teams[this.gameState.userTeamId];
        if (userTeam) {
          const userLeague = this.leagues.find(l => l.id === userTeam.leagueId);
          if (userLeague && userLeague.teams) {
            const numTeams = userLeague.teams.length;
            this.gameState.maxWeeks = (numTeams - 1) * 2;

            if (this.gameState.standings.length === 0) {
              this.gameState.standings = userLeague.teams.map(t => ({
                teamId: t.id,
                name: t.name,
                played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0
              }));
            }
          }
        }

        // Sanitizar semana y partidos jugados si sobrepasaron el límite
        if (this.gameState.week > this.gameState.maxWeeks) {
          this.gameState.week = this.gameState.maxWeeks;
        }

        if (this.gameState.standings) {
          this.gameState.standings.forEach(s => {
            if (s.played > this.gameState!.maxWeeks) {
              s.played = this.gameState!.maxWeeks;
            }
          });
        }
      }
      return true;
    } catch (e) {
      console.error('Error al cargar partida guardada:', e);
      return false;
    }
  }

  /**
   * Repara el XI de la plantilla del usuario cuando el top 11 del array es
   * inválido (0 o 2+ porteros), reordenando una sola vez a los mejores 11.
   * Si el DT ya dejó un XI válido (exactamente 1 portero), se respeta.
   */
  private healUserTeamXI(): void {
    if (!this.gameState || !this.gameState.userTeamId) return;
    const formation = (this.gameState.tactics && this.gameState.tactics.formation) || '4-3-3';
    const squad = this.getTeamPlayers(this.gameState.userTeamId);
    if (!squad || squad.length < 11) return;

    const first11 = squad.slice(0, 11);
    const gkCount = first11.filter(p => p.pos === 'POR').length;
    if (gkCount === 1) return; // XI válido — respetar la alineación del DT

    const { startingXI, substitutes } = TacticsEngine.getBestStartingXI(squad, formation as FormationId);
    const newOrder = [...startingXI.map(i => i.player), ...substitutes];
    squad.length = 0;
    squad.push(...newOrder);
  }

  /**
   * Comprueba si existe una partida recuperable: el save principal o, si este
   * falta/corrompió, un autoguardado válido (v3.7).
   * @returns boolean
   */
  hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null || this.hasValidBackup();
  }

  /**
   * Verifica la integridad del save principal (v3.7) ANTES de cargarlo: el
   * JSON debe parsear y, si existe clave de checksum, el hash FNV-1a debe
   * coincidir con el JSON almacenado. Los saves anteriores a v3.7 (sin
   * checksum) se consideran válidos y reciben checksum al siguiente guardado.
   * @returns 'ok' íntegro | 'corrupted' dañado/truncado (o solo queda
   *          autoguardado) | 'missing' sin save principal ni autoguardado
   */
  checkSaveIntegrity(): 'ok' | 'corrupted' | 'missing' {
    const dataStr = localStorage.getItem(SAVE_KEY);
    if (!dataStr) {
      return this.hasValidBackup() ? 'corrupted' : 'missing';
    }
    let parsed: SaveData | null = null;
    try {
      parsed = JSON.parse(dataStr) as SaveData;
    } catch {
      parsed = null; // JSON truncado o corrupto
    }
    const storedCheck = localStorage.getItem(SAVE_CHECK_KEY);
    const checksumOk = !storedCheck || fnv1a(dataStr) === storedCheck;
    if (!parsed || !checksumOk) {
      console.error('⚠️ v3.7: Save principal corrupto (parse o checksum).', { hasChecksum: Boolean(storedCheck) });
      return 'corrupted';
    }
    return 'ok';
  }

  /**
   * Verifica si existe un autoguardado válido (v3.7): el JSON del slot de
   * respaldo parsea y, si tiene checksum, coincide. Es el "último save bueno"
   * que saveGame promueve antes de cada sobrescritura.
   */
  hasValidBackup(): boolean {
    const b = localStorage.getItem(SAVE_BACKUP_KEY);
    if (!b) return false;
    try {
      const parsed = JSON.parse(b) as SaveData;
      const check = localStorage.getItem(SAVE_BACKUP_CHECK_KEY);
      return Boolean(parsed && parsed.gameState && (!check || fnv1a(b) === check));
    } catch {
      return false;
    }
  }

  /**
   * Restaura el último autoguardado válido como save principal (v3.7): lo
   * promueve a la clave principal (con su checksum) y lo carga con el
   * pipeline normal de loadGame. La UI llama a esto cuando el jugador acepta
   * recuperar tras un save corrupto.
   * @returns true si la recuperación tuvo éxito
   */
  recoverFromBackup(): boolean {
    const b = localStorage.getItem(SAVE_BACKUP_KEY);
    const check = localStorage.getItem(SAVE_BACKUP_CHECK_KEY);
    if (!b) return false;
    try {
      const parsed = JSON.parse(b) as SaveData;
      const ok = Boolean(parsed && parsed.gameState && (!check || fnv1a(b) === check));
      if (!ok) return false;

      // Promover backup → principal y cargar con el flujo normal.
      localStorage.setItem(SAVE_KEY, b);
      if (check) localStorage.setItem(SAVE_CHECK_KEY, check);
      const loaded = this.loadGame();

      if (loaded && this.gameState) {
        this.gameState.eventsLog.unshift({
          date: `Semana ${this.gameState.week}`,
          text: '🚑 RECUPERACIÓN: Tu partida estaba dañada y se restauró el último autoguardado válido.'
        });
        this.saveGame(); // reescribe el principal (regenera el checksum)
      }
      localStorage.removeItem(SAVE_BACKUP_KEY);
      localStorage.removeItem(SAVE_BACKUP_CHECK_KEY);
      return loaded;
    } catch (e) {
      console.error('Error recuperando el autoguardado:', e);
      return false;
    }
  }

  /**
   * Elimina el save principal, su checksum y el autoguardado (v3.7). Se usa
   * al reiniciar la carrera: sin esto, un reset dejaría un autoguardado
   * antiguo que la siguiente carga ofrecería recuperar.
   */
  clearSave(): void {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(SAVE_CHECK_KEY);
    localStorage.removeItem(SAVE_BACKUP_KEY);
    localStorage.removeItem(SAVE_BACKUP_CHECK_KEY);
  }
}

/** Instancia única singleton del gestor de datos */
export const db = new DatabaseManager();
