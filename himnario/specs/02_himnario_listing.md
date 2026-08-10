# Feature: Índices y Listado de Himnario

**ID:** WEB-02  
**Prioridad:** Must  
**Alineación:** `02-indices.md` (Mobile)

---

## Descripción

La exploración de los catálogos en la versión web debe mantenerse fidedigna a la experiencia móvil. Se proveerán dos vistas principales (pestañas o tabs): un índice Numérico (basado en agrupaciones temáticas) y un índice Alfabético.

---

## Criterios de Aceptación

### CA-01: Selectores de Vista (Tabs)
- [ ] Diseño en la parte superior del listado general con pestañas grandes para alternar entre: **"Numérico"** y **"Alfabético"**.
- [ ] El cambio entre pestañas no recarga la página; usa renderizado dinámico en el DOM.

### CA-02: Índice Numérico (Agrupación por Categoría)
- [ ] **Fuente de Datos:** Agrupa los himnos basado estrictamente en el `seccion_id` de la base de datos (categorías oficiales).
- [ ] **UI Acordeón:** Las secciones temáticas se muestran contraídas por defecto (o solo la primera abierta).
- [ ] Expandir una sección cierra automáticamente las demás (una a la vez) para no sobrecargar el scroll vertical.
- [ ] Las cabeceras de las secciones muestran el título temático y el conteo total de himnos contenidos dentro del grupo.

### CA-03: Índice Alfabético (A-Z)
- [ ] Lista plana de todos los himnos del catálogo seleccionado, ordenada de la A a la Z.
- [ ] **Title Case:** Se aplicará formateo automático a "Title Case" para los títulos en el frontend si la base de datos tiene inconsistencias, asegurando una presentación impecable.
- [ ] **Separadores Alfabéticos:** Agrupación visual mediante cabeceras divisoras para cada letra del abecedario ("A", "B", "C"...) separando visualmente los himnos.

### CA-04: Diseño de las Fichas (List Items)
- [ ] Cada himno se presenta dentro de una ficha interactiva (`glass-panel`).
- [ ] Muestra de forma clara el Indicador de himnario (P/N/A) + el número, alineado a la izquierda.
- [ ] Título en negrita principal.

### CA-05: Acciones
- [ ] Click en la fila del himno → Abre el modo de lectura.
- [ ] Menú contextual o ícono flotante (`...`) al lado derecho para "Agregar a la Lista" o "Proyectar".

---

## Arquitectura y Consideraciones Técnicas
- **Virtualización:** Si la lista A-Z o un himnario específico es extremadamente largo (> 500 filas), implementar virtualización básica en el DOM (o paginación infinita ligera) para evitar cuellos de botella de rendimiento en el cliente.
- **Consultas (Backend):** 
    - `/api/public/hymnals/:id/sections` para recuperar la jerarquía de secciones.
    - `/api/public/songs?himnario_id=...&order=alpha` para recuperar la estructura A-Z.
