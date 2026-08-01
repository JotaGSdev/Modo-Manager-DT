# Entrenador Leyenda - Juego de Gestion de Futbol (DT)

Entrenador Leyenda es un videojuego de gestion deportiva en HTML5 y JavaScript orientado a simular la carrera profesional de un Director Tecnico (DT) a lo largo de un periodo de 25 años. Inspirado en las mecanicas clasicas de modo carrera de franquicias de futbol estilo EA FC y FIFA, el proyecto combina gestion tactica, mercado de fichajes de varios pasos, cantera de jovenes promesas por regiones, dinamicas financieras y evaluacion de contratos por la junta directiva en tiempo real.

---

## Jugar en Linea

Puedes jugar directamente desde tu navegador en el enlace oficial del proyecto:

**[https://jotagsdev.github.io/Modo-Manager-DT/](https://jotagsdev.github.io/Modo-Manager-DT/)**

---

## Colaborar con el Proyecto

Si disfrutante de Entrenador Leyenda y deseas apoyar su desarrollo continuo, mantenimiento e inclusion de nuevas caracteristicas y ligas, puedes realizar una contribucion voluntaria en el siguiente enlace:

**[https://ko-fi.com/jotags](https://ko-fi.com/jotags)**

Tu apoyo ayuda a mantener el proyecto activo, libre de publicidad e impulsado por la comunidad.

---

## Descripcion General del Juego

En Entrenador Leyenda, asumes el rol de un entrenador principal al mando de un club profesional entre 496 equipos disponibles distribuidos en 36 ligas de todo el mundo. A lo largo de tu trayectoria deberas gestionar el rendimiento en el terreno de juego, planificar la plantilla a corto y largo plazo, tomar decisiones financieras en el mercado de pases de 2 pasos y cumplir con las expectativas planteadas por la directiva del equipo.

El juego esta estructurado para ofrecer una experiencia dinamica con parones estrategicos, resumenes estadisticos, torneos Apertura y Clausura, Copas Nacionales y competiciones continentales integradas.

---

## Caracteristicas Principales

### 1. Cobertura Masiva de 36 Ligas, 496 Equipos y 10,912 Jugadores
- **36 Ligas Profesionales Integradas**:
  - **Sudamerica (CONMEBOL - 10 Ligas)**: Argentina (Liga Profesional), Brasil (Brasileirão Serie A), Colombia (Liga BetPlay), Bolivia, Chile, Ecuador (LigaPro Ecuabet), Paraguay, Peru (Liga 1 Te Apuesto), Uruguay, Venezuela (Liga FUTVE).
  - **Norteamerica y Centroamerica (CONCACAF - 6 Ligas)**: Estados Unidos / Canada (MLS), Mexico (Liga BBVA MX), Canada (CPL), Costa Rica (Liga Promerica), Honduras, Guatemala.
  - **Europa (1ra y 2da Division - 10 Ligas)**: Inglaterra (Premier League y EFL Championship), España (LALIGA EA Sports y LALIGA Hypermotion), Italia (Serie A y Serie B), Alemania (Bundesliga y 2. Bundesliga), Francia (Ligue 1 y Ligue 2).
  - **Ligas Globales Destacadas (10 Ligas)**: Portugal (Primeira Liga), Paises Bajos (Eredivisie), Turquia (Süper Lig), Arabia Saudita (Saudi Pro League), Japon (J1 League), Belgica (Pro League), Escocia (Scottish Premiership), Austria (Bundesliga Austriaca), Dinamarca (Superliga Danesa), Croacia (HNL).
- **10,912 Futbolistas Unicos**: Cada plantilla profesional cuenta con 22 jugadores con atributos individuales, salarios, clausulas y valores de mercado.

### 2. Estructura Completa de Torneos (Apertura, Clausura, Copas y Torneos Continentales)
- **Torneos Cortos Apertura y Clausura**: Para ligas latinoamericanas (Peru, Argentina, Colombia, Mexico, Chile, Uruguay, Ecuador, Bolivia, Paraguay, Venezuela, Costa Rica, Honduras, Guatemala).
- **31 Copas Nacionales Domesticas**: Sistema de eliminacion directa (Copa Bicentenario de Peru, Copa Argentina, Copa do Brasil, Copa del Rey de España, Emirates FA Cup de Inglaterra, Coppa Italia, DFB-Pokal de Alemania, entre otras).
- **Torneos Continentales de Elite**:
  - Sudamerica: Copa CONMEBOL Libertadores y Copa CONMEBOL Sudamericana.
  - Europa: UEFA Champions League y UEFA Europa League.
  - Norteamerica y Centroamerica: Copa de Campeones de la CONCACAF y Copa Centroamericana.

### 3. Mercado de Fichajes Estilo EA FC (Negociacion de 2 Pasos y Bloqueo)
- **Wizard de Negociacion en 2 Pasos**: Paso 1 (Traspaso y Clausula de Venta Futura con el club vendedor) y Paso 2 (Rol en el equipo, años de contrato, salario semanal y bono por firmas con el jugador).
- **Mecanica de Bloqueo por Rechazo**: Si una negociacion se rompe, el jugador queda bloqueado hasta la siguiente ventana de transferencias.
- **Ventanas de Mercado**: Apertura en Verano (Semanas 1 a 4) e Invierno (Semanas 19 a 22).

### 4. Sistema de Cantera Avanzado con 5 Niveles de Ojeador
- **5 Niveles de Cazatalentos**: Nivel 1 (Novato Local), Nivel 2 (Experimentado Regional), Nivel 3 (Profesional Continental), Nivel 4 (Internacional Mundial), Nivel 5 (Leyenda Elite con potencial 87-97).
- **Scouting por 5 Regiones del Mundo**: Sudamerica, Europa, Norteamerica, Centroamerica y Asia.
- **Nombres y Nacionalidades Autenticas**: Generacion dinamica de nombres y banderas segun el pais explorado.
- **Gestion de Canteranos**: Opciones directas para Promocionar al primer equipo o Descartar canteranos.

### 5. Barra de Estado Reactiva en Tiempo Real
- Sincronizacion instantanea del presupuesto del club, nivel de confianza de la junta directiva, nombre del DT, club actual y temporada en la barra superior sin necesidad de recargar la pantalla.

### 6. Trayectoria Profesional de 25 Años y Evaluacion de la Directiva
- Carrera continua desde la temporada 2026/2027 hasta la temporada 2050/2051.
- Evaluacion de rendimiento mediante 4 indicadores clave (KPIs): Resultados Deportivos, Satisfaccion de la Hinchada, Balance Economico y Confianza Global.
- Ofertas de trabajo de clubes rivales segun la reputacion alcanzada y Palmares de Titulos Acumulados.

### 7. Interfaz Tactica con Cancha 2D y Drag and Drop
- Alineacion visual sobre campo de juego 2D.
- Funcionalidad HTML5 Drag and Drop para intercambiar posiciones y sustituir jugadores arrastrando sus fichas.

---

## Estructura del Proyecto

```
Modo Manager DT/
├── index.html                  # Punto de entrada HTML5
├── README.md                   # Documentacion del proyecto
├── css/
│   ├── main.css                # Estilos base y variables de diseño
│   ├── components.css          # Tablas, tarjetas, cantera y componentes de interfaz
│   ├── pitch.css               # Cancha 2D tactica y fichas de jugadores
│   └── minigames.css           # Estilos para minijuegos
├── assets/
│   ├── audio/
│   │   └── sfx.js              # Sintetizador de audio Web Audio API
│   ├── data/
│   │   └── leagues.json        # Base de datos unificada de 36 ligas y 496 clubes
│   └── images/
│       └── badgeGenerator.js   # Generador de escudos vectoriales SVG
└── js/
    ├── app.js                  # Inicializador y enrutador principal con sincronizacion global UI
    ├── data/
    │   ├── db.js               # Gestor de base de datos LocalStorage y reinicios de temporada
    │   └── teamData.js         # Generador de plantillas y formulas de OVR
    ├── engine/
    │   ├── contracts.js        # Motor de contratos y evaluacion de KPIs
    │   ├── competitionsEngine.js # Motor de Apertura, Clausura, Copas Nacionales e Internacionales
    │   ├── matchEngine.js      # Motor de partidos y simulacion de ligas
    │   ├── probability.js      # Motor de probabilidades y analisis
    │   ├── tactics.js          # Formaciones y calculo de quimica
    │   ├── transfers.js        # Mercado de pases de 2 pasos y bloqueos por rechazo
    │   ├── youthAcademy.js     # Gestion de la cantera por niveles de ojeador y regiones
    │   ├── eventsEngine.js     # Motor de eventos aleatorios
    │   └── trophyRoom.js       # Registro de palmares e historial
    ├── minigames/              # Minijuegos de habilidad
    └── ui/                     # Componentes de interfaz de usuario
```

---

## Licencia

Este proyecto esta desarrollado con fines educativos y de entretenimiento. Todos los escudos y nombres genericos son generados de forma vectorial mediante SVG sin infraccion de derechos de autor.
