// Módulo de Cantera (Youth Academy) y Canteranos Avanzados con Niveles de Ojeador
// Migrado a TypeScript (Fase 1): tipos conectados a js/types.ts, lógica intacta.

import { db } from '../data/db.js';
import { assignPersonalityRole, calculatePlayerMarketValue, calculatePlayerSalary } from '../data/teamData.js';

import type { Position, Region, YouthProspect } from '../types.js';

/** Datos por nivel de ojeador (SCOUT_LEVEL_DATA) */
interface ScoutLevelData {
  name: string;
  upgradeCost: number;
  scoutCost: number;
  minOvr: number;
  maxOvr: number;
  minPot: number;
  maxPot: number;
  accuracy: string;
}

/** Pool de nombres y países de una región del mundo */
interface RegionalNames {
  firstNames: string[];
  lastNames: string[];
  countries: string[];
}

// Diccionario de Nombres y Apellidos por Región del Mundo
const REGIONAL_NAMES: Record<string, RegionalNames> = {
  'Sudamérica': {
    firstNames: ['Gabriel', 'Mateo', 'Lucas', 'Thiago', 'Enzo', 'Agustín', 'Joaquín', 'Ignacio', 'Santino', 'Bautista', 'Vinícius', 'Matheus', 'Rodrigo', 'Felipe', 'Santiago'],
    lastNames: ['Suárez', 'Pérez', 'Gómez', 'Ríos', 'Navarro', 'Castillo', 'Vargas', 'Morales', 'Reyes', 'Mendoza', 'Silva', 'Santos', 'Oliveira', 'Fernández', 'Rodríguez'],
    countries: ['Argentina', 'Brasil', 'Colombia', 'Chile', 'Uruguay', 'Ecuador', 'Perú', 'Paraguay', 'Bolivia', 'Venezuela']
  },
  'Europa': {
    firstNames: ['Hugo', 'Oliver', 'Lucas', 'Liam', 'Marco', 'Matteo', 'Lukas', 'Felix', 'Enzo', 'Antoine', 'Ruben', 'Gonçalo', 'Sven', 'Jan'],
    lastNames: ['García', 'Smith', 'Müller', 'Rossi', 'Dubois', 'Silva', 'Schmidt', 'Taylor', 'Ferrari', 'Martin', 'Brito', 'Jansen', 'Nielsen'],
    countries: ['España', 'Inglaterra', 'Italia', 'Alemania', 'Francia', 'Portugal', 'Países Bajos', 'Bélgica', 'Escocia', 'Dinamarca']
  },
  'Norteamérica': {
    firstNames: ['Ethan', 'Liam', 'Mason', 'Noah', 'Mateo', 'Carlos', 'Diego', 'Jackson', 'Logan', 'Alexander', 'Sebastian', 'Oliver'],
    lastNames: ['Johnson', 'Smith', 'Hernández', 'González', 'Martínez', 'Williams', 'Brown', 'Jones', 'López', 'Davis', 'García'],
    countries: ['Estados Unidos', 'México', 'Canadá']
  },
  'Centroamérica': {
    firstNames: ['Keylor', 'Joel', 'Bryan', 'Celso', 'Carlos', 'Oscar', 'Marvin', 'Henry', 'Erick', 'Anthony', 'Kevin'],
    lastNames: ['Navas', 'Ruiz', 'Borges', 'Campbell', 'Figueroa', 'Pinto', 'López', 'Hernández', 'Reyes', 'Gómez'],
    countries: ['Costa Rica', 'Honduras', 'Guatemala']
  },
  'Asia': {
    firstNames: ['Ren', 'Haruto', 'Yuki', 'Sora', 'Kaito', 'Riku', 'Takumi', 'Daiki', 'Kenta', 'Ali', 'Mohammed', 'Salem'],
    lastNames: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Al-Dawsari', 'Al-Harbi', 'Al-Ghamdi'],
    countries: ['Japón', 'Arabia Saudita']
  }
};

export const SCOUT_LEVEL_DATA: Record<number, ScoutLevelData> = {
  1: { name: 'Novato (Local)', upgradeCost: 0, scoutCost: 100000, minOvr: 55, maxOvr: 64, minPot: 65, maxPot: 78, accuracy: 'Baja' },
  2: { name: 'Experimentado (Regional)', upgradeCost: 500000, scoutCost: 250000, minOvr: 60, maxOvr: 68, minPot: 72, maxPot: 84, accuracy: 'Media' },
  3: { name: 'Profesional (Continental)', upgradeCost: 1500000, scoutCost: 500000, minOvr: 63, maxOvr: 72, minPot: 78, maxPot: 89, accuracy: 'Alta' },
  4: { name: 'Internacional (Mundial)', upgradeCost: 3500000, scoutCost: 1000000, minOvr: 66, maxOvr: 75, minPot: 83, maxPot: 93, accuracy: 'Élite' },
  5: { name: 'Leyenda (Cazatalentos Élite)', upgradeCost: 7000000, scoutCost: 2000000, minOvr: 70, maxOvr: 78, minPot: 87, maxPot: 97, accuracy: 'Perfecta ⭐' }
};

/** Resultado de acciones de cantera: éxito con datos o fallo con razón */
interface YouthActionResult {
  success: boolean;
  reason?: string;
  message?: string;
  prospects?: YouthProspect[];
}

export class YouthAcademyEngine {
  /**
   * Genera nuevos prospectos de cantera según la región elegida y nivel de ojeador
   */
  static scoutNewProspects(region: Region = 'Sudamérica'): YouthActionResult {
    const gameState = db.gameState!;
    const scoutLevel = gameState.scoutLevel || 1;
    const levelData = SCOUT_LEVEL_DATA[scoutLevel] || SCOUT_LEVEL_DATA[1]!;

    if (gameState.budget < levelData.scoutCost) {
      return {
        success: false,
        reason: `Presupuesto insuficiente. Se requieren €${(levelData.scoutCost / 1000).toFixed(0)}K para ojear en ${region} con tu ojeador Nivel ${scoutLevel}.`
      };
    }

    gameState.budget -= levelData.scoutCost;

    const regionalData = REGIONAL_NAMES[region] || REGIONAL_NAMES['Sudamérica']!;
    const prospects: YouthProspect[] = [];
    const count = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const fn = regionalData.firstNames[Math.floor(Math.random() * regionalData.firstNames.length)]!;
      const ln = regionalData.lastNames[Math.floor(Math.random() * regionalData.lastNames.length)]!;
      const country = regionalData.countries[Math.floor(Math.random() * regionalData.countries.length)]!;
      const pos: Position = (['POR', 'DFC', 'LI', 'LD', 'MCD', 'MC', 'MCO', 'EI', 'ED', 'DC'] as Position[])[Math.floor(Math.random() * 10)]!;

      const age = 15 + Math.floor(Math.random() * 4); // 15 - 18 años
      const ovr = levelData.minOvr + Math.floor(Math.random() * (levelData.maxOvr - levelData.minOvr + 1));

      const potMin = Math.min(96, Math.max(ovr + 5, levelData.minPot + Math.floor(Math.random() * 6)));
      const potMax = Math.min(97, Math.max(potMin + 4, levelData.maxPot - Math.floor(Math.random() * 4)));

      const value = calculatePlayerMarketValue(ovr, age, potMax);
      const salary = calculatePlayerSalary(value, ovr);

      // Cast a YouthProspect: los campos Player (teamId, morale, form, appearances,
      // seasonGoals) se completan en promoteToFirstTeam; el resto (statsHistory, fcIqRole,
      // tacticalAffinity...) lo migra loadGame al persistir. No "arreglar" con campos adicionales.
      prospects.push({
        id: `youth_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`,
        name: `${fn} ${ln}`,
        country: country,
        region: region,
        pos: pos,
        age: age,
        overall: ovr,
        potential: potMax,
        potRange: `${potMin} - ${potMax}`,
        pac: Math.min(99, Math.max(40, ovr + Math.floor((Math.random() - 0.5) * 12))),
        sho: Math.min(99, Math.max(40, ovr + Math.floor((Math.random() - 0.5) * 12))),
        pas: Math.min(99, Math.max(40, ovr + Math.floor((Math.random() - 0.5) * 12))),
        dri: Math.min(99, Math.max(40, ovr + Math.floor((Math.random() - 0.5) * 12))),
        def: Math.min(99, Math.max(40, ovr + Math.floor((Math.random() - 0.5) * 12))),
        phy: Math.min(99, Math.max(40, ovr + Math.floor((Math.random() - 0.5) * 12))),
        value: value,
        salary: salary,
        promotionCost: Math.round(ovr * 1500 + potMax * 2000)
      } as YouthProspect);
    }

    if (!gameState.youthAcademy) gameState.youthAcademy = [];
    gameState.youthAcademy.push(...prospects);
    db.saveGame();

    return { success: true, prospects };
  }

  /**
   * Sube de nivel el ojeador de cantera
   */
  static upgradeScoutLevel(): YouthActionResult {
    const gameState = db.gameState!;
    const currentLevel = gameState.scoutLevel || 1;

    if (currentLevel >= 5) {
      return { success: false, reason: 'Tu ojeador ya ha alcanzado el Nivel Máximo Leyenda (Nivel 5).' };
    }

    const nextLevel = currentLevel + 1;
    const upgradeCost = SCOUT_LEVEL_DATA[nextLevel]!.upgradeCost;

    if (gameState.budget < upgradeCost) {
      return {
        success: false,
        reason: `Presupuesto insuficiente. Se requieren €${(upgradeCost / 1000000).toFixed(1)}M para subir al Nivel ${nextLevel}.`
      };
    }

    gameState.budget -= upgradeCost;
    gameState.scoutLevel = nextLevel;
    db.saveGame();

    return {
      success: true,
      message: `¡Ojeador mejorado a Nivel ${nextLevel}: ${SCOUT_LEVEL_DATA[nextLevel]!.name}!`
    };
  }

  /**
   * Descarta un canterano de la academia
   */
  static dismissProspect(playerDataId: string): YouthActionResult {
    const gameState = db.gameState!;
    const academy = gameState.youthAcademy || [];
    const idx = academy.findIndex(p => p.id === playerDataId);
    if (idx !== -1) {
      const removed = academy.splice(idx, 1)[0]!;
      db.saveGame();
      return { success: true, message: `${removed.name} ha sido descartado de la cantera.` };
    }
    return { success: false, reason: 'Canterano no encontrado.' };
  }

  /**
   * Promociona a un juvenil al primer equipo
   */
  static promoteToFirstTeam(youthPlayer: YouthProspect): YouthActionResult {
    const gameState = db.gameState!;
    const promotionCost = youthPlayer.promotionCost || 100000;

    if (gameState.budget < promotionCost) {
      return {
        success: false,
        reason: `Presupuesto insuficiente. Se requieren €${(promotionCost / 1000).toFixed(0)}K para el contrato profesional de ${youthPlayer.name}.`
      };
    }

    gameState.budget -= promotionCost;

    const userTeamId = gameState.userTeamId;
    const squad = db.getTeamPlayers(userTeamId);

    youthPlayer.teamId = userTeamId;
    youthPlayer.morale = 95;
    youthPlayer.form = 80;
    youthPlayer.appearances = 0;
    youthPlayer.seasonGoals = 0;
    // v4.0 — Rol de vestuario automático según las características del canterano
    if (!youthPlayer.personalityRole) {
      youthPlayer.personalityRole = assignPersonalityRole(youthPlayer.age, youthPlayer.overall, youthPlayer.potential || youthPlayer.overall);
    }
    squad.push(youthPlayer);

    // Remover de la cantera
    const academy = gameState.youthAcademy;
    const idx = academy.findIndex(p => p.id === youthPlayer.id);
    if (idx !== -1) academy.splice(idx, 1);

    db.saveGame();
    return {
      success: true,
      message: `¡${youthPlayer.name} (${youthPlayer.pos}, OVR: ${youthPlayer.overall}, Pot: ${youthPlayer.potential}) ha firmado su contrato profesional y fue promovido al primer equipo!`
    };
  }

  /**
   * Simula el Torneo de Cantera Sub-19 anual para evolucionar a los juveniles (+1 a +3 OVR). Solo 1 por temporada.
   */
  static runYouthTournamentMatch(): YouthActionResult {
    const gameState = db.gameState!;

    if (gameState.youthTournamentPlayed) {
      return {
        success: false,
        reason: `🏆 El Torneo de Cantera Sub-19 ya fue disputado durante la presente temporada (${gameState.season}/${gameState.season + 1}). Solo se permite 1 torneo juvenil por temporada.`
      };
    }

    const academy = gameState.youthAcademy || [];
    if (academy.length === 0) {
      return { success: false, reason: 'No tienes canteranos en la academia para disputar el Torneo Sub-19.' };
    }

    academy.forEach(p => {
      const gain = Math.floor(Math.random() * 3) + 1;
      p.overall = Math.min(p.potential || 90, p.overall + gain);
      p.value = calculatePlayerMarketValue(p.overall, p.age, p.potential);
      p.salary = calculatePlayerSalary(p.value, p.overall);
    });

    gameState.youthTournamentPlayed = true;
    db.saveGame();
    return {
      success: true,
      message: `🏆 ¡TORNEO DE CANTERA SUB-19 COMPLETADO! Tus ${academy.length} canteranos disputaron la edición anual y evolucionaron (+1 a +3 OVR).`
    };
  }
}
