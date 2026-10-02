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
3. ~~**Compatibilidad App Móvil**: La app móvil realiza una verificación estricta de string (`===`), lo que hace compatible este formato de hasta 4 segmentos de puntos, sin depender de librerías SemVer estrictas.~~ **Reemplazado por ADR-005**: la etiqueta `YYYY.MM.DD[.Rev]` se conserva en el campo `version` (los binarios ya publicados siguen comparándola con `===`), pero la comparación de orden se hace con el entero `catalogVersion`. La etiqueta no es comparable como texto (`.10` < `.9`).

---

### ADR-005: Publicación del Catálogo por Snapshot Inmutable

**Fecha**: 2 de octubre de 2026  
**Estado**: Aprobado / En implementación (pendiente de deploy)  
**Plan de ejecución**: `himnario/CATALOG_UPDATE_PLAN.md`

**Contexto**:  
Hasta esta decisión, la base que editaba el CMS era el mismo archivo público que descarga la app (`public_html/lalira/catalogo/catalogo_v2.sqlite`). Cada aprobación o borrado modificaba el archivo servido, `/publish` ejecutaba `VACUUM` sobre ese mismo archivo, y la app podía descargar contenido no publicado o un archivo a medio escribir. Además, el índice FTS del catálogo publicado acumulaba ~46.500 entradas huérfanas (54.409 indexadas para 7.869 estrofas): la búsqueda devolvía himnos que no contenían el término y el archivo pesaba 6,2 MB en lugar de 2,5 MB.

**Regla de Diseño**:
1. **Base de trabajo separada**: el CMS edita `/home3/magnusal/lalira/catalogo_v2_working.sqlite`, fuera de `public_html`. Nunca se sirve directamente.
2. **Snapshot inmutable por publicación** (`api/catalog_publisher.php`, función `catalog_publish`):
   1. Valida la base de trabajo (`integrity_check`, tablas requeridas, canciones > 0) y la guardia de IDs (regla 5).
   2. Copia con `VACUUM INTO` a `catalogo_v2_<catalogVersion>.sqlite.tmp` (fallback para SQLite < 3.27: `BEGIN IMMEDIATE` + copia + `VACUUM` de la copia). La base de trabajo no se modifica.
   3. En la copia: reconstruye el índice FTS (`rebuild`), compacta, fija `PRAGMA user_version = CATALOG_SCHEMA_VERSION` y vuelve a validar, incluyendo `integrity-check` del FTS contra la tabla de contenido.
   4. Calcula `md5` y `size`, y renombra a su nombre final (atómico).
   5. Escribe `version_v2.json` **al final**, vía `.tmp` + `rename`.
   6. Conserva los últimos 3 snapshots (clientes que aún descargan) y elimina temporales.
   7. Una publicación a la vez (`flock`). Si cualquier paso falla, no se publica nada y lo publicado anteriormente queda intacto.
3. **Contrato `version_v2.json`**:

   | Campo | Tipo | Regla |
   |---|---|---|
   | `version` | string | Etiqueta ADR-004 (`YYYY.MM.DD[.Rev]`). La comparan los binarios publicados (`===`). **No se elimina nunca.** |
   | `url` | string | Snapshot inmutable. **No se elimina nunca.** |
   | `size` | entero | Bytes exactos del snapshot. **No se elimina nunca.** |
   | `catalogVersion` | entero | `YYYYMMDD * 100 + Rev`. Monotónico; máximo 99 publicaciones por día. |
   | `schemaVersion` | entero | Igual a `PRAGMA user_version` del snapshot. |
   | `md5` | string | Integridad del archivo (la autenticidad la cubre HTTPS). |
   | `publishedAt` | string | ISO 8601, informativo. |

   * La ruta `https://lalira.app/catalogo/version_v2.json` **no cambia nunca**: es el único punto fijo de la app. Cambiar la `url` del snapshot no requiere publicar la app.
   * Los campos solo se agregan; nunca se quitan ni cambian de significado.
4. **Esquema**: `CATALOG_SCHEMA_VERSION` se incrementa solo junto con un release de la app que lo soporte. Un cambio incompatible (renombrar o eliminar tablas/columnas que consulta la app) se publica en `version_v3.json`; `version_v2.json` sigue sirviendo un esquema compatible con los binarios existentes.
5. **IDs de canción estables**: un `cancion.id` publicado nunca se reutiliza para otra canción (las listas de usuario de la app lo referencian).
   * `DELETE /songs/:id` registra el ID en `cancion_tombstone` (base interna del CMS).
   * Las canciones nuevas sin ID estructurado (`100000+n` / `200000+n`) reciben `max(MAX(cancion.id), MAX(tombstone)) + 1`, nunca el rowid implícito de SQLite.
   * `/publish` registra como eliminados los IDs presentes en el snapshot anterior y ausentes ahora, y aborta si un ID eliminado aparece con otra identidad (`himnario_id` + `numero_en_himnario`). Recrear el mismo himno con su ID estructurado está permitido.
6. **Publicación local**: una publicación desde un entorno que no es producción **no sube nada al servidor** salvo `CATALOG_PUBLISH_UPLOAD=1`. Producción tiene su propia base de trabajo e historial de versiones; dos escritores sobre el catálogo público producirían versiones divergentes.
7. **Verificación**: tras cada deploy o publicación se ejecuta `npm run verify:catalog` (solo lectura).
8. **Paridad**: `catalog_publisher.js` replica la lógica para `server.js` (ADR-002). `npm run test:publish` ejecuta los mismos casos contra ambas implementaciones y contra `api/index.php` real.

**Razonamiento**:  
Separar edición de publicación convierte cada versión del catálogo en un artefacto inmutable y verificable: la app puede validarlo (`size`, `md5`, `schemaVersion`) antes de aplicarlo, y ningún cliente vuelve a recibir un archivo parcial o contenido no aprobado. Mantener los campos legados permite que los binarios ya publicados reciban los snapshots sin publicar la app.
