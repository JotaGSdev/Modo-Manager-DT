/**
 * ============================================================================
 * ENTRENADOR LEYENDA - GESTOR BASE DE DATOS Y ESTADO GLOBAL (db.js)
 * ============================================================================
 * Este módulo es el NÚCLEO Y FUENTE ÚNICA DE VERDAD (Single Source of Truth) del juego.
 * Administra:
 * 1. Carga inicial de ligas y equipos desde ./assets/data/leagues.json.
 * 2. Generación y almacenamiento de futbolistas por equipo (teamData.js).
 * 3. Estado completo de la partida activa (`this.gameState`).
 * 4. Persistencia automática en `localStorage` (clave: `entrenador_leyenda_save`).
 * 5. Avance y envejecimiento de temporada (`processSeasonPlayerEvolution`).
 * 6. Historial de carrera multi-club durante las 25 temporadas máximas de juego.
 *
 * VERSIÓN 2.0 — Añade: Manager Market IA, The Feed, Team Spirit, FC IQ Roles,
 * Presupuesto Dual, Seguimiento Multiliga, Histórico por Jugador, Regens, Eventos Avanzados.
 */

import { generateTeamPlayers, calculatePositionOvr, calculatePlayerMarketValue, calculatePlayerSalary } from './teamData.js';
import { TransferEngine } from '../engine/transfers.js';
import { ContractEngine } from '../engine/contracts.js';
import { ManagerMarketEngine } from '../engine/managerMarketEngine.js';

class DatabaseManager {
  constructor() {
    /** @type {Array<Object>} Lista de ligas cargadas */
    this.leagues = [];
    
    /** @type {Object.<string, Object>} Diccionario de equipos por ID */
    this.teams = {};
    
    /** @type {Object.<string, Array<Object>>} Diccionario de plantillas por ID de equipo */
    this.players = {};
    
    /** @type {Object|null} Objeto con el estado global de la partida del usuario */
    this.gameState = null;
    
    /** @type {boolean} Flag de carga completada */
    this.isLoaded = false;
    
    /** @type {boolean} Flag para prevenir guardados concurrentes */
    this.isSaving = false;
  }

  /**
   * Carga asíncrona de las ligas desde el archivo JSON local.
   */
  async init() {
    if (this.isLoaded) return;
    try {
      const response = await fetch('./assets/data/leagues.json');
      this.leagues = await response.json();
      
      this.leagues.forEach(league => {
        league.teams.forEach(team => {
          this.teams[team.id] = { 
            ...team, 
            leagueId: league.id,
            country: league.country,
            region: league.region 
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
   * @param {string} teamId - ID del equipo
   * @returns {Array<Object>} Lista de jugadores del equipo
   */
  getTeamPlayers(teamId) {
    if (!this.players[teamId]) {
      const team = this.teams[teamId];
      if (team) {
        this.players[teamId] = generateTeamPlayers(team);
      } else {
        this.players[teamId] = [];
      }
    }

    if (this.players[teamId]) {
      this.players[teamId].forEach(p => {
        if (p.overall > 91) {
          p.overall = 91;
        }
        const expectedValue = calculatePlayerMarketValue(p.overall, p.age, p.potential || p.overall);
        if (!p.value || (p.overall >= 80 && p.value < expectedValue * 0.4)) {
          p.value = expectedValue;
          p.salary = calculatePlayerSalary(p.value, p.overall);
        }
      });
    }

    return this.players[teamId];
  }

  /**
   * Busca un jugador por su ID único en todas las plantillas cargadas.
   * @param {string} playerId - ID del jugador
   * @returns {Object|null}
   */
  getPlayerById(playerId) {
    for (const teamId in this.players) {
      const p = this.players[teamId].find(player => player.id === playerId);
      if (p) return p;
    }
    return null;
  }

  /**
   * Inicializa un nuevo estado de carrera de 25 temporadas para el DT.
   * @param {string} userTeamId - ID del equipo seleccionado
   * @param {string} [managerName='Director Técnico'] - Nombre del entrenador
   * @param {string} [managerCountry='Argentina'] - Nacionalidad del entrenador
   * @param {number} [managerAge=35] - Edad actual del entrenador (30 a 65)
   * @param {string} [managerArchetype='GUARDIOLA'] - Arquetipo táctico elegido
   * @returns {Object} Estado inicial creado
   */
  newCareer(userTeamId, managerName = 'Director Técnico', managerCountry = 'Argentina', managerAge = 35, managerArchetype = 'GUARDIOLA', options = {}) {
    const userTeam = this.teams[userTeamId];
    if (!userTeam) return null;

    const userLeague = this.leagues.find(l => l.id === userTeam.leagueId) || this.leagues[0];
    if (userLeague && userLeague.teams) {
      userLeague.teams.forEach(t => this.getTeamPlayers(t.id));
    }

    const leagueStandings = (userLeague && userLeague.teams) ? userLeague.teams.map(t => ({
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
      managerAge: parseInt(managerAge) || 35,
      managerArchetype: managerArchetype,
      clubPhilosophy: userTeam.philosophy || managerArchetype, // filosofía exigida por el club
      tacticalFidelityWeeks: 0, // semanas consecutivas con estilo correcto

      // ── Equipo y liga ─────────────────────────────────────────────────────
      userTeamId: userTeamId,
      userLeagueId: userTeam.leagueId,

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
  processSeasonPlayerEvolution() {
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

    const userTeamId = this.gameState.userTeamId;

    // 1. EVOLUCIÓN, ENVEJECIMIENTO (+1 AÑO) Y DECREMENTO DE CONTRATOS (-1 AÑO) EN TODOS LOS EQUIPOS
    for (const tId in this.players) {
      const roster = this.players[tId];
      if (Array.isArray(roster)) {
        roster.forEach(p => {
          const appearances = p.appearances || 0;
          let deltaOvr = 0;

          if (p.age < 23) {
            if (appearances >= 12) deltaOvr = 3 + Math.floor(Math.random() * 3);
            else deltaOvr = 1 + Math.floor(Math.random() * 2);
          } else if (p.age >= 23 && p.age <= 28) {
            if (appearances >= 15 && p.overall < p.potential) deltaOvr = 1 + Math.floor(Math.random() * 2);
          } else if (p.age >= 29 && p.age <= 32) {
            deltaOvr = -1;
            p.pac = Math.max(40, p.pac - 2);
            p.phy = Math.max(40, p.phy - 1);
          } else if (p.age >= 33) {
            deltaOvr = - (2 + Math.floor(Math.random() * 3));
            p.pac = Math.max(35, p.pac - 3);
            p.phy = Math.max(35, p.phy - 3);
          }

          p.overall = calculatePositionOvr(p.pos, p.pac, p.sho, p.pas, p.dri, p.def, p.phy);
          
          p.age++;
          const currentContract = p.contractYears !== undefined ? p.contractYears : 3;
          p.contractYears = Math.max(0, currentContract - 1);

          // ── Snapshot de estadísticas históricas (Fase 5B) ────────────────
          if (!Array.isArray(p.statsHistory)) p.statsHistory = [];
          p.statsHistory.push({
            season: this.gameState.season,
            goals: p.seasonGoals || 0,
            appearances: p.appearances || 0,
            ratingAvg: p.ratingAvg || 0,
            ovr: p.overall
          });

          p.appearances = 0;
          p.seasonGoals = 0;
          p.ratingAvg = 0;

          // ── Detección de leyendas retiradas para sistema de Regens (Fase 6A) ──
          if (p.age > 38 && this.gameState.enableRegens) {
            if (!this.gameState.retiredLegends) this.gameState.retiredLegends = [];
            const alreadyRetired = this.gameState.retiredLegends.some(r => r.name === p.name);
            if (!alreadyRetired && p.overall >= 75) {
              this.gameState.retiredLegends.push({
                name: p.name,
                pos: p.pos,
                originalOvr: p.overall,
                potential: Math.round(p.overall * 0.8),
                originTeamId: p.teamId
              });
            }
          }

          if (p.contractYears === 0 && tId === userTeamId) {
            this.gameState.eventsLog.unshift({
              date: `Temporada ${this.gameState.season + 1}`,
              text: `⚠️ ALERTA DE CONTRATO: El contrato de ${p.name} ha vencido (0 años restantes). ¡Renueva su vínculo en el Inspector de Jugador!`
            });
          }
        });
      }
    }

    // Aumentar edad de canteranos en la academia
    if (this.gameState.youthAcademy) {
      this.gameState.youthAcademy.forEach(y => y.age++);
    }

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
    const userStandingForHistory = this.gameState.standings ? this.gameState.standings.find(s => s.teamId === this.gameState.userTeamId) : null;
    const squadForHistory = this.players[this.gameState.userTeamId] || [];
    const topScorerHistory = [...squadForHistory].sort((a, b) => (b.seasonGoals || 0) - (a.seasonGoals || 0))[0];
    
    this.gameState.careerHistory.push({
      season: this.gameState.season,
      club: userTeamForHistory ? userTeamForHistory.name : 'Desconocido',
      leagueRank: userStandingForHistory ? (this.gameState.standings.indexOf(userStandingForHistory) + 1) : 0,
      isTitleWon: userStandingForHistory && this.gameState.standings[0] && this.gameState.standings[0].teamId === this.gameState.userTeamId,
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

    // 7. AVANZAR AÑO Y SEMANA
    this.gameState.season++;
    this.gameState.week = 1;
    this.gameState.eventsLog.unshift({
      date: `Temporada ${this.gameState.season}`,
      text: `🔄 ¡Nueva Temporada ${this.gameState.season}/${this.gameState.season + 1}! Se han reiniciado las posiciones, victorias y mercado de fichajes.`
    });

    this.saveGame();
  }

  /**
   * Guarda el estado actual en localStorage y notifica a la interfaz global.
   */
  saveGame() {
    if (!this.gameState || this.isSaving) return;
    this.isSaving = true;
    try {
      const saveObj = {
        gameState: this.gameState,
        players: this.players
      };
      localStorage.setItem('entrenador_leyenda_save', JSON.stringify(saveObj));

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
   * Carga la partida guardada desde localStorage e inicializa defaults faltantes.
   * @returns {boolean} True si se cargó con éxito
   */
  loadGame() {
    const dataStr = localStorage.getItem('entrenador_leyenda_save');
    if (!dataStr) return false;
    try {
      const parsed = JSON.parse(dataStr);
      this.gameState = parsed.gameState;
      this.players = parsed.players || {};

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
        if (!this.gameState.finances) this.gameState.finances = { ticketRevenue: 0, weeklyWageTotal: 0, playerSales: 0, playerPurchases: 0, leaguePrize: 0, balance: 0 };
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
            if (s.played > this.gameState.maxWeeks) {
              s.played = this.gameState.maxWeeks;
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
   * Comprueba si existe una partida guardada en localStorage.
   * @returns {boolean}
   */
  hasSave() {
    return localStorage.getItem('entrenador_leyenda_save') !== null;
  }
}

/** Instancia única singleton del gestor de datos */
export const db = new DatabaseManager();
