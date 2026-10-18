/**
 * ============================================================================
 * ENTRENADOR LEYENDA - MOTOR DE LOGROS Y DESAFÍOS (achievementsEngine.ts)
 * ============================================================================
 * Registra y desbloquea retos de carrera con recompensas de EXP y prestigio.
 */

import { db } from '../data/db.js';
import { ManagerRPG } from './managerRPG.js';
import { sfx } from '../../assets/audio/sfx.js';
import type { Achievement } from '../types.js';

export const ACHIEVEMENTS_LIST: Array<Omit<Achievement, 'unlocked'>> = [
  {
    id: 'first_win',
    title: 'Primer Grito Sagrado',
    desc: 'Consigue tu primera victoria oficial como Director Técnico.',
    icon: '[TRIUNFO]',
    category: 'matches',
    xpReward: 100,
    maxProgress: 1
  },
  {
    id: 'derby_winner',
    title: 'Orgullo de la Ciudad',
    desc: 'Vence a tu máximo rival histórico en un Clásico oficial.',
    icon: '[CLÁSICO]',
    category: 'matches',
    xpReward: 250,
    maxProgress: 1
  },
  {
    id: 'streak_5',
    title: 'Racha Imparable',
    desc: 'Hilvana una racha de 5 victorias consecutivas en la temporada.',
    icon: '[RACHA 5]',
    category: 'matches',
    xpReward: 300,
    maxProgress: 5
  },
  {
    id: 'streak_10',
    title: 'Máquina de Ganar',
    desc: 'Alcanza la mítica cifra de 10 triunfos seguidos.',
    icon: '[RACHA 10]',
    category: 'matches',
    xpReward: 600,
    maxProgress: 10
  },
  {
    id: 'clean_sheet_3',
    title: 'Cerrojo Impenetrable',
    desc: 'Mantén tu arco en cero durante 3 partidos oficiales consecutivos.',
    icon: '[CERROJO]',
    category: 'matches',
    xpReward: 200,
    maxProgress: 3
  },
  {
    id: 'trophy_winner',
    title: 'Hambre de Gloria',
    desc: 'Conquista tu primer trofeo oficial (Liga, Copa o Continental).',
    icon: '[TÍTULO]',
    category: 'trophies',
    xpReward: 500,
    maxProgress: 1
  },
  {
    id: 'treble',
    title: 'La Triple Corona',
    desc: 'Conquista al menos 2 títulos en la misma temporada (Doblete o Triplete).',
    icon: '[CORONA]',
    category: 'trophies',
    xpReward: 1000,
    maxProgress: 2
  },
  {
    id: 'wonderkid_promoted',
    title: 'Cazatalentos de Oro',
    desc: 'Promociona al primer equipo un canterano con 85+ de potencial.',
    icon: '[CANTERA]',
    category: 'management',
    xpReward: 250,
    maxProgress: 1
  },
  {
    id: 'dt_level_5',
    title: 'Graduado con Honores',
    desc: 'Alcanza el Nivel 5 de Director Técnico en tu carrera.',
    icon: '[NIVEL 5]',
    category: 'management',
    xpReward: 200,
    maxProgress: 5
  },
  {
    id: 'dt_level_15',
    title: 'Estratega de Élite',
    desc: 'Alcanza el Nivel 15 de Director Técnico.',
    icon: '[NIVEL 15]',
    category: 'management',
    xpReward: 500,
    maxProgress: 15
  },
  {
    id: 'millionaire',
    title: 'Billetera Galáctica',
    desc: 'Acumula más de €30M en el presupuesto del club.',
    icon: '[FINANZAS]',
    category: 'management',
    xpReward: 300,
    maxProgress: 30
  },
  {
    id: 'veteran',
    title: 'Viejo Lobo de Mar',
    desc: 'Completa 5 temporadas dirigidas en tu trayectoria profesional.',
    icon: '[LEYENDA]',
    category: 'special',
    xpReward: 800,
    maxProgress: 5
  }
];

export class AchievementsEngine {
  /**
   * Inicializa la estructura en GameState si no existe
   */
  static initIfMissing(): Record<string, { unlocked: boolean; date?: string; progress?: number }> {
    const gameState = db.gameState;
    if (!gameState) return {};
    if (!gameState.achievements) {
      gameState.achievements = {};
    }
    return gameState.achievements;
  }

  /**
   * Intenta desbloquear un logro si no ha sido desbloqueado previamente
   */
  static checkAndUnlock(achievementId: string, currentVal = 1): boolean {
    const store = AchievementsEngine.initIfMissing();
    const def = ACHIEVEMENTS_LIST.find(a => a.id === achievementId);
    if (!def) return false;

    if (!store[achievementId]) {
      store[achievementId] = { unlocked: false, progress: 0 };
    }

    const item = store[achievementId]!;
    if (item.unlocked) return false;

    item.progress = Math.max(item.progress || 0, currentVal);

    if (item.progress >= (def.maxProgress || 1)) {
      item.unlocked = true;
      item.date = new Date().toLocaleDateString('es-ES');

      // Recompensa de EXP de DT y reputación
      ManagerRPG.awardXP(def.xpReward, `Logro: ${def.title}`);
      if (db.gameState) {
        db.gameState.reputation = Math.min(99, db.gameState.reputation + 1);
        db.gameState.managerScore += 100;
        if (db.gameState.eventsLog) {
          db.gameState.eventsLog.unshift({
            date: `Semana ${db.gameState.week || 1}`,
            text: `¡DESAFÍO DESBLOQUEADO: "${def.title}"! ${def.desc} (+${def.xpReward} EXP DT).`
          });
        }
      }

      sfx.playTransferChime();
      db.saveGame();
      return true;
    }

    return false;
  }

  /**
   * Lista todos los logros con su estado actual de avance
   */
  static getAllAchievements(): Achievement[] {
    const store = AchievementsEngine.initIfMissing();
    return ACHIEVEMENTS_LIST.map(def => {
      const saved = store[def.id];
      return {
        ...def,
        unlocked: Boolean(saved?.unlocked),
        date: saved?.date,
        progress: saved?.progress || 0
      };
    });
  }
}
