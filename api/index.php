<?php
// Core REST API controller for La Lira CMS

// Allow CORS for local dev
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');
}
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    }
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    }
    exit(0);
}
header('Content-Type: application/json; charset=utf-8');

// Polyfills for older PHP versions if needed
if (!function_exists('str_starts_with')) {
    function str_starts_with($haystack, $needle) {
        return (string)$needle !== '' && strncmp($haystack, $needle, strlen($needle)) === 0;
    }
}
if (!function_exists('str_contains')) {
    function str_contains($haystack, $needle) {
        return $needle !== '' && strpos($haystack, $needle) !== false;
    }
}
if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
}

// Normalize request URI routing path
$request_method = $_SERVER['REQUEST_METHOD'];
$request_uri = $_SERVER['REQUEST_URI'];
$path = parse_url($request_uri, PHP_URL_PATH);
$api_pos = strpos($path, '/api');
if ($api_pos !== false) {
    $path = substr($path, $api_pos + 4);
}
$path = '/' . trim($path, '/');

// Load environment configuration file
$local_env = dirname(__DIR__) . '/.env';
$sibling_env = '/Users/magnus.carlos/Documents/GitHub/lalira/himnario/himnario/exports/.env';
$env_file = file_exists($local_env) ? $local_env : $sibling_env;

if (file_exists($env_file)) {
    $lines = file($env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (!$line || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
        list($key, $val) = explode('=', $line, 2);
        $key = trim($key);
        $val = trim($val);
        putenv("$key=$val");
        $_ENV[$key] = $val;
    }
}

// Determine if running on production host or local dev machine fallback
$is_prod = str_contains(__DIR__, '/home3/magnusal/') || file_exists('/home3/magnusal/public_html/lalira');

if ($is_prod) {
    $assets_dir = dirname(__DIR__) . '/assets';
    if (is_dir($assets_dir)) {
        @chmod($assets_dir, 0755);
        $files = glob($assets_dir . '/*');
        foreach ($files as $file) {
            if (is_file($file)) {
                @chmod($file, 0644);
            }
        }
    }
}

$headers = getallheaders();
$db_version = $headers['X-DB-Version'] ?? '2';

if ($db_version === '1') {
    $db_path = getenv('DB_PATH_V1') ?: ($is_prod 
      ? '/home3/magnusal/public_html/lalira/catalogo/catalogo.sqlite' 
      : '/Users/magnus.carlos/Documents/GitHub/lalira/himnario/himnario/catalogo.sqlite');
} else {
    $db_path = getenv('DB_PATH') ?: ($is_prod 
      ? '/home3/magnusal/public_html/lalira/catalogo/catalogo_v2.sqlite' 
      : '/Users/magnus.carlos/Documents/GitHub/lalira/himnario/himnario/catalogo_v2.sqlite');
}

$cms_db_path = getenv('CMS_DB_PATH') ?: ($is_prod 
  ? '/home3/magnusal/lalira/cms_internal.sqlite' 
  : '/Users/magnus.carlos/Documents/GitHub/lalira/himnario/himnario/cms_internal.sqlite');

$version_path = getenv('VERSION_PATH') ?: ($is_prod 
  ? '/home3/magnusal/public_html/lalira/catalogo/version_v2.json' 
  : '/Users/magnus.carlos/Documents/GitHub/lalira/himnario/himnario/server/catalogo/version_v2.json');

$assets_db_path = getenv('ASSETS_DB_PATH') ?: ($is_prod 
  ? dirname(__DIR__) . '/assets/catalogo_v2.sqlite' 
  : '/Users/magnus.carlos/Documents/GitHub/lalira/himnario/himnario/assets/catalogo_v2.sqlite');

// Initialize database connections
try {
    $dbCatalog = new PDO("sqlite:" . $db_path);
    $dbCatalog->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $dbCatalog->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    $dbCms = new PDO("sqlite:" . $cms_db_path);
    $dbCms->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $dbCms->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to connect to SQLite databases: " . $e->getMessage()]);
    exit;
}

// Migrate schema if needed and seed default admin user
function initInternalDB($dbCms) {
    try {
        $dbCms->query("SELECT auth_provider FROM usuario LIMIT 1");
    } catch (Exception $e) {
        $dbCms->exec("DROP TABLE IF EXISTS usuario;");
    }

    $dbCms->exec("
        CREATE TABLE IF NOT EXISTS usuario (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            nombre TEXT NOT NULL,
            rol TEXT NOT NULL CHECK(rol IN ('admin', 'editor')),
            auth_provider TEXT NOT NULL CHECK(auth_provider IN ('google', 'apple', 'local')),
            provider_user_id TEXT,
            estado TEXT DEFAULT 'activo' CHECK(estado IN ('activo', 'inactivo')),
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    ");

    $dbCms->exec("
        CREATE TABLE IF NOT EXISTS draft_hymn (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cancion_id INTEGER NOT NULL,
            editor_id INTEGER NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('draft', 'pending_approval')),
            data_json TEXT NOT NULL,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            modificado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(cancion_id)
        );
    ");

    $dbCms->exec("
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER,
            accion TEXT NOT NULL,
            cancion_id INTEGER,
            detalles TEXT,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    ");

    $count = $dbCms->query("SELECT COUNT(*) as count FROM usuario")->fetch()['count'];
    if ($count == 0) {
        $passwordHash = password_hash('admin123', PASSWORD_BCRYPT, ['cost' => 10]);
        $stmt = $dbCms->prepare("
            INSERT INTO usuario (email, password_hash, nombre, rol, auth_provider, estado)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute(['admin@lalira.com', $passwordHash, 'Administrador Inicial', 'admin', 'local', 'activo']);
    }
}
initInternalDB($dbCms);

// ── JWT IMPLEMENTATION ───────────────────────────────────────────────────────
define('JWT_SECRET', $_ENV['JWT_SECRET'] ?? 'lalira_cms_secret_token_key_2026');

function jwt_encode($payload, $expiry = 43200) {
    $header = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
    $payload['exp'] = time() + $expiry;
    $payload_json = json_encode($payload);
    
    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload_json));
    
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

function jwt_decode($jwt) {
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) return false;
    
    list($header64, $payload64, $signature64) = $parts;
    
    $signature = hash_hmac('sha256', $header64 . "." . $payload64, JWT_SECRET, true);
    $expectedSignature64 = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    if (!hash_equals($signature64, $expectedSignature64)) {
        return false;
    }
    
    $payload = json_decode(base64_decode(str_replace(['-','_'], ['+','/'], $payload64)), true);
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return false; // Expired
    }
    
    return $payload;
}

function get_auth_user() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (empty($authHeader) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }
    
    if (empty($authHeader)) {
        return null;
    }
    
    $parts = explode(' ', $authHeader);
    if (count($parts) !== 2 || strtolower($parts[0]) !== 'bearer') {
        return null;
    }
    
    return jwt_decode($parts[1]);
}

function require_auth() {
    $user = get_auth_user();
    if (!$user) {
        http_response_code(401);
        echo json_encode(["error" => "Token de acceso faltante o inválido"]);
        exit;
    }
    return $user;
}

function require_admin($user) {
    if (($user['rol'] ?? '') !== 'admin') {
        http_response_code(403);
        echo json_encode(["error" => "Permisos de administrador requeridos"]);
        exit;
    }
}

function log_audit($dbCms, $userId, $action, $songId, $details) {
    $stmt = $dbCms->prepare("INSERT INTO audit_log (usuario_id, accion, cancion_id, detalles) VALUES (?, ?, ?, ?)");
    $stmt->execute([$userId, $action, $songId, $details]);
}

function verify_google_token($token) {
    $url = "https://oauth2.googleapis.com/tokeninfo?id_token=" . urlencode($token);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http_code === 200) {
        $data = json_decode($response, true);
        if (isset($data['email'])) {
            return [
                'sub' => $data['sub'],
                'email' => $data['email'],
                'nombre' => $data['name'] ?? $data['email']
            ];
        }
    }
    return false;
}

$cache_dir = sys_get_temp_dir() . '/lalira_cache';
if (!is_dir($cache_dir)) {
    @mkdir($cache_dir, 0777, true);
}
$cache_key = md5($request_uri);
$cache_file = $cache_dir . '/' . $cache_key . '.json';
$cache_ttl = 3600; // 1 hour cache

if (str_starts_with($path, '/public/') && $request_method === 'GET' && empty($_GET['search'])) {
    if (file_exists($cache_file) && (time() - filemtime($cache_file)) < $cache_ttl) {
        header('X-Cache: HIT');
        readfile($cache_file);
        exit;
    }
}

function json_response($data, $code = 200) {
    global $path, $cache_file, $request_method;
    http_response_code($code);
    $out = json_encode($data);
    if ($code === 200 && str_starts_with($path, '/public/') && $request_method === 'GET' && empty($_GET['search'])) {
        @file_put_contents($cache_file, $out);
    }
    echo $out;
    exit;
}


// Parse request payload
$input = [];
$content_type = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
if (str_contains($content_type, 'application/json')) {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
} else {
    $input = $_POST;
}

// ── ROUTING CONTROLLER ───────────────────────────────────────────────────────

// GET /auth/config
if ($path === '/auth/config' && $request_method === 'GET') {
    json_response([
        "googleClientId" => $_ENV['GOOGLE_CLIENT_ID'] ?? null,
        "devBypass" => ($_ENV['DEV_BYPASS'] ?? '') === 'true'
    ]);
}

// POST /auth/login
if ($path === '/auth/login' && $request_method === 'POST') {
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    if (empty($email) || empty($password)) {
        json_response(["error" => "Email y contraseña requeridos"], 400);
    }
    
    $stmt = $dbCms->prepare("SELECT * FROM usuario WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user || empty($user['password_hash']) || !password_verify($password, $user['password_hash'])) {
        json_response(["error" => "Credenciales inválidas"], 401);
    }
    
    if ($user['estado'] !== 'activo') {
        json_response(["error" => "Tu cuenta de usuario ha sido desactivada por un administrador."], 403);
    }
    
    $token = jwt_encode([
        "id" => $user['id'],
        "email" => $user['email'],
        "rol" => $user['rol'],
        "nombre" => $user['nombre']
    ]);
    
    json_response([
        "token" => $token,
        "user" => [
            "email" => $user['email'],
            "rol" => $user['rol'],
            "nombre" => $user['nombre']
        ]
    ]);
}

// POST /auth/oauth
if ($path === '/auth/oauth' && $request_method === 'POST') {
    json_response(["error" => "Autenticación de Google desactivada temporalmente."], 501);
}

// GET /auth/me
if ($path === '/auth/me' && $request_method === 'GET') {
    $user = require_auth();
    json_response(["user" => $user]);
}

// GET /hymnals
if ($path === '/hymnals' && $request_method === 'GET') {
    $user = require_auth();
    $stmt = $dbCatalog->query("SELECT id, nombre, codigo FROM himnario ORDER BY id");
    json_response($stmt->fetchAll());
}

// GET /sections
if ($path === '/sections' && $request_method === 'GET') {
    $user = require_auth();
    $stmt = $dbCatalog->query("SELECT id, nombre, orden FROM seccion ORDER BY orden");
    json_response($stmt->fetchAll());
}

// GET /audit-logs
if ($path === '/audit-logs' && $request_method === 'GET') {
    $user = require_auth();
    require_admin($user);
    
    $stmt = $dbCms->query("
        SELECT a.id, a.accion, a.cancion_id, a.detalles, a.fecha, u.nombre as usuario_nombre
        FROM audit_log a
        LEFT JOIN usuario u ON a.usuario_id = u.id
        ORDER BY a.fecha DESC LIMIT 100
    ");
    json_response($stmt->fetchAll());
}

// GET /version
if ($path === '/version' && $request_method === 'GET') {
    $user = require_auth();
    if (file_exists($version_path)) {
        $vdata = json_decode(file_get_contents($version_path), true) ?? [];
        $vdata['db_size'] = filesize($db_path);
        json_response($vdata);
    } else {
        json_response(["version" => "Desconocida", "db_size" => filesize($db_path)]);
    }
}

// GET /songs
if ($path === '/songs' && $request_method === 'GET') {
    $user = require_auth();
    
    $himnario_id = $_GET['himnario_id'] ?? null;
    $seccion_id = $_GET['seccion_id'] ?? null;
    $search = $_GET['search'] ?? null;
    
    $sql = "
        SELECT c.id, c.numero_en_himnario, c.tonalidad, c.himnario_id, h.codigo as himnario_codigo,
               m.titulo, m.autor,
               EXISTS(SELECT 1 FROM cifra WHERE cancion_id = c.id AND contenido IS NOT NULL AND contenido != '') as has_chords
        FROM cancion c
        LEFT JOIN himnario h ON c.himnario_id = h.id
        LEFT JOIN cancion_metadata m ON c.id = m.cancion_id AND m.idioma = 'es'
        WHERE 1=1
    ";
    $params = [];
    
    if ($himnario_id !== null && $himnario_id !== '') {
        $sql .= " AND c.himnario_id = ?";
        $params[] = $himnario_id;
    }
    if ($seccion_id !== null && $seccion_id !== '') {
        $sql .= " AND c.seccion_id = ?";
        $params[] = $seccion_id;
    }
    if ($search !== null && $search !== '') {
        $sql .= " AND (m.titulo LIKE ? OR c.numero_en_himnario LIKE ? OR c.id IN (SELECT cancion_id FROM estrofa WHERE texto LIKE ?))";
        $likeParam = "%" . $search . "%";
        $params[] = $likeParam;
        $params[] = $likeParam;
        $params[] = $likeParam;
    }
    
    $sql .= " ORDER BY c.himnario_id, CAST(c.numero_en_himnario AS INTEGER), c.id";
    
    $stmt = $dbCatalog->prepare($sql);
    $stmt->execute($params);
    $songs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $draftsQuery = $dbCms->query("SELECT * FROM draft_hymn");
    $drafts = $draftsQuery->fetchAll(PDO::FETCH_ASSOC);
    
    $draftMap = [];
    $negativeDrafts = [];
    foreach ($drafts as $d) {
        $draftMap[$d['cancion_id']] = $d['status'];
        if ((int)$d['cancion_id'] < 0) {
            $negativeDrafts[] = $d;
        }
    }
    
    foreach ($songs as &$s) {
        $s['draft_status'] = $draftMap[$s['id']] ?? null;
    }
    unset($s);
    
    // Resolve himnario codigos
    $hymnalsQuery = $dbCatalog->query("SELECT id, codigo FROM himnario");
    $hymnalsList = $hymnalsQuery->fetchAll(PDO::FETCH_ASSOC);
    $hymnalMap = [];
    foreach ($hymnalsList as $h) {
        $hymnalMap[$h['id']] = $h['codigo'];
    }

    $addedSongs = [];
    foreach ($negativeDrafts as $d) {
        $data = json_decode($d['data_json'], true);
        if (!$data) continue;

        // Apply filters
        if ($himnario_id !== null && $himnario_id !== '' && (!isset($data['himnario_id']) || $data['himnario_id'] != $himnario_id)) {
            continue;
        }
        if ($seccion_id !== null && $seccion_id !== '' && (!isset($data['seccion_id']) || $data['seccion_id'] != $seccion_id)) {
            continue;
        }

        $title = $data['metadata']['es']['titulo'] ?? $data['metadata']['pt']['titulo'] ?? '(Nueva Alabanza)';
        $autor = $data['metadata']['es']['autor'] ?? '';
        $num = $data['numero_en_himnario'] ?? '';

        if ($search !== null && $search !== '') {
            $searchLower = mb_strtolower($search, 'UTF-8');
            $matchesTitle = mb_strpos(mb_strtolower($title, 'UTF-8'), $searchLower) !== false;
            $matchesNumber = mb_strpos(mb_strtolower($num, 'UTF-8'), $searchLower) !== false;
            
            $matchesStanzas = false;
            if (isset($data['estrofas']) && is_array($data['estrofas'])) {
                foreach ($data['estrofas'] as $st) {
                    if (isset($st['texto']) && mb_strpos(mb_strtolower($st['texto'], 'UTF-8'), $searchLower) !== false) {
                        $matchesStanzas = true;
                        break;
                    }
                }
            }
            if (!$matchesTitle && !$matchesNumber && !$matchesStanzas) {
                continue;
            }
        }

        $hasChords = 0;
        if (isset($data['cifras'])) {
            foreach ($data['cifras'] as $cif) {
                if (isset($cif['contenido']) && trim($cif['contenido']) !== '') {
                    $hasChords = 1;
                    break;
                }
            }
        }

        $addedSongs[] = [
            'id' => (int)$d['cancion_id'],
            'numero_en_himnario' => $num,
            'tonalidad' => $data['tonalidad'] ?? '',
            'himnario_id' => (int)($data['himnario_id'] ?? 1),
            'himnario_codigo' => $hymnalMap[$data['himnario_id'] ?? 1] ?? '',
            'titulo' => $title,
            'autor' => $autor,
            'draft_status' => $d['status'],
            'has_chords' => $hasChords
        ];
    }

    $allSongs = array_merge($songs, $addedSongs);
    usort($allSongs, function($a, $b) {
        if ($a['himnario_id'] !== $b['himnario_id']) {
            return $a['himnario_id'] - $b['himnario_id'];
        }
        $numA = (int)$a['numero_en_himnario'];
        $numB = (int)$b['numero_en_himnario'];
        if ($numA !== $numB) {
            return $numA - $numB;
        }
        return $a['id'] - $b['id'];
    });

    json_response($allSongs);
}

// Helper to assemble full song JSON from the catalog SQLite
function getProductionSong($dbCatalog, $songId) {
    $stmt = $dbCatalog->prepare("
        SELECT c.id, c.himnario_id, c.seccion_id, c.numero_en_himnario, c.tonalidad, c.intro, h.codigo as himnario_codigo
        FROM cancion c
        LEFT JOIN himnario h ON c.himnario_id = h.id
        WHERE c.id = ?
    ");
    $stmt->execute([$songId]);
    $song = $stmt->fetch();
    if (!$song) return null;
    
    $metaStmt = $dbCatalog->prepare("SELECT idioma, titulo, autor, compositor, adaptador, traductor FROM cancion_metadata WHERE cancion_id = ?");
    $metaStmt->execute([$songId]);
    $metadata = [];
    foreach ($metaStmt->fetchAll() as $r) {
        $metadata[$r['idioma']] = $r;
    }
    foreach (['es', 'pt', 'en'] as $lang) {
        if (!isset($metadata[$lang])) {
            $metadata[$lang] = ["idioma" => $lang, "titulo" => "", "autor" => "", "compositor" => "", "adaptador" => "", "traductor" => ""];
        }
    }
    $song['metadata'] = $metadata;
    
    $stanzasStmt = $dbCatalog->prepare("SELECT id, orden, tipo, texto, repeticiones, idioma FROM estrofa WHERE cancion_id = ? ORDER BY orden");
    $stanzasStmt->execute([$songId]);
    $song['estrofas'] = $stanzasStmt->fetchAll();
    
    $cifraStmt = $dbCatalog->prepare("SELECT idioma, contenido, tonalidad, tiempo, bpm, ritmo FROM cifra WHERE cancion_id = ?");
    $cifraStmt->execute([$songId]);
    $cifras = [];
    foreach ($cifraStmt->fetchAll() as $r) {
        $cifras[$r['idioma']] = $r;
    }
    foreach (['es', 'pt', 'en'] as $lang) {
        if (!isset($cifras[$lang])) {
            $cifras[$lang] = ["idioma" => $lang, "contenido" => "", "tonalidad" => "", "tiempo" => "", "bpm" => 0, "ritmo" => ""];
        } else {
            $cifras[$lang]['bpm'] = (int)$cifras[$lang]['bpm'];
        }
    }
    $song['cifras'] = $cifras;
    
    $notesStmt = $dbCatalog->prepare("SELECT id, tipo, marcador_numero, fragmento_letra, texto, referencia, versiculo_texto, autor FROM nota WHERE cancion_id = ? ORDER BY marcador_numero");
    $notesStmt->execute([$songId]);
    $song['notas'] = $notesStmt->fetchAll();
    
    return $song;
}

// POST /songs
if ($path === '/songs' && $request_method === 'POST') {
    $user = require_auth();
    $himnario_id = $input['himnario_id'] ?? null;
    $numero_en_himnario = $input['numero_en_himnario'] ?? null;
    $titulo = $input['titulo'] ?? null;
    
    if (!$himnario_id || !$numero_en_himnario || !$titulo) {
        json_response(["error" => "Himnario, número y título inicial son requeridos"], 400);
    }
    
    $minStmt = $dbCms->query("SELECT MIN(cancion_id) as minId FROM draft_hymn");
    $minRow = $minStmt->fetch();
    $newId = -1;
    if ($minRow && $minRow['minId'] !== null && (int)$minRow['minId'] < 0) {
        $newId = (int)$minRow['minId'] - 1;
    }
    
    $now = gmdate('Y-m-d\TH:i:s\Z');
    $songData = [
        'numero_en_himnario' => trim((string)$numero_en_himnario),
        'tonalidad' => '',
        'seccion_id' => null,
        'intro' => '',
        'himnario_id' => (int)$himnario_id,
        'metadata' => [
            'es' => ['idioma' => 'es', 'titulo' => trim($titulo), 'autor' => '', 'compositor' => '', 'adaptador' => '', 'traductor' => ''],
            'pt' => ['idioma' => 'pt', 'titulo' => '', 'autor' => '', 'compositor' => '', 'adaptador' => '', 'traductor' => ''],
            'en' => ['idioma' => 'en', 'titulo' => '', 'autor' => '', 'compositor' => '', 'adaptador' => '', 'traductor' => '']
        ],
        'cifras' => [
            'es' => ['idioma' => 'es', 'contenido' => '', 'tonalidad' => '', 'tiempo' => '', 'bpm' => 0, 'ritmo' => ''],
            'pt' => ['idioma' => 'pt', 'contenido' => '', 'tonalidad' => '', 'tiempo' => '', 'bpm' => 0, 'ritmo' => ''],
            'en' => ['idioma' => 'en', 'contenido' => '', 'tonalidad' => '', 'tiempo' => '', 'bpm' => 0, 'ritmo' => '']
        ],
        'estrofas' => [],
        'notas' => []
    ];
    
    $insertStmt = $dbCms->prepare("
        INSERT INTO draft_hymn (cancion_id, editor_id, status, data_json, creado_en, modificado_en)
        VALUES (?, ?, 'draft', ?, ?, ?)
    ");
    $insertStmt->execute([$newId, $user['id'], json_encode($songData), $now, $now]);
    
    log_audit($dbCms, $user['id'], 'SAVE_DRAFT', $newId, "Borrador de nueva canción \"" . $titulo . "\" creado.");
    json_response(["success" => true, "id" => $newId]);
}

// GET /songs/:id
if (preg_match('/^\/songs\/(-?\d+)$/', $path, $matches) && $request_method === 'GET') {
    $user = require_auth();
    $songId = (int)$matches[1];
    
    $prodSong = null;
    if ($songId >= 0) {
        $prodSong = getProductionSong($dbCatalog, $songId);
    }
    
    $draftStmt = $dbCms->prepare("SELECT * FROM draft_hymn WHERE cancion_id = ?");
    $draftStmt->execute([$songId]);
    $draft = $draftStmt->fetch();
    
    if (!$prodSong && !$draft) {
        json_response(["error" => "Alabanza no encontrada"], 404);
    }
    
    json_response([
        "production" => $prodSong,
        "draft" => $draft ? [
            "id" => $draft['id'],
            "status" => $draft['status'],
            "editor_id" => $draft['editor_id'],
            "modificado_en" => $draft['modificado_en'],
            "data" => json_decode($draft['data_json'], true)
        ] : null
    ]);
}

// POST /drafts/:songId
if (preg_match('/^\/drafts\/(-?\d+)$/', $path, $matches) && $request_method === 'POST') {
    $user = require_auth();
    $songId = (int)$matches[1];
    $songData = $input;
    
    $checkStmt = $dbCms->prepare("SELECT id FROM draft_hymn WHERE cancion_id = ?");
    $checkStmt->execute([$songId]);
    $existing = $checkStmt->fetch();
    
    $now = gmdate('Y-m-d\TH:i:s\Z');
    if ($existing) {
        $updateStmt = $dbCms->prepare("
            UPDATE draft_hymn
            SET data_json = ?, status = 'draft', modificado_en = ?
            WHERE cancion_id = ?
        ");
        $updateStmt->execute([json_encode($songData), $now, $songId]);
    } else {
        $insertStmt = $dbCms->prepare("
            INSERT INTO draft_hymn (cancion_id, editor_id, status, data_json, creado_en, modificado_en)
            VALUES (?, ?, 'draft', ?, ?, ?)
        ");
        $insertStmt->execute([$songId, $user['id'], json_encode($songData), $now, $now]);
    }
    
    log_audit($dbCms, $user['id'], 'SAVE_DRAFT', $songId, "Borrador guardado.");
    json_response(["success" => true]);
}

// POST /drafts/:songId/submit
if (preg_match('/^\/drafts\/(-?\d+)\/submit$/', $path, $matches) && $request_method === 'POST') {
    $user = require_auth();
    $songId = (int)$matches[1];
    
    $updateStmt = $dbCms->prepare("UPDATE draft_hymn SET status = 'pending_approval' WHERE cancion_id = ?");
    $updateStmt->execute([$songId]);
    if ($updateStmt->rowCount() === 0) {
        json_response(["error" => "Borrador no encontrado"], 404);
    }
    
    log_audit($dbCms, $user['id'], 'SUBMIT_APPROVAL', $songId, "Enviado para aprobación.");
    json_response(["success" => true]);
}

// POST /drafts/:songId/reject
if (preg_match('/^\/drafts\/(-?\d+)\/reject$/', $path, $matches) && $request_method === 'POST') {
    $user = require_auth();
    require_admin($user);
    $songId = (int)$matches[1];
    $motivo = $input['motivo'] ?? 'No especificado';
    
    $updateStmt = $dbCms->prepare("UPDATE draft_hymn SET status = 'draft' WHERE cancion_id = ?");
    $updateStmt->execute([$songId]);
    if ($updateStmt->rowCount() === 0) {
        json_response(["error" => "Borrador no encontrado"], 404);
    }
    
    log_audit($dbCms, $user['id'], 'REJECT', $songId, "Borrador rechazado. Motivo: " . $motivo);
    json_response(["success" => true]);
}

// POST /drafts/:songId/approve
if (preg_match('/^\/drafts\/(-?\d+)\/approve$/', $path, $matches) && $request_method === 'POST') {
    $user = require_auth();
    require_admin($user);
    $songId = (int)$matches[1];
    
    $draftStmt = $dbCms->prepare("SELECT data_json FROM draft_hymn WHERE cancion_id = ?");
    $draftStmt->execute([$songId]);
    $draft = $draftStmt->fetch();
    if (!$draft) {
        json_response(["error" => "Borrador no encontrado para aprobación"], 404);
    }
    
    $songData = json_decode($draft['data_json'], true);
    
    try {
        $dbCatalog->beginTransaction();
        
        $targetSongId = $songId;

        if ($songId > 0) {
            $updateSongStmt = $dbCatalog->prepare("
                UPDATE cancion
                SET himnario_id = ?, seccion_id = ?, tonalidad = ?, intro = ?, numero_en_himnario = ?
                WHERE id = ?
            ");
            $updateSongStmt->execute([
                empty($songData['himnario_id']) ? null : $songData['himnario_id'],
                $songData['seccion_id'] ?? null,
                $songData['tonalidad'] ?? '',
                $songData['intro'] ?? '',
                $songData['numero_en_himnario'],
                $targetSongId
            ]);
        } else {
            $findSongStmt = $dbCatalog->prepare("SELECT id FROM cancion WHERE himnario_id = ? AND numero_en_himnario = ?");
            $findSongStmt->execute([empty($songData['himnario_id']) ? null : $songData['himnario_id'], $songData['numero_en_himnario']]);
            $existingSong = $findSongStmt->fetch();

            if ($existingSong) {
                $targetSongId = (int)$existingSong['id'];
                $updateSongStmt = $dbCatalog->prepare("
                    UPDATE cancion
                    SET himnario_id = ?, seccion_id = ?, tonalidad = ?, intro = ?, numero_en_himnario = ?
                    WHERE id = ?
                ");
                $updateSongStmt->execute([
                    empty($songData['himnario_id']) ? null : $songData['himnario_id'],
                    $songData['seccion_id'] ?? null,
                    $songData['tonalidad'] ?? '',
                    $songData['intro'] ?? '',
                    $songData['numero_en_himnario'],
                    $targetSongId
                ]);
            } else {
                $customId = null;
                $numInt = (int)$songData['numero_en_himnario'];
                if ($numInt > 0) {
                    if ((int)$songData['himnario_id'] === 1) $customId = 100000 + $numInt;
                    else if ((int)$songData['himnario_id'] === 2) $customId = 200000 + $numInt;
                }

                if ($customId) {
                    $insertSongStmt = $dbCatalog->prepare("
                        INSERT INTO cancion (id, himnario_id, seccion_id, tonalidad, intro, numero_en_himnario)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ");
                    $insertSongStmt->execute([
                        $customId,
                        empty($songData['himnario_id']) ? null : $songData['himnario_id'],
                        $songData['seccion_id'] ?? null,
                        $songData['tonalidad'] ?? '',
                        $songData['intro'] ?? '',
                        $songData['numero_en_himnario']
                    ]);
                    $targetSongId = $customId;
                } else {
                    $insertSongStmt = $dbCatalog->prepare("
                        INSERT INTO cancion (himnario_id, seccion_id, tonalidad, intro, numero_en_himnario)
                        VALUES (?, ?, ?, ?, ?)
                    ");
                    $insertSongStmt->execute([
                        empty($songData['himnario_id']) ? null : $songData['himnario_id'],
                        $songData['seccion_id'] ?? null,
                        $songData['tonalidad'] ?? '',
                        $songData['intro'] ?? '',
                        $songData['numero_en_himnario']
                    ]);
                    $targetSongId = (int)$dbCatalog->lastInsertId();
                }
            }
        }
        
        foreach (['es', 'pt', 'en'] as $lang) {
            $meta = $songData['metadata'][$lang] ?? null;
            if ($meta && !empty($meta['titulo'])) {
                $metaStmt = $dbCatalog->prepare("
                    INSERT OR REPLACE INTO cancion_metadata (cancion_id, idioma, titulo, autor, compositor, adaptador, traductor)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                $metaStmt->execute([
                    $targetSongId,
                    $lang,
                    trim($meta['titulo']),
                    trim($meta['autor'] ?? ''),
                    trim($meta['compositor'] ?? ''),
                    trim($meta['adaptador'] ?? ''),
                    trim($meta['traductor'] ?? '')
                ]);
            }
        }
        
        // 3. Save Stanzas (strictly save explicit stanzas from editor without auto-generating from ChordPro)
        $stanzas = $songData['estrofas'] ?? [];
        $hasStanzaContent = false;
        foreach ($stanzas as $s) {
            if (!empty($s['texto']) && trim($s['texto']) !== '') {
                $hasStanzaContent = true;
                break;
            }
        }

        if ($hasStanzaContent) {
            $delStanzas = $dbCatalog->prepare("DELETE FROM estrofa WHERE cancion_id = ?");
            $delStanzas->execute([$targetSongId]);

            foreach ($stanzas as $s) {
                if (!empty($s['texto']) && trim($s['texto']) !== '') {
                    $insStanza = $dbCatalog->prepare("
                        INSERT INTO estrofa (cancion_id, idioma, orden, tipo, texto, repeticiones)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ");
                    $insStanza->execute([
                        $targetSongId,
                        $s['idioma'] ?? 'es',
                        $s['orden'] ?? 1,
                        $s['tipo'] ?? 'estrofa',
                        trim($s['texto']),
                        $s['repeticiones'] ?? 1
                    ]);
                }
            }
        }
        
        foreach (['es', 'pt', 'en'] as $lang) {
            $cifra = $songData['cifras'][$lang] ?? null;
            if ($cifra && !empty($cifra['contenido']) && trim($cifra['contenido']) !== '') {
                $bpm = isset($cifra['bpm']) ? (int)$cifra['bpm'] : null;
                $insCifra = $dbCatalog->prepare("
                    INSERT OR REPLACE INTO cifra (cancion_id, idioma, contenido, tonalidad, tiempo, bpm, ritmo)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                $insCifra->execute([
                    $targetSongId,
                    $lang,
                    trim($cifra['contenido']),
                    $cifra['tonalidad'] ?? null,
                    $cifra['tiempo'] ?? null,
                    $bpm,
                    $cifra['ritmo'] ?? null
                ]);
            } else {
                $delCifra = $dbCatalog->prepare("DELETE FROM cifra WHERE cancion_id = ? AND idioma = ?");
                $delCifra->execute([$targetSongId, $lang]);
            }
        }
        
        $delNotes = $dbCatalog->prepare("DELETE FROM nota WHERE cancion_id = ?");
        $delNotes->execute([$targetSongId]);
        $notes = $songData['notas'] ?? [];
        foreach ($notes as $note) {
            if (!empty($note['texto']) || !empty($note['referencia'])) {
                $insNote = $dbCatalog->prepare("
                    INSERT INTO nota (cancion_id, tipo, marcador_numero, fragmento_letra, texto, referencia, versiculo_texto, autor)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $insNote->execute([
                    $targetSongId,
                    $note['tipo'],
                    $note['marcador_numero'],
                    $note['fragmento_letra'] ?? '',
                    $note['texto'] ?? '',
                    $note['referencia'] ?? '',
                    $note['versiculo_texto'] ?? '',
                    $note['autor'] ?? ''
                ]);
            }
        }
        
        $dbCatalog->commit();
        
        $delDraft = $dbCms->prepare("DELETE FROM draft_hymn WHERE cancion_id = ?");
        $delDraft->execute([$songId]);
        
        log_audit($dbCms, $user['id'], 'APPROVE', $targetSongId, $songId < 0 ? "Nueva canción aprobada e integrada a producción con ID " . $targetSongId : "Borrador aprobado e integrado a producción.");
        json_response(["success" => true, "targetSongId" => $targetSongId]);
        
    } catch (Exception $e) {
        $dbCatalog->rollBack();
        json_response(["error" => $e->getMessage()], 500);
    }
}

// GET /users
if ($path === '/users' && $request_method === 'GET') {
    $user = require_auth();
    require_admin($user);
    $stmt = $dbCms->query("SELECT id, email, nombre, rol, auth_provider, provider_user_id, estado, creado_en FROM usuario ORDER BY creado_en DESC");
    json_response($stmt->fetchAll());
}

// POST /users
if ($path === '/users' && $request_method === 'POST') {
    $user = require_auth();
    require_admin($user);
    
    $email = $input['email'] ?? '';
    $nombre = $input['nombre'] ?? '';
    $rol = $input['rol'] ?? '';
    $auth_provider = $input['auth_provider'] ?? 'google';
    $password = $input['password'] ?? '';
    
    if (empty($email) || empty($nombre) || empty($rol)) {
        json_response(["error" => "Nombre, email y rol son requeridos"], 400);
    }
    
    if ($auth_provider === 'local' && (empty($password) || strlen(trim($password)) < 6)) {
        json_response(["error" => "La contraseña local es requerida y debe tener al menos 6 caracteres."], 400);
    }
    
    $emailLower = strtolower(trim($email));
    
    $checkStmt = $dbCms->prepare("SELECT id FROM usuario WHERE LOWER(email) = ?");
    $checkStmt->execute([$emailLower]);
    if ($checkStmt->fetch()) {
        json_response(["error" => "Este correo electrónico ya está registrado"], 400);
    }
    
    $passwordHash = $auth_provider === 'local' ? password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]) : null;
    
    $insertStmt = $dbCms->prepare("
        INSERT INTO usuario (email, nombre, rol, auth_provider, password_hash, estado)
        VALUES (?, ?, ?, ?, ?, 'activo')
    ");
    $insertStmt->execute([$emailLower, trim($nombre), $rol, $auth_provider, $passwordHash]);
    $newId = $dbCms->lastInsertId();
    
    log_audit($dbCms, $user['id'], 'INVITE_USER', $newId, "Usuario {$emailLower} registrado con proveedor {$auth_provider} como {$rol}.");
    json_response(["success" => true, "id" => (int)$newId]);
}

// PUT /users/:id
if (preg_match('/^\/users\/(\d+)$/', $path, $matches) && $request_method === 'PUT') {
    $user = require_auth();
    require_admin($user);
    $userId = (int)$matches[1];
    
    $nombre = $input['nombre'] ?? null;
    $rol = $input['rol'] ?? null;
    $estado = $input['estado'] ?? null;
    $auth_provider = $input['auth_provider'] ?? null;
    $password = $input['password'] ?? null;
    
    $checkStmt = $dbCms->prepare("SELECT rol, estado FROM usuario WHERE id = ?");
    $checkStmt->execute([$userId]);
    $targetUser = $checkStmt->fetch();
    if (!$targetUser) {
        json_response(["error" => "Usuario no encontrado"], 404);
    }
    
    if ($targetUser['rol'] === 'admin' && ($rol === 'editor' || $estado === 'inactivo')) {
        $activeStmt = $dbCms->query("SELECT COUNT(*) as count FROM usuario WHERE rol = 'admin' AND estado = 'activo'");
        $activeAdmins = $activeStmt->fetch()['count'];
        if ($activeAdmins <= 1 && $targetUser['estado'] === 'activo') {
            json_response(["error" => "No se puede desactivar o rebajar al último administrador activo."], 400);
        }
    }
    
    $passwordHash = null;
    $hasPassword = 0;
    if ($password !== null && strlen(trim($password)) >= 6) {
        $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
        $hasPassword = 1;
    }
    
    $updateStmt = $dbCms->prepare("
        UPDATE usuario
        SET nombre = COALESCE(?, nombre),
            rol = COALESCE(?, rol),
            estado = COALESCE(?, estado),
            auth_provider = COALESCE(?, auth_provider),
            password_hash = CASE WHEN ? THEN ? ELSE password_hash END
        WHERE id = ?
    ");
    $updateStmt->execute([
        $nombre !== null ? trim($nombre) : null,
        $rol,
        $estado,
        $auth_provider,
        $hasPassword,
        $passwordHash,
        $userId
    ]);
    
    log_audit($dbCms, $user['id'], 'UPDATE_USER', $userId, "Usuario modificado. Rol: " . ($rol ?? 'sin cambios') . ", Estado: " . ($estado ?? 'sin cambios') . ", Proveedor: " . ($auth_provider ?? 'sin cambios'));
    json_response(["success" => true]);
}

// DELETE /songs/:id
if (preg_match('/^\/songs\/(\d+)$/', $path, $matches) && $request_method === 'DELETE') {
    $user = require_auth();
    require_admin($user);
    $songId = (int)$matches[1];

    try {
        $dbCatalog->beginTransaction();
        
        $dbCatalog->prepare("DELETE FROM estrofa WHERE cancion_id = ?")->execute([$songId]);
        $dbCatalog->prepare("DELETE FROM cifra WHERE cancion_id = ?")->execute([$songId]);
        $dbCatalog->prepare("DELETE FROM nota WHERE cancion_id = ?")->execute([$songId]);
        $dbCatalog->prepare("DELETE FROM cancion_metadata WHERE cancion_id = ?")->execute([$songId]);
        $dbCatalog->prepare("DELETE FROM cancion WHERE id = ?")->execute([$songId]);
        
        $dbCatalog->commit();
        
        // Also delete any pending draft in CMS DB
        $dbCms->prepare("DELETE FROM draft_hymn WHERE cancion_id = ?")->execute([$songId]);
        
        log_audit($dbCms, $user['id'], 'DELETE_SONG', $songId, "Canción ID {$songId} eliminada permanentemente del catálogo.");
        
        json_response(["success" => true]);
    } catch (Exception $e) {
        $dbCatalog->rollBack();
        json_response(["error" => $e->getMessage()], 500);
    }
}

// DELETE /users/:id
if (preg_match('/^\/users\/(\d+)$/', $path, $matches) && $request_method === 'DELETE') {
    $user = require_auth();
    require_admin($user);
    $userId = (int)$matches[1];
    
    $checkStmt = $dbCms->prepare("SELECT rol FROM usuario WHERE id = ?");
    $checkStmt->execute([$userId]);
    $targetUser = $checkStmt->fetch();
    if (!$targetUser) {
        json_response(["error" => "Usuario no encontrado"], 404);
    }
    
    if ($targetUser['rol'] === 'admin') {
        $adminsStmt = $dbCms->query("SELECT COUNT(*) as count FROM usuario WHERE rol = 'admin'");
        $totalAdmins = $adminsStmt->fetch()['count'];
        if ($totalAdmins <= 1) {
            json_response(["error" => "No se puede eliminar al único administrador del sistema."], 400);
        }
    }
    
    if ($userId === (int)$user['id']) {
        json_response(["error" => "No puedes eliminar tu propio usuario."], 400);
    }
    
    $deleteStmt = $dbCms->prepare("DELETE FROM usuario WHERE id = ?");
    $deleteStmt->execute([$userId]);
    
    log_audit($dbCms, $user['id'], 'DELETE_USER', $userId, "Usuario ID {$userId} eliminado del sistema.");
    json_response(["success" => true]);
}

// POST /publish
if ($path === '/publish' && $request_method === 'POST') {
    $user = require_auth();
    require_admin($user);
    
    if (!file_exists($version_path)) {
        json_response(["error" => "Ruta version.json no encontrada"], 500);
    }
    
    $vdata = json_decode(file_get_contents($version_path), true) ?? [];
    $oldVersion = $vdata['version'] ?? '2.0.0';
    
    $parts = explode('.', $oldVersion);
    $parts[count($parts) - 1] = (string)((int)$parts[count($parts) - 1] + 1);
    $newVersion = implode('.', $parts);
    
    $dbCatalog->exec("VACUUM;");
    $newSize = filesize($db_path);
    
    $vdata['version'] = $newVersion;
    $vdata['size'] = $newSize;
    
    file_put_contents($version_path, json_encode($vdata, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
    
    copy($db_path, $assets_db_path);
    
    $uploaded = false;
    $uploadLog = "No se configuraron las credenciales SSH en el archivo .env";
    
    if ($is_prod) {
        $uploaded = true;
        $uploadLog = "Ejecutando en producción. Base de datos y versión actualizadas localmente.";
    } else {
        $sshHost = $_ENV['SSH_HOST'] ?? '';
        $sshUser = $_ENV['SSH_USER'] ?? '';
        $sshPort = $_ENV['SSH_PORT'] ?? '22';
        $sshKey = $_ENV['SSH_KEY'] ?? '';
        $remotePath = $_ENV['SSH_REMOTE_PATH'] ?? '';
        
        if (!empty($sshHost) && !empty($sshUser) && !empty($remotePath)) {
            $sshKeyPath = $sshKey;
            if (str_starts_with($sshKeyPath, '~')) {
                $home = getenv('HOME') ?: '/Users/magnus.carlos';
                $sshKeyPath = str_replace('~', $home, $sshKeyPath);
            }
            if (empty($sshKeyPath)) {
                $home = getenv('HOME') ?: '/Users/magnus.carlos';
                $sshKeyPath = $home . '/.ssh/id_rsa';
            }
            
            $scpCmdBase = sprintf(
                "scp -P %s -i %s -o StrictHostKeyChecking=accept-new -o IdentitiesOnly=yes",
                escapeshellarg($sshPort),
                escapeshellarg($sshKeyPath)
            );
            
            $remoteTarget = sprintf(
                "%s@%s:%s",
                $sshUser,
                $sshHost,
                $remotePath
            );
            
            $cmdDb = sprintf("%s %s %s 2>&1", $scpCmdBase, escapeshellarg($db_path), escapeshellarg($remoteTarget));
            $cmdVer = sprintf("%s %s %s 2>&1", $scpCmdBase, escapeshellarg($version_path), escapeshellarg($remoteTarget));
            
            exec($cmdDb, $outputDb, $statusDb);
            exec($cmdVer, $outputVer, $statusVer);
            
            if ($statusDb === 0 && $statusVer === 0) {
                $uploaded = true;
                $uploadLog = "Carga SCP exitosa a " . $sshHost;
            } else {
                $errDb = implode("\n", $outputDb);
                $errVer = implode("\n", $outputVer);
                $uploadLog = "Error SCP. DB Status: $statusDb ($errDb). Ver Status: $statusVer ($errVer)";
            }
        }
    }
    
    log_audit($dbCms, $user['id'], 'PUBLISH', null, "Publicación v{$newVersion} realizada.");
    json_response([
        "success" => true,
        "old_version" => $oldVersion,
        "new_version" => $newVersion,
        "db_size" => $newSize,
        "copied_to_assets" => true,
        "uploaded_to_server" => $uploaded,
        "upload_log" => $uploadLog
    ]);
}

// --- PUBLIC ENDPOINTS (Web Module) ---

// GET /public/sections
if ($path === '/public/sections' && $request_method === 'GET') {
    $stmt = $dbCatalog->query("SELECT id, nombre, orden FROM seccion ORDER BY orden");
    json_response($stmt->fetchAll());
}

// GET /public/filters
if ($path === '/public/filters' && $request_method === 'GET') {
    $ritmos = $dbCatalog->query("SELECT DISTINCT ritmo FROM cifra WHERE ritmo IS NOT NULL AND ritmo != '' ORDER BY ritmo")->fetchAll(PDO::FETCH_COLUMN, 0);
    $tempos = $dbCatalog->query("SELECT DISTINCT bpm FROM cifra WHERE bpm IS NOT NULL AND bpm > 0 ORDER BY bpm")->fetchAll(PDO::FETCH_COLUMN, 0);
    $tonalidades = $dbCatalog->query("SELECT DISTINCT tonalidad FROM cancion WHERE tonalidad IS NOT NULL AND tonalidad != '' ORDER BY tonalidad")->fetchAll(PDO::FETCH_COLUMN, 0);
    $tiempos = $dbCatalog->query("SELECT DISTINCT tiempo FROM cifra WHERE tiempo IS NOT NULL AND tiempo != '0' AND tiempo != '' ORDER BY tiempo")->fetchAll(PDO::FETCH_COLUMN, 0);
    
    json_response([
        'ritmos' => $ritmos,
        'tempos' => array_map('intval', $tempos),
        'tonalidades' => $tonalidades,
        'tiempos' => $tiempos
    ]);
}

// GET /public/hymnals
if ($path === '/public/hymnals' && $request_method === 'GET') {
    $stmt = $dbCatalog->query("SELECT id, nombre, codigo FROM himnario ORDER BY id");
    json_response($stmt->fetchAll());
}

// GET /public/songs
if ($path === '/public/songs' && $request_method === 'GET') {
    $himnario_id = $_GET['himnario_id'] ?? null;
    $seccion_id = $_GET['seccion_id'] ?? null;
    $search = $_GET['search'] ?? null;
    $limit = $_GET['limit'] ?? null;
    $ritmo = $_GET['ritmo'] ?? null;
    $bpm = $_GET['bpm'] ?? null;
    $tonalidad = $_GET['tonalidad'] ?? null;
    $tiempo = $_GET['tiempo'] ?? null;
    
    $params = [];
    
    // Check if we need to join the cifra table
    $needsCifra = ($ritmo !== null || $bpm !== null || $tiempo !== null);
    $cifraJoin = $needsCifra ? " LEFT JOIN (SELECT * FROM cifra GROUP BY cancion_id) cf ON c.id = cf.cancion_id " : "";
    
    if ($search !== null && $search !== '') {
        $ftsSearch = '"' . str_replace('"', '""', $search) . '*"';
        $likeParam = "%" . $search . "%";
        
        $sql = "
            SELECT c.id, c.numero_en_himnario, c.tonalidad, c.himnario_id, c.seccion_id, h.codigo as himnario_codigo,
                   m.titulo, m.autor,
                   COALESCE(
                       (SELECT snippet(estrofa_fts, -1, '<mark>', '</mark>', '...', 15)
                        FROM estrofa_fts
                        JOIN estrofa e ON estrofa_fts.rowid = e.id
                        WHERE e.cancion_id = c.id AND estrofa_fts MATCH ?
                        LIMIT 1),
                       ''
                   ) as snippet
            FROM cancion c
            JOIN himnario h ON c.himnario_id = h.id
            LEFT JOIN cancion_metadata m ON c.id = m.cancion_id AND m.idioma = 'es'
            " . $cifraJoin . "
            WHERE 1=1
        ";
        
        $params[] = $ftsSearch;
        
        if ($himnario_id !== null && $himnario_id !== '') {
            $sql .= " AND c.himnario_id = ?";
            $params[] = $himnario_id;
        }
        if ($seccion_id !== null && $seccion_id !== '') {
            $sql .= " AND c.seccion_id = ?";
            $params[] = $seccion_id;
        }
        if ($ritmo !== null && $ritmo !== '') {
            $sql .= " AND cf.ritmo = ?";
            $params[] = $ritmo;
        }
        if ($bpm !== null && $bpm !== '') {
            $sql .= " AND cf.bpm = ?";
            $params[] = $bpm;
        }
        if ($tonalidad !== null && $tonalidad !== '') {
            $sql .= " AND c.tonalidad = ?";
            $params[] = $tonalidad;
        }
        if ($tiempo !== null && $tiempo !== '') {
            $sql .= " AND cf.tiempo = ?";
            $params[] = $tiempo;
        }
        
        $sql .= " AND (m.titulo LIKE ? OR c.numero_en_himnario LIKE ? OR c.id IN (
            SELECT e.cancion_id FROM estrofa_fts f JOIN estrofa e ON f.rowid = e.id WHERE estrofa_fts MATCH ?
        ))";
        
        $params[] = $likeParam;
        $params[] = $likeParam;
        $params[] = $ftsSearch;
        
    } else {
        $sql = "
            SELECT c.id, c.numero_en_himnario, c.tonalidad, c.himnario_id, c.seccion_id, h.codigo as himnario_codigo,
                   m.titulo, m.autor, '' as snippet
            FROM cancion c
            JOIN himnario h ON c.himnario_id = h.id
            LEFT JOIN cancion_metadata m ON c.id = m.cancion_id AND m.idioma = 'es'
            " . $cifraJoin . "
            WHERE 1=1
        ";
        
        if ($himnario_id !== null && $himnario_id !== '') {
            $sql .= " AND c.himnario_id = ?";
            $params[] = $himnario_id;
        }
        if ($seccion_id !== null && $seccion_id !== '') {
            $sql .= " AND c.seccion_id = ?";
            $params[] = $seccion_id;
        }
        if ($ritmo !== null && $ritmo !== '') {
            $sql .= " AND cf.ritmo = ?";
            $params[] = $ritmo;
        }
        if ($bpm !== null && $bpm !== '') {
            $sql .= " AND cf.bpm = ?";
            $params[] = $bpm;
        }
        if ($tonalidad !== null && $tonalidad !== '') {
            $sql .= " AND c.tonalidad = ?";
            $params[] = $tonalidad;
        }
        if ($tiempo !== null && $tiempo !== '') {
            $sql .= " AND cf.tiempo = ?";
            $params[] = $tiempo;
        }
    }
    
    // Order by Titulo to support alphabetical sorting naturally if no search is active
    if ($search !== null && $search !== '') {
        $sql .= " ORDER BY c.himnario_id, CAST(c.numero_en_himnario AS INTEGER), c.id LIMIT 50";
    } else {
        if ($himnario_id !== null || $seccion_id !== null) {
            $sql .= " ORDER BY c.himnario_id, CAST(c.numero_en_himnario AS INTEGER), c.id ASC";
        } else {
            $sql .= " ORDER BY m.titulo ASC, c.id ASC";
        }
        
        if ($limit !== null && $limit !== '') {
            $sql .= " LIMIT ?";
            $params[] = (int)$limit;
        }
    }
    
    $stmt = $dbCatalog->prepare($sql);
    $stmt->execute($params);
    json_response($stmt->fetchAll());
}

// GET /public/songs/:id
if (preg_match('/^\/public\/songs\/(\d+)$/', $path, $matches) && $request_method === 'GET') {
    $songId = (int)$matches[1];
    
    $stmt = $dbCatalog->prepare("
        SELECT c.id, c.himnario_id, c.seccion_id, c.numero_en_himnario, c.tonalidad, h.codigo as himnario_codigo
        FROM cancion c
        JOIN himnario h ON c.himnario_id = h.id
        WHERE c.id = ?
    ");
    $stmt->execute([$songId]);
    $song = $stmt->fetch();
    if (!$song) {
        json_response(["error" => "Alabanza no encontrada"], 404);
    }
    
    $metaStmt = $dbCatalog->prepare("SELECT idioma, titulo, autor, compositor, adaptador, traductor FROM cancion_metadata WHERE cancion_id = ?");
    $metaStmt->execute([$songId]);
    $metadata = [];
    foreach ($metaStmt->fetchAll() as $r) {
        $metadata[$r['idioma']] = $r;
    }
    $song['metadata'] = $metadata;
    
    $stanzasStmt = $dbCatalog->prepare("SELECT id, orden, tipo, texto, repeticiones, idioma FROM estrofa WHERE cancion_id = ? ORDER BY orden");
    $stanzasStmt->execute([$songId]);
    $song['estrofas'] = $stanzasStmt->fetchAll();
    
    json_response($song);
}

// 404 Fallback
json_response(["error" => "Ruta no encontrada: " . $request_method . " " . $path], 404);

