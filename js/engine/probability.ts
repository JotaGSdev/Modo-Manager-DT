// Motor Analítico de Probabilidades para Fichajes, Partidos y Eventos
// Migrado a TypeScript (Fase 1): tipos conectados a js/types.ts, lógica intacta.

import type { MatchProbabilities, MatchupBonus, MatchupStyle, Player, PlayStyle, RivalCounterOffer, Team } from '../types.js';

/**
 * Normaliza un estilo de juego (o string libre) a una clave de la matriz táctica.
 * Mismo orden de comprobación que la cadena de ternarios original de
 * `calculateMatchProbabilities`: Tiki → Gegen/Presión → Catena/Autobús → Bandas → Contraataque.
 */
export function cleanStyle(style: string): MatchupStyle {
  if ((style || '').includes('Tiki')) return 'Tiki-Taka';
  if ((style || '').includes('Gegen') || (style || '').includes('Presión')) return 'Gegenpressing';
  if ((style || '').includes('Catena') || (style || '').includes('Autobús')) return 'Catenaccio';
  if ((style || '').includes('Bandas')) return 'Juego por Bandas';
  return 'Contraataque';
}

/**
 * Matriz de enfrentamientos tácticos estilo vs estilo.
 * FUENTE ÚNICA DE VERDAD: también la usa tactics.ts (TacticsEngine.getTacticalMatchup),
 * que antes la duplicaba como TACTICAL_MATCHUP_MATRIX. La descripción es opcional
 * para el motor de partidos, que solo lee bonusXG y possession.
 */
export const TACTICAL_MATCHUP_MATRIX: Record<MatchupStyle, Record<MatchupStyle, MatchupBonus>> = {
  'Tiki-Taka': {
    'Catenaccio': { bonusXG: 0.35, possession: 62, desc: 'Posesión paciente desarmó el cerrojo' },
    'Juego por Bandas': { bonusXG: 0.25, possession: 58, desc: 'Triangulaciones por el centro superaron el juego exterior' },
    'Gegenpressing': { bonusXG: -0.20, possession: 46, desc: 'La presión alta rival asfixió la salida de balón' },
    'Contraataque': { bonusXG: 0.10, possession: 60, desc: 'Dominio de balón pero vulnerabilidad al espacio' },
    'Tiki-Taka': { bonusXG: 0, possession: 50, desc: 'Duelo equilibrado de posesión' }
  },
  'Gegenpressing': {
    'Tiki-Taka': { bonusXG: 0.38, possession: 54, desc: 'Presión tras pérdida provocó pérdidas peligrosas' },
    'Juego por Bandas': { bonusXG: 0.22, possession: 55, desc: 'Intensidad física cortó los avances por banda' },
    'Contraataque': { bonusXG: -0.30, possession: 58, desc: 'Espaldas desprotegidas castigadas al contraataque' },
    'Catenaccio': { bonusXG: -0.15, possession: 56, desc: 'Choque contra un muro defensivo impenetrable' },
    'Gegenpressing': { bonusXG: 0, possession: 50, desc: 'Vértigo e intensidad de ida y vuelta' }
  },
  'Catenaccio': {
    'Contraataque': { bonusXG: 0.35, possession: 40, desc: 'Bloque bajo anuló los espacios de contraataque' },
    'Gegenpressing': { bonusXG: 0.20, possession: 42, desc: 'Atrinchertamiento en área forzó tiros desviados' },
    'Tiki-Taka': { bonusXG: -0.25, possession: 38, desc: 'Desgaste defensivo ante el toque paciente' },
    'Juego por Bandas': { bonusXG: -0.20, possession: 41, desc: 'Centros repetidos perforaron el área' },
    'Catenaccio': { bonusXG: 0, possession: 50, desc: 'Partido trabado de cerrojo táctico' }
  },
  'Juego por Bandas': {
    'Catenaccio': { bonusXG: 0.30, possession: 54, desc: 'Desborde de extremos desbordó la marca cerrada' },
    'Contraataque': { bonusXG: 0.15, possession: 55, desc: 'Amplitud de campo generó centros peligrosos' },
    'Tiki-Taka': { bonusXG: -0.18, possession: 42, desc: 'Balón perdido al intentar abrir a las bandas' },
    'Gegenpressing': { bonusXG: -0.20, possession: 45, desc: 'Laterales taponados por la presión rival' },
    'Juego por Bandas': { bonusXG: 0, possession: 50, desc: 'Duelo abierto de centros y desbordes' }
  },
  'Contraataque': {
    'Gegenpressing': { bonusXG: 0.40, possession: 42, desc: 'Zarpazos al espacio castigaron la línea adelantada' },
    'Tiki-Taka': { bonusXG: 0.15, possession: 40, desc: 'Repliegue y salida relámpago con pocos toques' },
    'Catenaccio': { bonusXG: -0.30, possession: 48, desc: 'Sin metros para correr ante un rival replegado' },
    'Juego por Bandas': { bonusXG: -0.12, possession: 45, desc: 'Centro rival interceptado en transición' },
    'Contraataque': { bonusXG: 0, possession: 50, desc: 'Partido cauto a la espera del error ajeno' }
  }
};

export class ProbabilityEngine {
  /**
   * Calcula la probabilidad de éxito de fichaje de un jugador (0% - 100%)
   * @param player - Jugador deseado
   * @param buyingTeam - Club comprador
   * @param sellingTeam - Club vendedor
   * @param offerAmount - Oferta económica
   * @param wageOffered - Salario ofrecido
   * @param teamTablePosition - Posición actual del equipo (1-20)
   * @param trophyCount - Títulos ganados recientemente
   */
  static calculateTransferChance(
    player: Player,
    buyingTeam: Team,
    sellingTeam: Team,
    offerAmount: number,
    wageOffered: number,
    teamTablePosition = 1,
    trophyCount = 0
  ): number {
    let baseChance = 50;

    // 1. Evaluación de Valor de Traspaso vs Oferta
    const valueRatio = offerAmount / Math.max(1, player.value);
    if (valueRatio < 0.85) {
      baseChance -= 45; // Oferta demasiado baja
    } else if (valueRatio >= 1.3) {
      baseChance += 35; // Oferta generosa
    } else {
      baseChance += (valueRatio - 1.0) * 50;
    }

    // 2. Evaluación de Salario
    const wageRatio = wageOffered / Math.max(1, player.salary);
    if (wageRatio < 0.9) {
      baseChance -= 30;
    } else {
      baseChance += Math.min(25, (wageRatio - 1.0) * 40);
    }

    // 3. Diferencia de Prestigio/Popularidad entre clubes
    const repDiff = buyingTeam.reputation - sellingTeam.reputation;
    baseChance += repDiff * 0.8;

    // 4. Posición en la tabla
    if (teamTablePosition <= 3) {
      baseChance += 12; // Puestos de Champions/Libertadores
    } else if (teamTablePosition > 12) {
      baseChance -= 15;
    }

    // 5. Palmarés reciente
    baseChance += Math.min(15, trophyCount * 4);

    // 6. Si el jugador es una súper estrella (>85 ovr) y el equipo tiene menor reputación
    if (player.overall > 85 && buyingTeam.reputation < 82) {
      baseChance -= 35;
    }

    return Math.max(5, Math.min(98, Math.round(baseChance)));
  }

  /**
   * Genera contraofertas de equipos rivales por un jugador objetivo
   * @returns Contraoferta o null si ningún rival se interesa
   */
  static generateRivalCounterOffer(player: Player, currentOffer: number): RivalCounterOffer | null {
    const rivalInterest = Math.random() < (player.overall > 78 ? 0.45 : 0.20);
    if (!rivalInterest) return null;

    const premium = 1.08 + Math.random() * 0.25; // 8% - 33% más
    const rivalOffer = Math.round(currentOffer * premium);

    const rivalClubs = ['Real Madrid', 'Manchester City', 'Bayern München', 'Paris Saint-Germain', 'Flamengo', 'Palmeiras', 'Boca Juniors', 'Al-Hilal'];
    const randomRival = rivalClubs[Math.floor(Math.random() * rivalClubs.length)] ?? 'Real Madrid';

    return {
      rivalName: randomRival,
      offerAmount: rivalOffer
    };
  }

  /**
   * Genera las probabilidades de partido (xG y posesión) según valoración, táctica y choque probabilístico de estilos
   */
  static calculateMatchProbabilities(
    homeTeamOvr: number,
    awayTeamOvr: number,
    homeTacticsBonus = 0,
    awayTacticsBonus = 0,
    homeStyle: PlayStyle = 'Tiki-Taka',
    awayStyle: PlayStyle = 'Tiki-Taka'
  ): MatchProbabilities {
    const ovrDiff = (homeTeamOvr + homeTacticsBonus + 3) - (awayTeamOvr + awayTacticsBonus);

    let matchupBonusXG = 0;
    let basePossession = 50;

    const hStyleClean = cleanStyle(homeStyle);
    const aStyleClean = cleanStyle(awayStyle);

    const matchup = TACTICAL_MATCHUP_MATRIX[hStyleClean][aStyleClean] || { bonusXG: 0, possession: 50 };
    matchupBonusXG = matchup.bonusXG;
    basePossession = matchup.possession;

    // Base xG impulsada por OVR y choque de estilos de juego
    let homeXG = 1.4 + (ovrDiff * 0.08) + matchupBonusXG;
    let awayXG = 1.1 - (ovrDiff * 0.07) - (matchupBonusXG * 0.8);

    homeXG = Math.max(0.3, Math.min(4.5, homeXG));
    awayXG = Math.max(0.2, Math.min(4.0, awayXG));

    const possession = Math.max(30, Math.min(75, Math.round(basePossession + ovrDiff * 0.8)));

    return {
      homeXG: Number(homeXG.toFixed(2)),
      awayXG: Number(awayXG.toFixed(2)),
      homePossession: possession
    };
  }

  /**
   * Genera crecimiento de juvenil de cantera según edad y potencial
   */
  static calculateYouthGrowth(youthPlayer: Player): number {
    const potGap = youthPlayer.potential - youthPlayer.overall;
    if (potGap <= 0) return 0;

    const growthChance = Math.random();
    if (growthChance > 0.3) {
      const growthAmount = 1 + Math.floor(Math.random() * Math.min(3, potGap));
      return growthAmount;
    }
    return 0;
  }
}
