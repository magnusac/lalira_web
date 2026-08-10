# Feature: Modo Proyección (Doble Pantalla)

**ID:** WEB-05  
**Prioridad:** Must  
**Alineación:** Requisitos web extendidos.

---

## Descripción

El sistema de proyección avanzado permite al director de música o técnico controlar lo que se visualiza en la pantalla principal de la iglesia desde un panel de control secundario de manera ininterrumpida.

---

## Criterios de Aceptación

### CA-01: Arquitectura Base
- [ ] El controlador lanza la pantalla de proyección haciendo uso de un "Pop-up" (`window.open`).
- [ ] El proyector es completamente independiente pero está suscrito a la API nativa de JavaScript `BroadcastChannel` (ej. canal `'lalira_projector'`) para reaccionar a cargas útiles JSON.

### CA-01b: Ubicación del Botón de Proyección
- El botón de "Proyectar" **NO debe estar disponible** de forma global en la navegación principal (Home/Catálogo), asegurando que el proyector solo se inicie cuando haya contenido cantable en curso.
- Será accesible exclusivamente desde dos lugares:
  1. **Lectura de un Himno (`view-song`):** Estará posicionado junto al título de la canción actual.
  2. **Vista de Listas (`view-lists`):** Al ejecutar una "Lista de Reproducción" guardada, existirá un botón principal de "Proyectar Lista" que preparará el proyector para el flujo secuencial de esas canciones.

### CA-02: Shortcuts de Teclado y Mouse (Control Rápido)
- El director puede cambiar las diapositivas de proyección (estrofas) directamente desde el panel de control usando:
  - [ ] **Barra Espaciadora** o **Clic Izquierdo en un área limpia**: Avanza a la siguiente estrofa.
  - [ ] **Teclas de flechas abajo/derecha**: Avanza a la siguiente estrofa.
  - [ ] **Teclas de flechas arriba/izquierda**: Regresa a la estrofa anterior.
  - [ ] **Tecla ESC (Escape):** Actúa como cierre global. Al presionarlo desde el panel de control, se enviará una señal para cerrar (`window.close()`) la ventana emergente del proyector de manera definitiva.
- [ ] Si se llega al final de la canción activa en el "Modo Servicio" (`04_song_lists.md`), hacer avanzar la estrofa cruzará el límite y cargará de manera automática y fluida la *primera estrofa de la próxima canción* en la lista.

### CA-03: Visualización Multi-idioma
- [ ] Existirá un componente de selección (ej. Checkboxes múltiples o Multi-Select Dropdown) en el panel de control, donde el director decide exactamente **qué idiomas** se renderizan de manera simultánea (ej. `[x] Español`, `[x] Portugués`, `[ ] Inglés`).
- [ ] El JSON transmitido por el `BroadcastChannel` despachará el contenido crudo en los idiomas elegidos.
- [ ] El proyector presentará el texto del idioma primario arriba (con la fuente y color regular) y el idioma secundario por debajo (idealmente en cursiva o un color atenuado como gris claro).

### CA-04: Fondos y Customización Visual
- [ ] El panel de control permitirá seleccionar diferentes "Colores Sólidos" o **Subir Imágenes Locales** (`.jpg/.png` vía `URL.createObjectURL`). Se transmitirá la URL temporal vía Broadcast para cambiar el fondo.
- [ ] **Fondos Separados:** El usuario podrá definir un fondo para el **Slide de Título/Inicio** y otro fondo distinto para el **Cuerpo de la Canción** (las estrofas).
- [ ] **Slide de Título (Presentación):** Antes de la primera estrofa, el proyector puede mostrar un slide exclusivo con el Título, Número, Indicador y Metadatos.
- [ ] **Posicionamiento del Título:** Desde el panel de control, el usuario podrá elegir en qué ubicación se renderiza el texto del título en el slide de inicio (ej. "Centrado Absoluto", "Esquina Inferior Izquierda", "Tercio Superior", etc.).
- [ ] Diseño en el proyector:
    - **Alineación de Letras:** Las letras cantables se mostrarán **alineadas a la izquierda**, pero el bloque de texto en su totalidad estará centrado vertical y horizontalmente en la pantalla para mantener simetría.
    - **Repeticiones:** Las estrofas que se repiten tendrán una barra lateral a la **derecha**, simulando el diseño de la app.
    - **Indicaciones de Canto:** Las etiquetas como `(Instrumentos)` se mostrarán explícitamente en la pantalla del proyector. Su posición será al **final del slide** (debajo de la última línea de la estrofa completa). Al hacer el siguiente avance, se pasará al siguiente slide cantado.
    - **Tipografía:** Tipografía colosal predefinida (`vw` o `vh` variables).

### CA-05: Lógica de Interpolación de Coros
- [ ] **Inyección Automática:** Si la canción contiene un "Coro" (identificado en la base de datos), el sistema de proyección inyectará/mostrará automáticamente el slide del Coro intercalado entre cada estrofa regular, incluso si no está escrito explícitamente de esa forma en el texto plano de la base de datos.
- [ ] **Sustitución de Indicadores:** Si en la letra de la base de datos existe una indicación de salto o llamada que dice solamente "Coro", el proyector no mostrará la palabra "Coro" aislada; en su lugar, la expandirá y renderizará el slide con el texto completo del coro.

### CA-06: Manejo Inteligente de Repeticiones Estructurales
Tras analizar la base de datos, existen estrofas enteras que contienen exclusivamente comandos de repetición. El proyector deberá detectar estos patrones mediante expresiones regulares (RegEx) para expandir el contenido real en lugar de proyectar el comando literal:
- [ ] **"Repetir el himno" / "Repetir desde el inicio":** Cuando una estrofa contenga este texto exacto, el proyector volverá a encolar/mostrar automáticamente todas las estrofas de la canción en orden, como si fuese un bucle.
- [ ] **"Repetir la [N] estrofa":** (Ej. "Repetir la 1ra estrofa", "Repetir la 2ª estrofa"). El proyector identificará el número ordinal, buscará la estrofa correspondiente en memoria y la proyectará como el siguiente slide en la secuencia (una sola estrofa).
- [ ] **"Repetir desde [X]":** (Ej. "Repetir desde segunda estrofa", "Repetir desde el coro"). El proyector buscará la estrofa indicada por `[X]` (ya sea un número ordinal o el Coro) y encolará en secuencia **esa estrofa y todas las siguientes** hasta el final normal del himno.
- [ ] **Ocultar el comando en lectura:** En el panel de control del director, estos comandos seguirán siendo visibles para su guía, pero tendrán un estilo de etiqueta indicativa, sabiendo que al dar "Siguiente", el proyector mostrará la letra real correspondiente a esa indicación.
