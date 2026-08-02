import { generateTeamPlayers, calculatePositionOvr, calculatePlayerMarketValue, calculatePlayerSalary } from './teamData.js';
import { TransferEngine } from '../engine/transfers.js';

class DatabaseManager {
  constructor() {
    this.leagues = [];
    this.teams = {};
    this.players = {};
    this.standings = {};
    this.gameState = null;
    this.isLoaded = false;
  }

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

  getTeamPlayers(teamId) {
    if (!this.players[teamId]) {
      const team = this.teams[teamId];
      if (team) {
        this.players[teamId] = generateTeamPlayers(team);
      } else {
        this.players[teamId] = [];
      }
    }

    // Actualizar valor de mercado con la nueva curva hiperrealista si el jugador era antiguo
    if (this.players[teamId]) {
      this.players[teamId].forEach(p => {
        const expectedValue = calculatePlayerMarketValue(p.overall, p.age, p.potential || p.overall);
        if (!p.value || (p.overall >= 80 && p.value < expectedValue * 0.4)) {
          p.value = expectedValue;
          p.salary = calculatePlayerSalary(p.value, p.overall);
        }
      });
    }

    return this.players[teamId];
  }

  getPlayerById(playerId) {
    for (const teamId in this.players) {
      const p = this.players[teamId].find(player => player.id === playerId);
      if (p) return p;
    }
    return null;
  }

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
      ]
    };

    this.saveGame();
    return this.gameState;
  }

  /**
   * Procesa el final de temporada: Evoluciona medias, reinicia tabla de posiciones, goles y pichichis
   */
  processSeasonPlayerEvolution() {
    if (!this.gameState) return;

    if (this.gameState.season >= 2050) {
      this.gameState.isCareerFinished = true;
      this.gameState.eventsLog.unshift({
        date: `Año 2051`,
        text: `🏆 ¡CARRERA FINALIZADA! Has completado tu trayectoria profesional de 25 años como Director Técnico.`
      });
      this.saveGame();
      return;
    }

    // 1. Evolución de jugadores según minutos y edad
    for (const teamId in this.players) {
      const roster = this.players[teamId];
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
        p.appearances = 0;
        p.seasonGoals = 0;
      });
    }

    // 2. REINICIAR TABLA DE POSICIONES PARA LA NUEVA TEMPORADA
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
    TransferEngine.resetWindowLocks();

    // 4. Avanzar año y semana
    this.gameState.season++;
    this.gameState.week = 1;
    this.gameState.eventsLog.unshift({
      date: `Temporada ${this.gameState.season}`,
      text: `🔄 ¡Nueva Temporada ${this.gameState.season}/${this.gameState.season + 1}! Se han reiniciado las posiciones, victorias y mercado de fichajes.`
    });

    this.saveGame();
  }

  saveGame() {
    if (!this.gameState || this.isSaving) return;
    this.isSaving = true;
    try {
      const saveObj = {
        gameState: this.gameState,
        players: this.players
      };
      localStorage.setItem('entrenador_leyenda_save', JSON.stringify(saveObj));

      // Disparar sincronización instantánea de la interfaz superior si existe el actualizador
      if (typeof window !== 'undefined' && typeof window.updateGlobalUI === 'function') {
        window.updateGlobalUI();
      }
    } catch (e) {
      console.error('Error al guardar partida:', e);
    } finally {
      this.isSaving = false;
    }
  }

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

        // Si la tabla de posiciones está vacía por un guardado anterior, reconstruirla
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

  hasSave() {
    return localStorage.getItem('entrenador_leyenda_save') !== null;
  }
}

export const db = new DatabaseManager();
