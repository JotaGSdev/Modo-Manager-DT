// Generador Vectorial de Escudos y Logos SVG de Clubes de Fútbol y Banderas de Países (High Impact Crests & Flags)

const COUNTRY_FLAGS = {
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
  return COUNTRY_FLAGS[countryName] || '🏳️';
}

/**
 * Renderiza el escudo heráldico SVG de un equipo con gradiente y sombras impecables
 * @param {Object} team - Objeto del equipo
 * @param {number} [size=52] - Tamaño en px
 * @returns {string} Markup SVG
 */
export function renderTeamBadgeSVG(team, size = 52) {
  if (!team) return '';
  const colors = team.colors || ['#00aaff', '#00ffaa'];
  const color1 = colors[0] || '#00c885';
  const color2 = colors[1] || '#0f172a';
  const shortText = (team.short || team.name?.substring(0, 3) || 'FC').toUpperCase();
  const uniqueId = `badge_${(team.id || 'gen').replace(/[^a-zA-Z0-9]/g, '_')}`;

  return `
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
      
      <!-- Escudo Heráldico de Fútbol SVG -->
      <path d="M 50 5 L 90 20 L 85 75 Q 50 115 15 75 L 10 20 Z" 
            fill="url(#${uniqueId}_grad)" 
            stroke="url(#${uniqueId}_border)" 
            stroke-width="4"/>
      
      <!-- Franja Elegante Diagonal -->
      <path d="M 20 20 L 80 80 L 85 75 L 25 15 Z" fill="rgba(255,255,255,0.22)"/>

      <!-- Sigla o Inicial del Club -->
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
}
