/**
 * ============================================================================
 * SERVICIO DE INTEGRACIÓN CON API-FOOTBALL (v3.football.api-sports.io)
 * ============================================================================
 * Permite consultar escudos, logos de ligas, posiciones reales y estadísticas
 * utilizando la clave de API oficial.
 */

export const API_FOOTBALL_CONFIG = {
  apiKey: 'dd5adef4b4e457b125b038f86786fcdd',
  baseUrl: 'https://v3.football.api-sports.io'
};

/**
 * Diccionario Oficial de IDs de Competiciones en API-Football (v3)
 */
export const API_LEAGUE_IDS = {
  // LIGAS NACIONALES
  'arg_1': { id: 128, name: 'Liga Profesional de Fútbol', country: 'Argentina' },
  'esp_1': { id: 140, name: 'LaLiga EA Sports', country: 'España' },
  'eng_1': { id: 39, name: 'Premier League', country: 'Inglaterra' },
  'ita_1': { id: 135, name: 'Serie A', country: 'Italia' },
  'ger_1': { id: 78, name: 'Bundesliga', country: 'Alemania' },
  'fra_1': { id: 61, name: 'Ligue 1', country: 'Francia' },
  'bra_1': { id: 71, name: 'Brasileirão Série A', country: 'Brasil' },
  'col_1': { id: 239, name: 'Liga BetPlay', country: 'Colombia' },
  'chi_1': { id: 265, name: 'Campeonato Nacional Itaú', country: 'Chile' },
  'per_1': { id: 281, name: 'Liga 1 Te Apuesto', country: 'Perú' },
  'mex_1': { id: 262, name: 'Liga MX', country: 'México' },
  'usa_1': { id: 253, name: 'Major League Soccer (MLS)', country: 'Estados Unidos' },
  'por_1': { id: 94, name: 'Primeira Liga', country: 'Portugal' },
  'ned_1': { id: 88, name: 'Eredivisie', country: 'Países Bajos' },
  'sau_1': { id: 307, name: 'Saudi Pro League', country: 'Arabia Saudita' },

  // COPAS NACIONALES
  'cup_arg': { id: 130, name: 'Copa Argentina', type: 'Cup' },
  'cup_esp': { id: 143, name: 'Copa del Rey', type: 'Cup' },
  'cup_eng': { id: 45, name: 'FA Cup', type: 'Cup' },
  'cup_ita': { id: 137, name: 'Coppa Italia', type: 'Cup' },
  'cup_ger': { id: 81, name: 'DFB Pokal', type: 'Cup' },
  'cup_bra': { id: 73, name: 'Copa do Brasil', type: 'Cup' },

  // COMPETICIONES CONTINENTALES
  'champions_league': { id: 2, name: 'UEFA Champions League', region: 'Europa' },
  'europa_league': { id: 3, name: 'UEFA Europa League', region: 'Europa' },
  'libertadores': { id: 13, name: 'Copa CONMEBOL Libertadores', region: 'Sudamérica' },
  'sudamericana': { id: 11, name: 'Copa CONMEBOL Sudamericana', region: 'Sudamérica' },
  'concacaf_champions': { id: 16, name: 'Concacaf Champions Cup', region: 'Norteamérica' },

  // TORNEOS DE SELECCIONES
  'world_cup': { id: 1, name: 'Copa Mundial de la FIFA', scope: 'Mundial' },
  'copa_america': { id: 9, name: 'Copa América', scope: 'CONMEBOL' },
  'euro': { id: 4, name: 'UEFA Eurocopa', scope: 'UEFA' },
  'gold_cup': { id: 22, name: 'CONCACAF Copa de Oro', scope: 'CONCACAF' }
};

export class APIFootballService {
  /**
   * Realiza una petición GET segura a la API de API-Football
   * @param {string} endpoint - Ejemplo: '/leagues?id=128'
   */
  static async fetchAPI(endpoint) {
    try {
      const response = await fetch(`${API_FOOTBALL_CONFIG.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'x-apisports-key': API_FOOTBALL_CONFIG.apiKey
        }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.response;
    } catch (err) {
      console.warn(`[API-Football Warning] No se pudo conectar a ${endpoint}:`, err);
      return null;
    }
  }

  /**
   * Obtiene la tabla de posiciones en vivo de una liga desde la API
   * @param {number} leagueId - ID de la liga en API-Football
   * @param {number} [season=2024] - Temporada
   */
  static async getRealStandings(leagueId, season = 2024) {
    const data = await this.fetchAPI(`/standings?league=${leagueId}&season=${season}`);
    if (data && data.length > 0) {
      return data[0].league.standings[0];
    }
    return null;
  }

  /**
   * Obtiene los equipos y sus escudos oficiales HD en PNG
   * @param {number} leagueId 
   * @param {number} season 
   */
  static async getLeagueTeams(leagueId, season = 2024) {
    const data = await this.fetchAPI(`/teams?league=${leagueId}&season=${season}`);
    if (data) {
      return data.map(item => ({
        id: item.team.id,
        name: item.team.name,
        code: item.team.code,
        country: item.team.country,
        founded: item.team.founded,
        logo: item.team.logo,
        stadium: item.venue?.name,
        city: item.venue?.city,
        stadiumCapacity: item.venue?.capacity
      }));
    }
    return [];
  }
}
