// Generador e Integrador de Escudos de Equipos y Banderas de Países
// Compatible con API-Football CDN (https://media.api-sports.io) y Assets Locales de Reserva SVG

const COUNTRY_FLAG_CODES = {
  'Argentina': 'ar', 'Brasil': 'br', 'Colombia': 'co', 'Chile': 'cl', 'Uruguay': 'uy',
  'Perú': 'pe', 'Ecuador': 'ec', 'Paraguay': 'py', 'Bolivia': 'bo', 'Venezuela': 've',
  'España': 'es', 'Inglaterra': 'gb', 'Italia': 'it', 'Alemania': 'de', 'Francia': 'fr',
  'Portugal': 'pt', 'Países Bajos': 'nl', 'Bélgica': 'be', 'Escocia': 'gb-sct', 'Turquía': 'tr',
  'Grecia': 'gr', 'Suiza': 'ch', 'Austria': 'at', 'Dinamarca': 'dk', 'Noruega': 'no',
  'Suecia': 'se', 'Polonia': 'pl', 'República Checa': 'cz', 'Croacia': 'hr', 'México': 'mx',
  'Estados Unidos': 'us', 'Arabia Saudita': 'sa', 'Japón': 'jp', 'Emiratos Árabes': 'ae',
  'Australia': 'au', 'Marruecos': 'ma', 'Egipto': 'eg'
};

const TEAM_API_FOOTBALL_IDS = {
  'real_madrid': 541, 'barcelona': 529, 'atletico': 530, 'boca': 1064, 'river': 1065,
  'man_city': 50, 'man_utd': 33, 'liverpool': 40, 'arsenal': 42, 'chelsea': 49,
  'juventus': 496, 'inter': 505, 'milan': 489, 'psg': 85, 'bayern': 157,
  'dortmund': 165, 'flamengo': 127, 'palmeiras': 121, 'colo_colo': 1137, 'u_chile': 1138,
  'liga_quito': 1145, 'olimpia': 1142, 'penarol': 1150, 'nacional_uy': 1149,
  'millonarios': 1128, 'atl_nacional': 1125, 'america_mx': 2287, 'chivas': 2288,
  'al_hilal': 2931, 'inter_miami': 15984, 'racing': 1063, 'independiente': 1066,
  'san_lorenzo': 1067, 'estudiantes': 1068, 'velez': 1070
};

const COUNTRY_FLAGS_EMOJI = {
  'Argentina': '🇦🇷', 'Brasil': '🇧🇷', 'Colombia': '🇨🇴', 'Chile': '🇨🇱', 'Uruguay': '🇺🇾',
  'Perú': '🇵🇪', 'Ecuador': '🇪🇨', 'Paraguay': '🇵🇾', 'Bolivia': '🇧🇴', 'Venezuela': '🇻🇪',
  'España': '🇪🇸', 'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Italia': '🇮🇹', 'Alemania': '🇩🇪', 'Francia': '🇫🇷',
  'Portugal': '🇵🇹', 'Países Bajos': '🇳🇱', 'Bélgica': '🇧🇪', 'Escocia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Turquía': '🇹🇷',
  'Grecia': '🇬🇷', 'Suiza': '🇨🇭', 'Austria': '🇦🇹', 'Dinamarca': '🇩🇰', 'Noruega': '🇳🇴',
  'Suecia': '🇸🇪', 'Polonia': '🇵🇱', 'República Checa': '🇨🇿', 'Croacia': '🇭🇷', 'México': '🇲🇽',
  'Estados Unidos': '🇺🇸', 'Arabia Saudita': '🇸🇦', 'Japón': '🇯🇵', 'Emiratos Árabes': '🇦🇪',
  'Australia': '🇦🇺', 'Marruecos': '🇲🇦', 'Egipto': '🇪🇬'
};

export function getCountryFlag(countryName) {
  return COUNTRY_FLAGS_EMOJI[countryName] || '🏳️';
}

/**
 * Genera el marcado HTML para la bandera oficial de un país usando API-Sports CDN
 * @param {string} countryName - Nombre del país
 * @param {number} [height=18] - Altura en px
 */
export function renderCountryFlagSVG(countryName, height = 18) {
  const code = COUNTRY_FLAG_CODES[countryName];
  if (!code) return getCountryFlag(countryName);

  const flagUrl = `https://media.api-sports.io/flags/${code}.svg`;
  return `
    <img src="${flagUrl}" 
         alt="${countryName}" 
         style="height: ${height}px; width: auto; border-radius: 3px; vertical-align: middle; box-shadow: 0 1px 3px rgba(0,0,0,0.5);" 
         onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';" />
    <span style="display:none;">${getCountryFlag(countryName)}</span>
  `;
}

/**
 * Renderiza el escudo heráldico vectorial o la imagen oficial de API-Football
 * @param {Object} team - Objeto del equipo
 * @param {number} [size=52] - Tamaño en px
 * @returns {string} Markup HTML/SVG
 */
export function renderTeamBadgeSVG(team, size = 52) {
  if (!team) return '';

  const apiId = TEAM_API_FOOTBALL_IDS[team.id];
  const colors = team.colors || ['#00aaff', '#00ffaa'];
  const color1 = colors[0] || '#00c885';
  const color2 = colors[1] || '#0f172a';
  const shortText = (team.short || team.name?.substring(0, 3) || 'FC').toUpperCase();
  const uniqueId = `badge_${(team.id || 'gen').replace(/[^a-zA-Z0-9]/g, '_')}`;

  const vectorBadge = `
    <svg viewBox="0 0 100 120" style="width: ${size}px; height: ${(size * 1.15).toFixed(0)}px; filter: drop-shadow(0 6px 12px rgba(0,0,0,0.6)); display: inline-block; vertical-align: middle;">
      <defs>
        <linearGradient id="${uniqueId}_grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color1}"/>
          <stop offset="100%" stop-color="${color2}"/>
        </linearGradient>
        <linearGradient id="${uniqueId}_border" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#e5a93c"/>
          <stop offset="100%" stop-color="#cbd5e1"/>
        </linearGradient>
      </defs>
      
      <path d="M 50 5 L 90 20 L 85 75 Q 50 115 15 75 L 10 20 Z" 
            fill="url(#${uniqueId}_grad)" 
            stroke="url(#${uniqueId}_border)" 
            stroke-width="4"/>
      
      <path d="M 20 20 L 80 80 L 85 75 L 25 15 Z" fill="rgba(255,255,255,0.22)"/>

      <text x="50" y="62" 
            font-family="'Outfit', 'Inter', sans-serif" 
            font-size="28" 
            font-weight="900" 
            fill="#ffffff" 
            text-anchor="middle" 
            alignment-baseline="middle" 
            style="letter-spacing: 1px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.9));">
        ${shortText}
      </text>
    </svg>
  `;

  // Si se cuenta con ID registrado de API-Football, intentar cargar primero la imagen oficial CDN
  if (apiId) {
    const cdnUrl = `https://media.api-sports.io/football/teams/${apiId}.png`;
    return `
      <div style="display: inline-block; position: relative;">
        <img src="${cdnUrl}" 
             alt="${team.name}" 
             style="width: ${size}px; height: ${size}px; object-fit: contain; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.6)); vertical-align: middle;" 
             onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" />
        <div style="display: none;">${vectorBadge}</div>
      </div>
    `;
  }

  return vectorBadge;
}
