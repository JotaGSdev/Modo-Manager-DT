/**
 * ============================================================================
 * ENTRENADOR LEYENDA - DINÁMICA DE RACHAS Y WONDERKIDS (playerForm.ts)
 * ============================================================================
 * Administra el estado de forma dinámico de los futbolistas:
 * - "EN RACHA": jugadores encendidos (+2 OVR temporal)
 * - "SEQUÍA": baja de rendimiento transitoria (-2 OVR)
 * - "WONDERKID": jóvenes promesas mundiales (Sub-21 con 88+ POT)
 */

import { db } from '../data/db.js';
import type { Player } from '../types.js';

export class PlayerFormEngine {
  /**
   * Evalúa y actualiza las rachas de los futbolistas de un equipo tras un partido
   */
  static processPostMatchForm(teamId: string, goalsScoredByPlayer: Record<string, number>, teamWon: boolean, cleanSheet: boolean): void {
    const squad = db.getTeamPlayers(teamId);
    if (!squad || squad.length === 0) return;

    squad.forEach(p => {
      // Detección de Wonderkids (Sub-21 con 88+ POT)
      if (p.age <= 21 && p.potential >= 88) {
        p.isWonderkid = true;
      }

      const goals = goalsScoredByPlayer[p.id] || 0;
      const isAttacker = ['DC', 'EI', 'ED', 'MCO'].includes(p.pos);
      const isDefender = ['POR', 'DFC', 'LI', 'LD', 'MCD'].includes(p.pos);

      // Evaluación de buena actuación
      const hadGreatGame = goals > 0 || (isDefender && cleanSheet && teamWon);

      if (hadGreatGame) {
        if (p.formStreak === 'cold') {
          p.formStreak = 'normal';
          p.formMatches = 0;
        } else {
          p.formMatches = (p.formMatches || 0) + 1;
          if (p.formMatches >= 2) {
            p.formStreak = 'hot';
            p.morale = Math.min(100, p.morale + 4);
          }
        }
      } else if (!teamWon && isAttacker && (!p.seasonGoals || p.seasonGoals === 0)) {
        // Sequía para delanteros
        p.formMatches = (p.formMatches || 0) - 1;
        if (p.formMatches <= -3) {
          p.formStreak = 'cold';
          p.morale = Math.max(30, p.morale - 4);
        }
      }
    });
  }

  /**
   * Obtiene la etiqueta visual de forma para renderizar en cartas de jugador (sin emojis)
   */
  static getFormBadgeHTML(player: Player): string {
    if (player.formStreak === 'hot') {
      return `<span title="En Racha: rendimiento estelar (+2 OVR)" style="background: linear-gradient(135deg, #f97316, #ef4444); color: #fff; font-size: 0.6rem; font-weight: 900; padding: 2px 5px; border-radius: 3px; letter-spacing: 0.5px; box-shadow: 0 0 6px rgba(239, 68, 68, 0.4);">EN RACHA</span>`;
    }
    if (player.formStreak === 'cold') {
      return `<span title="En Sequía: rendimiento bajo (-2 OVR)" style="background: #0284c7; color: #fff; font-size: 0.6rem; font-weight: 800; padding: 2px 5px; border-radius: 3px; letter-spacing: 0.5px;">SEQUÍA</span>`;
    }
    if (player.isWonderkid) {
      return `<span title="Joya Mundial / Wonderkid (Sub-21 con 88+ POT)" style="background: linear-gradient(135deg, #eab308, #ca8a04); color: #000; font-size: 0.6rem; font-weight: 900; padding: 2px 5px; border-radius: 3px; letter-spacing: 0.5px; box-shadow: 0 0 6px rgba(234, 179, 8, 0.4);">WONDERKID</span>`;
    }
    return '';
  }
}
