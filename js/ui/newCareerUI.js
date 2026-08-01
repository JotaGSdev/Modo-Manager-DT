// Pantalla de Selección de Equipo y Nueva Carrera (Estilos Mejorados)

import { db } from '../data/db.js';
import { sfx } from '../../assets/audio/sfx.js';

export function renderNewCareer(container, onCareerStarted) {
  let selectedRegion = 'Sudamérica';
  let selectedLeagueId = 'arg_1';
  let selectedTeamId = 'boca';

  const updateLeagueSelect = () => {
    const leagues = db.leagues.filter(l => l.region === selectedRegion);
    const leagueSelect = document.getElementById('selectLeague');
    if (!leagueSelect) return;

    leagueSelect.innerHTML = leagues.map(l => `
      <option value="${l.id}" ${l.id === selectedLeagueId ? 'selected' : ''}>${l.name} (${l.country})</option>
    `).join('');

    if (!leagues.some(l => l.id === selectedLeagueId)) {
      selectedLeagueId = leagues[0]?.id || 'arg_1';
    }
    updateTeamSelect();
  };

  const updateTeamSelect = () => {
    const league = db.leagues.find(l => l.id === selectedLeagueId);
    const teamGrid = document.getElementById('teamGrid');
    if (!league || !teamGrid) return;

    teamGrid.innerHTML = league.teams.map(t => `
      <div class="team-select-card ${t.id === selectedTeamId ? 'selected' : ''}" data-id="${t.id}">
        <div class="team-badge-circle" style="background: linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]});">
          ${t.short}
        </div>
        <h4>${t.name}</h4>
        <div class="team-meta">
          <span>OVR: <strong>${t.overall}</strong></span>
          <span>Presupuesto: <strong class="text-highlight">€${(t.budget / 1000000).toFixed(1)}M</strong></span>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.team-select-card').forEach(card => {
      card.addEventListener('click', (e) => {
        sfx.playClick();
        selectedTeamId = e.currentTarget.dataset.id;
        document.querySelectorAll('.team-select-card').forEach(c => c.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
      });
    });
  };

  container.innerHTML = `
    <div class="new-career-layout">
      <div class="glass-panel text-center mb-4">
        <h1 class="brand-heading">⚽ ENTRENADOR LEYENDA</h1>
        <p class="text-sub">Comienza tu carrera de DT. Selecciona tu club inicial y lleva al equipo a la gloria mundial.</p>
      </div>

      <div class="glass-panel">
        <div class="form-group mb-4">
          <label class="form-label">Nombre del Director Técnico:</label>
          <input type="text" id="inputManagerName" class="input-text" value="Director Técnico" style="width: 100%; max-width: 400px;" />
        </div>

        <div class="selection-filters">
          <div class="form-group">
            <label class="form-label">Región Continental:</label>
            <select id="selectRegion" class="input-select">
              <option value="Sudamérica" selected>Sudamérica</option>
              <option value="Europa">Europa</option>
              <option value="Norteamérica">Norteamérica (Liga MX / MLS)</option>
              <option value="Asia">Asia (Arabia Saudita / Japón / EAU)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Liga / Competición:</label>
            <select id="selectLeague" class="input-select"></select>
          </div>
        </div>

        <h3 class="mt-4 mb-3">Elige tu Club Inicial:</h3>
        <div id="teamGrid" class="team-grid"></div>

        <div class="text-center mt-4">
          <button id="btnStartCareer" class="btn-primary btn-large">🚀 INICIAR MI CARRERA DE DT</button>
        </div>
      </div>
    </div>
  `;

  // Dynamic CSS for team select grid & dropdowns
  let existingStyle = document.getElementById('new-career-style');
  if (!existingStyle) {
    existingStyle = document.createElement('style');
    existingStyle.id = 'new-career-style';
    document.head.appendChild(existingStyle);
  }

  existingStyle.innerHTML = `
    .new-career-layout {
      max-width: 1200px;
      margin: 0 auto;
    }
    .brand-heading {
      font-size: 2.2rem;
      font-weight: 900;
      letter-spacing: 1px;
      background: linear-gradient(90deg, #00ffb3, #00d2ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 6px;
    }
    .form-label {
      display: block;
      margin-bottom: 6px;
      font-weight: 700;
      font-size: 0.9rem;
      color: var(--text-sub);
    }
    .team-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 18px;
    }
    .team-select-card {
      background: linear-gradient(145deg, rgba(22, 30, 48, 0.8), rgba(12, 18, 30, 0.85));
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px;
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      transition: all 0.22s ease;
    }
    .team-select-card:hover {
      border-color: rgba(0, 255, 179, 0.4);
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
    }
    .team-select-card.selected {
      border-color: #00ffb3 !important;
      background: linear-gradient(145deg, rgba(0, 255, 179, 0.18), rgba(0, 210, 255, 0.08)) !important;
      transform: translateY(-4px);
      box-shadow: 0 0 25px rgba(0, 255, 179, 0.35) !important;
    }
    .team-meta {
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 0.85rem;
      color: var(--text-sub);
      gap: 3px;
    }
    .selection-filters {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }
    .selection-filters .form-group {
      flex: 1;
      min-width: 250px;
    }
    .selection-filters select.input-select {
      width: 100%;
    }
  `;

  document.getElementById('selectRegion').addEventListener('change', (e) => {
    selectedRegion = e.target.value;
    updateLeagueSelect();
  });

  document.getElementById('selectLeague').addEventListener('change', (e) => {
    selectedLeagueId = e.target.value;
    updateTeamSelect();
  });

  updateLeagueSelect();

  document.getElementById('btnStartCareer').addEventListener('click', () => {
    const managerName = document.getElementById('inputManagerName').value || 'Director Técnico';
    sfx.playWhistle();
    db.newCareer(selectedTeamId, managerName);
    onCareerStarted();
  });
}
