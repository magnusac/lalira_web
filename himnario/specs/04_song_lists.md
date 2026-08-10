# Feature: Gestión de Listas de Reproducción

**ID:** WEB-04  
**Prioridad:** Must  
**Alineación:** `ux.md` (Listas y Preparación para el Culto)

---

## Descripción

El usuario debe ser capaz de preparar y organizar secuencias de himnos para un servicio, congreso o evento, replicando el comportamiento de "Listas" local.

---

## Criterios de Aceptación

### CA-01: Persistencia Local
- [ ] Las listas creadas se guardan en el navegador utilizando `localStorage`.
- [ ] Cada lista tiene un ID único, un Título editable, un array ordenado de IDs de canciones y una fecha de modificación.

### CA-02: UI de Gestión
- [ ] Vista de dashboard de "Listas" donde se muestran tarjetas por cada lista almacenada.
- [ ] Acciones por tarjeta: **Renombrar**, **Duplicar**, **Eliminar**, y **Ejecutar**.

### CA-03: Editor de la Lista
- [ ] Al hacer clic en editar una lista, se entra a una vista detallada.
- [ ] **Drag & Drop:** Implementación de la API de HTML5 nativa u otra librería ligera web para arrastrar y soltar filas, permitiendo la reorganización en tiempo real.
- [ ] Botón global de "Agregar Canción", que activa una versión superpuesta del `01_search_feature.md` modal.

### CA-04: Ejecución de Lista (Modo Servicio)
- [ ] El modo "Ejecutar" bloquea el editor y limpia la vista para concentrarse solo en la presentación.
- [ ] Se muestra en la parte inferior o superior un contador del estado de avance (ej. `2 / 8`).
- [ ] La navegación lateral (Next/Prev) solo fluye sobre el array específico de esta lista.
- [ ] Integración automática y fluida con el Modo Proyección (ver `05_projection_mode.md`).

---

## Arquitectura y Consideraciones Técnicas
- Se implementará un `ListManager` en JavaScript que encapsula todo el acceso CRUD hacia `window.localStorage`.
- Estructura base propuesta: `[{ id: 'uuid', name: 'Domingo AM', songs: [{id: 12}, {id: 45}], lastUpdated: Date }]`
