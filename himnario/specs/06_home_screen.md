# Feature: Home Screen / Dashboard (Inicio)

**ID:** WEB-06  
**Prioridad:** Must  
**Alineación:** `ux.md` - Pantalla de Inicio Móvil.

---

## Descripción

La pantalla de inicio de la versión web debe replicar de manera fidedigna la funcionalidad central (dashboard) descrita en el diseño de la aplicación nativa. Al carecer de autenticación de usuario por defecto, esta pantalla utilizará almacenamiento local para simular la persistencia y la personalización.

---

## Criterios de Aceptación

### CA-01: Layout General
- [ ] La interfaz base tiene el clásico aspecto "Dashboard".
- [ ] Estructurada en múltiples secciones en vertical: Himno del Día, Listas Recientes e Historial de Himnos Recientes.

### CA-02: Himno del Día
- [ ] Card o Banner visual destacado.
- [ ] **Selección Determinista:** El himno se selecciona calculando matemáticamente una semilla basada en el día actual (ej. `hash(YYYY-MM-DD) % total_himnos`), logrando que "offline" muestre siempre el mismo resultado para todos los usuarios ese día específico sin requerir servidor central.
- [ ] Botón principal para ir directamente al Modo de Lectura de este himno.

### CA-03: Listas Recientes
- [ ] Lectura desde el manejador `localStorage` descrito en el `04_song_lists.md`.
- [ ] Ordenamiento: Las listas modificadas o visualizadas de forma más reciente se muestran primero.
- [ ] Diseño en tarjetas u horizontal-scroll (carrusel) si sobrepasa el ancho límite de la pantalla.
- [ ] Clic en una lista lleva al usuario directamente al editor para ser ejecutada en el culto.

### CA-04: Himnos Recientes (Historial)
- [ ] Cada vez que el usuario navega exitosamente a una canción (ya sea desde el listado, búsqueda o proyector), el ID del himno se registra (hace "Push") en una clave `recent_hymns` del `localStorage`.
- [ ] Se limitará la cola histórica a los últimos 15 himnos visitados para evitar consumo masivo.
- [ ] Mostrados en una cuadrícula simplificada en la parte inferior del Home Screen.
- [ ] Al clicar uno de los elementos, el usuario salta de vuelta directamente a su lectura en la versión local.

---

## Arquitectura y Consideraciones Técnicas
- **Offline First:** Esta vista se renderizará de forma instantánea al abrir el sitio, extrayendo variables de estado y local storage puramente usando DOM rendering. Sin fallos de API.
- Todo lo documentado en esta página estará bajo el scope de la vista "Home", oculta cuando se ingrese al Search o Listados.
