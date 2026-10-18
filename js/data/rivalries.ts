/**
 * ============================================================================
 * ENTRENADOR LEYENDA - BASE DE DATOS DE RIVALIDADES Y CLÁSICOS (rivalries.ts)
 * ============================================================================
 * Mapeo de clásicos y derbis mundiales con nombres oficiales y multiplicadores
 * de tensión y gloria para partidos de alto impacto emocional.
 */

export interface RivalryInfo {
  isDerby: boolean;
  name?: string;
  intensity?: 'legendary' | 'high';
  tag?: string;
}

const RIVALRY_PAIRS: Array<{
  teams: [string, string];
  name: string;
  tag: string;
  intensity: 'legendary' | 'high';
}> = [
  // Argentina
  { teams: ['river', 'boca'], name: 'Superclásico del Fútbol Argentino', tag: 'EL SUPERCLÁSICO', intensity: 'legendary' },
  { teams: ['racing', 'independiente'], name: 'Clásico de Avellaneda', tag: 'CLÁSICO DE AVELLANEDA', intensity: 'high' },
  { teams: ['san_lorenzo', 'huracan'], name: 'Clásico Porteño', tag: 'CLÁSICO DE BARRIO', intensity: 'high' },
  { teams: ['rosario_central', 'newells'], name: 'Clásico Rosarino', tag: 'CLÁSICO ROSARINO', intensity: 'high' },

  // España
  { teams: ['real_madrid', 'barcelona'], name: 'El Clásico de La Liga', tag: 'EL CLÁSICO MUNDIAL', intensity: 'legendary' },
  { teams: ['real_madrid', 'atletico_madrid'], name: 'Derbi Madrileño', tag: 'EL DERBI DE MADRID', intensity: 'high' },
  { teams: ['barcelona', 'espanyol'], name: 'Derbi Barcelonés', tag: 'DERBI DE CATALUÑA', intensity: 'high' },
  { teams: ['betis', 'sevilla'], name: 'El Gran Derbi', tag: 'EL GRAN DERBI SEVILLANO', intensity: 'high' },
  { teams: ['athletic_bilbao', 'real_sociedad'], name: 'Derbi Vasco', tag: 'DERBI VASCO', intensity: 'high' },

  // Inglaterra
  { teams: ['man_united', 'liverpool'], name: 'North West Derby', tag: 'EL CLÁSICO INGLÉS', intensity: 'legendary' },
  { teams: ['arsenal', 'tottenham'], name: 'North London Derby', tag: 'DERBI DEL NORTE DE LONDRES', intensity: 'high' },
  { teams: ['man_city', 'man_united'], name: 'Manchester Derby', tag: 'EL DERBI DE MANCHESTER', intensity: 'high' },
  { teams: ['liverpool', 'everton'], name: 'Merseyside Derby', tag: 'MERSEYSIDE DERBY', intensity: 'high' },
  { teams: ['chelsea', 'arsenal'], name: 'Derbi de Londres', tag: 'DERBI DE LONDRES', intensity: 'high' },

  // Italia
  { teams: ['inter', 'milan'], name: 'Derby della Madonnina', tag: 'DERBY DELLA MADONNINA', intensity: 'legendary' },
  { teams: ['juventus', 'inter'], name: "Derby d'Italia", tag: "DERBY D'ITALIA", intensity: 'legendary' },
  { teams: ['roma', 'lazio'], name: 'Derby della Capitale', tag: 'DERBY DELLA CAPITALE', intensity: 'high' },

  // Alemania & Francia
  { teams: ['bayern', 'dortmund'], name: 'Der Klassiker', tag: 'DER KLASSIKER', intensity: 'legendary' },
  { teams: ['psg', 'marseille'], name: 'Le Classique', tag: 'LE CLASSIQUE DE FRANCIA', intensity: 'legendary' },

  // Brasil
  { teams: ['flamengo', 'fluminense'], name: 'Fla-Flu Histórico', tag: 'EL FLA-FLU HISTÓRICO', intensity: 'legendary' },
  { teams: ['flamengo', 'vasco'], name: 'Clássico dos Milhões', tag: 'CLÁSSICO DOS MILHÕES', intensity: 'high' },
  { teams: ['corinthians', 'palmeiras'], name: 'Derby Paulista', tag: 'DERBY PAULISTA', intensity: 'high' },
  { teams: ['gremio', 'internacional'], name: 'Grenal do Sul', tag: 'EL GRENAL', intensity: 'high' },

  // México
  { teams: ['america_mex', 'chivas'], name: 'El Clásico Nacional', tag: 'EL CLÁSICO NACIONAL', intensity: 'legendary' },
  { teams: ['america_mex', 'cruz_azul'], name: 'Clásico Joven', tag: 'CLÁSICO JOVEN', intensity: 'high' },
  { teams: ['monterrey', 'tigres'], name: 'Clásico Regio', tag: 'CLÁSICO REGIO', intensity: 'high' },

  // Colombia
  { teams: ['nacional_col', 'america_cali'], name: 'Clásico Histórico de Colombia', tag: 'CLÁSICO DE COLOMBIA', intensity: 'high' },
  { teams: ['millonarios', 'santa_fe'], name: 'Clásico Capitalino', tag: 'CLÁSICO BOGOTANO', intensity: 'high' },
  { teams: ['millonarios', 'nacional_col'], name: 'Superclásico de Colombia', tag: 'EL CLÁSICO COLOMBIANO', intensity: 'high' },

  // Chile & Perú & Uruguay
  { teams: ['colo_colo', 'uchile'], name: 'Superclásico Chileno', tag: 'SUPERCLÁSICO DE CHILE', intensity: 'legendary' },
  { teams: ['alianza_lima', 'universitario'], name: 'El Clásico de los Clásicos', tag: 'EL CLÁSICO PERUANO', intensity: 'legendary' },
  { teams: ['penarol', 'nacional'], name: 'Superclásico Uruguayo', tag: 'EL CLÁSICO DEL URUGUAY', intensity: 'legendary' },

  // Otros Clásicos Notables
  { teams: ['benfica', 'porto'], name: 'O Clássico de Portugal', tag: 'O CLÁSSICO', intensity: 'legendary' },
  { teams: ['benfica', 'sporting_lisbon'], name: 'Derby de Lisboa', tag: 'DERBI DE LISBOA', intensity: 'high' },
  { teams: ['ajax', 'feyenoord'], name: 'De Klassieker', tag: 'DE KLASSIEKER', intensity: 'legendary' },
  { teams: ['celtic', 'rangers'], name: 'Old Firm Derby', tag: 'THE OLD FIRM', intensity: 'legendary' },
  { teams: ['galatasaray', 'fenerbahce'], name: 'Kıtalararası Derbi', tag: 'DERBI INTERCONTINENTAL', intensity: 'legendary' },
  { teams: ['al_hilal', 'al_nassr'], name: 'Riyadh Super Derby', tag: 'DERBI DE RIYADH', intensity: 'high' },
  { teams: ['cerro_porteno', 'olimpia_par'], name: 'Superclásico Paraguayo', tag: 'SUPERCLÁSICO PARAGUAYO', intensity: 'legendary' },
  { teams: ['barcelona_sc', 'emelec'], name: 'Clásico del Astillero', tag: 'CLÁSICO DEL ASTILLERO', intensity: 'legendary' },
  { teams: ['bolivar', 'the_strongest'], name: 'Clásico Paceño', tag: 'CLÁSICO PACEÑO', intensity: 'high' }
];

/**
 * Consulta si un enfrentamiento entre dos equipos constituye un clásico o derbi histórico.
 */
export function getRivalryInfo(teamId1: string, teamId2: string): RivalryInfo {
  if (!teamId1 || !teamId2) return { isDerby: false };

  const idA = teamId1.toLowerCase();
  const idB = teamId2.toLowerCase();

  const found = RIVALRY_PAIRS.find(pair => {
    const [t1, t2] = pair.teams;
    return (t1 === idA && t2 === idB) || (t1 === idB && t2 === idA);
  });

  if (found) {
    return {
      isDerby: true,
      name: found.name,
      intensity: found.intensity,
      tag: found.tag
    };
  }

  return { isDerby: false };
}
