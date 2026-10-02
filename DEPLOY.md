# Deploy a Producción (SSH / SCP)

Este documento registra el método estándar para desplegar los archivos modificados del CMS La Lira al servidor de producción utilizando llaves SSH.

## Servidor de Producción
- **Usuario:** `magnusal`
- **Host:** `maranata.org`
- **Ruta Destino:** `/home3/magnusal/public_html/lalira/`
- **Llave SSH:** `~/.ssh/id_lalira`
- **Acceso:** solo SFTP/SCP (la cuenta no tiene shell). Las operaciones sobre archivos (`ls`, `get`, `rename`) se hacen con `sftp`.

## Rutas del Catálogo (ADR-005)

| Archivo | Ruta | Público |
|---|---|---|
| Base de trabajo (la edita el CMS) | `/home3/magnusal/lalira/catalogo_v2_working.sqlite` | No |
| Base interna del CMS | `/home3/magnusal/lalira/cms_internal.sqlite` | No |
| Snapshots publicados | `/home3/magnusal/public_html/lalira/catalogo/catalogo_v2_<catalogVersion>.sqlite` | Sí |
| Manifiesto (punto fijo de la app) | `/home3/magnusal/public_html/lalira/catalogo/version_v2.json` | Sí |

Mientras la base de trabajo no exista en su ruta nueva, `api/index.php` sigue usando la ruta legada `public_html/lalira/catalogo/catalogo_v2.sqlite`.

## Antes de Desplegar

```bash
npm run test:publish
```

Respaldo fechado de lo que se va a reemplazar (desde la raíz del repo):

```bash
mkdir -p backups/$(date +%Y%m%d-%H%M)
sftp -i ~/.ssh/id_lalira magnusal@maranata.org <<EOF
get /home3/magnusal/public_html/lalira/api/index.php backups/$(date +%Y%m%d-%H%M)/
get /home3/magnusal/public_html/lalira/catalogo/version_v2.json backups/$(date +%Y%m%d-%H%M)/
get /home3/magnusal/lalira/cms_internal.sqlite backups/$(date +%Y%m%d-%H%M)/
EOF
```

## Comandos de Despliegue

Para desplegar actualizaciones en la API y el CMS, ejecuta los siguientes comandos desde la raíz del repositorio local:

```bash
# Backend (API REST) — catalog_publisher.php es requerido por index.php: se despliegan juntos
scp -i ~/.ssh/id_lalira api/catalog_publisher.php magnusal@maranata.org:/home3/magnusal/public_html/lalira/api/catalog_publisher.php
scp -i ~/.ssh/id_lalira api/index.php magnusal@maranata.org:/home3/magnusal/public_html/lalira/api/index.php

# Frontend (CMS Vanilla JS)
scp -i ~/.ssh/id_lalira cms/index.html magnusal@maranata.org:/home3/magnusal/public_html/lalira/cms/index.html
scp -i ~/.ssh/id_lalira cms/app.js magnusal@maranata.org:/home3/magnusal/public_html/lalira/cms/app.js
scp -i ~/.ssh/id_lalira cms/style.css magnusal@maranata.org:/home3/magnusal/public_html/lalira/cms/style.css
```

*Nota: Solo es necesario ejecutar los comandos de los archivos que hayan sido modificados en la sesión. `catalog_publisher.php` siempre se sube **antes** que `index.php`.*

## Después de Desplegar o Publicar

```bash
npm run verify:catalog
```

Verifica, en solo lectura, que el manifiesto y el snapshot publicados sean consistentes (`size`, `md5`, `quick_check`, `user_version`, índice FTS).

## Rollback

* **Catálogo publicado**: la vía normal es corregir en el CMS y volver a publicar. Para una reversión de emergencia a un snapshot anterior (se conservan los últimos 3), se republica su contenido como una versión **nueva**, porque la app nunca aplica una `catalogVersion` menor a la activa:
  1. Descargar el snapshot anterior con `sftp get`.
  2. Elegir la siguiente `catalogVersion` (la actual + 1) y la etiqueta `version` correspondiente (ADR-004).
  3. Subirlo como `catalogo_v2_<nueva catalogVersion>.sqlite`.
  4. Subir **después** un `version_v2.json` con esa `catalogVersion`, su `version`, `url`, `size` y `md5` (el `md5` y el `size` son los del archivo, que no cambia).
  5. Ejecutar `npm run verify:catalog`.
* **API**: volver a subir `index.php` (y `catalog_publisher.php`) desde el respaldo fechado.
