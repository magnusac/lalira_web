# Deploy a Producción (SSH / SCP)

Este documento registra el método estándar para desplegar los archivos modificados del CMS La Lira al servidor de producción utilizando llaves SSH.

## Servidor de Producción
- **Usuario:** `magnusal`
- **Host:** `maranata.org`
- **Ruta Destino:** `/home3/magnusal/public_html/lalira/`
- **Llave SSH:** `~/.ssh/id_lalira`

## Comandos de Despliegue

Para desplegar actualizaciones en la API y el CMS, ejecuta los siguientes comandos desde la raíz del repositorio local:

```bash
# Backend (API REST)
scp -i ~/.ssh/id_lalira api/index.php magnusal@maranata.org:/home3/magnusal/public_html/lalira/api/index.php

# Frontend (CMS Vanilla JS)
scp -i ~/.ssh/id_lalira cms/index.html magnusal@maranata.org:/home3/magnusal/public_html/lalira/cms/index.html
scp -i ~/.ssh/id_lalira cms/app.js magnusal@maranata.org:/home3/magnusal/public_html/lalira/cms/app.js
scp -i ~/.ssh/id_lalira cms/style.css magnusal@maranata.org:/home3/magnusal/public_html/lalira/cms/style.css
```

*Nota: Solo es necesario ejecutar los comandos de los archivos que hayan sido modificados en la sesión.*
