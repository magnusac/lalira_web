# System Design & Architecture Guidelines — La Lira CMS

Este documento registra los principios de diseño de sistema y decisiones de arquitectura (ADR - Architecture Decision Records) para mantener la coherencia y estabilidad del CMS y la plataforma La Lira.

---

## Decisiones de Arquitectura (ADR)

### ADR-001: Independencia Estricta de Módulos Editores en el CMS

**Fecha**: 12 de agosto de 2026  
**Estado**: Aprobado / En Vigor  
**Contexto**:  
El CMS cuenta con editores diferenciados para manejar los aspectos de una alabanza:
1. **Pestaña 1: Cifrado y Acordes (ChordPro)** — Diseñada para editar la notación musical de acordes, tono, compás y ritmo.
2. **Pestaña 2: Texto Plano y Estrofas (`estrofa`)** — Diseñada para gestionar la letra estructurada por estrofas (usada en la vista de lectura sin acordes de la app móvil y en el motor de búsqueda por texto completo FTS).
3. **Pestaña 3: Metadatos** — Diseñada para títulos, autores y traductores por idioma.
4. **Pestaña 4: Notas Referenciales** — Notas bíblicas e históricas.

**Regla de Diseño**:
1. **Cero Acoplamiento Destructivo**: Cada módulo editor gestiona únicamente su propia entidad de datos. 
2. **Prohibición de Autogeneración en Servidor**: Queda **estrictamente prohibido** que al guardar o aprobar un borrador desde el editor de cifrado (ChordPro) el backend destruya, sobrescriba o reconstruya automáticamente las estrofas en la tabla `estrofa` mediante algoritmos de limpieza de caracteres de acordes.
3. **Prioridad a Datos Explícitos**: El servidor debe almacenar exactamente lo que el usuario define en la pestaña de estrofas (`songData.estrofas`). Si el borrador no contiene estrofas explícitas, se deben preservar las estrofas existentes en la base de datos sin borrarlas ni sobreescribirlas.

**Razonamiento**:  
Cualquier sincronización o parsing automático que modifique entidades de datos entre pestañas altera la previsibilidad del UX y destruye el trabajo manual que los editores realizan en las estrofas de texto plano.

---

### ADR-002: Entorno de Ejecución del Backend y Despliegue en Producción (PHP)

**Fecha**: 12 de agosto de 2026  
**Estado**: Aprobado / En Vigor  
**Contexto**:  
El repositorio contiene dos archivos de backend:
1. `api/index.php` — Controlador API REST en PHP.
2. `server.js` — Servidor auxiliar en Node.js (usado solo para desarrollo local).

**Regla de Diseño y Despliegue**:
1. **Servidor de Producción Canónico**: El entorno de producción corre en **PHP (Apache/LiteSpeed)** y todas las peticiones del CMS en vivo son procesadas única y exclusivamente por **`api/index.php`**.
2. **Cualquier cambio de lógica en la API debe aplicarse primero y obligatoriamente en `api/index.php`**.
3. `server.js` se mantendrá sincronizado únicamente como runner secundario de desarrollo local.
4. **Despliegue**: Los despliegues de la API REST del CMS a producción deben garantizar la copia y actualización del archivo `api/index.php` en el servidor web remote.

---

### ADR-003: Integración de IA para Extracción de Partituras (Gemini)

**Fecha**: 24 de agosto de 2026  
**Estado**: Aprobado / En Vigor  
**Contexto**:  
El CMS integra la API de Gemini para analizar PDFs de partituras y mapear acordes visuales en el texto plano de la base de datos, generando formato ChordPro.

**Regla de Diseño**:
1. **Preservación del Texto (Anchor-based)**: El LLM actúa como formateador inyector de acordes, no como creador de texto. Utiliza el texto plano existente como ancla inmutable. Cualquier diferencia encontrada en la partitura se descarta en favor del texto de la DB.
2. **Cero Dependencias Externas (Single File API)**: Para mantener la naturaleza procedural de `api/index.php`, la integración con Gemini se realiza mediante cURL sobre la API REST HTTP nativa de Google (sin Composer ni SDKs).
3. **Resolución de Conflictos vía Usuario**: Ante discrepancias líricas, el servidor jamás asume o corrige datos; el sistema devuelve un arreglo de discrepancias que el frontend presenta como alerta crítica para que el editor humano lo resuelva.

---

### ADR-004: Date-based Database Versioning (YYYY.MM.DD)

**Fecha**: 21 de septiembre de 2026  
**Estado**: Aprobado / En Vigor  
**Contexto**:  
El CMS genera versiones de la base de datos (`version_v2.json`) para que la app móvil (himnario) determine cuándo descargar actualizaciones. Anteriormente usaba un sistema de incrementos (ej. `2.0.14`).

**Regla de Diseño**:
1. **Formato Base**: El número de versión publicado debe seguir el formato `YYYY.MM.DD` correspondiente a la fecha actual del servidor.
2. **Sufijo de Revisión (Same-Day Publish)**: Si se realizan múltiples publicaciones en un mismo día, se debe agregar y aumentar un número de revisión (`YYYY.MM.DD.Rev`, ej: `2026.09.21.1`) para garantizar que el string de versión cambie y la app móvil detecte la actualización.
3. **Compatibilidad App Móvil**: La app móvil realiza una verificación estricta de string (`===`), lo que hace compatible este formato de hasta 4 segmentos de puntos, sin depender de librerías SemVer estrictas.
