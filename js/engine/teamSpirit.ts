/**
 * ============================================================================
 * ENTRENADOR LEYENDA - MOTOR DE TEAM SPIRIT Y QUÍMICA DE VESTUARIO (teamSpirit.js)
 * ============================================================================
 * v2.0 — Sistema de cohesión colectiva (0-100) que combina:
 * 1. Moral media de los titulares.
 * 2. Compatibilidad de Roles FC IQ entre posiciones adyacentes.
 * 3. Afinidad táctica de los jugadores con el estilo del equipo.
 * 4. Impacto de roles de personalidad (Capitán, Rebelde, Mentor).
 * 5. Drift semanal según resultados recientes (racha de victorias/derrotas).
 *
 * Migrado a TypeScript (Fase 1): tipos conectados a js/types.ts, lógica intacta.
 */

import { db } from '../data/db.js';

import type { AffinityKey, FCIQRole, PlayStyle, StartingXIEntry, TacticsConfig } from '../types.js';

// Pares de roles FC IQ que generan sinergia entre sí (+bonus de compatibilidad)
const ROLE_SYNERGIES: [FCIQRole, FCIQRole][] = [
  ['Anchor', 'Playmaker'],
  ['Anchor', 'Box-to-Box'],
  ['Deep-Lying PM', 'Enganche'],
  ['Inverted Wingback', 'Inside Forward'],
  ['Overlapping FB', 'Winger'],
  ['Ball-Playing CB', 'Deep-Lying PM'],
  ['Box Crasher', 'Shadow Striker'],
  ['False 9', 'Mezzala'],
  ['Sweeper Keeper', 'Ball-Playing CB'],
  ['Box-to-Box', 'Winger'],
];

// Mapa de estilos de juego a clave de afinidad
const STYLE_TO_AFFINITY: Record<PlayStyle, AffinityKey> = {
  'Tiki-Taka':     'possession',
  'Gegenpressing': 'highPress',
  'Presión Alta':  'highPress',
  'Catenaccio':    'counterattack',
  'Contraataque':  'counterattack',
  'Juego por Bandas': 'possession',
};

export class TeamSpiritEngine {
  /**
   * Calcula el Team Spirit actual basado en el estado del equipo.
   * @param startingXI - Titulares actuales ({ player, slot })
   * @param tactics - Configuración táctica (style, formation)
   * @returns Spirit calculado (0-100)
   */
  static calculate(startingXI: StartingXIEntry[] | null | undefined, tactics?: TacticsConfig): number {
    if (!startingXI || startingXI.length === 0) return 50;

    const gameState = db.gameState;

    // 1. BASE: Moral media de los titulares (0-100)
    const avgMorale = startingXI.reduce((sum, item) => sum + (item.player.morale || 75), 0) / startingXI.length;
    let spirit = avgMorale * 0.50; // 50% del spirit base

    // 2. Bonus por compatibilidad de Roles FC IQ entre titulares
    const assignedRoles = startingXI
      .map(item => item.player.fcIqRole)
      .filter(Boolean);

    let synergyBonus = 0;
    ROLE_SYNERGIES.forEach(([roleA, roleB]) => {
      if (assignedRoles.includes(roleA) && assignedRoles.includes(roleB)) {
        synergyBonus += 3;
      }
    });
    spirit += Math.min(15, synergyBonus); // máx +15 por sinergias

    // 3. Bonus por afinidad táctica de los titulares con el estilo
    const style = tactics?.style;
    const affinityKey: AffinityKey | null = style ? (STYLE_TO_AFFINITY[style] || null) : null;
    if (affinityKey) {
      const avgAffinity = startingXI.reduce((sum, item) => {
        return sum + ((item.player.tacticalAffinity?.[affinityKey] || 50));
      }, 0) / startingXI.length;
      spirit += Math.round((avgAffinity - 50) * 0.15); // máx ±7.5
    }

    // 4. Impacto de roles de personalidad
    const allPlayers = startingXI.map(i => i.player);
    const captain  = allPlayers.find(p => p.personalityRole === 'captain');
    const rebel    = allPlayers.find(p => p.personalityRole === 'rebel');
    const mentor   = allPlayers.find(p => p.personalityRole === 'mentor');

    if (captain) spirit += 5;  // Capitán estabiliza
    if (rebel && (rebel.morale || 75) < 70) spirit -= 5; // Rebelde con baja moral daña
    if (mentor) spirit += 3;   // Mentor cohesiona al grupo

    // 5. Penalización por eventos negativos recientes en el Feed
    const recentNegative = (gameState?.feedItems || [])
      .slice(0, 5)
      .filter(f => ['FILTRACIÓN_SALARIAL', 'CRISIS_FINANCIERA', 'DESCONTENTO'].includes(f.type)).length;
    spirit -= recentNegative * 3;

    return Math.max(0, Math.min(100, Math.round(spirit)));
  }

  /**
   * Aplica el drift semanal del Team Spirit según los últimos resultados.
   * Debe llamarse al avanzar semana desde dashboardUI.
   */
  static applyWeeklyDrift(): void {
    const gameState = db.gameState;
    if (!gameState) return;

    const streak = gameState.currentStreak || 0;
    let drift = 0;

    if (streak >= 3)  drift = +3;  // racha de 3+ victorias
    else if (streak >= 1) drift = +1;
    else if (streak <= -3) drift = -4; // racha de 3+ derrotas
    else if (streak <= -1) drift = -2;
    else drift = -1; // empate: leve bajada

    gameState.teamSpirit = Math.max(0, Math.min(100,
      (gameState.teamSpirit || 50) + drift
    ));

    db.saveGame();
  }

  /**
   * Renderiza el panel de Team Spirit como HTML embebible en cualquier vista.
   * @returns HTML del panel
   */
  static renderSpiritPanel(): string {
    const gameState = db.gameState;
    const spirit = gameState?.teamSpirit ?? 50;

    const spiritColor = spirit >= 75 ? '#00c885'
      : spirit >= 50 ? '#e5a93c'
      : '#ff4460';

    const spiritLabel = spirit >= 80 ? '🔥 VESTUARIO EN LLAMAS'
      : spirit >= 65 ? '💪 BUENA COHESIÓN'
      : spirit >= 45 ? '😐 AMBIENTE NEUTRO'
      : spirit >= 30 ? '⚠️ TENSIÓN INTERNA'
      : '💥 CRISIS DE VESTUARIO';

    return `
      <div class="stat-card" style="border-left: 3px solid ${spiritColor};">
        <div class="stat-label">🤝 Team Spirit</div>
        <div class="stat-value" style="color: ${spiritColor};">${spirit}/100</div>
        <div class="progress-bar" style="margin-top: 6px; height: 6px; background: var(--surface-3); border-radius: 3px;">
          <div style="width: ${spirit}%; height: 100%; background: ${spiritColor}; border-radius: 3px; transition: width 0.4s;"></div>
        </div>
        <div class="stat-label" style="margin-top: 4px; color: ${spiritColor};">${spiritLabel}</div>
        <div class="stat-label" style="margin-top: 2px; font-size: 0.72rem; opacity: 0.7;">
          Impacto en OVR efectivo: ${spirit >= 50 ? '+' : ''}${Math.round((spirit - 50) * 0.06)} puntos
        </div>
      </div>
    `;
  }
}
