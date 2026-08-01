// Gestor de Tácticas, Alineaciones y Rendimiento

export const FORMATIONS = {
  '4-3-3': {
    name: '4-3-3 Ofensiva',
    positions: [
      { role: 'POR', x: 50, y: 88 },
      { role: 'LI',  x: 15, y: 70 },
      { role: 'DFC', x: 38, y: 74 },
      { role: 'DFC', x: 62, y: 74 },
      { role: 'LD',  x: 85, y: 70 },
      { role: 'MCD', x: 50, y: 55 },
      { role: 'MC',  x: 32, y: 45 },
      { role: 'MC',  x: 68, y: 45 },
      { role: 'EI',  x: 18, y: 22 },
      { role: 'DC',  x: 50, y: 15 },
      { role: 'ED',  x: 82, y: 22 }
    ]
  },
  '4-4-2': {
    name: '4-4-2 Clásica',
    positions: [
      { role: 'POR', x: 50, y: 88 },
      { role: 'LI',  x: 15, y: 70 },
      { role: 'DFC', x: 38, y: 74 },
      { role: 'DFC', x: 62, y: 74 },
      { role: 'LD',  x: 85, y: 70 },
      { role: 'MI',  x: 15, y: 45 },
      { role: 'MC',  x: 38, y: 48 },
      { role: 'MC',  x: 62, y: 48 },
      { role: 'MD',  x: 85, y: 45 },
      { role: 'DC',  x: 38, y: 18 },
      { role: 'DC',  x: 62, y: 18 }
    ]
  },
  '4-2-3-1': {
    name: '4-2-3-1 Control',
    positions: [
      { role: 'POR', x: 50, y: 88 },
      { role: 'LI',  x: 15, y: 70 },
      { role: 'DFC', x: 38, y: 74 },
      { role: 'DFC', x: 62, y: 74 },
      { role: 'LD',  x: 85, y: 70 },
      { role: 'MCD', x: 38, y: 58 },
      { role: 'MCD', x: 62, y: 58 },
      { role: 'MI',  x: 18, y: 35 },
      { role: 'MCO', x: 50, y: 32 },
      { role: 'MD',  x: 82, y: 35 },
      { role: 'DC',  x: 50, y: 15 }
    ]
  },
  '3-5-2': {
    name: '3-5-2 Ataque por Bandas',
    positions: [
      { role: 'POR', x: 50, y: 88 },
      { role: 'DFC', x: 25, y: 75 },
      { role: 'DFC', x: 50, y: 76 },
      { role: 'DFC', x: 75, y: 75 },
      { role: 'MI',  x: 12, y: 45 },
      { role: 'MCD', x: 38, y: 55 },
      { role: 'MCD', x: 62, y: 55 },
      { role: 'MD',  x: 88, y: 45 },
      { role: 'MCO', x: 50, y: 34 },
      { role: 'DC',  x: 38, y: 18 },
      { role: 'DC',  x: 62, y: 18 }
    ]
  },
  '5-3-2': {
    name: '5-3-2 Contraataque',
    positions: [
      { role: 'POR', x: 50, y: 88 },
      { role: 'LI',  x: 12, y: 68 },
      { role: 'DFC', x: 30, y: 75 },
      { role: 'DFC', x: 50, y: 77 },
      { role: 'DFC', x: 70, y: 75 },
      { role: 'LD',  x: 88, y: 68 },
      { role: 'MC',  x: 30, y: 48 },
      { role: 'MCD', x: 50, y: 52 },
      { role: 'MC',  x: 70, y: 48 },
      { role: 'DC',  x: 38, y: 18 },
      { role: 'DC',  x: 62, y: 18 }
    ]
  }
};

export class TacticsEngine {
  /**
   * Obtiene la alineación titular ideal para un equipo de jugadores
   */
  static getBestStartingXI(players, formationName = '4-3-3') {
    const formation = FORMATIONS[formationName] || FORMATIONS['4-3-3'];
    const squad = [...players].sort((a, b) => b.overall - a.overall);

    const startingXI = [];
    const usedIds = new Set();

    formation.positions.forEach(slot => {
      // Buscar mejor jugador para esa posición
      let best = squad.find(p => !usedIds.has(p.id) && p.pos === slot.role);
      if (!best) {
        // Si no hay posición exacta, buscar la más cercana
        best = squad.find(p => !usedIds.has(p.id));
      }
      if (best) {
        usedIds.add(best.id);
        startingXI.push({ player: best, slot });
      }
    });

    const substitutes = squad.filter(p => !usedIds.has(p.id));

    return { startingXI, substitutes };
  }

  /**
   * Calcula el nivel de química y la media táctica titular (0-100)
   */
  static calculateEffectiveRating(startingXI, tacticsConfig) {
    if (!startingXI || startingXI.length === 0) return 60;

    let totalOvr = 0;
    let chemistryPoints = 0;

    startingXI.forEach(item => {
      const p = item.player;
      let posPenalty = 0;

      // Penalización si el jugador juega fuera de su posición natural
      if (p.pos !== item.slot.role) {
        posPenalty = 4;
      }

      const effectiveOvr = Math.max(50, p.overall - posPenalty);
      totalOvr += effectiveOvr;

      if (p.morale >= 85) chemistryPoints += 2;
      if (p.form >= 80) chemistryPoints += 2;
    });

    const avgOvr = totalOvr / startingXI.length;
    const chemistry = Math.min(100, 75 + chemistryPoints);

    // Impacto de estrategia táctica
    let styleBonus = 0;
    if (tacticsConfig.style === 'Tiki-Taka' && avgOvr > 75) styleBonus = 2;
    if (tacticsConfig.style === 'Contraataque' && tacticsConfig.formation === '5-3-2') styleBonus = 3;

    return Math.round(avgOvr * 0.85 + (chemistry * 0.15) + styleBonus);
  }
}
