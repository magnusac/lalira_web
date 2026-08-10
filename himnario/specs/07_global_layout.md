# Feature: Layout Global (Navegación y Pie de Página)

**ID:** WEB-07  
**Prioridad:** Must  
**Alineación:** `ux.md` - Navegación Principal y Footer.

---

## Descripción

El Layout Global define los componentes estructurales que persisten a través de todas las pantallas del módulo web (con excepción de la pantalla de Proyección). Esto incluye el menú de navegación principal (Header) y el pie de página (Footer) informativo.

---

## Criterios de Aceptación

### CA-01: Menú de Navegación (Header)
- [ ] **Diseño Glassmorphism:** El header mantendrá un efecto de cristal (blur) semitransparente que permanezca flotando ("sticky") en la parte superior al hacer scroll.
- [ ] **Accesos Principales:** Deberá contener enlaces claros hacia las funciones principales:
  - **Inicio** (Dashboard / `06_home_screen.md`).
  - **Himnario** (Índices y catálogos / `02_himnario_listing.md`).
  - **Mis Listas** (Gestión de cultos / `04_song_lists.md`).
- [ ] **Omnisearch:** La barra de búsqueda global (`01_search_feature.md`) debe estar integrada en este header o accesible mediante un ícono de lupa prominente.
- [ ] **Acciones Globales:** Un selector visual de "Idioma" principal del sistema (UI) o configuración, según aplique.
- [ ] **Responsividad:** En dispositivos móviles, los accesos principales colapsarán en un menú "Hamburguesa" o en una "Bottom Navigation Bar" al estilo app nativa para garantizar alcance fácil con el pulgar.

### CA-02: Pie de Página (Footer)
El pie de página se mostrará al final de todas las vistas de lista y de inicio (se ocultará en el Modo de Lectura para no interrumpir el canto). Su diseño heredará exactamente la estructura `.footer-grid` del Landing Page (`lalira.app`) para garantizar consistencia absoluta:
- [ ] **Columna Izquierda (Brand):** Logo de La Lira App y pequeña descripción.
- [ ] **Columna Derecha (Legal y Contacto):** Enlaces directos a las páginas estáticas del proyecto raíz:
  - **Términos y Condiciones** (`/terms.html`).
  - **Política de Privacidad** (`/privacy.html`).
  - **Contacto de Soporte** (`mailto:contacto@lalira.app`).
- [ ] **Redes Sociales:** Si se añaden íconos sociales, irán agrupados debajo de la descripción del brand o en la columna legal, según el patrón del landing.
- [ ] **Borde Inferior (`.footer-bottom`):** Copyright de La Lira y derechos reservados.

---

## Arquitectura y Consideraciones Técnicas
- **Componente Reutilizable:** Estos elementos (Header y Footer) se estructurarán en el `index.html` del módulo Himnario. El contenido central de la aplicación (Home, Listas, Búsqueda) será inyectado o reemplazado dinámicamente usando JavaScript (`<main id="app-content">`) para evitar recargar la página entera (Single Page Application - SPA).
