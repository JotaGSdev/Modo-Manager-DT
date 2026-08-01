# Entrenador Leyenda - Juego de Gestion de Futbol (DT)

Entrenador Leyenda es un videojuego de gestion deportiva en HTML5 y JavaScript orientado a simular la carrera profesional de un Director Tecnico (DT) a lo largo de un periodo de 25 años. Inspirado en las mecanicas clasicas de modo carrera de franquicias de futbol, el proyecto combina gestion tactica, mercado de fichajes, cantera de jovenes promesas, dinamicas financieras y evaluacion de contratos por la junta directiva.

---

## Jugar en Linea

Puedes jugar directamente desde tu navegador en el siguiente enlace oficial del proyecto:

**[https://jotagsdev.github.io/Modo-Manager-DT/](https://jotagsdev.github.io/Modo-Manager-DT/)**

---

## Colaborar con el Proyecto

Si disfrutas de Entrenador Leyenda y deseas apoyar su desarrollo continuo, mantenimiento e inclusion de nuevas caracteristicas, puedes realizar una contribucion voluntaria en el siguiente enlace:

**[https://ko-fi.com/jotags](https://ko-fi.com/jotags)**

Tu apoyo ayuda a mantener el proyecto activo, libre de publicidad e impulsado por la comunidad.

---

## Descripcion General del Juego

En Entrenador Leyenda, asumes el rol de un entrenador principal al mando de un club profesional. A lo largo de tu trayectoria deberas gestionar el rendimiento en el terreno de juego, planificar la plantilla a corto y largo plazo, tomar decisiones financieras en el mercado de pases y cumplir con las expectativas planteadas por la directiva del equipo.

El juego esta estructurado para ofrecer una experiencia dinamica con parones estrategicos, resumenes estadisticos y competiciones continentales integradas.

---

## Caracteristicas Principales

### 1. Trayectoria Profesional de 25 Años
- Duracion maxima de carrera desde la temporada 2026/2027 hasta la temporada 2050/2051.
- Contratos laborales con duracion de 3 a 5 años por club.
- Ofertas de trabajo de equipos rivales al finalizar cada contrato o al alcanzar una reputacion destacada.
- Registro historico de titulos y estadisticas acumuladas en el Palmares del entrenador.

### 2. Sistema de Evaluacion de la Directiva (4 KPIs)
La permanencia en el club y la probabilidad de renovacion de contrato se miden a traves de cuatro indicadores clave:
- Resultados Deportivos: Rendimiento en liga respecto al objetivo fijado por el club.
- Satisfaccion de la Aficion: Porcentaje de respaldo de los hinchas basado en resultados y regularidad.
- Balance Economico: Control del presupuesto salarial y liquidez financiera del equipo.
- Confianza Global de la Directiva: Indice de aprobacion general que determina alertas de despido o propuestas de renovacion.

### 3. Cobertura de Ligas y Competiciones Continentales
- Inclusión de ligas profesionales de Sudamerica, Europa, Norteamerica y Asia (La Liga, Premier League, Serie A, Bundesliga, Ligue 1, Liga Profesional Argentina, Brasileirão, Liga MX, MLS, Saudi Pro League, Liga 1 de Peru, entre otras).
- Simulación simultanea de todos los partidos de la jornada para cada equipo de la liga, garantizando una tabla de posiciones equitativa y competitiva.
- Competiciones Continentales integradas según la región del club:
  - Europa: UEFA Champions League.
  - Sudamerica: Copa CONMEBOL Libertadores.
  - Norteamerica: CONCACAF Champions Cup.
- Recompensas financieras por avanzar de ronda y premios especiales por consagrarse campeon continental.

### 4. Modelo de Mercado de Fichajes
- Limitacion estricta a dos ventanas de transferencias por temporada:
  - Ventana de Verano: Semanas 1 a 4.
  - Ventana de Invierno: Semanas 19 a 22.
- El mercado permanece cerrado en las demas semanas de la temporada.
- Negociaciones mediante calculo de probabilidad de aceptacion basado en la oferta de traspaso, salario propuesto, reputacion del club y ofertas de clubes rivales.
- Mecanica de negociacion por pasos con bloqueo de ofertas rechazadas durante el resto de la ventana activa.

### 5. Cantera y Desarrollo de Jovenes Promesas
- Envio de ojeadores a regiones como Sudamerica y Europa con costo deducible del presupuesto del club.
- Promocion de canteranos al primer equipo mediante el pago de su ficha contractual profesional.

### 6. Ponderacion de Medias (OVR) por Posicion
Las medias generales de los futbolistas se calculan según pesos especificos para cada demarcación:
- Porteros (POR): 40% Defensivo/Reflejos + 35% Fisico + 15% Pase + 10% Ritmo.
- Defensas Centrales (DFC): 40% Defensivo + 35% Fisico + 15% Ritmo + 10% Pase.
- Laterales (LI/LD): 30% Ritmo + 30% Defensivo + 20% Pase + 20% Fisico.
- Mediocampistas (MC/MCD/MCO): Distribucion entre pase, regate, vision y trabajo defensivo.
- Delanteros (DC/EI/ED): 40% Tiro/Ritmo + 30% Regate + 15% Fisico + 15% Pase.

### 7. Evolucion Dinamica de Plantilla
- Jugadores jovenes (menores de 23 años): Crecimiento progresivo de media en funcion de los minutos y partidos disputados.
- Jugadores veteranos (mayores de 29 años): Declive natural anual con reduccion progresiva en atributos fisicos y velocidad.

### 8. Interfaz Tactica con Cancha 2D y Drag and Drop
- Alineacion visual sobre campo de juego 2D.
- Funcionalidad HTML5 Drag and Drop para intercambiar posiciones y sustituir jugadores directamente arrastrando sus fichas.

### 9. Economia Fluctuante y Parón de Invierno
- Recaudacion automatica de ingresos por taquilla en partidos como local.
- Prestigio y bonificaciones financieras al final de la temporada según la posicion alcanzada.
- Parón intertemporal en la Semana 19 con revision de clasificacion, tabla de goleadores (Pichichi) y apertura del mercado invernal.

---

## Estructura del Proyecto

```
Modo Manager DT/
├── index.html                  # Punto de entrada HTML5
├── README.md                   # Documentacion del proyecto
├── css/
│   ├── main.css                # Estilos base y variables de diseño
│   ├── components.css          # Tablas, tarjetas y componentes de interfaz
│   ├── pitch.css               # Cancha 2D tactica y fichas de jugadores
│   └── minigames.css           # Estilos para minijuegos
├── assets/
│   ├── audio/
│   │   └── sfx.js              # Sintetizador de audio Web Audio API
│   ├── data/
│   │   └── leagues.json        # Base de datos de ligas y clubes
│   └── images/
│       └── badgeGenerator.js   # Generador de escudos vectoriales SVG
└── js/
    ├── app.js                  # Inicializador y enrutador principal
    ├── data/
    │   ├── db.js               # Gestor de base de datos LocalStorage
    │   └── teamData.js         # Generador de plantillas y formulas de OVR
    ├── engine/
    │   ├── contracts.js        # Motor de contratos y evaluacion de KPIs
    │   ├── competitionsEngine.js # Motor de copas continentales y premios
    │   ├── matchEngine.js      # Motor de partidos y simulacion de ligas
    │   ├── probability.js      # Motor de probabilidades y analisis
    │   ├── tactics.js          # Formaciones y calculo de quimica
    │   ├── transfers.js        # Mercado de pases y ofertas rivales
    │   ├── youthAcademy.js     # Gestion de la cantera
    │   ├── eventsEngine.js     # Motor de eventos aleatorios
    │   └── trophyRoom.js       # Registro de palmares e historial
    ├── minigames/              # Minijuegos de habilidad
    └── ui/                     # Componentes de interfaz de usuario
```

---

## Ejecución Local (Opcional)

Si deseas ejecutar el proyecto localmente:

1. Clona o descarga el repositorio en tu equipo local.
2. Abre una terminal de comandos en la carpeta raiz del proyecto.
3. Inicia un servidor HTTP local (por ejemplo usando Python):
   ```bash
   python -m http.server 8080
   ```
4. Abre tu navegador web e ingresa a `http://localhost:8080` o accede directamente a la version alojada en **[https://jotagsdev.github.io/Modo-Manager-DT/](https://jotagsdev.github.io/Modo-Manager-DT/)**.

---

## Licencia

Este proyecto esta desarrollado con fines educativos y de entretenimiento. Todos los escudos y nombres genericos son generados de forma vectorial mediante SVG sin infraccion de derechos de autor.
