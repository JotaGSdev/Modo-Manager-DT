/**
 * ============================================================================
 * ENTRENADOR LEYENDA - PANTALLA INICIAL RETRO BROADCAST (welcomeUI.ts)
 * ============================================================================
 * Pantalla de bienvenida y punto de entrada visual estilo PES 6 / FIFA 08:
 * - Tarjeta de "Continuar Carrera" con datos vivos del club y DT.
 * - Desafío destacado "Road to Glory" (Inicio en División de Barro).
 * - Selector rápido de los 5 Pilares Europeos.
 * - Opciones de gestión de partida (Exportar / Importar / Limpiar).
 */

import { db } from '../data/db.js';
import { sfx } from '../../assets/audio/sfx.js';
import { renderTeamBadgeSVG } from './badgeHelper.js';

interface WelcomeCallbacks {
  onContinue: () => void;
  onNewCareer: () => void;
}

export function renderWelcomeScreen(container: HTMLElement, callbacks: WelcomeCallbacks): void {
  const hasSave = db.hasSave() && db.gameState !== null;
  const state = db.gameState;
  const currentTeam = state ? db.teams[state.userTeamId] : null;

  container.innerHTML = `
    <div style="min-height: 100vh; background: radial-gradient(circle at 50% 15%, #0f271d 0%, #07130e 45%, #030806 100%); display: flex; flex-direction: column; justify-content: space-between; padding: 24px 20px; color: #f8fafc; font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box;">
      
      <!-- HEADER CON MARCADOR Y LOGO BROADCAST -->
      <header style="max-width: 1040px; width: 100%; margin: 0 auto; display: flex; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 44px; height: 44px; border-radius: 8px; background: linear-gradient(135deg, #00c885, #007a52); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.3rem; color: #000; box-shadow: 0 0 16px rgba(0, 200, 133, 0.35);">
            EL
          </div>
          <div>
            <div style="font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 1.4rem; letter-spacing: 0.5px; line-height: 1.1; color: #ffffff;">
              ENTRENADOR LEYENDA
            </div>
            <div style="font-size: 0.72rem; color: #94a3b8; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">
              Simulador de Carrera DT
            </div>
          </div>
        </div>
      </header>

      <!-- CUERPO PRINCIPAL CON TARJETAS DE ACCIÓN -->
      <main style="max-width: 1040px; width: 100%; margin: 32px auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; align-items: stretch;">
        
        <!-- TARJETA 1: CONTINUAR PARTIDA (O INICIO DIRECTO) -->
        ${hasSave && state && currentTeam ? `
          <div class="glass-panel" style="background: rgba(13, 24, 19, 0.85); border: 1px solid rgba(0, 200, 133, 0.35); border-radius: 12px; padding: 28px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; box-shadow: 0 12px 32px rgba(0,0,0,0.45);">
            <div style="position: absolute; top: -20px; right: -20px; width: 120px; height: 120px; background: radial-gradient(circle, rgba(0, 200, 133, 0.2) 0%, transparent 70%); border-radius: 50%;"></div>
            
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <span style="font-size: 0.72rem; font-weight: 800; color: #00c885; text-transform: uppercase; letter-spacing: 1px;">
                  PARTIDA EN CURSO
                </span>
                <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 700;">
                  TEMPORADA ${state.season} · SEMANA ${state.week} / 38
                </span>
              </div>

              <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
                <div style="width: 56px; height: 56px; background: #0c1a14; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                  ${renderTeamBadgeSVG(currentTeam, 42)}
                </div>
                <div>
                  <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.45rem; font-weight: 900; margin: 0; color: #ffffff;">
                    ${currentTeam.name}
                  </h2>
                  <div style="font-size: 0.8rem; color: #94a3b8; display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                    <span>DT: <strong style="color: #f1f5f9;">${state.managerName || 'Entrenador'}</strong> (${state.managerAge || 35} años)</span>
                  </div>
                </div>
              </div>

              <!-- STATS RÁPIDAS -->
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: rgba(5, 12, 9, 0.75); border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 8px; margin-bottom: 22px;">
                <div style="text-align: center;">
                  <div style="font-size: 0.65rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Presupuesto</div>
                  <div style="font-family: 'Outfit', sans-serif; font-size: 0.95rem; font-weight: 800; color: #38bdf8;">
                    €${((currentTeam.budget || 0) / 1000000).toFixed(1)}M
                  </div>
                </div>
                <div style="text-align: center; border-left: 1px solid rgba(255,255,255,0.08); border-right: 1px solid rgba(255,255,255,0.08);">
                  <div style="font-size: 0.65rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Confianza</div>
                  <div style="font-family: 'Outfit', sans-serif; font-size: 0.95rem; font-weight: 800; color: #00c885;">
                    ${state.contract?.boardConfidence || 85}%
                  </div>
                </div>
                <div style="text-align: center;">
                  <div style="font-size: 0.65rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Reputación</div>
                  <div style="font-family: 'Outfit', sans-serif; font-size: 0.95rem; font-weight: 800; color: #f59e0b;">
                    ${currentTeam.reputation || 50}
                  </div>
                </div>
              </div>
            </div>

            <button id="btnWelcomeContinue" class="btn-primary" style="width: 100%; padding: 14px; font-size: 0.95rem; font-weight: 900; letter-spacing: 0.5px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>CONTINUAR CARRERA</span>
              <span style="font-size: 1.1rem;">▶</span>
            </button>
          </div>
        ` : `
          <!-- CARD DE BIENVENIDA SI ES PRIMERA VEZ -->
          <div class="glass-panel" style="background: rgba(13, 24, 19, 0.85); border: 1px solid rgba(0, 200, 133, 0.35); border-radius: 12px; padding: 28px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 12px 32px rgba(0,0,0,0.45);">
            <div>
              <div style="font-size: 0.72rem; font-weight: 800; color: #00c885; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                COMIENZO DE TRAYECTORIA
              </div>
              <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 900; margin: 0 0 12px 0; color: #ffffff; line-height: 1.2;">
                El Camino a la Gloria Comienza en el Barro
              </h2>
              <p style="font-size: 0.88rem; color: #94a3b8; line-height: 1.5; margin-bottom: 18px;">
                Inicia como DT novato de 35 años en las divisiones inferiores del fútbol europeo. Administra presupuestos ajustados, forja tu filosofía táctica y compite durante 25 temporadas para alcanzar la élite mundial.
              </p>
              
              <div style="background: rgba(5, 12, 9, 0.7); border: 1px solid rgba(255,255,255,0.06); padding: 12px 14px; border-radius: 8px; margin-bottom: 20px;">
                <div style="font-size: 0.75rem; font-weight: 700; color: #f1f5f9; margin-bottom: 6px;">5 Pilares Europeos Disponibles:</div>
                <div style="font-size: 0.76rem; color: #64748b; line-height: 1.6;">
                  🏴󠁧󠁢󠁥󠁮󠁧󠁿 National League (Tier 5) · 🇪🇸 Tercera RFEF (Tier 5)<br>
                  🇮🇹 Serie C (Tier 3) · 🇩🇪 3. Liga (Tier 3) · 🇫🇷 National (Tier 3)
                </div>
              </div>
            </div>

            <button id="btnWelcomeNewCareerPrime" class="btn-primary" style="width: 100%; padding: 14px; font-size: 0.95rem; font-weight: 900; letter-spacing: 0.5px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>INICIAR NUEVA CARRERA</span>
              <span style="font-size: 1.1rem;">+</span>
            </button>
          </div>
        `}

        <!-- TARJETA 2: NUEVA CARRERA (SI YA HABÍA SAVE) O MODALIDADES -->
        <div class="glass-panel" style="background: rgba(11, 19, 32, 0.85); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 28px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-size: 0.72rem; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
              OPCIONES DE CARRERA
            </div>
            
            <h3 style="font-family: 'Outfit', sans-serif; font-size: 1.3rem; font-weight: 800; color: #ffffff; margin: 0 0 10px 0;">
              ${hasSave ? 'Empezar Nueva Temporada' : 'Reglas Oficiales del Modo DT'}
            </h3>
            
            <p style="font-size: 0.84rem; color: #94a3b8; line-height: 1.5; margin-bottom: 16px;">
              ${hasSave 
                ? 'Puedes iniciar una nueva trayectoria desde cero. Podrás elegir entre los 5 pilares europeos y definir tu arquetipo táctico.'
                : 'Partidos en 90 segundos con visión táctica 2D, flechas de forma PES 6, mercado con restricciones realistas y cantera de 4 generaciones.'}
            </p>

            <ul style="list-style: none; padding: 0; margin: 0 0 20px 0; font-size: 0.78rem; color: #cbd5e1; display: flex; flex-direction: column; gap: 8px;">
              <li style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #00c885; font-weight: 900;">✓</span> Máximo 25 temporadas (DT madura de 35 a 70 años).
              </li>
              <li style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #00c885; font-weight: 900;">✓</span> Sistema de Ojeo (Gacha de Ventajas) con presupuesto del club.
              </li>
              <li style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #00c885; font-weight: 900;">✓</span> Prohibición de traspasos irreales en categorías inferiores.
              </li>
            </ul>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${hasSave ? `
              <button id="btnWelcomeNewCareer" class="btn-secondary" style="width: 100%; padding: 12px; font-weight: 800; font-size: 0.88rem; border-radius: 8px; cursor: pointer;">
                Crear Nueva Carrera (Reiniciar)
              </button>
            ` : ''}
            <button id="btnWelcomeDataOps" class="btn-secondary" style="width: 100%; padding: 11px; font-weight: 700; font-size: 0.82rem; border-radius: 8px; cursor: pointer; color: #94a3b8;">
              Gestión de Datos y Respaldos
            </button>
          </div>
        </div>

      </main>

      <!-- FOOTER PROFESIONAL DE AUTORÍA -->
      <footer style="max-width: 1040px; width: 100%; margin: 0 auto; display: flex; justify-content: center; align-items: center; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 14px; font-size: 0.78rem; color: #94a3b8; font-weight: 700; letter-spacing: 0.5px;">
        <div>
          Desarrollado por <span style="color: #00c885; font-weight: 800;">J.GS Dev</span>
        </div>
      </footer>

    </div>
  `;

  // EVENT LISTENERS
  const btnContinue = document.getElementById('btnWelcomeContinue');
  if (btnContinue) {
    btnContinue.addEventListener('click', () => {
      sfx.playClick();
      callbacks.onContinue();
    });
  }

  const btnNewPrime = document.getElementById('btnWelcomeNewCareerPrime');
  if (btnNewPrime) {
    btnNewPrime.addEventListener('click', () => {
      sfx.playClick();
      callbacks.onNewCareer();
    });
  }

  const btnNew = document.getElementById('btnWelcomeNewCareer');
  if (btnNew) {
    btnNew.addEventListener('click', () => {
      sfx.playClick();
      if (confirm('¿Estás seguro de iniciar una nueva carrera? La partida actual será reemplazada.')) {
        db.clearSave();
        callbacks.onNewCareer();
      }
    });
  }

  const btnDataOps = document.getElementById('btnWelcomeDataOps');
  if (btnDataOps) {
    btnDataOps.addEventListener('click', () => {
      sfx.playClick();
      showDataOpsModal();
    });
  }
}

/**
 * Modal para exportar/importar partida en JSON
 */
function showDataOpsModal(): void {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,23,0.85);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px);';
  overlay.innerHTML = `
    <div class="glass-panel" style="max-width:480px;width:90%;padding:24px;background:#0c1322;border:1px solid rgba(255,255,255,0.12);border-radius:12px;color:#f8fafc;">
      <h3 style="font-family:'Outfit',sans-serif;font-size:1.25rem;font-weight:900;margin:0 0 10px 0;color:#ffffff;">
        Gestión de Datos y Partida
      </h3>
      <p style="font-size:0.82rem;color:#94a3b8;line-height:1.4;margin-bottom:18px;">
        Exporta tu progreso para continuar en otro dispositivo o importa un archivo JSON de respaldo.
      </p>

      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:18px;">
        <button id="btnExportJSON" class="btn-primary" style="padding:10px;font-size:0.85rem;font-weight:800;border-radius:6px;cursor:pointer;">
          Exportar Partida (Descargar JSON)
        </button>
        
        <label class="btn-secondary" style="padding:10px;font-size:0.85rem;font-weight:800;border-radius:6px;cursor:pointer;text-align:center;display:block;">
          Importar Partida (Subir JSON)
          <input type="file" id="fileImportJSON" accept=".json" style="display:none;" />
        </label>
      </div>

      <div style="display:flex;justify-content:flex-end;">
        <button id="btnCloseDataOps" class="btn-secondary" style="padding:8px 16px;font-size:0.8rem;border-radius:6px;cursor:pointer;">
          Cerrar
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('btnCloseDataOps')!.addEventListener('click', () => {
    sfx.playClick();
    overlay.remove();
  });

  document.getElementById('btnExportJSON')!.addEventListener('click', () => {
    sfx.playClick();
    const dataStr = localStorage.getItem('entrenador_leyenda_save');
    if (!dataStr) {
      alert('No hay ninguna partida guardada para exportar.');
      return;
    }
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entrenador_leyenda_save_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  const fileInput = document.getElementById('fileImportJSON') as HTMLInputElement;
  if (fileInput) {
    fileInput.addEventListener('change', (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          if (!content || !content.startsWith('{')) {
            alert('El archivo no contiene un JSON válido.');
            return;
          }
          localStorage.setItem('entrenador_leyenda_save', content);
          const loaded = db.loadGame();
          if (loaded) {
            alert('Partida importada con éxito.');
            location.reload();
          } else {
            alert('El archivo no tiene un formato de partida válido.');
          }
        } catch {
          alert('Error al leer el archivo de partida.');
        }
      };
      reader.readAsText(file);
    });
  }
}
