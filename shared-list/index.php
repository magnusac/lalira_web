<?php
// Extraer la ruta solicitada
$uri = $_SERVER['REQUEST_URI']; // ej: /shared-list/UID/LISTID
$parts = explode('/', trim(parse_url($uri, PHP_URL_PATH), '/'));

$ownerUid = isset($parts[1]) ? $parts[1] : '';
$listId = isset($parts[2]) ? $parts[2] : '';

// Reconstruir el link profundo (Custom URI Scheme)
$deepLink = "la-lira://shared-list/" . htmlspecialchars($ownerUid) . "/" . htmlspecialchars($listId);
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lista Compartida - La Lira</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; text-align: center; padding: 40px 20px; background: #fafafa; }
    h1 { color: #333; font-size: 24px; margin-bottom: 8px; }
    p { color: #666; margin-bottom: 24px; }
    .btn { display: inline-block; background: #6200ea; color: white; padding: 14px 28px; border-radius: 30px; text-decoration: none; font-weight: bold; font-size: 16px; }
  </style>
  <script>
    window.onload = function() {
      // Intentar abrir la app nativa mediante custom scheme
      window.location.href = '<?php echo $deepLink; ?>';
    };
  </script>
</head>
<body>
  <h1>Redirigiendo a La Lira...</h1>
  <p>Si la aplicación no se abre automáticamente, toca el botón de abajo.</p>
  <a href="<?php echo $deepLink; ?>" class="btn">Abrir Lista en la App</a>
</body>
</html>
