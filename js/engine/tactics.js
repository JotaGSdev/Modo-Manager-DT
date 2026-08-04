/**
 * ============================================================================
 * ENTRENADOR LEYENDA - GESTOR DE TÁCTICAS Y ARQUETIPOS DE DT (tactics.js)
 * ============================================================================
 * Administra las alineaciones 2D, formaciones de juego y arquetipos tácticos de DT.
 * Arquetipos disponibles:
 * 1. Pep Guardiola / Xavi Hernández: Maestro de Posesión y Pase Corto.
 * 2. Xabi Alonso / Klopp / Ancelotti: Rey del Contraataque y Velocidad Directa.
 * 3. Luis de la Fuente / Cholo Simeone: Garra de Potrero, Balón Parado y Presión.
 * 
 * Además proporciona:
 * - Diccionario de coordenadas para formaciones 2D en el campo (4-3-3, 4-4-2, 4-2-3-1, 3-5-2, 5-3-2).
 * - Selección automática de los 11 mejores titulares por posición (`getBestStartingXI`).
 * - Sistema de nivel táctico del entrenador por consumo de EXP (`upgradeManagerSkill`).
 */

import { db } from '../data/db.js';

export const MANAGER_ARCHETYPES = {
  TIKI_TAKA: {
    id: 'TIKI_TAKA',
    name: 'TIKI-TAKA & JUEGO DE POSICIÓN',
    coachStyle: 'Posesión Prolongada & Triangulación',
    description: 'Construcción paciente desde el fondo, pases cortos, triangulaciones de apoyo y control del espacio.',
    badgeColor: '#00c885',
    icon: '⚽',
    skills: {
      possession: { name: 'Control de Posesión y Triangulación', level: 1, maxLevel: 10 },
      shortPassing: { name: 'Precisión de Pase Corto en Salida', level: 1, maxLevel: 10 }
    },
    bonusSummary: '+8 Pases Cortos | +5% Control del Balón'
  },
  GEGENPRESSING: {
    id: 'GEGENPRESSING',
    name: 'GEGENPRESSING & PRESIÓN ALTA',
    coachStyle: 'Presión Tras Pérdida & Vértigo',
    description: 'Presión asfixiante en campo rival inmediatamente tras perder el balón y zarpazo vertical al espacio.',
    badgeColor: '#0096c7',
    icon: '⚡',
    skills: {
      counterSpeed: { name: 'Velocidad de Transición al Espacio', level: 1, maxLevel: 10 },
      directAttacking: { name: 'Efectividad en Recuperación Alta', level: 1, maxLevel: 10 }
    },
    bonusSummary: '+8 Recuperación Alta | +6% Transición Rápida'
  },
  CATENACCIO: {
    id: 'CATENACCIO',
    name: 'CATENACCIO & BLOQUE BAJO',
    coachStyle: 'El Autobús & Cerrojo Defensivo',
    description: 'Organización defensiva impenetrable en área propia, marcaje estricto, garra y córners letales.',
    badgeColor: '#e5a93c',
    icon: '🚌',
    skills: {
      setPiece: { name: 'Jugadas de Balón Parado & Córners', level: 1, maxLevel: 10 },
      potreroGrit: { name: 'Garra de Cerrojo & Marca Física', level: 1, maxLevel: 10 }
    },
    bonusSummary: '+8 Solidez Defensiva | +6% Cerrojo en Área'
  },
  WING_PLAY: {
    id: 'WING_PLAY',
    name: 'JUEGO POR BANDAS & CENTROS',
    coachStyle: 'Amplitud Total & Desborde',
    description: 'Laterales proyectados en ataque, uno contra uno por los costados y centros al área para rematadores.',
    badgeColor: '#a855f7',
    icon: '🌊',
    skills: {
      crossing: { name: 'Precisión de Centros al Área', level: 1, maxLevel: 10 },
      wingPace: { name: 'Desborde de Extremos', level: 1, maxLevel: 10 }
    },
    bonusSummary: '+8 Centros & Desborde | +5% Remate Aéreo'
  },
  DIRECT_ATTACK: {
    id: 'DIRECT_ATTACK',
    name: 'CONTRAATAQUE DIRECTO',
    coachStyle: 'Transición Relámpago al Espacio',
    description: 'Ceder la iniciativa al rival para explotar la espalda de su defensa con zarpazos a alta velocidad.',
    badgeColor: '#ff0055',
    icon: '🎯',
    skills: {
      counterPace: { name: 'Ataque Relámpago', level: 1, maxLevel: 10 },
      longBalls: { name: 'Balón Largo al Espacio', level: 1, maxLevel: 10 }
    },
    bonusSummary: '+8 Contraataque | +6% Eficiencia al Espacio'
  }
};

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
   * Obtiene la alineación titular ideal para una plantilla de jugadores y formación elegida.
   * @param {Array<Object>} players - Plantilla de futbolistas
   * @param {string} formationName - Nombre de la formación (ej. '4-3-3')
   * @returns {{ startingXI: Array<Object>, substitutes: Array<Object> }}
   */
  static getBestStartingXI(players, formationName = '4-3-3') {
    const formation = FORMATIONS[formationName] || FORMATIONS['4-3-3'];
    const squad = [...players].sort((a, b) => b.overall - a.overall);

    const startingXI = [];
    const usedIds = new Set();

    formation.positions.forEach(slot => {
      let best = squad.find(p => !usedIds.has(p.id) && p.pos === slot.role);
      if (!best) {
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
   * Mejora el nivel de una habilidad táctica del DT consumiendo EXP acumulada.
   * @param {string} skillKey - Clave de la habilidad ('skill1' o 'skill2')
   * @returns {{ success: boolean, message?: string, reason?: string }}
   */
  static upgradeManagerSkill(skillKey) {
    const gameState = db.gameState;
    if (!gameState.managerTactics) {
      gameState.managerTactics = { archetype: 'GUARDIOLA', exp: 500, skillLevels: { skill1: 1, skill2: 1 } };
    }

    const mTac = gameState.managerTactics;
    const currentLevel = mTac.skillLevels[skillKey] || 1;

    if (currentLevel >= 10) {
      return { success: false, reason: 'Esta habilidad táctica ya alcanzó el Nivel Máximo (Nivel 10).' };
    }

    const upgradeCost = currentLevel * 300;
    if ((mTac.exp || 0) < upgradeCost) {
      return { success: false, reason: `Se requieren ${upgradeCost} EXP de DT para subir a Nivel ${currentLevel + 1} (Tienes ${mTac.exp || 0} EXP).` };
    }

    mTac.exp -= upgradeCost;
    mTac.skillLevels[skillKey] = currentLevel + 1;
    db.saveGame();

    return { success: true, message: `¡Habilidad Táctica mejorada a Nivel ${currentLevel + 1}! Tu equipo gana +${currentLevel + 1}% de bonificación táctica.` };
  }

  /**
   * Calcula la valoración táctica efectiva de la alineación titular.
   * @param {Array<Object>} startingXI - Alineación titular en cancha
   * @param {Object} tacticsConfig - Configuración de tácticas del estado
   * @returns {number} Calificación táctica (0-99)
   */
  static calculateEffectiveRating(startingXI, tacticsConfig) {
    if (!startingXI || startingXI.length === 0) return 60;

    let totalOvr = 0;
    let chemistryPoints = 0;

    startingXI.forEach(item => {
      const p = item.player;
      let posPenalty = 0;

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

    const gameState = db.gameState;
    const mTac = gameState?.managerTactics || { skillLevels: { skill1: 1, skill2: 1 } };
    const skillBonus = ((mTac.skillLevels?.skill1 || 1) + (mTac.skillLevels?.skill2 || 1)) * 0.8;

    return Math.round(avgOvr * 0.80 + (chemistry * 0.15) + skillBonus);
  }
}
