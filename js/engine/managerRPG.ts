/**
 * ============================================================================
 * ENTRENADOR LEYENDA - MOTOR DE RPG Y PROGRESIÓN DEL DT (managerRPG.ts)
 * ============================================================================
 * Administra el sistema de Niveles (1 a 50), EXP de Mánager y Árbol de Talentos.
 * Concede recompensas continuas tras cada victoria, clásico, título o desarrollo
 * de canteranos.
 */

import { db } from '../data/db.js';
import { sfx } from '../../assets/audio/sfx.js';
import type { ActionResult, ManagerRPGState, TalentDefinition } from '../types.js';

export const TALENTS_CATALOG: TalentDefinition[] = [
  // ── 1. MAESTRÍA TÁCTICA ──
  {
    id: 'tactical_analysis',
    name: 'Lectura de Pizarra',
    branch: 'tactics',
    tier: 1,
    cost: 1,
    icon: '[TAC]',
    desc: 'Análisis minucioso del rival antes de cada partido.',
    effectSummary: '+3% Posesión y +8% Eficacia en ocasiones de gol',
    requiredLevel: 1
  },
  {
    id: 'clutch_master',
    name: 'Especialista en Claves',
    branch: 'tactics',
    tier: 2,
    cost: 1,
    icon: '[CLUTCH]',
    desc: 'Decisiones infalibles en los Momentos de Tensión (minutos 30 y 70).',
    effectSummary: '+15% Efectividad en órdenes tácticas bajo presión',
    requiredLevel: 3,
    prerequisiteId: 'tactical_analysis'
  },
  {
    id: 'masterclass',
    name: 'Pizarra de Oro',
    branch: 'tactics',
    tier: 3,
    cost: 2,
    icon: '[ORO]',
    desc: 'Los grandes partidos sacan la mejor versión estratégica de tu equipo.',
    effectSummary: '+2 OVR global en Clásicos, Derbis y Fases Finales de Copa',
    requiredLevel: 7,
    prerequisiteId: 'clutch_master'
  },

  // ── 2. LIDERAZGO & VESTUARIO ──
  {
    id: 'iron_discipline',
    name: 'Mente Inquebrantable',
    branch: 'locker',
    tier: 1,
    cost: 1,
    icon: '[DISC]',
    desc: 'Cultura de compromiso que impide que el vestuario caiga en el desánimo.',
    effectSummary: 'Team Spirit mínimo blindado en 60% (previene crisis)',
    requiredLevel: 1
  },
  {
    id: 'supersub',
    name: 'El Factor Revulsivo',
    branch: 'locker',
    tier: 2,
    cost: 1,
    icon: '[REV]',
    desc: 'Los cambios tácticos en el segundo tiempo entran encendidos al campo.',
    effectSummary: 'Suplentes y ajustes de entretiempo rinden con +3 OVR temporal',
    requiredLevel: 3,
    prerequisiteId: 'iron_discipline'
  },
  {
    id: 'legendary_talk',
    name: 'Arenga Sagrada',
    branch: 'locker',
    tier: 3,
    cost: 2,
    icon: '[ARENGA]',
    desc: 'Charlas de vestuario memorables al entretiempo que cambian partidos.',
    effectSummary: '+50% Potencia en charlas de vestuario y +5 Moral tras triunfos',
    requiredLevel: 7,
    prerequisiteId: 'supersub'
  },

  // ── 3. CANTERA & OJO CLÍNICO ──
  {
    id: 'eagle_eye',
    name: 'Ojo de Halcón',
    branch: 'scouting',
    tier: 1,
    cost: 1,
    icon: '[OJO]',
    desc: 'Instinto innato para percibir el techo futbolístico de cualquier promesa.',
    effectSummary: 'Revela el rango de potencial (POT) exacto en el inspector',
    requiredLevel: 1
  },
  {
    id: 'wonderkid_magnet',
    name: 'Fábrica de Cracks',
    branch: 'scouting',
    tier: 2,
    cost: 1,
    icon: '[CRACK]',
    desc: 'Tu reputación formativa atrae a los mayores talentos juveniles del continente.',
    effectSummary: 'Garantiza al menos 1 Wonderkid (88+ POT) en la cantera por año',
    requiredLevel: 3,
    prerequisiteId: 'eagle_eye'
  },
  {
    id: 'youth_accelerator',
    name: 'Evolución Relámpago',
    branch: 'scouting',
    tier: 3,
    cost: 2,
    icon: '[EVO]',
    desc: 'Metodología intensiva de entrenamientos y minutos para juveniles.',
    effectSummary: 'Jugadores Sub-22 reciben +50% EXP por partido disputado',
    requiredLevel: 7,
    prerequisiteId: 'wonderkid_magnet'
  },

  // ── 4. NEGOCIACIÓN & FINANZAS ──
  {
    id: 'financial_guru',
    name: 'Tiburón de Finanzas',
    branch: 'business',
    tier: 1,
    cost: 1,
    icon: '[FIN]',
    desc: 'Explotación comercial superior y fidelización masiva de hinchas.',
    effectSummary: '+15% Recaudación de taquilla y abonos cada jornada en casa',
    requiredLevel: 1
  },
  {
    id: 'hard_bargain',
    name: 'Mano de Hierro',
    branch: 'business',
    tier: 2,
    cost: 1,
    icon: '[PACTO]',
    desc: 'Habilidad psicológica para negociar contratos sin ceder ante agentes.',
    effectSummary: '-15% En demandas salariales de fichajes y renovaciones',
    requiredLevel: 3,
    prerequisiteId: 'financial_guru'
  },
  {
    id: 'super_agent',
    name: 'Ventas Galácticas',
    branch: 'business',
    tier: 3,
    cost: 2,
    icon: '[AGENTE]',
    desc: 'Capacidad para generar guerras de ofertas millonarias por tus figuras.',
    effectSummary: '+20% En propuestas de compra de clubes IA por tus futbolistas',
    requiredLevel: 7,
    prerequisiteId: 'hard_bargain'
  }
];

export class ManagerRPG {
  /**
   * Asegura que el estado RPG esté inicializado en GameState
   */
  static initIfMissing(): ManagerRPGState {
    const gameState = db.gameState;
    if (!gameState) {
      return { level: 1, xp: 0, talentPoints: 1, unlockedTalents: {} };
    }

    if (!gameState.managerRpg) {
      gameState.managerRpg = {
        level: 1,
        xp: 0,
        talentPoints: 1, // Punto inicial de bienvenida
        unlockedTalents: {}
      };
    }

    return gameState.managerRpg;
  }

  /**
   * Calcula la EXP necesaria para pasar del nivel actual al siguiente
   */
  static getXpRequired(level: number): number {
    return Math.round(150 * Math.pow(level, 1.28));
  }

  /**
   * Otorga EXP al DT y procesa posibles subidas de nivel
   */
  static awardXP(amount: number, reason: string): { leveledUp: boolean; newLevel: number; pointsGained: number; msg: string } {
    const rpg = ManagerRPG.initIfMissing();
    rpg.xp += amount;

    let leveledUp = false;
    let pointsGained = 0;

    let xpNeeded = ManagerRPG.getXpRequired(rpg.level);
    while (rpg.xp >= xpNeeded && rpg.level < 50) {
      rpg.xp -= xpNeeded;
      rpg.level++;
      rpg.talentPoints++;
      pointsGained++;
      leveledUp = true;
      xpNeeded = ManagerRPG.getXpRequired(rpg.level);
    }

    if (leveledUp) {
      sfx.playLevelUp();
      const gameState = db.gameState;
      if (gameState && gameState.eventsLog) {
        gameState.eventsLog.unshift({
          date: `Semana ${gameState.week || 1}`,
          text: `SUBIDA DE NIVEL DE DT: Alcanzaste el Nivel ${rpg.level} (+${pointsGained} Punto de Talento disponible).`
        });
      }
    }

    db.saveGame();

    return {
      leveledUp,
      newLevel: rpg.level,
      pointsGained,
      msg: leveledUp
        ? `¡SUBISTE AL NIVEL ${rpg.level} DE DT! (+${pointsGained} Puntos de Talento)`
        : `+${amount} EXP de Mánager (${reason})`
    };
  }

  /**
   * Verifica si un talento específico está desbloqueado
   */
  static hasTalent(talentId: string): boolean {
    const rpg = ManagerRPG.initIfMissing();
    return Boolean(rpg.unlockedTalents[talentId]);
  }

  /**
   * Desbloquea un talento consumiendo Puntos de Talento
   */
  static unlockTalent(talentId: string): ActionResult {
    const rpg = ManagerRPG.initIfMissing();
    const talent = TALENTS_CATALOG.find(t => t.id === talentId);

    if (!talent) {
      return { success: false, reason: 'Talento desconocido.' };
    }

    if (rpg.unlockedTalents[talentId]) {
      return { success: false, reason: 'Este talento ya ha sido desbloqueado.' };
    }

    if (rpg.level < talent.requiredLevel) {
      return { success: false, reason: `Requiere Nivel ${talent.requiredLevel} de DT (Tu nivel actual: ${rpg.level}).` };
    }

    if (talent.prerequisiteId && !rpg.unlockedTalents[talent.prerequisiteId]) {
      const prereq = TALENTS_CATALOG.find(t => t.id === talent.prerequisiteId);
      return { success: false, reason: `Debes desbloquear primero el talento previo: "${prereq?.name || talent.prerequisiteId}".` };
    }

    if (rpg.talentPoints < talent.cost) {
      return { success: false, reason: `Puntos de Talento insuficientes. Necesitas ${talent.cost} pts (Tienes ${rpg.talentPoints}).` };
    }

    rpg.talentPoints -= talent.cost;
    rpg.unlockedTalents[talentId] = true;

    // Aplicar efectos inmediatos si corresponde
    if (talentId === 'iron_discipline') {
      const gameState = db.gameState;
      if (gameState && gameState.teamSpirit < 60) {
        gameState.teamSpirit = 60;
      }
    }

    sfx.playLevelUp();
    db.saveGame();

    return {
      success: true,
      message: `¡Talento desbloqueado: ${talent.name}! ${talent.effectSummary}`
    };
  }

  /**
   * Devuelve el catálogo completo de talentos
   */
  static getTalentsCatalog(): TalentDefinition[] {
    return TALENTS_CATALOG;
  }
}
