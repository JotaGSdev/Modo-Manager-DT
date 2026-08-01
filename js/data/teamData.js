// Generador dinámico de plantillas con medias ponderadas por posición

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
  return Math.max(50, Math.min(99, Math.round(ovr)));
}

const STAR_PLAYERS = [
  { teamId: 'real_madrid', name: 'Vinícius Júnior', pos: 'EI', age: 24, pot: 94, pac: 95, sho: 84, pas: 81, dri: 92, def: 29, phy: 69, val: 180000000, sal: 350000 },
  { teamId: 'real_madrid', name: 'Kylian Mbappé', pos: 'DC', age: 25, pot: 95, pac: 97, sho: 90, pas: 80, dri: 92, def: 36, phy: 78, val: 190000000, sal: 400000 },
  { teamId: 'real_madrid', name: 'Jude Bellingham', pos: 'MC', age: 21, pot: 95, pac: 80, sho: 86, pas: 85, dri: 88, def: 78, phy: 84, val: 180000000, sal: 340000 },
  { teamId: 'real_madrid', name: 'Thibaut Courtois', pos: 'POR', age: 32, pot: 89, pac: 46, sho: 15, pas: 30, dri: 20, def: 90, phy: 86, val: 60000000, sal: 250000 },

  { teamId: 'barcelona', name: 'Lamine Yamal', pos: 'ED', age: 17, pot: 95, pac: 89, sho: 78, pas: 82, dri: 89, def: 32, phy: 60, val: 120000000, sal: 120000 },
  { teamId: 'barcelona', name: 'Robert Lewandowski', pos: 'DC', age: 36, pot: 88, pac: 72, sho: 90, pas: 79, dri: 83, def: 42, phy: 80, val: 30000000, sal: 300000 },
  { teamId: 'barcelona', name: 'Pedri', pos: 'MC', age: 21, pot: 92, pac: 76, sho: 72, pas: 87, dri: 88, def: 68, phy: 66, val: 90000000, sal: 200000 },

  { teamId: 'man_city', name: 'Erling Haaland', pos: 'DC', age: 24, pot: 94, pac: 89, sho: 92, pas: 65, dri: 80, def: 45, phy: 88, val: 185000000, sal: 380000 },
  { teamId: 'man_city', name: 'Kevin De Bruyne', pos: 'MC', age: 33, pot: 90, pac: 72, sho: 87, pas: 94, dri: 86, def: 65, phy: 74, val: 50000000, sal: 350000 },

  { teamId: 'inter_miami', name: 'Lionel Messi', pos: 'ED', age: 37, pot: 88, pac: 78, sho: 89, pas: 90, dri: 91, def: 33, phy: 64, val: 30000000, sal: 500000 },
  { teamId: 'al_nassr', name: 'Cristiano Ronaldo', pos: 'DC', age: 39, pot: 86, pac: 77, sho: 88, pas: 75, dri: 80, def: 34, phy: 77, val: 15000000, sal: 1000000 },

  { teamId: 'boca', name: 'Edinson Cavani', pos: 'DC', age: 37, pot: 79, pac: 70, sho: 82, pas: 68, dri: 74, def: 48, phy: 76, val: 3000000, sal: 40000 },
  { teamId: 'boca', name: 'Kevin Zenón', pos: 'MI', age: 23, pot: 83, pac: 81, sho: 74, pas: 76, dri: 78, def: 60, phy: 71, val: 10000000, sal: 25000 },
  { teamId: 'river', name: 'Franco Armani', pos: 'POR', age: 37, pot: 78, pac: 45, sho: 15, pas: 30, dri: 20, def: 80, phy: 75, val: 2000000, sal: 35000 },
  { teamId: 'river', name: 'Claudio Echeverri', pos: 'MCO', age: 18, pot: 88, pac: 83, sho: 71, pas: 75, dri: 82, def: 42, phy: 58, val: 15000000, sal: 20000 }
];

const FIRST_NAMES = ['Carlos', 'Mateo', 'Lucas', 'Gonzalo', 'Santiago', 'Nicolás', 'Joaquín', 'Enzo', 'Gabriel', 'Thiago', 'Felipe', 'Rodrigo', 'Lautaro', 'Julian', 'Alejandro', 'Diego', 'Sebastian', 'Marco', 'Bruno', 'Leo', 'Alex', 'David'];
const LAST_NAMES = ['Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Díaz', 'Álvarez', 'Romero', 'Sosa', 'Torres', 'Benítez', 'Silva', 'Santos', 'Oliveira', 'Costa', 'Pereira', 'Ferreira', 'García'];

export function generateTeamPlayers(team) {
  const players = [];
  
  // Agregar estrellas predefinidas
  const stars = STAR_PLAYERS.filter(p => p.teamId === team.id);
  stars.forEach((star, index) => {
    const ovr = calculatePositionOvr(star.pos, star.pac, star.sho, star.pas, star.dri, star.def, star.phy);
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
      value: star.val,
      salary: star.sal,
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
    const baseTarget = Math.min(92, Math.max(58, targetOvr + ovrOffset));

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
      def = Math.min(94, baseTarget + 6 + Math.floor(Math.random() * 5));
      phy = Math.min(94, baseTarget + 5 + Math.floor(Math.random() * 5));
    } else if (pos === 'DC' || pos === 'EI' || pos === 'ED') {
      pac = Math.min(96, baseTarget + 8);
      sho = Math.min(94, baseTarget + 6);
      pas = baseTarget - 10 + Math.floor(Math.random() * 10);
      dri = Math.min(95, baseTarget + 6);
      def = 30 + Math.floor(Math.random() * 20);
      phy = baseTarget - 5 + Math.floor(Math.random() * 10);
    } else {
      pac = baseTarget - 5 + Math.floor(Math.random() * 10);
      sho = baseTarget - 8 + Math.floor(Math.random() * 10);
      pas = Math.min(94, baseTarget + 6);
      dri = Math.min(93, baseTarget + 5);
      def = baseTarget - 10 + Math.floor(Math.random() * 15);
      phy = baseTarget - 5 + Math.floor(Math.random() * 10);
    }

    const ovr = calculatePositionOvr(pos, pac, sho, pas, dri, def, phy);
    const pot = Math.min(95, Math.max(ovr, ovr + Math.floor((34 - age) / 2) + Math.floor(Math.random() * 4)));
    
    const fName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];

    const value = Math.round((Math.pow(ovr, 3.2) * (1 + (34 - age) * 0.04)) * 1.8);
    const salary = Math.round(value * 0.002);

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
      morale: 80 + Math.floor(Math.random() * 20),
      form: 70 + Math.floor(Math.random() * 25),
      appearances: 0,
      seasonGoals: 0,
      teamId: team.id
    });
  }

  return players;
}
