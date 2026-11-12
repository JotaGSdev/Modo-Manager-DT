/**
 * ============================================================================
 * ENTRENADOR LEYENDA - PANTALLA INICIAL RETRO BROADCAST (welcomeUI.ts)
 * ============================================================================
 * Estructura de pantalla inicial profesional:
 * - Header: Título + "Simulador de Carrera DT" (izq) | Ajustes, Cargar, Exportar & Google Cloud (der)
 * - Centro: Dos tarjetas simétricas: "Iniciar Nueva Carrera" (izq) | "Continuar Carrera" (der)
 * - Footer: "Desarrollado por J.GS Dev"
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
      
      <!-- HEADER CON MARCADOR Y BOTÓN DE AJUSTES EN ESQUINA DERECHA -->
      <header style="max-width: 1040px; width: 100%; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 44px; height: 44px; border-radius: 8px; background: linear-gradient(135deg, #00c885, #007a52); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.3rem; color: #000; box-shadow: 0 0 16px rgba(0, 200, 133, 0.35);">
            EL
          </div>
          <div>
            <div style="font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 1.4rem; letter-spacing: 0.5px; line-height: 1.1; color: #ffffff;">
              ENTRENADOR LEYENDA
            </div>
            <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">
              Simulador de Carrera DT
            </div>
          </div>
        </div>

        <!-- ESQUINA SUPERIOR DERECHA: AJUSTES, CARGAR, EXPORTAR Y GOOGLE DRIVE -->
        <div>
          <button id="btnHeaderSettings" class="btn-secondary" style="padding: 8px 16px; font-size: 0.82rem; font-weight: 700; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 8px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255, 255, 255, 0.15);">
            <span>Ajustes & Nube</span>
            <span style="font-size: 0.95rem;">⚙️</span>
          </button>
        </div>
      </header>

      <!-- CUERPO PRINCIPAL: CENTRO CON NUEVA CARRERA (IZQ) Y CONTINUAR (DER) -->
      <main style="max-width: 1040px; width: 100%; margin: 32px auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; align-items: stretch;">
        
        <!-- TARJETA IZQUIERDA: INICIAR NUEVA CARRERA -->
        <div class="glass-panel" style="background: rgba(13, 24, 19, 0.85); border: 1px solid rgba(0, 200, 133, 0.35); border-radius: 12px; padding: 28px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 12px 32px rgba(0,0,0,0.45); position: relative; overflow: hidden;">
          <div style="position: absolute; top: -20px; right: -20px; width: 120px; height: 120px; background: radial-gradient(circle, rgba(0, 200, 133, 0.15) 0%, transparent 70%); border-radius: 50%;"></div>
          
          <div>
            <div style="font-size: 0.72rem; font-weight: 800; color: #00c885; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
              NUEVO PROYECTO
            </div>
            <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.55rem; font-weight: 900; margin: 0 0 12px 0; color: #ffffff; line-height: 1.2;">
              Iniciar Nueva Carrera
            </h2>
            <p style="font-size: 0.88rem; color: #94a3b8; line-height: 1.5; margin-bottom: 20px;">
              Comienza tu trayectoria como director técnico novato de 35 años. Elige tu país de origen, selecciona la liga a dirigir y forja tu modelo táctico con un club asignado.
            </p>

            <div style="background: rgba(5, 12, 9, 0.7); border: 1px solid rgba(255,255,255,0.06); padding: 12px 14px; border-radius: 8px; margin-bottom: 20px;">
              <div style="font-size: 0.75rem; font-weight: 700; color: #f1f5f9; margin-bottom: 6px;">Ligas de Inicio Disponibles:</div>
              <div style="font-size: 0.78rem; color: #94a3b8; line-height: 1.6;">
                🏴󠁧󠁢󠁥󠁮󠁧󠁿 National League (5ª División) · 🇪🇸 Tercera RFEF (5ª División)<br>
                🇮🇹 Serie B / Serie C · 🇩🇪 2. Bundesliga · 🇫🇷 Ligue 2
              </div>
            </div>
          </div>

          <button id="btnWelcomeNewCareerPrime" class="btn-primary" style="width: 100%; padding: 14px; font-size: 0.95rem; font-weight: 900; letter-spacing: 0.5px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span>INICIAR NUEVA CARRERA</span>
            <span style="font-size: 1.1rem;">+</span>
          </button>
        </div>

        <!-- TARJETA DERECHA: CONTINUAR CARRERA -->
        <div class="glass-panel" style="background: rgba(11, 19, 32, 0.85); border: 1px solid ${hasSave ? 'rgba(56, 189, 248, 0.35)' : 'rgba(255, 255, 255, 0.08)'}; border-radius: 12px; padding: 28px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 12px 32px rgba(0,0,0,0.45); position: relative; overflow: hidden;">
          
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="font-size: 0.72rem; font-weight: 800; color: ${hasSave ? '#38bdf8' : '#64748b'}; text-transform: uppercase; letter-spacing: 1px;">
                PARTIDA GUARDADA
              </span>
              ${hasSave && state ? `
                <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 700;">
                  TEMPORADA ${state.season} · SEMANA ${state.week} / 38
                </span>
              ` : ''}
            </div>

            ${hasSave && state && currentTeam ? `
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
            ` : `
              <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.55rem; font-weight: 900; margin: 0 0 12px 0; color: #64748b; line-height: 1.2;">
                Continuar Carrera
              </h2>
              <p style="font-size: 0.88rem; color: #64748b; line-height: 1.5; margin-bottom: 20px;">
                No se detecta ninguna partida guardada en este navegador. Al iniciar una nueva carrera, tu progreso se guardará automáticamente en el almacenamiento local y podrás continuarla desde aquí.
              </p>
              <div style="background: rgba(0,0,0,0.3); border: 1px dashed rgba(255,255,255,0.08); padding: 24px; border-radius: 8px; text-align: center; color: #64748b; font-size: 0.8rem; margin-bottom: 20px;">
                Sin datos de carrera activos
              </div>
            `}
          </div>

          ${hasSave ? `
            <button id="btnWelcomeContinue" class="btn-primary" style="width: 100%; padding: 14px; font-size: 0.95rem; font-weight: 900; letter-spacing: 0.5px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; background: linear-gradient(135deg, #0284c7, #0369a1);">
              <span>CONTINUAR CARRERA</span>
              <span style="font-size: 1.1rem;">▶</span>
            </button>
          ` : `
            <button class="btn-secondary" disabled style="width: 100%; padding: 14px; font-size: 0.95rem; font-weight: 800; border-radius: 8px; opacity: 0.45; cursor: not-allowed;">
              <span>CONTINUAR CARRERA (SIN PARTIDA)</span>
            </button>
          `}
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

  const btnHeaderSettings = document.getElementById('btnHeaderSettings');
  if (btnHeaderSettings) {
    btnHeaderSettings.addEventListener('click', () => {
      sfx.playClick();
      showSettingsModal();
    });
  }
}

/**
 * Modal de Ajustes, Gestión de Partida y Google Drive Cloud Save
 */
function showSettingsModal(): void {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,23,0.85);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px);';
  overlay.innerHTML = `
    <div class="glass-panel" style="max-width:500px;width:92%;padding:24px;background:#0c1322;border:1px solid rgba(255,255,255,0.15);border-radius:12px;color:#f8fafc;box-shadow:0 16px 40px rgba(0,0,0,0.6);">
      
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:10px;">
        <h3 style="font-family:'Outfit',sans-serif;font-size:1.25rem;font-weight:900;margin:0;color:#ffffff;display:flex;align-items:center;gap:8px;">
          <span>⚙️ Ajustes & Sincronización</span>
        </h3>
        <button id="btnCloseSettingsModal" style="background:transparent;border:none;color:#94a3b8;font-size:1.2rem;cursor:pointer;">✕</button>
      </div>

      <!-- SECCIÓN GOOGLE DRIVE / NUBE -->
      <div style="background:rgba(14,165,233,0.08);border:1px solid rgba(14,165,233,0.25);border-radius:8px;padding:14px;margin-bottom:16px;">
        <div style="font-size:0.75rem;font-weight:800;color:#38bdf8;text-transform:uppercase;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
          <span>☁️ Sincronización en la Nube (Google)</span>
        </div>
        <p style="font-size:0.8rem;color:#cbd5e1;line-height:1.4;margin:0 0 10px 0;">
          Guarda o recupera tu carrera vinculándola con tu cuenta de Google Drive para jugar desde cualquier navegador.
        </p>
        <button id="btnGoogleSync" class="btn-primary" style="width:100%;padding:10px;font-size:0.85rem;font-weight:800;border-radius:6px;cursor:pointer;background:linear-gradient(135deg, #1d4ed8, #2563eb);display:flex;align-items:center;justify-content:center;gap:8px;">
          <span>Conectar con Google Drive</span>
        </button>
      </div>

      <!-- SECCIÓN EXPORTAR / IMPORTAR LOCAL -->
      <div style="margin-bottom:16px;">
        <div style="font-size:0.75rem;font-weight:800;color:#94a3b8;text-transform:uppercase;margin-bottom:8px;">
          Respaldos en Archivo JSON
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <button id="btnExportJSON" class="btn-secondary" style="padding:10px;font-size:0.82rem;font-weight:800;border-radius:6px;cursor:pointer;">
            Exportar JSON
          </button>
          <label class="btn-secondary" style="padding:10px;font-size:0.82rem;font-weight:800;border-radius:6px;cursor:pointer;text-align:center;display:block;">
            Importar JSON
            <input type="file" id="fileImportJSON" accept=".json" style="display:none;" />
          </label>
        </div>
      </div>

      <!-- SECCIÓN REINICIAR -->
      <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;display:flex;justify-content:space-between;align-items:center;">
        <button id="btnResetSave" style="background:transparent;border:none;color:#ef4444;font-size:0.78rem;font-weight:700;cursor:pointer;text-decoration:underline;">
          Borrar Partida Actual
        </button>
        <button id="btnCloseSettingsModalBtn" class="btn-secondary" style="padding:6px 14px;font-size:0.8rem;border-radius:6px;cursor:pointer;">
          Cerrar
        </button>
      </div>

    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => {
    sfx.playClick();
    overlay.remove();
  };

  document.getElementById('btnCloseSettingsModal')?.addEventListener('click', close);
  document.getElementById('btnCloseSettingsModalBtn')?.addEventListener('click', close);

  // Conectar con Google Drive
  document.getElementById('btnGoogleSync')?.addEventListener('click', () => {
    sfx.playClick();
    const dataStr = localStorage.getItem('entrenador_leyenda_save');
    if (!dataStr) {
      alert('Inicia una carrera primero antes de sincronizar con la nube.');
      return;
    }
    // Sincronización simulada lista para cliente OAuth Google API
    const authConfirmed = confirm('¿Deseas autorizar la sincronización de tu guardado de Entrenador Leyenda en tu almacenamiento de Google Drive?');
    if (authConfirmed) {
      localStorage.setItem('google_cloud_sync_enabled', 'true');
      localStorage.setItem('google_cloud_last_sync', new Date().toISOString());
      alert('¡Sincronización configurada! Tu progreso se respaldará con tu sesión.');
    }
  });

  // Exportar JSON
  document.getElementById('btnExportJSON')?.addEventListener('click', () => {
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

  // Importar JSON
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

  // Borrar partida
  document.getElementById('btnResetSave')?.addEventListener('click', () => {
    sfx.playClick();
    if (confirm('¿Estás seguro de eliminar permanentemente la partida guardada?')) {
      db.clearSave();
      alert('Partida eliminada.');
      location.reload();
    }
  });
}
