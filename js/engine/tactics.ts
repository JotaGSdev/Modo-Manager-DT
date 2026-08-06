/**
 * ============================================================================
 * ENTRENADOR LEYENDA - GESTOR DE TÁCTICAS Y ARQUETIPOS DE DT (tactics.js)
 * ============================================================================
 * Administra las alineaciones 2D, formaciones de juego y arquetipos tácticos de DT.
 *
 * v2.0 AÑADE:
 * - Sistema de Roles FC IQ: Box Crasher, Inverted Wingback, Anchor, etc.
 * - Modificadores de atributos por Rol FC IQ (afectan el OVR efectivo en simulación).
 * - Cálculo de Team Spirit integrado en `calculateEffectiveRating()`.
 * - Afinidad Táctica por jugador: bonus si el estilo del equipo coincide con su perfil.
 *
 * Migrado a TypeScript (Fase 1): se ELIMINARON las duplicaciones de datos —
 * la matriz táctica vive en probability.ts (TACTICAL_MATCHUP_MATRIX) y los
 * roles FC IQ en types.ts (FC_IQ_ROLES). Ambos se re-exportan para preservar
 * la API pública de este módulo.
 */

import { db } from '../data/db.js';
import { TACTICAL_MATCHUP_MATRIX, cleanStyle } from './probability.js';

import type {
  ActionResult, AffinityKey, FCIQRole, Formation, FormationId, ManagerArchetypeInfo,
  ManagerArchetypeKey, MatchupBonus, PlayStyle, Player, RoleModifiers, SkillLevels,
  StartingXIEntry, TacticsConfig
} from '../types.js';

/** Roles FC IQ por posición — fuente única en types.ts (re-export para compatibilidad) */
export { FC_IQ_ROLES } from '../types.js';

/** Matriz táctica estilo vs estilo — fuente única en probability.ts (re-export para compatibilidad) */
export { TACTICAL_MATCHUP_MATRIX };

export const MANAGER_ARCHETYPES: Record<ManagerArchetypeKey, ManagerArchetypeInfo> = {
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

export const FORMATIONS: Record<FormationId, Formation> = {
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

// =============================================================================
// v2.0 — SISTEMA DE ROLES FC IQ
// =============================================================================

/** Mapa de roles FC IQ disponibles por posición — fuente única en types.ts */

/**
 * Modificadores de atributos por Rol FC IQ.
 * Cada clave es un nombre de rol, el valor son los deltas de atributos.
 * El OVR efectivo se recalcula aplicando estos modificadores en simulación.
 */
export const FC_IQ_ROLE_MODIFIERS: Record<FCIQRole, RoleModifiers> = {
  // Porteros
  'Goalkeeper':        { def: 0,  pac: 0,  pas: 0,  dri: 0,  sho: 0,  phy: 0 },
  'Sweeper Keeper':    { def: -2, pac: +3, pas: +3, dri: +2, sho: 0,  phy: 0 },

  // Defensas Centrales
  'Stopper':           { def: +4, phy: +3, pac: +1, pas: -2, dri: -2, sho: 0 },
  'Ball-Playing CB':   { pas: +4, def: +1, dri: +2, pac: 0,  sho: 0,  phy: 0 },
  'Libero':            { def: +2, pas: +3, dri: +3, pac: +1, sho: 0,  phy: 0 },

  // Laterales
  'Full Back':         { def: +3, pac: +2, pas: +1, dri: 0,  sho: 0,  phy: 0 },
  'Inverted Wingback': { def: +2, dri: +3, pas: +2, pac: +2, sho: +2, phy: 0 },
  'Overlapping FB':    { pac: +4, dri: +3, pas: +2, def: 0,  sho: 0,  phy: 0 },

  // Mediocampistas Defensivos
  'Anchor':            { def: +5, phy: +2, pas: -1, dri: -1, sho: -2, pac: 0 },
  'Deep-Lying PM':     { pas: +5, def: +2, dri: +2, pac: -1, sho: 0,  phy: 0 },
  'Box-to-Box':        { phy: +3, pac: +2, sho: +2, pas: +1, def: +1, dri: 0 },

  // Mediocampistas Centrales
  'Playmaker':         { pas: +5, dri: +3, sho: +1, def: -1, pac: 0,  phy: 0 },
  'Mezzala':           { dri: +4, pas: +3, sho: +3, pac: +2, def: -2, phy: 0 },

  // Mediocampistas Ofensivos
  'Enganche':          { pas: +5, dri: +4, sho: +2, pac: -2, def: -3, phy: -2 },
  'Shadow Striker':    { sho: +5, dri: +4, pac: +3, pas: 0,  def: -3, phy: 0 },
  'Deep Forward':      { pas: +4, dri: +3, sho: +2, pac: 0,  def: -1, phy: 0 },

  // Extremos
  'Inside Forward':    { sho: +4, dri: +3, pac: +2, pas: +1, def: -2, phy: 0 },
  'Winger':            { pac: +4, dri: +3, pas: +2, sho: 0,  def: -1, phy: 0 },
  'Half Winger':       { dri: +3, pas: +3, pac: +2, sho: +1, def: 0,  phy: 0 },
  'Wide Midfielder':   { pas: +3, dri: +2, pac: +2, def: +2, sho: 0,  phy: 0 },

  // Delanteros Centro
  'Target Forward':    { phy: +5, sho: +3, pac: -1, pas: -1, dri: 0,  def: 0 },
  'Box Crasher':       { sho: +4, phy: +3, pac: +2, pas: -2, dri: +1, def: 0 },
  'False 9':           { pas: +4, dri: +4, sho: +1, pac: +1, def: 0,  phy: -1 },
  'Poacher':           { sho: +6, pac: +3, dri: +2, pas: -3, def: -2, phy: 0 }
};

/**
 * Calcula el OVR efectivo de un jugador aplicando modificadores de rol FC IQ.
 * @param player - Objeto jugador con atributos base
 * @returns OVR efectivo ajustado (50-99)
 */
export function calculateFCIQEffectiveOvr(player: Player): number {
  if (!player.fcIqRole || !FC_IQ_ROLE_MODIFIERS[player.fcIqRole]) {
    return player.overall;
  }
  const mods = FC_IQ_ROLE_MODIFIERS[player.fcIqRole];
  const pac = Math.max(30, Math.min(99, (player.pac || 70) + (mods.pac || 0)));
  const sho = Math.max(10, Math.min(99, (player.sho || 60) + (mods.sho || 0)));
  const pas = Math.max(30, Math.min(99, (player.pas || 60) + (mods.pas || 0)));
  const dri = Math.max(30, Math.min(99, (player.dri || 65) + (mods.dri || 0)));
  const def = Math.max(20, Math.min(99, (player.def || 50) + (mods.def || 0)));
  const phy = Math.max(30, Math.min(99, (player.phy || 65) + (mods.phy || 0)));

  // Recalcular OVR con los atributos modificados usando la misma fórmula de posición
  const pos = player.pos;
  let ovr: number;
  if (pos === 'POR')       ovr = def * 0.40 + phy * 0.35 + pas * 0.15 + pac * 0.10;
  else if (pos === 'DFC')  ovr = def * 0.40 + phy * 0.35 + pac * 0.15 + pas * 0.10;
  else if (pos === 'LI' || pos === 'LD') ovr = pac * 0.30 + def * 0.30 + pas * 0.20 + phy * 0.20;
  else if (pos === 'MCD')  ovr = def * 0.35 + phy * 0.30 + pas * 0.25 + dri * 0.10;
  else if (pos === 'MC')   ovr = pas * 0.35 + dri * 0.25 + phy * 0.15 + sho * 0.15 + def * 0.10;
  else if (pos === 'MCO')  ovr = dri * 0.35 + pas * 0.35 + sho * 0.20 + pac * 0.10;
  else if (pos === 'EI' || pos === 'ED' || pos === 'MI' || pos === 'MD')
                           ovr = pac * 0.40 + dri * 0.30 + sho * 0.15 + pas * 0.15;
  else if (pos === 'DC')   ovr = sho * 0.40 + pac * 0.25 + phy * 0.20 + dri * 0.15;
  else                     ovr = (pac + sho + pas + dri + def + phy) / 6;

  return Math.max(50, Math.min(99, Math.round(ovr)));
}

export class TacticsEngine {
  /**
   * Obtiene la alineación titular ideal para una plantilla de jugadores y formación elegida.
   * @param players - Plantilla de futbolistas
   * @param formationName - Nombre de la formación (ej. '4-3-3')
   * @returns Alineación titular y suplentes
   */
  static getBestStartingXI(players: Player[], formationName: FormationId = '4-3-3'): { startingXI: StartingXIEntry[]; substitutes: Player[] } {
    const formation = FORMATIONS[formationName] || FORMATIONS['4-3-3'];
    const squad = [...players].sort((a, b) => b.overall - a.overall);

    const startingXI: StartingXIEntry[] = [];
    const usedIds = new Set<string>();

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
   * @param skillKey - Clave de la habilidad ('skill1' o 'skill2')
   */
  static upgradeManagerSkill(skillKey: keyof SkillLevels): ActionResult {
    const gameState = db.gameState!;
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
   * @param startingXI - Alineación titular en cancha
   * @param tacticsConfig - Configuración de tácticas del estado
   * @returns Calificación táctica (0-99)
   */
  static calculateEffectiveRating(startingXI: StartingXIEntry[], tacticsConfig: TacticsConfig | undefined): number {
    if (!startingXI || startingXI.length === 0) return 60;

    let totalOvr = 0;
    let chemistryPoints = 0;
    let fcIqRoleCount = 0;

    const gameState = db.gameState;
    const tacticsStyle = tacticsConfig?.style || gameState?.tactics?.style || '';

    // Mapa de estilos a clave de afinidad
    const styleAffinityMap: Partial<Record<PlayStyle, AffinityKey>> = {
      'Tiki-Taka': 'possession',
      'Gegenpressing': 'highPress',
      'Presión Alta': 'highPress',
      'Catenaccio': 'counterattack',
      'Contraataque': 'counterattack',
      'Juego por Bandas': 'possession'
    };
    const styleAffinityKey = styleAffinityMap[tacticsStyle as PlayStyle] || null;

    startingXI.forEach(item => {
      const p = item.player;
      let posPenalty = 0;

      if (p.pos !== item.slot.role) {
        posPenalty = 4;
      }

      // Aplicar modificadores de Rol FC IQ si están asignados
      let baseOvr = p.overall;
      if (p.fcIqRole) {
        baseOvr = calculateFCIQEffectiveOvr(p);
        fcIqRoleCount++;
      }

      // Bonus de afinidad táctica (hasta +3 por jugador si el estilo coincide)
      let affinityBonus = 0;
      if (styleAffinityKey && p.tacticalAffinity[styleAffinityKey]) {
        affinityBonus = Math.round((p.tacticalAffinity[styleAffinityKey] - 50) * 0.04);
      }

      const effectiveOvr = Math.max(50, baseOvr - posPenalty + affinityBonus);
      totalOvr += effectiveOvr;

      if (p.morale >= 85) chemistryPoints += 2;
      if (p.form >= 80) chemistryPoints += 2;
    });

    const avgOvr = totalOvr / startingXI.length;
    const chemistry = Math.min(100, 75 + chemistryPoints);

    const mTac = gameState?.managerTactics || { skillLevels: { skill1: 1, skill2: 1 } };
    const skillBonus = ((mTac.skillLevels?.skill1 || 1) + (mTac.skillLevels?.skill2 || 1)) * 0.8;

    // Bonus de Team Spirit (hasta +3 OVR si spirit = 100)
    const spirit = gameState?.teamSpirit || 50;
    const spiritBonus = Math.round((spirit - 50) * 0.06);

    // Bonus por uso extensivo de Roles FC IQ (bonus adicional si todos tienen rol)
    const fcIqBonus = fcIqRoleCount >= 8 ? 2 : (fcIqRoleCount >= 5 ? 1 : 0);

    return Math.round(avgOvr * 0.80 + (chemistry * 0.15) + skillBonus + spiritBonus + fcIqBonus);
  }

  /**
   * Obtiene la bonificación probabilística por enfrentamiento táctico
   */
  static getTacticalMatchup(homeStyle: PlayStyle = 'Tiki-Taka', awayStyle: PlayStyle = 'Tiki-Taka'): MatchupBonus {
    const hStyleClean = cleanStyle(homeStyle);
    const aStyleClean = cleanStyle(awayStyle);

    const matchup = TACTICAL_MATCHUP_MATRIX[hStyleClean]?.[aStyleClean] || { bonusXG: 0, possession: 50, desc: 'Encuentro táctico nivelado' };
    return matchup;
  }

  /**
   * Actualiza dinámicamente la media (OVR) de un equipo en db según los 11 titulares activos
   */
  static updateTeamOverall(teamId: string): number {
    const squad = db.getTeamPlayers(teamId);
    if (!squad || squad.length === 0) return 70;

    const top11 = squad.slice(0, 11);
    const avgOvr = Math.round(top11.reduce((sum, p) => sum + (p.overall || 70), 0) / top11.length);

    const team = db.teams[teamId];
    if (team) {
      team.overall = avgOvr;
    }
    return avgOvr;
  }
}
