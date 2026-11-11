# 📋 Clients & Stakeholder Requirements — Entrenador Leyenda (Modo Manager DT)

> **Documento de Requerimientos y Alineación de Producto**  
> **Versión:** 1.0.0 (MVP Road to Glory)  
> **Última Actualización:** Temporada 2025/2026

---

## 🎯 1. Visión del Producto

Desarrollar un simulador de gestión técnica y deportiva de fútbol enfocado en navegador web (desplegado en **Vercel**), con la inmediatez y estética retro arcade-táctica inspirada en los clásicos **FIFA 06 / FIFA 08** y **Pro Evolution Soccer 6 (PES 6)**, combinado con una profundidad moderna de carrera de **hasta 25 temporadas**.

### Pilares Fundamentales
1. **Inicio en el Fútbol de Barro ("Road to Glory")**: El jugador no inicia en un gigante europeo; comienza obligatoriamente en las divisiones más bajas del escalafón futbolístico para ascender paso a paso.
2. **Los 5 Pilares Europeos (Pirámide de Ascenso)**:
   - 🏴󠁧󠁢󠁥󠁮󠁧󠁿 **Inglaterra**: 5ª División (National League) ➔ League Two ➔ League One ➔ Championship ➔ Premier League.
   - 🇪🇸 **España**: Segunda / Tercera Federación (RFEF) ➔ Primera Federación ➔ LaLiga Hypermotion ➔ LaLiga EA Sports.
   - 🇮🇹 **Italia**: Serie C ➔ Serie B ➔ Serie A.
   - 🇩🇪 **Alemania**: 3. Liga / Regionalliga ➔ 2. Bundesliga ➔ Bundesliga.
   - 🇫🇷 **Francia**: Championnat National ➔ Ligue 2 ➔ Ligue 1.
3. **Restricciones Realistas de Reputación y Fichajes**:
   - Un club de 5ª división no puede tentar ni fichar promesas de potencial 90 ni estrellas mundiales (OVR 80+).
   - El mercado impone un techo estricto por reputación de club y categoría.
4. **Sistema de Ojeo Dinámico / Ventajas Gacha**:
   - Sobres y carteras de scouting financiados con el presupuesto del club.
   - Otorgan ventajas estratégicas proporcionales al nivel del club: descuentos en traspasos, agilización de contratos, línea directa con agentes o flexibilización de cláusulas.
5. **Carrera de 25 Años & Longevidad del DT (35 a 70 años)**:
   - El DT madura de novato (35 años) a leyenda veterana (70 años).
   - Academia Juvenil y Generación Sintética (*Regens*) para renovar de 3 a 4 generaciones de futbolistas.
6. **Simulación Simultánea de Múltiples Ligas**:
   - Seguimiento dinámico de tablas, goleadores y resultados de ligas europeas y continentales.

---

## 👤 2. Perfil de Usuario y Experiencia (UX)

- **Target**: Amantes de la gestión futbolística nostálgica (PES 6 / PC Fútbol / FIFA 07), que buscan partidas rápidas (60-90 segundos por partido o simulación instantánea) sin tiempos de carga pesados.
- **Plataforma Objetivo**: Navegador de escritorio y móvil vía Vercel (Offline First, 60 FPS Canvas 2D, almacenamiento en `localStorage`).
- **Tono Visual**: Tipografía retro-profesional, pixel art / vista isométrica limpia, cero elementos infantiles o emojis en interfaces críticas.

---

## 🗺️ 3. Matriz de Entregables del MVP

| Módulo | Alcance MVP | Criterio de Aceptación |
| :--- | :--- | :--- |
| **Inicio de Carrera** | Selección de país de los 5 pilares, club de división más baja y perfil de DT (35 años). | No se permite elegir clubes de 1ª división en el arranque. |
| **Cancha & Simulación** | Motor 2D Isométrico + simulación tick-by-tick con fatiga, química y órdenes de banda. | 90 segundos reales calibrados o avance rápido 2x/4x; goles atribuidos en tiempo real. |
| **Mercado & Restricciones** | Catálogo con filtros por división; rechazo automático a ofertas absurdas (OVR/POT fuera de rango). | Jugadores con potencial >80 bloqueados para divisiones de barro. |
| **Scouting / Gacha** | Paquetes de ojeo financiados con presupuesto con ventajas de gestión. | Beneficios contextuales aplicados sin romper la economía del club. |
| **Academia & Regens** | Generación de canteranos anuales y reemplazo de estrellas retiradas. | Mantiene plantillas completas y competitivas durante 25 temporadas consecutivas. |
| **Persistencia** | Guardado automático y compresión en `localStorage`. | Partidas exportables/importables sin pérdida de datos. |

---

## 👥 4. Registro de Stakeholders y Roles

- **Lead Game Designer & Product Owner**: JotaGS (JotaDev).
- **Engine & Systems Architect**: Antigravity Assistant.
- **Repositorio Oficial**: `https://github.com/JotaGSdev/Modo-Manager-DT.git` (rama `main`).
