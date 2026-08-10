# Feature: Búsqueda Web

**ID:** WEB-01  
**Prioridad:** Must  
**Alineación:** `03-busqueda.md` (Mobile)

---

## Descripción

El usuario debe poder buscar himnos en todo el catálogo de forma dinámica desde la plataforma web. La búsqueda debe ser idéntica en comportamiento y reglas de ordenamiento a la de la aplicación móvil, garantizando resultados predecibles y de alta relevancia usando la base de datos local (SQLite).

---

## Criterios de Aceptación

### CA-01: Interfaz y Acceso
- [ ] La barra de búsqueda (tipo "Omnisearch" o Spotlight) estará disponible fijada en la parte superior del layout principal (Header/Nav).
- [ ] La barra debe recibir auto-foco en pantallas de escritorio al cargar.
- [ ] En pantallas móviles, el campo de búsqueda estará visible sin necesidad de abrir menús secundarios.

### CA-02: Ejecución de Búsqueda
- [ ] **En tiempo real:** La búsqueda debe ejecutarse automáticamente mientras el usuario escribe, con un `debounce` de 300ms para evitar sobrecargar el backend.
- [ ] **Insensibilidad:** La búsqueda debe ignorar mayúsculas, minúsculas y acentos de forma nativa.
- [ ] **Restablecer:** Botón rápido (cruz) para limpiar la barra de búsqueda y los resultados instantáneamente.

### CA-03: Motor de Base de Datos y Relevancia (Backend)
- [ ] Utilización de FTS5 (Full-Text Search) en la tabla `estrofa` para rendimiento extremo.
- [ ] **Orden de Relevancia** estricto:
  1. Coincidencia exacta de número (`numero_en_himnario`).
  2. El título empieza con el término buscado.
  3. El título contiene el término buscado.
  4. El autor/compositor contiene el término.
  5. El término se encuentra en el contenido de la letra.

### CA-04: Resultados y Fragmentos (Snippets)
- [ ] La lista desplegable de resultados muestra el identificador del himnario (ej. "P"), el número y el título completo.
- [ ] **Snippets:** Si el resultado fue encontrado por coincidencia de letra, mostrar el extracto específico (snippet) justo debajo del título.
- [ ] Resaltado visual (`<b>...</b>`) del término exacto dentro del fragmento de la letra o el título, retornado directamente por las funciones de SQLite (`snippet()`).

### CA-05: Acciones de Resultado
- [ ] Click en un resultado → Navegar directamente al modo de lectura de ese himno (`03_lyrics_reading.md`).
- [ ] Hover (Desktop) → Mostrar opción de despliegue rápido para agregar a una lista existente o enviar al proyector.

---

## Arquitectura y Consideraciones Técnicas
- **Endpoint API:** `/api/public/songs?search=...`
- **Frontend:** Elementos DOM renderizados iterativamente mediante JavaScript Vanilla. Los snippets recibidos ya deben incluir el markup `<b>`. Se debe escapar la entrada HTML para evitar ataques XSS si el snippet viene sin purificar.
