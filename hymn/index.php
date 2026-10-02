<?php
// Extraer la ruta solicitada (ej: /hymn/100058)
$uri = $_SERVER['REQUEST_URI'];
$parts = explode('/', trim(parse_url($uri, PHP_URL_PATH), '/'));

$hymnId = isset($parts[1]) ? preg_replace('/[^0-9a-zA-Z_-]/', '', $parts[1]) : '';

// Reconstruir el link profundo con el esquema oficial de la app
$deepLink = !empty($hymnId) ? "lalira://hymn/" . htmlspecialchars($hymnId) : "lalira://";

// Helper para convertir títulos a Title Case respetando UTF-8
function formatTitleCase($str) {
    if (empty($str)) return '';
    return mb_convert_case(mb_strtolower($str, 'UTF-8'), MB_CASE_TITLE, 'UTF-8');
}

// Intentar consultar datos del himno en la base de datos SQLite
$songNumber = '';
$songTitle = '';

if (!empty($hymnId)) {
    $possiblePaths = [
        dirname(__DIR__) . '/catalogo/catalogo_v2.sqlite',
        '/home3/magnusal/public_html/lalira/catalogo/catalogo_v2.sqlite',
        getenv('DB_PATH') ?: '',
        '/Users/magnus.carlos/Documents/GitHub/lalira/himnario/himnario/assets/catalogo_v2.sqlite'
    ];

    $dbPath = null;
    foreach ($possiblePaths as $p) {
        if (!empty($p) && file_exists($p)) {
            $dbPath = $p;
            break;
        }
    }

    if ($dbPath) {
        try {
            $db = new PDO("sqlite:" . $dbPath);
            $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT);
            $stmt = $db->prepare("
                SELECT c.numero_en_himnario, m.titulo 
                FROM cancion c 
                LEFT JOIN cancion_metadata m ON c.id = m.cancion_id AND m.idioma = 'es' 
                WHERE c.id = ? 
                LIMIT 1
            ");
            $stmt->execute([$hymnId]);
            $song = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($song) {
                $songNumber = trim($song['numero_en_himnario'] ?? '');
                $rawTitle = trim($song['titulo'] ?? '');
                $songTitle = formatTitleCase($rawTitle);
            }
        } catch (Exception $e) {
            // Silencioso: fallback a textos generales
        }
    }
}

// Construir títulos y textos dinámicos
if (!empty($songNumber) && !empty($songTitle)) {
    $headingText = "#{$songNumber} {$songTitle}";
    $pageTitle = "#{$songNumber} {$songTitle} - La Lira";
    $ogTitle = "#{$songNumber} {$songTitle}";
    $ogDesc = "Abre y reproduce el himno #{$songNumber} con letra y acordes en la aplicación oficial La Lira.";
} elseif (!empty($hymnId)) {
    $headingText = "Himno en La Lira";
    $pageTitle = "Himno en La Lira";
    $ogTitle = "Himno en La Lira";
    $ogDesc = "Abre y reproduce este himno con letra y acordes en la aplicación oficial La Lira.";
} else {
    $headingText = "La Lira - Himnario";
    $pageTitle = "La Lira - Himnario";
    $ogTitle = "La Lira - Himnario Cristiano";
    $ogDesc = "Tus alabanzas favoritas con letras y acordes en la aplicación oficial La Lira.";
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?php echo htmlspecialchars($pageTitle); ?></title>

  <!-- Open Graph / Redes Sociales -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="La Lira App">
  <meta property="og:title" content="<?php echo htmlspecialchars($ogTitle); ?>">
  <meta property="og:description" content="<?php echo htmlspecialchars($ogDesc); ?>">
  <meta property="og:image" content="https://lalira.app/assets/og_preview.png">
  <meta property="og:image:secure_url" content="https://lalira.app/assets/og_preview.png">
  <meta property="og:url" content="https://lalira.app<?php echo htmlspecialchars(parse_url($uri, PHP_URL_PATH)); ?>">

  <!-- Favicon -->
  <link rel="shortcut icon" href="/assets/logo.svg" type="image/svg+xml">
  <link rel="icon" type="image/svg+xml" href="/assets/logo.svg">
  <link rel="apple-touch-icon" href="/assets/logo.svg">

  <!-- Google Fonts: Inter & Outfit -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@600;700&display=swap" rel="stylesheet">

  <style>
    :root {
      --accent-red: #c0392b;
      --accent-crimson: #962d22;
      --gradient-primary: linear-gradient(135deg, var(--accent-red) 0%, var(--accent-crimson) 100%);
      --text-primary: #1a1a1a;
      --text-secondary: #4a4a4a;
      --text-muted: #8a8a8a;
      --border-light: rgba(0, 0, 0, 0.08);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #fbfbfb;
      background-image: 
        radial-gradient(circle at 50% 15%, rgba(192, 57, 43, 0.05) 0%, transparent 60%),
        radial-gradient(circle at 85% 85%, rgba(192, 57, 43, 0.02) 0%, transparent 50%);
      color: var(--text-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px 16px;
      -webkit-font-smoothing: antialiased;
    }

    .card {
      background: #ffffff;
      border-radius: 24px;
      padding: 40px 32px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.06), 0 2px 6px rgba(0, 0, 0, 0.04);
      border: 1px solid var(--border-light);
      position: relative;
      overflow: hidden;
    }

    .card::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--gradient-primary);
    }

    .logo-container {
      width: 76px;
      height: 76px;
      margin: 0 auto 20px;
      background: rgba(192, 57, 43, 0.07);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(192, 57, 43, 0.12);
    }

    .logo-img {
      width: 44px;
      height: 44px;
      display: block;
    }

    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.02em;
      margin-bottom: 8px;
      line-height: 1.3;
    }

    p {
      color: var(--text-secondary);
      font-size: 15px;
      line-height: 1.5;
      margin-bottom: 28px;
    }

    .btn-primary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      background: var(--gradient-primary);
      color: #ffffff;
      font-family: 'Outfit', sans-serif;
      font-weight: 600;
      font-size: 16px;
      padding: 16px 24px;
      border-radius: 14px;
      text-decoration: none;
      transition: transform 0.15s ease, box-shadow 0.2s ease, filter 0.2s ease;
      box-shadow: 0 8px 20px rgba(192, 57, 43, 0.32);
    }

    .btn-primary:hover {
      filter: brightness(1.05);
      transform: translateY(-2px);
      box-shadow: 0 10px 24px rgba(192, 57, 43, 0.4);
    }

    .btn-primary:active {
      transform: translateY(0);
      filter: brightness(0.95);
      box-shadow: 0 4px 12px rgba(192, 57, 43, 0.25);
    }

    .divider {
      margin: 28px 0 20px;
      height: 1px;
      background: #edf0f4;
      position: relative;
    }

    .divider span {
      position: absolute;
      top: -10px;
      left: 50%;
      transform: translateX(-50%);
      background: #ffffff;
      padding: 0 14px;
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    .stores-grid {
      display: flex;
      gap: 10px;
      justify-content: center;
    }

    .store-btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 11px 14px;
      border-radius: 12px;
      border: 1px solid rgba(0, 0, 0, 0.1);
      background: #ffffff;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      transition: all 0.2s ease;
    }

    .store-btn:hover {
      background: #f7f7f7;
      color: var(--text-primary);
      border-color: rgba(0, 0, 0, 0.2);
      transform: translateY(-1px);
    }

    .store-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
  </style>

  <script>
    window.onload = function() {
      var deepLink = "<?php echo $deepLink; ?>";
      if (deepLink) {
        // Redirigir automáticamente a la app si el dispositivo la soporta
        window.location.href = deepLink;
      }
    };
  </script>
</head>
<body>
  <div class="card">
    <div class="logo-container">
      <img src="/assets/logo.svg" alt="La Lira" class="logo-img">
    </div>

    <h1><?php echo htmlspecialchars($headingText); ?></h1>
    <p>Si la aplicación no se abre automáticamente en tu dispositivo, presiona el botón inferior:</p>

    <a href="<?php echo $deepLink; ?>" class="btn-primary">
      <span>Abrir Himno en la App</span>
    </a>

    <div class="divider">
      <span>o descarga la app</span>
    </div>

    <div class="stores-grid">
      <a href="https://play.google.com/store/apps/details?id=com.lalira.hymnary" class="store-btn" target="_blank" rel="noopener">
        <svg class="store-icon" viewBox="0 0 24 24">
          <path fill="#00D2FF" d="M3.609 1.814L13.793 12 3.61 22.185A2.32 2.32 0 0 1 3 20.554V3.445c0-.649.23-1.242.609-1.631z"/>
          <path fill="#00E676" d="M17.156 8.638L13.793 12 3.609 1.814a2.296 2.296 0 0 1 1.62-.663c.553 0 1.07.19 1.488.513l10.439 6.974z"/>
          <path fill="#FF3D00" d="M17.156 15.362l-10.44 6.975A2.33 2.33 0 0 1 5.23 22.85a2.296 2.296 0 0 1-1.62-.664L13.793 12l3.363 3.362z"/>
          <path fill="#FFD600" d="M20.686 10.871l-3.53-2.362L13.793 12l3.363 3.362 3.53-2.362c.792-.53 1.314-1.42 1.314-2.428s-.522-1.899-1.314-2.428z"/>
        </svg>
        <span>Google Play</span>
      </a>
      <a href="https://testflight.apple.com/join/1zXYZpbn" class="store-btn" target="_blank" rel="noopener">
        <svg class="store-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.2.67-2.92 1.49-.62.71-1.16 1.85-1.01 2.96 1.12.09 2.27-.58 2.94-1.39z"/>
        </svg>
        <span>iOS (Beta)</span>
      </a>
    </div>
  </div>
</body>
</html>
