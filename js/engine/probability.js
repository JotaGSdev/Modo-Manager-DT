// Motor Analítico de Probabilidades para Fichajes, Partidos y Eventos

export class ProbabilityEngine {
  /**
   * Calcula la probabilidad de éxito de fichaje de un jugador (0% - 100%)
   * @param {Object} player - Jugador deseado
   * @param {Object} buyingTeam - Club comprador
   * @param {Object} sellingTeam - Club vendedor
   * @param {number} offerAmount - Oferta económica
   * @param {number} wageOffered - Salario ofrecido
   * @param {number} teamTablePosition - Posición actual del equipo (1-20)
   * @param {number} trophyCount - Títulos ganados recientemente
   */
  static calculateTransferChance(player, buyingTeam, sellingTeam, offerAmount, wageOffered, teamTablePosition = 1, trophyCount = 0) {
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
   */
  static generateRivalCounterOffer(player, currentOffer) {
    const rivalInterest = Math.random() < (player.overall > 78 ? 0.45 : 0.20);
    if (!rivalInterest) return null;

    const premium = 1.08 + Math.random() * 0.25; // 8% - 33% más
    const rivalOffer = Math.round(currentOffer * premium);
    
    const rivalClubs = ['Real Madrid', 'Manchester City', 'Bayern München', 'Paris Saint-Germain', 'Flamengo', 'Palmeiras', 'Boca Juniors', 'Al-Hilal'];
    const randomRival = rivalClubs[Math.floor(Math.random() * rivalClubs.length)];

    return {
      rivalName: randomRival,
      offerAmount: rivalOffer
    };
  }

  /**
   * Genera las probabilidades de partido (xG) según valoración, táctica y bonificaciones de minijuegos
   */
  static calculateMatchProbabilities(homeTeamOvr, awayTeamOvr, homeTacticsBonus = 0, awayTacticsBonus = 0) {
    const ovrDiff = (homeTeamOvr + homeTacticsBonus + 3) - (awayTeamOvr + awayTacticsBonus);
    
    // Base xG
    let homeXG = 1.4 + (ovrDiff * 0.08);
    let awayXG = 1.1 - (ovrDiff * 0.07);

    homeXG = Math.max(0.3, Math.min(4.5, homeXG));
    awayXG = Math.max(0.2, Math.min(4.0, awayXG));

    return {
      homeXG: Number(homeXG.toFixed(2)),
      awayXG: Number(awayXG.toFixed(2))
    };
  }

  /**
   * Genera crecimiento de juvenil de cantera según edad y potencial
   */
  static calculateYouthGrowth(youthPlayer) {
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
