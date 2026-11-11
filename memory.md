# 🧠 Memory & Architecture Log — Entrenador Leyenda (Modo Manager DT)

> **Memoria Técnica y Registro de Decisiones de Desarrollo**  
> **Proyecto:** Entrenador Leyenda — Simulador Profesional de DT de Fútbol  
> **Stack:** TypeScript 5+, HTML5 Canvas 2D Isométrico, ES Modules, CSS Glassmorphism, Playwright E2E, Vercel  
> **Temporada Base:** 2025/2026 (Proyección hasta 2050/2051 - 25 Temporadas)

---

## 🏗️ 1. Arquitectura del Repositorio y Auditoría de Limpieza

### Estado Actual del Workspace
```
Modo Manager DT/
├── index.html                   # Entry point de la aplicación web
├── vercel.json                  # Configuración de despliegue en Vercel
├── tsconfig.json                # Configuración TypeScript strict (ES2022)
├── package.json                 # Versión 3.1.0, scripts de build y tests
├── clients.md                   # Requerimientos y matriz de producto
├── memory.md                    # Memoria técnica y estado de motores
├── .gitignore                   # Reglas de exclusión (actualizado)
├── css/
│   ├── main.css                 # Paleta de diseño y tokens CSS
│   ├── components.css           # Modales, tablas, botones y badges
│   └── pitch.css                # Estilos del lienzo y HUD del partido
├── assets/
│   ├── audio/sfx.js             # Efectos de audio retro sintetizados (Web Audio API)
│   ├── badges/                  # Escudos vectoriales/PNG de clubes de las ligas
│   └── data/
│       ├── leagues.json         # Base de datos de ligas y clubes del mundo
│       ├── real_players.json    # Plantillas y datos oficiales de jugadores (temp 2025/26)
│       └── team_api_mapping.json# Correspondencia de IDs de clubes
├── js/
│   ├── app.ts                   # Orquestador del ciclo de vida y navegación UI
│   ├── types.ts                 # Contratos de tipos de dominio (Single Source of Truth)
│   ├── data/
│   │   ├── db.ts                # DatabaseManager (persistencia y estado en runtime)
│   │   ├── teamData.ts          # Generador de jugadores y atributos FIFA/FC
│   │   ├── rivalries.ts         # Derbis y clásicos mundiales
│   │   └── leaguePrizes.ts      # Tabla de premios económicos por torneo
│   ├── engine/
│   │   ├── matchEngine.ts       # Simulación minuto a minuto, xG y eventos
│   │   ├── tactics.ts           # Formaciones, estilos y roles FC IQ
│   │   ├── teamSpirit.ts        # Química de vestuario y sinergias tácticas
│   │   ├── playerForm.ts        # Rachas (En Racha, Sequía, Wonderkid)
│   │   ├── transfers.ts         # Mercado de fichajes, ofertas y bloqueo de ventanas
│   │   ├── youthAcademy.ts      # Academia de cantera y generación de juveniles
│   │   ├── managerRPG.ts        # Árbol de talentos y niveles del DT
│   │   ├── managerMarketEngine.ts# Mercado y contrataciones de DTs rivales IA
│   │   ├── competitionsEngine.ts# Copas nacionales, Libertadores y Champions League
│   │   ├── contracts.ts         # Contratos, objetivos de directiva y destitución
│   │   └── eventsEngine.ts      # The Feed: noticias, filtraciones y crisis
│   └── ui/
│       ├── isometricPitch.ts    # Terreno 2D isométrico a 60 FPS estilo EA FC / PES
│       ├── matchUI.ts           # Marcador, control de velocidad y narración
│       ├── squadUI.ts           # Gestión de once inicial, táctica y suplentes
│       ├── tacticsUI.ts         # Pizarrón interactivo y roles
│       ├── transfersUI.ts       # Panel de transferencias y negociaciones
│       ├── scoutingUI.ts        # Red de ojeadores
│       ├── youthUI.ts           # Panel de academia de juveniles
│       ├── financesUI.ts        # Contabilidad y balances del club
│       ├── contractUI.ts        # Evaluación de la directiva
│       ├── dashboardUI.ts       # Menú principal y calendario semanal
│       ├── playerInspectorUI.ts # Ficha detallada de atributos y estadísticas
│       └── newCareerUI.ts       # Asistente de inicio de carrera
└── tests/
    └── e2e/regression.mjs       # Suite de tests de regresión visual y funcional
```

### Limpieza de Archivos y Optimización
- **Eliminación del rastreo de `.freebuff/`**: Se desindexaron ~17 MB de archivos binarios SQLite (`desktop-v2.db`, `wal`, `shm`) que habían sido comiteados por error de herramientas locales.
- **Actualización de `.gitignore`**: Exclusión explícita de `.freebuff/` para evitar reintroducción de binarios.
- **Validación de Compilación**: `npm run typecheck` (`tsc --noEmit`) verificado al 100% con cero errores de tipos.

---

## 🎮 2. Definición del MVP ("Road to Glory" y Experiencia PES 6 / FIFA 06-08)

### 2.1 Pirámide de Ligas para los 5 Pilares Europeos
El DT solo puede iniciar su trayectoria en el peldaño inferior de uno de los 5 países principales:

```
🏴󠁧󠁢󠁥󠁮󠁧󠁿 INGLATERRA:
Tier 1: Premier League (20 equipos)
Tier 2: EFL Championship (24 equipos)
Tier 3: EFL League One (24 equipos)
Tier 4: EFL League Two (24 equipos)
Tier 5: National League (División de Barro - 24 equipos)  <-- Punto de Inicio

🇪🇸 ESPAÑA:
Tier 1: LaLiga EA Sports (20 equipos)
Tier 2: LALIGA Hypermotion (22 equipos)
Tier 3: Primera Federación (RFEF)
Tier 4: Segunda Federación (RFEF)
Tier 5: Tercera Federación (RFEF - División de Barro)    <-- Punto de Inicio

🇮🇹 ITALIA:
Tier 1: Serie A (20 equipos)
Tier 2: Serie B (20 equipos)
Tier 3: Serie C (Girone A/B/C)                             <-- Punto de Inicio

🇩🇪 ALEMANIA:
Tier 1: Bundesliga (18 equipos)
Tier 2: 2. Bundesliga (18 equipos)
Tier 3: 3. Liga / Regionalliga                             <-- Punto de Inicio

🇫🇷 FRANCIA:
Tier 1: Ligue 1 (18 equipos)
Tier 2: Ligue 2 (18 equipos)
Tier 3: Championnat National                               <-- Punto de Inicio
```

---

## 📊 3. Reglas de Negocio del Sistema

### 3.1 Techo de Fichajes y Restricciones por División
Para mantener el realismo, un club no puede incorporar jugadores cuyo nivel o proyección deportiva exceda el prestigio de su categoría:

$$\text{OVR}_{\text{máximo permitido}} = 55 + (\text{Nivel de Tier Invertido} \times 7)$$

| División / Tier | OVR Máximo Fichable | Potencial Máximo Fichable | Salario Máximo Semanal |
| :---: | :---: | :---: | :---: |
| **Tier 5 (Barro)** | 66 OVR | 74 POT | €2.500 / sem |
| **Tier 4** | 70 OVR | 78 POT | €6.000 / sem |
| **Tier 3** | 74 OVR | 82 POT | €18.000 / sem |
| **Tier 2** | 78 OVR | 85 POT | €45.000 / sem |
| **Tier 1 (Élite)** | 94 OVR | 95 POT | Ilimitado (según presupuesto) |

> **Excepción de la Cantera**: Los juveniles formados en la **Academia Propia** pueden romper este techo (por ejemplo, descubrir un Wonderkid de 88 POT en 5ª división y retenerlo hasta que lleguen ofertas millonarias de la élite).

### 3.2 Sistema de Ojeo / Gacha de Ventajas (Scouting Network)
Financiado exclusivamente con presupuesto del club (`team.budget`). Otorga cartas de ventaja táctica y administrativa:
- 🎫 **Línea Directa con Agente**: Reduce el tiempo de negociación a 1 turno.
- 🏷️ **Descuento de Traspaso**: Descuento directo del 10% al 25% en la ficha.
- 🔓 **Omisión de Cláusula de Rescisión**: Permite negociar por debajo del valor de cláusula.
- 📈 **Desarrollo Intensivo**: Acelera el crecimiento de un canterano en +3 OVR temporal.

*Restricción de Tier*: Los paquetes de ojeo se desbloquean en función del prestigio del club. Un club de 5ª división solo accede a *Ojeo Regional Barrial*, impidiendo obtener ventajas incompatibles con su economía.

### 3.3 Carrera de 25 Años, Envejecimiento y Regens
- **Edad del DT**: Comienza con 35 años y culmina a los 70 años (25 temporadas exactas).
- **Envejecimiento Anual**: Al finalizar cada temporada, cada jugador envejece 1 año.
  - Futbolistas mayores de 32 años sufren decremento físico progresivo (`pac`, `phy`).
  - Futbolistas entre 34 y 38 años evalúan su retiro según su rol y minutos jugados.
- **Sistema de Cantera y Regens (3 a 4 Generaciones)**:
  - Cuando una figura mundial se retira (ej. Messi, Cristiano, De Bruyne, Lewandowski), el motor genera un **Regen** sintético con misma nacionalidad, posición y rango de potencial alto, colocado en agentes libres o canteras del mismo país.
  - La Academia produce anualmente de 3 a 5 prospectos sintéticos de 15 a 17 años con nombres y atributos procedimentales coherentes por región.

### 3.4 Sensación de Juego PES 6 / FIFA 06-08
- **Motor de Simulación Dinámico**:
  - Tiempo de partido calibrado (90 segundos en visualización continua o avance por eventos).
  - Medidor de Momentum estilo arcade (+/- 100) que impulsa rachas ofensivas según la moral y las órdenes de banda.
  - Flechas de Forma física previas al partido (rojo = óptimo, verde = normal, azul = bajo) que modifican los atributos en un +/- 5%.
- **Simulación Multi-Liga en Segundo Plano**:
  - Cada semana se simulan los marcadores y tablas de las ligas principales en paralelo con `simulateAllRivalMatches()`, permitiendo seguir ascensos, descensos y clasificaciones a copas europeas de forma global.

---

## 📝 4. Registro de Cambios (Changelog Reciente)

| Fecha | Commit | Descripción |
| :--- | :--- | :--- |
| **2026-10-18** | `86b8390` | Simulación estilo vista táctica EA FC / FIFA con indicador de control, medidor de momentum, jugadas enriquecidas y órdenes en vivo. |
| **2026-10-17** | `e14b843` | Centrado del campo isométrico 2D, movimiento autónomo continuo de jugadores y activación en jugadas. |
| **2026-10-17** | `76ae529` | Actualización de golden baselines E2E para la nueva interfaz y campo isométrico. |
| **2026-11-10** | *WIP* | Desindexación de `.freebuff/` (~17MB), actualización de `.gitignore`, creación de `clients.md` y `memory.md`, y especificación de tiers de 5ª división para los 5 pilares europeos. |
