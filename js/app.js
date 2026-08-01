// Aplicación Principal, Ruteador de Vistas, Formato de Temporada 2026/2027 y Sincronización de Presupuesto

import { db } from './data/db.js';
import { renderNewCareer } from './ui/newCareerUI.js';
import { renderDashboard } from './ui/dashboardUI.js';
import { renderSquad } from './ui/squadUI.js';
import { renderTransfers } from './ui/transfersUI.js';
import { renderYouth } from './ui/youthUI.js';
import { renderTrophyRoom } from './ui/trophyUI.js';
import { renderMinigames } from './ui/minigamesUI.js';
import { renderMatch } from './ui/matchUI.js';
import { renderContractView } from './ui/contractUI.js';
import { ContractEngine } from './engine/contracts.js';
import { sfx } from '../assets/audio/sfx.js';

class App {
  constructor() {
    this.currentView = 'dashboard';
    this.mainContainer = null;
  }

  async init() {
    await db.init();
    const appEl = document.getElementById('app');
    
    if (!db.hasSave() && !db.gameState) {
      renderNewCareer(appEl, () => this.startMainLayout());
    } else {
      db.loadGame();
      this.startMainLayout();
    }
  }

  startMainLayout() {
    const appEl = document.getElementById('app');
    const userTeam = db.teams[db.gameState.userTeamId] || { name: 'Mi Club' };
    const contract = ContractEngine.evaluatePerformance() || ContractEngine.startClubContract(db.gameState.userTeamId, 3);
    const seasonLabel = `${db.gameState.season}/${db.gameState.season + 1}`;

    appEl.innerHTML = `
      <!-- Navbar Superior estilo EA FC -->
      <nav class="top-navbar">
        <div class="brand-logo">⚽ ENTRENADOR LEYENDA</div>

        <div class="manager-status-bar" id="topStatusBar">
          <div class="status-pill">DT: <strong>${db.gameState.managerName}</strong></div>
          <div class="status-pill">Club: <strong>${userTeam.name}</strong></div>
          <div class="status-pill">Presupuesto: <strong class="text-highlight" id="topBudgetDisplay">€${(db.gameState.budget / 1000000).toFixed(1)}M</strong></div>
          <div class="status-pill">Confianza Directiva: <strong class="text-highlight" id="topConfidenceDisplay">${contract.boardConfidence}%</strong></div>
          <div class="status-pill">Temporada: <strong id="topSeasonDisplay">${seasonLabel}</strong></div>
        </div>
      </nav>

      <div class="main-wrapper">
        <!-- Sidebar de Navegación -->
        <aside class="sidebar-nav">
          <a class="nav-item active" data-view="dashboard">🏠 Dashboard</a>
          <a class="nav-item" data-view="contract">📜 Mi Contrato (${contract.yearsRemaining}a)</a>
          <a class="nav-item" data-view="squad">📋 Plantilla & Tácticas</a>
          <a class="nav-item" data-view="transfers">📝 Mercado Fichajes</a>
          <a class="nav-item" data-view="youth">🌱 Cantera</a>
          <a class="nav-item" data-view="minigames">🎮 Minijuegos</a>
          <a class="nav-item" data-view="trophies">🏆 Palmarés</a>
          <a class="nav-item mt-4" id="btnResetCareer" style="color: var(--accent-red);">🔄 Nueva Carrera</a>
        </aside>

        <!-- Contenedor de Vista Activa -->
        <main id="mainContent" class="main-content"></main>
      </div>

      <!-- Elemento del Botón de Propinas Voluntarias (Se activa ÚNICAMENTE al finalizar la carrera) -->
      <a id="supportTipBtn" 
         href="https://buymeacoffee.com" 
         target="_blank" 
         rel="noopener noreferrer" 
         class="support-tip-btn hidden">
        ☕ 💰 Apoyar el proyecto
      </a>
    `;

    this.mainContainer = document.getElementById('mainContent');

    // Tab Event Listeners
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.addEventListener('click', (e) => {
        sfx.playClick();
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.navigateTo(e.currentTarget.dataset.view);
      });
    });

    document.getElementById('btnResetCareer').addEventListener('click', () => {
      if (confirm('¿Estás seguro de reiniciar la carrera actual de DT? Se perderán los datos de guardado.')) {
        localStorage.removeItem('entrenador_leyenda_save');
        location.reload();
      }
    });

    this.checkSupportTipVisibility();
    this.navigateTo('dashboard');
  }

  /**
   * Sincroniza la barra de estado superior (presupuesto dinámico, confianza, temporada 2026/2027)
   */
  updateTopStatusBar() {
    if (!db.gameState) return;
    const bDisplay = document.getElementById('topBudgetDisplay');
    const cDisplay = document.getElementById('topConfidenceDisplay');
    const sDisplay = document.getElementById('topSeasonDisplay');

    if (bDisplay) bDisplay.innerText = `€${(db.gameState.budget / 1000000).toFixed(1)}M`;
    
    if (cDisplay && db.gameState.contract) {
      cDisplay.innerText = `${db.gameState.contract.boardConfidence}%`;
    }

    if (sDisplay) {
      sDisplay.innerText = `${db.gameState.season}/${db.gameState.season + 1}`;
    }
  }

  /**
   * Controla la visibilidad del botón de propinas únicamente al finalizar la carrera
   */
  checkSupportTipVisibility() {
    const tipBtn = document.getElementById('supportTipBtn');
    if (!tipBtn) return;

    const isCareerFinished = db.gameState && (db.gameState.isCareerFinished || db.gameState.season >= 2050);
    if (isCareerFinished) {
      tipBtn.classList.remove('hidden');
    } else {
      tipBtn.classList.add('hidden');
    }
  }

  navigateTo(viewName, params = {}) {
    this.currentView = viewName;
    if (!this.mainContainer) return;
    this.updateTopStatusBar();
    this.checkSupportTipVisibility();

    if (viewName === 'dashboard') {
      renderDashboard(this.mainContainer, (v, p) => this.navigateTo(v, p));
    } else if (viewName === 'contract') {
      renderContractView(this.mainContainer, (v, p) => this.navigateTo(v, p));
    } else if (viewName === 'squad') {
      renderSquad(this.mainContainer);
    } else if (viewName === 'transfers') {
      renderTransfers(this.mainContainer);
    } else if (viewName === 'youth') {
      renderYouth(this.mainContainer);
    } else if (viewName === 'minigames') {
      renderMinigames(this.mainContainer, (v, p) => this.navigateTo(v, p));
    } else if (viewName === 'trophies') {
      renderTrophyRoom(this.mainContainer);
    } else if (viewName === 'match') {
      renderMatch(this.mainContainer, params.rival, params.mode, (v, p) => this.navigateTo(v, p));
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
