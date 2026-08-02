// Generador dinámico de plantillas con medias ponderadas y curva de valoración de mercado hiperrealista EA FC 25 (OVR Inicial Máximo 91)

export function calculatePositionOvr(pos, pac, sho, pas, dri, def, phy) {
  let ovr = 70;
  if (pos === 'POR') {
    ovr = (def * 0.40) + (phy * 0.35) + (pas * 0.15) + (pac * 0.10);
  } else if (pos === 'DFC') {
    ovr = (def * 0.40) + (phy * 0.35) + (pac * 0.15) + (pas * 0.10);
  } else if (pos === 'LI' || pos === 'LD') {
    ovr = (pac * 0.30) + (def * 0.30) + (pas * 0.20) + (phy * 0.20);
  } else if (pos === 'MCD') {
    ovr = (def * 0.35) + (phy * 0.30) + (pas * 0.25) + (dri * 0.10);
  } else if (pos === 'MC') {
    ovr = (pas * 0.35) + (dri * 0.25) + (phy * 0.15) + (sho * 0.15) + (def * 0.10);
  } else if (pos === 'MCO') {
    ovr = (dri * 0.35) + (pas * 0.35) + (sho * 0.20) + (pac * 0.10);
  } else if (pos === 'EI' || pos === 'ED') {
    ovr = (pac * 0.40) + (dri * 0.30) + (sho * 0.15) + (pas * 0.15);
  } else if (pos === 'DC') {
    ovr = (sho * 0.40) + (pac * 0.25) + (phy * 0.20) + (dri * 0.15);
  } else {
    ovr = (pac + sho + pas + dri + def + phy) / 6;
  }
  // En EA FC / FIFA la media inicial máxima al comenzar temporada es 91
  return Math.max(50, Math.min(91, Math.round(ovr)));
}

export function calculatePlayerMarketValue(ovr, age, pot = ovr) {
  const keypoints = [
    { ovr: 50, val: 300000 },
    { ovr: 60, val: 1200000 },
    { ovr: 68, val: 4500000 },
    { ovr: 74, val: 12000000 },
    { ovr: 78, val: 24000000 },
    { ovr: 82, val: 45000000 },
    { ovr: 86, val: 85000000 },
    { ovr: 89, val: 130000000 },
    { ovr: 91, val: 165000000 }, // OVR 91 Inicial ~ €165M - €185M
    { ovr: 93, val: 215000000 },
    { ovr: 94, val: 250000000 },
    { ovr: 95, val: 280000000 },
    { ovr: 99, val: 400000000 }
  ];

  let baseValue = 300000;
  if (ovr <= keypoints[0].ovr) {
    baseValue = keypoints[0].val;
  } else if (ovr >= keypoints[keypoints.length - 1].ovr) {
    baseValue = keypoints[keypoints.length - 1].val;
  } else {
    for (let i = 0; i < keypoints.length - 1; i++) {
      const p1 = keypoints[i];
      const p2 = keypoints[i + 1];
      if (ovr >= p1.ovr && ovr <= p2.ovr) {
        const ratio = (ovr - p1.ovr) / (p2.ovr - p1.ovr);
        baseValue = p1.val + ratio * (p2.val - p1.val);
        break;
      }
    }
  }

  let ageFactor = 1.0;
  if (age <= 20) ageFactor = 1.25;
  else if (age <= 23) ageFactor = 1.15;
  else if (age <= 27) ageFactor = 1.0;
  else if (age <= 30) ageFactor = 0.85;
  else if (age <= 33) ageFactor = 0.60;
  else if (age <= 35) ageFactor = 0.40;
  else ageFactor = 0.25;

  const potBonus = 1 + Math.max(0, pot - ovr) * 0.03;
  return Math.max(300000, Math.round(baseValue * ageFactor * potBonus));
}

export function calculatePlayerSalary(value, ovr) {
  const weeklyWage = Math.round(value * 0.0018 + Math.pow(Math.max(0, ovr - 70), 2.2) * 150);
  return Math.max(1500, weeklyWage);
}

// BASE DE DATOS DE ESTRELLAS REALES TOP MUNDIALES (Ajustadas a EA FC 25: OVR inicial máx 91)
const STAR_PLAYERS = [
  // REAL MADRID
  { teamId: 'real_madrid', name: 'Kylian Mbappé', pos: 'DC', age: 25, pot: 95, pac: 97, sho: 90, pas: 80, dri: 92, def: 36, phy: 78, val: 185000000, sal: 480000 },
  { teamId: 'real_madrid', name: 'Vinícius Júnior', pos: 'EI', age: 24, pot: 94, pac: 95, sho: 84, pas: 81, dri: 91, def: 29, phy: 69, val: 175000000, sal: 420000 },
  { teamId: 'real_madrid', name: 'Jude Bellingham', pos: 'MC', age: 21, pot: 94, pac: 80, sho: 86, pas: 85, dri: 88, def: 78, phy: 84, val: 170000000, sal: 400000 },
  { teamId: 'real_madrid', name: 'Federico Valverde', pos: 'MC', age: 26, pot: 90, pac: 88, sho: 82, pas: 84, dri: 84, def: 80, phy: 85, val: 120000000, sal: 300000 },
  { teamId: 'real_madrid', name: 'Rodrygo', pos: 'ED', age: 23, pot: 89, pac: 89, sho: 82, pas: 80, dri: 86, def: 31, phy: 64, val: 100000000, sal: 260000 },
  { teamId: 'real_madrid', name: 'Thibaut Courtois', pos: 'POR', age: 32, pot: 89, pac: 46, sho: 15, pas: 30, dri: 20, def: 89, phy: 86, val: 65000000, sal: 260000 },
  { teamId: 'real_madrid', name: 'Endrick', pos: 'DC', age: 18, pot: 91, pac: 87, sho: 76, pas: 68, dri: 80, def: 30, phy: 72, val: 45000000, sal: 100000 },

  // BARCELONA
  { teamId: 'barcelona', name: 'Lamine Yamal', pos: 'ED', age: 17, pot: 95, pac: 89, sho: 76, pas: 80, dri: 86, def: 32, phy: 60, val: 80000000, sal: 180000 },
  { teamId: 'barcelona', name: 'Pedri', pos: 'MC', age: 21, pot: 92, pac: 76, sho: 72, pas: 87, dri: 88, def: 68, phy: 66, val: 110000000, sal: 240000 },
  { teamId: 'barcelona', name: 'Robert Lewandowski', pos: 'DC', age: 36, pot: 88, pac: 72, sho: 89, pas: 79, dri: 82, def: 42, phy: 80, val: 35000000, sal: 300000 },
  { teamId: 'barcelona', name: 'Gavi', pos: 'MC', age: 20, pot: 90, pac: 76, sho: 68, pas: 79, dri: 83, def: 74, phy: 78, val: 75000000, sal: 160000 },
  { teamId: 'barcelona', name: 'Raphinha', pos: 'ED', age: 27, pot: 88, pac: 91, sho: 82, pas: 81, dri: 86, def: 52, phy: 73, val: 75000000, sal: 220000 },

  // MANCHESTER CITY
  { teamId: 'man_city', name: 'Erling Haaland', pos: 'DC', age: 24, pot: 94, pac: 89, sho: 92, pas: 65, dri: 80, def: 45, phy: 88, val: 180000000, sal: 450000 },
  { teamId: 'man_city', name: 'Rodri', pos: 'MCD', age: 28, pot: 93, pac: 66, sho: 76, pas: 86, dri: 84, def: 87, phy: 85, val: 165000000, sal: 360000 },
  { teamId: 'man_city', name: 'Kevin De Bruyne', pos: 'MC', age: 33, pot: 90, pac: 72, sho: 87, pas: 94, dri: 86, def: 65, phy: 74, val: 65000000, sal: 360000 },
  { teamId: 'man_city', name: 'Phil Foden', pos: 'MCO', age: 24, pot: 91, pac: 85, sho: 85, pas: 86, dri: 89, def: 56, phy: 62, val: 130000000, sal: 280000 },

  // BAYERN MÜNCHEN
  { teamId: 'bayern', name: 'Harry Kane', pos: 'DC', age: 31, pot: 90, pac: 69, sho: 92, pas: 84, dri: 83, def: 47, phy: 82, val: 90000000, sal: 340000 },
  { teamId: 'bayern', name: 'Jamal Musiala', pos: 'MCO', age: 21, pot: 93, pac: 85, sho: 79, pas: 82, dri: 90, def: 62, phy: 64, val: 135000000, sal: 260000 },
  { teamId: 'bayern', name: 'Leroy Sané', pos: 'ED', age: 28, pot: 86, pac: 92, sho: 82, pas: 79, dri: 86, def: 38, phy: 68, val: 55000000, sal: 200000 },

  // LIVERPOOL & ARSENAL
  { teamId: 'liverpool', name: 'Mohamed Salah', pos: 'ED', age: 32, pot: 89, pac: 89, sho: 87, pas: 82, dri: 88, def: 45, phy: 75, val: 75000000, sal: 320000 },
  { teamId: 'liverpool', name: 'Virgil van Dijk', pos: 'DFC', age: 33, pot: 89, pac: 72, sho: 60, pas: 71, dri: 72, def: 89, phy: 86, val: 45000000, sal: 260000 },
  { teamId: 'arsenal', name: 'Bukayo Saka', pos: 'ED', age: 22, pot: 91, pac: 86, sho: 82, pas: 82, dri: 87, def: 65, phy: 75, val: 125000000, sal: 240000 },
  { teamId: 'arsenal', name: 'Martin Ødegaard', pos: 'MCO', age: 25, pot: 90, pac: 77, sho: 81, pas: 89, dri: 88, def: 62, phy: 63, val: 115000000, sal: 250000 },
  { teamId: 'arsenal', name: 'Declan Rice', pos: 'MCD', age: 25, pot: 89, pac: 75, sho: 71, pas: 82, dri: 81, def: 85, phy: 86, val: 105000000, sal: 230000 },

  // INTER & ATLETICO
  { teamId: 'inter_milan', name: 'Lautaro Martínez', pos: 'DC', age: 27, pot: 90, pac: 82, sho: 87, pas: 76, dri: 84, def: 48, phy: 84, val: 115000000, sal: 280000 },
  { teamId: 'inter_milan', name: 'Nicolò Barella', pos: 'MC', age: 27, pot: 88, pac: 78, sho: 76, pas: 84, dri: 85, def: 79, phy: 82, val: 80000000, sal: 220000 },
  { teamId: 'atletico_madrid', name: 'Antoine Griezmann', pos: 'DC', age: 33, pot: 88, pac: 76, sho: 87, pas: 87, dri: 86, def: 58, phy: 72, val: 40000000, sal: 240000 },
  { teamId: 'atletico_madrid', name: 'Julián Álvarez', pos: 'DC', age: 24, pot: 88, pac: 84, sho: 85, pas: 78, dri: 83, def: 52, phy: 78, val: 90000000, sal: 200000 },

  // BAYER LEVERKUSEN & CHELSEA
  { teamId: 'leverkusen', name: 'Florian Wirtz', pos: 'MCO', age: 21, pot: 92, pac: 81, sho: 80, pas: 87, dri: 89, def: 54, phy: 65, val: 125000000, sal: 220000 },
  { teamId: 'chelsea', name: 'Cole Palmer', pos: 'MCO', age: 22, pot: 90, pac: 82, sho: 84, pas: 85, dri: 86, def: 48, phy: 66, val: 105000000, sal: 180000 },

  // INTER MIAMI & AL-NASSR
  { teamId: 'inter_miami', name: 'Lionel Messi', pos: 'ED', age: 37, pot: 88, pac: 78, sho: 89, pas: 90, dri: 91, def: 33, phy: 64, val: 35000000, sal: 500000 },
  { teamId: 'inter_miami', name: 'Luis Suárez', pos: 'DC', age: 37, pot: 82, pac: 68, sho: 86, pas: 78, dri: 79, def: 42, phy: 76, val: 7000000, sal: 110000 },
  { teamId: 'al_nassr', name: 'Cristiano Ronaldo', pos: 'DC', age: 39, pot: 86, pac: 77, sho: 88, pas: 75, dri: 80, def: 34, phy: 77, val: 20000000, sal: 1000000 },

  // ARGENTINA (BOCA & RIVER)
  { teamId: 'boca', name: 'Edinson Cavani', pos: 'DC', age: 37, pot: 79, pac: 70, sho: 82, pas: 68, dri: 74, def: 48, phy: 76, val: 3500000, sal: 35000 },
  { teamId: 'boca', name: 'Kevin Zenón', pos: 'MI', age: 23, pot: 83, pac: 81, sho: 74, pas: 76, dri: 78, def: 60, phy: 71, val: 12000000, sal: 25000 },
  { teamId: 'river', name: 'Franco Armani', pos: 'POR', age: 37, pot: 78, pac: 45, sho: 15, pas: 30, dri: 20, def: 78, phy: 75, val: 2500000, sal: 30000 },
  { teamId: 'river', name: 'Claudio Echeverri', pos: 'MCO', age: 18, pot: 88, pac: 83, sho: 71, pas: 75, dri: 82, def: 42, phy: 58, val: 18000000, sal: 25000 }
];

const FIRST_NAMES = ['Carlos', 'Mateo', 'Lucas', 'Gonzalo', 'Santiago', 'Nicolás', 'Joaquín', 'Enzo', 'Gabriel', 'Thiago', 'Felipe', 'Rodrigo', 'Lautaro', 'Julian', 'Alejandro', 'Diego', 'Sebastian', 'Marco', 'Bruno', 'Leo', 'Alex', 'David'];
const LAST_NAMES = ['Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Díaz', 'Álvarez', 'Romero', 'Sosa', 'Torres', 'Benítez', 'Silva', 'Santos', 'Oliveira', 'Costa', 'Pereira', 'Ferreira', 'García'];

export function generateTeamPlayers(team) {
  const players = [];
  
  // Agregar estrellas predefinidas
  const stars = STAR_PLAYERS.filter(p => p.teamId === team.id);
  stars.forEach((star, index) => {
    const ovr = calculatePositionOvr(star.pos, star.pac, star.sho, star.pas, star.dri, star.def, star.phy);
    const val = calculatePlayerMarketValue(ovr, star.age, star.pot);
    const sal = calculatePlayerSalary(val, ovr);
    players.push({
      id: `${team.id}_star_${index}`,
      name: star.name,
      pos: star.pos,
      age: star.age,
      overall: ovr,
      potential: star.pot,
      pac: star.pac,
      sho: star.sho,
      pas: star.pas,
      dri: star.dri,
      def: star.def,
      phy: star.phy,
      value: val,
      salary: sal,
      contractYears: 3 + Math.floor(Math.random() * 3), // 3 a 5 años de contrato
      morale: 85 + Math.floor(Math.random() * 15),
      form: 75 + Math.floor(Math.random() * 20),
      appearances: 0,
      seasonGoals: 0,
      teamId: team.id
    });
  });

  const targetOvr = team.overall || 72;
  const positionsNeeded = ['POR', 'POR', 'DFC', 'DFC', 'DFC', 'DFC', 'LD', 'LI', 'MCD', 'MC', 'MC', 'MCO', 'EI', 'ED', 'DC', 'DC', 'MI', 'MD', 'DFC', 'MC', 'DC', 'POR'];

  let count = players.length;
  for (let i = count; i < 22; i++) {
    const pos = positionsNeeded[i % positionsNeeded.length];
    const age = 18 + Math.floor(Math.random() * 16);
    const ovrOffset = Math.floor((Math.random() - 0.5) * 8);
    const baseTarget = Math.min(88, Math.max(58, targetOvr + ovrOffset));

    let pac, sho, pas, dri, def, phy;
    if (pos === 'POR') {
      pac = 40 + Math.floor(Math.random() * 25);
      sho = 15; pas = 35 + Math.floor(Math.random() * 30); dri = 20; 
      def = baseTarget + Math.floor(Math.random() * 6);
      phy = baseTarget + Math.floor(Math.random() * 6);
    } else if (pos === 'DFC') {
      pac = baseTarget - 10 + Math.floor(Math.random() * 12);
      sho = 40 + Math.floor(Math.random() * 20);
      pas = baseTarget - 15 + Math.floor(Math.random() * 10);
      dri = baseTarget - 15 + Math.floor(Math.random() * 10);
      def = Math.min(90, baseTarget + 6 + Math.floor(Math.random() * 5));
      phy = Math.min(90, baseTarget + 5 + Math.floor(Math.random() * 5));
    } else if (pos === 'DC' || pos === 'EI' || pos === 'ED') {
      pac = Math.min(92, baseTarget + 8);
      sho = Math.min(91, baseTarget + 6);
      pas = baseTarget - 10 + Math.floor(Math.random() * 10);
      dri = Math.min(91, baseTarget + 6);
      def = 30 + Math.floor(Math.random() * 20);
      phy = baseTarget - 5 + Math.floor(Math.random() * 10);
    } else {
      pac = baseTarget - 5 + Math.floor(Math.random() * 10);
      sho = baseTarget - 8 + Math.floor(Math.random() * 10);
      pas = Math.min(90, baseTarget + 6);
      dri = Math.min(90, baseTarget + 5);
      def = baseTarget - 10 + Math.floor(Math.random() * 15);
      phy = baseTarget - 5 + Math.floor(Math.random() * 10);
    }

    const ovr = calculatePositionOvr(pos, pac, sho, pas, dri, def, phy);
    const pot = Math.min(94, Math.max(ovr, ovr + Math.floor((34 - age) / 2) + Math.floor(Math.random() * 4)));
    
    const fName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];

    const value = calculatePlayerMarketValue(ovr, age, pot);
    const salary = calculatePlayerSalary(value, ovr);

    players.push({
      id: `${team.id}_gen_${i}`,
      name: `${fName} ${lName}`,
      pos: pos,
      age: age,
      overall: ovr,
      potential: pot,
      pac, sho, pas, dri, def, phy,
      value: value,
      salary: salary,
      contractYears: 2 + Math.floor(Math.random() * 4), // 2 a 5 años de contrato
      morale: 80 + Math.floor(Math.random() * 20),
      form: 70 + Math.floor(Math.random() * 25),
      appearances: 0,
      seasonGoals: 0,
      teamId: team.id
    });
  }

  return players;
}
