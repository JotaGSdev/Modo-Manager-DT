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
 */

import { generateTeamPlayers, calculatePositionOvr, calculatePlayerMarketValue, calculatePlayerSalary } from './teamData.js';
import { TransferEngine } from '../engine/transfers.js';
import { ContractEngine } from '../engine/contracts.js';

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
   * @param {string} managerName - Nombre del entrenador
   * @returns {Object} Estado inicial creado
   */
  newCareer(userTeamId, managerName = 'Director Técnico') {
    const userTeam = this.teams[userTeamId];
    if (!userTeam) return null;

    const userLeague = this.leagues.find(l => l.id === userTeam.leagueId);
    userLeague.teams.forEach(t => this.getTeamPlayers(t.id));

    const leagueStandings = userLeague.teams.map(t => ({
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
    }));

    this.gameState = {
      managerName: managerName,
      userTeamId: userTeamId,
      userLeagueId: userTeam.leagueId,
      budget: userTeam.budget,
      wageBudget: userTeam.wageBudget,
      reputation: userTeam.reputation,
      managerScore: 500,
      season: 2026,
      week: 1,
      maxWeeks: 38,
      isCareerFinished: false,
      failedTransferPlayers: [],
      standings: leagueStandings,
      topScorers: [],
      trophies: [],
      tactics: {
        formation: '4-3-3',
        mentality: 'Ofensiva',
        style: 'Tiki-Taka',
        defensiveLine: 'Alta',
        passingStyle: 'Corto'
      },
      matchBonus: {
        moraleBonus: 0,
        tacticalBonus: 0,
        penaltyBonus: 0
      },
      scoutLevel: 1,
      youthAcademy: [],
      eventsLog: [
        { date: '01/08/2026', text: `¡Bienvenido a ${userTeam.name}! El consejo directivo espera luchar por los primeros puestos esta temporada.` }
      ],
      finances: {
        ticketRevenue: 0,
        weeklyWageTotal: 0,
        playerSales: 0,
        playerPurchases: 0,
        leaguePrize: 0,
        balance: 0
      },
      careerHistory: [],
      winStreak: 0,
      currentStreak: 0,
      bestWinStreak: 0,
      classicWins: 0,
      seasonPlayersIn: [],
      seasonPlayersOut: [],
      cupPhaseReached: 'Fase de Grupos'
    };

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

          p.appearances = 0;
          p.seasonGoals = 0;

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

        const userTeam = this.teams[this.gameState.userTeamId];
        if (userTeam && this.gameState.standings.length === 0) {
          const userLeague = this.leagues.find(l => l.id === userTeam.leagueId);
          if (userLeague && userLeague.teams) {
            this.gameState.standings = userLeague.teams.map(t => ({
              teamId: t.id,
              name: t.name,
              played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0
            }));
          }
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
