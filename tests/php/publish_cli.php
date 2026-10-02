<?php
// Test harness: runs catalog_publish() with an explicit config (no defaults, no index.php).
// Usage: php publish_cli.php '<json config>'
require_once __DIR__ . '/../../api/catalog_publisher.php';

$cfg = json_decode($argv[1] ?? '', true);
$cms = new PDO('sqlite:' . $cfg['cmsDbPath']);
$cms->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$cms->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

if (!empty($cfg['tombstones'])) {
    catalog_record_tombstones($cms, $cfg['tombstones']);
}

try {
    $result = catalog_publish([
        'working_db_path' => $cfg['workingDbPath'],
        'cms_db' => $cms,
        'version_path' => $cfg['versionPath'],
        'publish_dir' => $cfg['publishDir'],
        'public_base_url' => $cfg['publicBaseUrl'],
        'assets_db_path' => $cfg['assetsDbPath'] ?? null,
        'now' => new DateTimeImmutable($cfg['now']),
        'retain' => $cfg['retain'] ?? CATALOG_SNAPSHOT_RETAIN,
    ]);
    echo json_encode(['ok' => true, 'result' => $result]);
} catch (CatalogPublishException $e) {
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
