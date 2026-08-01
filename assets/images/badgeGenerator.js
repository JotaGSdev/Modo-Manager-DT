// Generador Vectorial de Escudos Genéricos y Conector de API de Deportes

/**
 * Genera una imagen SVG Data URI genérica para cualquier club respetando derechos de autor
 * @param {Object} team - Objeto de equipo con short, colors [c1, c2], name
 */
export function generateGenericBadgeSVG(team) {
  const c1 = team.colors?.[0] || '#00ffb3';
  const c2 = team.colors?.[1] || '#00aaff';
  const short = (team.short || team.name.substring(0, 3)).toUpperCase();

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <defs>
        <linearGradient id="grad_${short}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${c1}" />
          <stop offset="100%" stop-color="${c2}" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.6"/>
        </filter>
      </defs>
      
      <!-- Escudo Exterior -->
      <path d="M 50 6 L 90 20 L 90 55 C 90 75 50 94 50 94 C 50 94 10 75 10 55 L 10 20 Z" 
            fill="url(#grad_${short})" 
            stroke="#ffffff" 
            stroke-width="3.5" 
            filter="url(#shadow)"/>
            
      <!-- Banda o Patrón Interior -->
      <path d="M 10 20 L 90 70 L 90 55 C 90 75 50 94 50 94 Z" 
            fill="rgba(0, 0, 0, 0.2)"/>
            
      <circle cx="50" cy="48" r="24" fill="rgba(10, 14, 24, 0.85)" stroke="#ffffff" stroke-width="2" />
      
      <!-- Monograma del Club -->
      <text x="50" y="55" 
            font-family="Outfit, Inter, sans-serif" 
            font-size="16" 
            font-weight="900" 
            fill="#ffffff" 
            text-anchor="middle" 
            letter-spacing="0.5">${short}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Consulta la viabilidad de obtener un logo desde API pública o devuelve el escudo genérico
 */
export async function getClubBadgeUrl(team) {
  // Intentar API pública (TheSportsDB genérica sin clave privada)
  try {
    const query = encodeURIComponent(team.name);
    const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${query}`);
    if (res.ok) {
      const data = await res.json();
      if (data.teams && data.teams[0] && data.teams[0].strBadge) {
        return data.teams[0].strBadge;
      }
    }
  } catch (e) {
    // Si falla o no hay conexión, usar fallback genérico seguro
  }

  return generateGenericBadgeSVG(team);
}
