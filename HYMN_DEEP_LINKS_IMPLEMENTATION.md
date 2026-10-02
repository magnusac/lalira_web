# Implementación de Deep Links y Fallback Web para Himnos en `lalira_web`

Este documento describe la arquitectura, archivos modificados/creados y el proceso de despliegue implementado en el repositorio `lalira_web` (servidor de `lalira.app`) para dar soporte a los enlaces directos de himnos/canciones (`https://lalira.app/hymn/:id`) y corregir la asociación de Universal Links en iOS.

---

## 1. Contexto y Problemas Resueltos

1. **Error 404 en la Web (`/hymn/*`)**:
   - Al compartir un enlace como `https://lalira.app/hymn/100058`, si el usuario abría el enlace desde una computadora, WhatsApp Web o en un dispositivo sin la app instalada, el servidor Apache de `lalira.app` devolvía un error **404 Not Found** debido a que no existía el directorio `/hymn/` ni reglas de enrutamiento web para esa ruta.
2. **Rechazo de Universal Links en iOS**:
   - En el archivo en vivo `https://lalira.app/.well-known/apple-app-site-association`, la propiedad `appID` estaba registrada únicamente como `"com.lalira.hymnary"`.
   - Apple requiere estrictamente el formato `<TeamID>.<BundleID>` (`4THX7H99HC.com.lalira.hymnary`). Sin el prefijo del Team ID, iOS descarta el Universal Link y fuerza la navegación web en Safari, provocando el 404.
3. **Inconsistencia de Scheme en `shared-list`**:
   - En `shared-list/index.php`, el URI Scheme nativo configurado era `la-lira://`, mientras que la app móvil en `app.json`, `Info.plist` y `AndroidManifest.xml` tiene registrado oficialmente el esquema `lalira://`.

---

## 2. Detalle de Archivos Modificados y Creados

### A. Corrección de Universal Links para iOS
- **Archivo:** `.well-known/apple-app-site-association`
- **Cambio:** Se incorporó el Team ID de Apple (`4THX7H99HC`) en `appID`:
  ```json
  {
    "applinks": {
      "apps": [],
      "details": [
        {
          "appID": "4THX7H99HC.com.lalira.hymnary",
          "paths": [
            "/shared-list/*",
            "/hymn/*"
          ]
        }
      ]
    }
  }
  ```

### B. Módulo de Redirección Web y Fallback para Himnos
Se creó el directorio `hymn/` en la raíz del proyecto web con dos archivos:

#### 1. `hymn/.htaccess` [NUEVO]
Permite que cualquier subruta de `/hymn/*` (ej. `/hymn/100058`, `/hymn/25`) sea procesada por `index.php`:
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [L,QSA]
```

#### 2. `hymn/index.php` [NUEVO]
Landing page ligera y responsiva con la identidad visual de La Lira que realiza:
1. **Extracción del ID:** Obtiene el identificador numérico o alfanumérico del himno desde `$_SERVER['REQUEST_URI']`.
2. **Construcción del Deep Link Nativo:** Genera la URL con el custom scheme `lalira://hymn/<id>`.
3. **Redirección automática por JavaScript:** Al cargarse la página en el navegador (`window.onload`), intenta invocar el custom scheme para abrir la app instalada en el dispositivo móvil.
4. **UI de Fallback:**
   - Botón primario: **«Abrir Himno en la App»** (`lalira://hymn/<id>`).
   - Botones a tiendas oficiales: Enlaces directos a **Google Play Store** y **Apple App Store** para usuarios que aún no tienen instalada la aplicación.
5. **Metadatos Open Graph:** Etiquetas `og:title`, `og:description`, `og:image` y `og:url` para asegurar que al compartir el link por WhatsApp, Telegram o redes sociales, se genere una previsualización con título e imagen.

### C. Corrección en Listas Compartidas
- **Archivo:** `shared-list/index.php`
- **Cambio:** Se actualizó la variable `$deepLink` para usar el esquema oficial `lalira://`:
  ```php
  $deepLink = "lalira://shared-list/" . htmlspecialchars($ownerUid) . "/" . htmlspecialchars($listId);
  ```

---

## 3. Despliegue a Producción

Siguiendo el procedimiento documentado en `DEPLOY.md`, los cambios se subieron al servidor de producción vía SSH/SCP:

- **Host:** `maranata.org`
- **Usuario:** `magnusal`
- **Ruta Remota:** `/home3/magnusal/public_html/lalira/`
- **Llave SSH:** `~/.ssh/id_lalira`

### Comandos ejecutados:
```bash
# 1. Subir archivo AASA corregido
scp -i ~/.ssh/id_lalira .well-known/apple-app-site-association magnusal@maranata.org:/home3/magnusal/public_html/lalira/.well-known/apple-app-site-association

# 2. Subir módulo /hymn/ (.htaccess e index.php)
scp -r -i ~/.ssh/id_lalira hymn magnusal@maranata.org:/home3/magnusal/public_html/lalira/

# 3. Subir corrección de esquema en shared-list
scp -i ~/.ssh/id_lalira shared-list/index.php magnusal@maranata.org:/home3/magnusal/public_html/lalira/shared-list/index.php
```

---

## 4. Verificación en Producción

Las comprobaciones realizadas confirmaron el funcionamiento esperado:

1. **Ruta Web `/hymn/:id`:**
   - Petición: `curl -s -I https://lalira.app/hymn/100058`
   - Resultado: **`HTTP/2 200`** (404 resuelto).
2. **Contenido y Redirección:**
   - La página renderiza el título (`Himno #100058 - La Lira`), las etiquetas Open Graph y el script de redirección a `lalira://hymn/100058`.
3. **Universal Links de Apple:**
   - Petición: `curl -s https://lalira.app/.well-known/apple-app-site-association`
   - Resultado: Verificado con `"appID": "4THX7H99HC.com.lalira.hymnary"`.
