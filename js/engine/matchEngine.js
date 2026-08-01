// Motor de Simulación de Partidos e Integración de Simulación Completa de la Liga

import { ProbabilityEngine } from './probability.js';
import { db } from '../data/db.js';

export class MatchEngine {
  constructor(homeTeam, awayTeam, homeRating, awayRating, userBonus = 0) {
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;
    this.homeRating = homeRating + userBonus;
    this.awayRating = awayRating;

    this.minute = 0;
    this.homeScore = 0;
    this.awayScore = 0;
    this.homeXG = 0;
    this.awayXG = 0;
    this.homeShots = 0;
    this.awayShots = 0;
    this.homePossession = 50;

    this.events = [];
    this.isFinished = false;

    this.initMatch();
  }

  initMatch() {
    const probs = ProbabilityEngine.calculateMatchProbabilities(this.homeRating, this.awayRating);
    this.targetHomeXG = probs.homeXG;
    this.targetAwayXG = probs.awayXG;
    
    const diff = this.homeRating - this.awayRating;
    this.homePossession = Math.max(35, Math.min(68, Math.round(50 + diff * 1.2)));

    // Acreditar apariciones a titulares
    const homePlayers = db.getTeamPlayers(this.homeTeam.id);
    const awayPlayers = db.getTeamPlayers(this.awayTeam.id);

    homePlayers.slice(0, 11).forEach(p => p.appearances = (p.appearances || 0) + 1);
    awayPlayers.slice(0, 11).forEach(p => p.appearances = (p.appearances || 0) + 1);

    this.events.push({
      minute: 0,
      type: 'start',
      text: `¡Pitazo inicial en el estadio ${this.homeTeam.stadium}! ${this.homeTeam.name} vs ${this.awayTeam.name}.`
    });
  }

  getRandomScorer(teamId) {
    const players = db.getTeamPlayers(teamId);
    const attackers = players.filter(p => ['DC', 'EI', 'ED', 'MCO', 'MC'].includes(p.pos));
    const pool = attackers.length > 0 ? attackers : players;
    const scorer = pool[Math.floor(Math.random() * pool.length)];

    if (scorer) {
      scorer.seasonGoals = (scorer.seasonGoals || 0) + 1;

      if (!db.gameState.topScorers) db.gameState.topScorers = [];
      const existing = db.gameState.topScorers.find(s => s.playerId === scorer.id);
      if (existing) {
        existing.goals++;
      } else {
        db.gameState.topScorers.push({
          playerId: scorer.id,
          name: scorer.name,
          teamName: db.teams[teamId]?.name || 'Club',
          goals: 1
        });
      }
      db.gameState.topScorers.sort((a, b) => b.goals - a.goals);
    }

    return scorer ? scorer.name : 'Delantero Star';
  }

  tickMinute() {
    if (this.isFinished) return null;

    this.minute++;

    const homeShotProb = (this.targetHomeXG / 90) * 1.5;
    const awayShotProb = (this.targetAwayXG / 90) * 1.5;

    if (Math.random() < homeShotProb) {
      this.homeShots++;
      const xgGain = +(0.05 + Math.random() * 0.35).toFixed(2);
      this.homeXG = +(this.homeXG + xgGain).toFixed(2);

      if (Math.random() < xgGain * 1.4) {
        this.homeScore++;
        const scorerName = this.getRandomScorer(this.homeTeam.id);
        const event = {
          minute: this.minute,
          type: 'goal_home',
          team: this.homeTeam.name,
          text: `⚽ ¡GOOOOOOL DE ${this.homeTeam.name.toUpperCase()}! Anota ${scorerName}. (${this.homeScore} - ${this.awayScore})`
        };
        this.events.push(event);
        return event;
      } else {
        const event = {
          minute: this.minute,
          type: 'shot_home',
          text: `🔥 Ocasión peligrosa de ${this.homeTeam.name}. Disparo directo atajado por el arquero.`
        };
        this.events.push(event);
        return event;
      }
    }

    if (Math.random() < awayShotProb) {
      this.awayShots++;
      const xgGain = +(0.05 + Math.random() * 0.35).toFixed(2);
      this.awayXG = +(this.awayXG + xgGain).toFixed(2);

      if (Math.random() < xgGain * 1.4) {
        this.awayScore++;
        const scorerName = this.getRandomScorer(this.awayTeam.id);
        const event = {
          minute: this.minute,
          type: 'goal_away',
          team: this.awayTeam.name,
          text: `⚽ ¡GOOOOOOL DE ${this.awayTeam.name.toUpperCase()}! Remate certero de ${scorerName}. (${this.homeScore} - ${this.awayScore})`
        };
        this.events.push(event);
        return event;
      } else {
        const event = {
          minute: this.minute,
          type: 'shot_away',
          text: `💥 Remate potente de ${this.awayTeam.name} que se estrella en el travesaño.`
        };
        this.events.push(event);
        return event;
      }
    }

    if (this.minute >= 90) {
      this.isFinished = true;
      const finalEvent = {
        minute: 90,
        type: 'end',
        text: `🏁 ¡FINAL DEL PARTIDO! Resultado final: ${this.homeTeam.name} ${this.homeScore} - ${this.awayScore} ${this.awayTeam.name}.`
      };
      this.events.push(finalEvent);
      return finalEvent;
    }

    return null;
  }

  simulateFullMatch() {
    while (!this.isFinished) {
      this.tickMinute();
    }
    return {
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      homeXG: this.homeXG,
      awayXG: this.awayXG,
      homeShots: this.homeShots,
      awayShots: this.awayShots,
      homePossession: this.homePossession,
      events: this.events
    };
  }

  /**
   * Simula la jornada completa para TODOS los equipos rivales de la liga
   */
  static simulateAllRivalMatches(userTeamId, rivalId) {
    const gameState = db.gameState;
    const standings = gameState.standings;
    if (!standings || standings.length < 2) return;

    // Equipos libres que no sean el usuario ni su rival de esta jornada
    const otherTeams = standings.filter(s => s.teamId !== userTeamId && s.teamId !== rivalId);

    // Emparejar a los demás equipos de 2 en 2 para simular su partido de la jornada
    for (let i = 0; i < otherTeams.length - 1; i += 2) {
      const t1Standing = otherTeams[i];
      const t2Standing = otherTeams[i + 1];

      const t1 = db.teams[t1Standing.teamId] || { overall: 74 };
      const t2 = db.teams[t2Standing.teamId] || { overall: 74 };

      const probs = ProbabilityEngine.calculateMatchProbabilities(t1.overall, t2.overall);

      let g1 = 0, g2 = 0;
      const roll = Math.random() * 100;
      if (roll < probs.homeWinProb) {
        g1 = 1 + Math.floor(Math.random() * 3);
        g2 = Math.floor(Math.random() * g1);
      } else if (roll < probs.homeWinProb + probs.drawProb) {
        g1 = Math.floor(Math.random() * 3);
        g2 = g1;
      } else {
        g2 = 1 + Math.floor(Math.random() * 3);
        g1 = Math.floor(Math.random() * g2);
      }

      t1Standing.played++; t2Standing.played++;
      t1Standing.gf += g1; t1Standing.ga += g2; t1Standing.gd = t1Standing.gf - t1Standing.ga;
      t2Standing.gf += g2; t2Standing.ga += g1; t2Standing.gd = t2Standing.gf - t2Standing.ga;

      if (g1 > g2) {
        t1Standing.won++; t1Standing.points += 3; t2Standing.lost++;
      } else if (g1 < g2) {
        t2Standing.won++; t2Standing.points += 3; t1Standing.lost++;
      } else {
        t1Standing.drawn++; t1Standing.points += 1;
        t2Standing.drawn++; t2Standing.points += 1;
      }
    }
  }
}
