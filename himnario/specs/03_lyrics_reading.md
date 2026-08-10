# Feature: Modo de Lectura de Letras

**ID:** WEB-03  
**Prioridad:** Must  
**Alineación:** `01-coleccion.md` y Arquitectura `Atomic Wrapper`

---

## Descripción

La vista principal que el usuario (cantante o músico) utilizará durante los ensayos o congregaciones. Requiere un enfoque absoluto en la legibilidad y tipografía.

---

## Criterios de Aceptación

### CA-01: UI y Legibilidad Base
- [ ] Estructura limpia que incluye: Encabezado (indicador, número, título en negrita), Metadatos al pie (autor, compositor, traducción).
- [ ] El cuerpo principal de la letra está formateado con `white-space: pre-wrap`. El texto dentro de las estrofas debe estar **alineado a la izquierda** (aunque el contenedor principal puede estar centrado en pantallas grandes para no estirar la vista).
- [ ] **Marcas de Repetición:** Las estrofas que tienen repeticiones mostrarán una barra vertical gruesa en el borde derecho (`border-right`), acompañada sutilmente del texto indicativo "Bis" o "2x" alineado también a la derecha, calcando el comportamiento del proyecto móvil.
- [ ] **Indicaciones de Canto (Voces/Instrumentos):** Las etiquetas de pausa musical como `(Instrumentos)` se renderizarán explícitamente al **final** del bloque de la estrofa anterior (es decir, primero se lee la estrofa completa, y debajo aparece la etiqueta "Instrumentos"). Estas etiquetas tendrán un estilo diferenciado (color de acento o fuente más pequeña) para no confundirse con la letra principal.
- [ ] **Tipografía:** Letra escalable; máximo ancho (max-width de 800px) para evitar saltos de línea innecesarios en pantallas ultra anchas de computadora.

### CA-02: Navegación Rápida
- [ ] Implementación de botones flotantes translúcidos o anclados a los laterales (Anterior / Siguiente) para avanzar al próximo himno dentro de la lista actual o la categoría de visualización.
- [ ] Soporte para teclas direccionales (flecha izquierda/derecha) para simular el gesto de "swipe" de la aplicación nativa en escritorio.

### CA-03: Comportamiento Multi-idioma
- [ ] Selector visual claro (ej. chips flotantes múltiples o Dropdown) en la cabecera para activar los idiomas deseados.
- [ ] **Vista Lado a Lado (Side-by-side):** Si el usuario selecciona 2 idiomas simultáneamente, la vista de lectura en pantallas anchas (escritorio/tablet) dividirá el layout en columnas (Grid) mostrando la estrofa en el Idioma 1 a la izquierda y la estrofa en el Idioma 2 a la derecha, perfectamente alineadas horizontalmente.
- [ ] En pantallas móviles (estrechas), si se eligen 2 idiomas, se mostrarán intercalados (Idioma 1 arriba, Idioma 2 debajo en cursiva/atenuado).
- [ ] La selección del idioma actualiza en tiempo real todo el cuerpo del texto de manera instantánea sin recargar la página.

### CA-04: Exclusiones respecto a Native
- [ ] **WakeLock API:** Por retroalimentación específica de diseño, *no* se implementará prevención del apagado de pantalla en la web para evitar sobreuso de la batería y complejidad innecesaria (el proyector o el usuario manejan el brillo/suspensión manual).

---

## Arquitectura y Consideraciones Técnicas
- **Atomic Wrapper:** Todo el layout de lectura utiliza las mismas clases maestras (`.lyrics-container`, `.stanza`, `.stanza-type`) descritas en la estructura atómica original de CSS para garantizar que coincida 100% con los estilos base de la app.
- Uso del `BroadcastChannel` para emitir clics en las estrofas y comunicarse con el modo proyector.
