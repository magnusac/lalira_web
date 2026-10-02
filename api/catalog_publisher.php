<?php
// Catalog snapshot publisher (ADR-005).
//
// Publishes the CMS working catalog as an immutable, validated snapshot:
//   working DB ──VACUUM INTO──> catalogo_v2_<catalogVersion>.sqlite.tmp
//              ──user_version, quick_check, md5──> rename to final name
//              ──> version_v2.json written last (tmp + rename)
//
// The working DB is never modified by publishing and the public JSON never
// points to a file that is incomplete or still being written.

// Bump only together with a mobile app release that supports the new schema.
// Breaking schema changes must be published under version_v3.json (ADR-005).
const CATALOG_SCHEMA_VERSION = 1;
const CATALOG_SNAPSHOT_PREFIX = 'catalogo_v2_';
const CATALOG_SNAPSHOT_RETAIN = 3;

class CatalogPublishException extends Exception {}

/** Creates the tombstone table that records every catalog song ID ever removed. */
function catalog_ensure_tombstones(PDO $dbCms) {
    $dbCms->exec("
        CREATE TABLE IF NOT EXISTS cancion_tombstone (
            cancion_id INTEGER PRIMARY KEY,
            himnario_id INTEGER,
            numero_en_himnario TEXT,
            eliminado_en DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    ");
}

/** Records song IDs that must never be reused for a different song. */
function catalog_record_tombstones(PDO $dbCms, array $songs) {
    catalog_ensure_tombstones($dbCms);
    $stmt = $dbCms->prepare("
        INSERT OR IGNORE INTO cancion_tombstone (cancion_id, himnario_id, numero_en_himnario)
        VALUES (?, ?, ?)
    ");
    foreach ($songs as $song) {
        $stmt->execute([(int)$song['id'], $song['himnario_id'] ?? null, $song['numero_en_himnario'] ?? null]);
    }
}

/**
 * Next ID for a song without a custom (himnario-based) ID. Unlike SQLite's
 * implicit rowid, it never hands out the ID of a deleted song.
 */
function catalog_next_song_id(PDO $dbCatalog, PDO $dbCms) {
    catalog_ensure_tombstones($dbCms);
    $maxCatalog = (int)$dbCatalog->query("SELECT COALESCE(MAX(id), 0) FROM cancion")->fetchColumn();
    $maxTombstone = (int)$dbCms->query("SELECT COALESCE(MAX(cancion_id), 0) FROM cancion_tombstone")->fetchColumn();
    return max($maxCatalog, $maxTombstone) + 1;
}

/** "2026.10.02" → 2026100200, "2026.10.02.3" → 2026100203, legacy/unknown → 0. */
function catalog_version_from_label($label) {
    if (!is_string($label) || !preg_match('/^(\d{4})\.(\d{2})\.(\d{2})(?:\.(\d+))?$/', $label, $m)) {
        return 0;
    }
    $rev = isset($m[4]) ? (int)$m[4] : 0;
    if ($rev > 99) return 0;
    return ((int)($m[1] . $m[2] . $m[3])) * 100 + $rev;
}

/** 2026100200 → "2026.10.02", 2026100203 → "2026.10.02.3" (ADR-004 label format). */
function catalog_label_from_version($catalogVersion) {
    $date = intdiv($catalogVersion, 100);
    $rev = $catalogVersion % 100;
    $label = substr($date, 0, 4) . '.' . substr($date, 4, 2) . '.' . substr($date, 6, 2);
    return $rev === 0 ? $label : $label . '.' . $rev;
}

/** Next monotonic catalogVersion: YYYYMMDD * 100 + revision of the day. */
function catalog_next_version(array $previous, DateTimeInterface $now) {
    $previousVersion = isset($previous['catalogVersion'])
        ? (int)$previous['catalogVersion']
        : catalog_version_from_label($previous['version'] ?? null);
    $todayBase = ((int)$now->format('Ymd')) * 100;
    $next = max($todayBase, $previousVersion + 1);
    if ($next % 100 === 0 && $next !== $todayBase) {
        // previous + 1 overflowed into the next day's base: more than 99 publishes in a day.
        throw new CatalogPublishException("Se alcanzó el máximo de 99 publicaciones en un día.");
    }
    return $next;
}

function catalog_open($path) {
    $db = new PDO('sqlite:' . $path);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    return $db;
}

/** FTS5 check against the external content table (rank = 1 compares index and content). */
function catalog_fts_in_sync(PDO $db) {
    try {
        $db->exec("INSERT INTO estrofa_fts(estrofa_fts, rank) VALUES('integrity-check', 1)");
        return true;
    } catch (PDOException $e) {
        return false;
    }
}

/** Structural and content checks shared by the working DB and the snapshot. */
function catalog_validate(PDO $db, $label, $checkFts = true) {
    $integrity = $db->query("PRAGMA integrity_check")->fetchColumn();
    if ($integrity !== 'ok') {
        throw new CatalogPublishException("$label: integrity_check falló ($integrity).");
    }
    foreach (['himnario', 'cancion', 'cancion_metadata', 'estrofa', 'estrofa_fts', 'cifra', 'nota', 'seccion'] as $table) {
        $exists = $db->query("SELECT COUNT(*) FROM sqlite_master WHERE name = " . $db->quote($table))->fetchColumn();
        if (!$exists) {
            throw new CatalogPublishException("$label: falta la tabla '$table'.");
        }
    }
    if ((int)$db->query("SELECT COUNT(*) FROM cancion")->fetchColumn() === 0) {
        throw new CatalogPublishException("$label: la tabla 'cancion' está vacía.");
    }
    if ($checkFts && !catalog_fts_in_sync($db)) {
        throw new CatalogPublishException("$label: el índice FTS de estrofas está corrupto o desincronizado.");
    }
}

/** @return array<int, array{id:int, himnario_id:mixed, numero_en_himnario:mixed}> keyed by id */
function catalog_song_identities(PDO $db) {
    $songs = [];
    foreach ($db->query("SELECT id, himnario_id, numero_en_himnario FROM cancion") as $row) {
        $songs[(int)$row['id']] = $row;
    }
    return $songs;
}

/**
 * Fails if a song ID that was deleted is now used by a different song.
 * Recreating the same hymnal number under its custom ID is allowed: it is the same hymn.
 */
function catalog_guard_id_reuse(PDO $dbCatalog, PDO $dbCms, $previousSnapshotPath) {
    $current = catalog_song_identities($dbCatalog);

    // Songs present in the last published snapshot but missing now were deleted.
    if ($previousSnapshotPath && is_file($previousSnapshotPath)) {
        $previousDb = catalog_open($previousSnapshotPath);
        $deleted = array_diff_key(catalog_song_identities($previousDb), $current);
        $previousDb = null;
        if ($deleted) catalog_record_tombstones($dbCms, $deleted);
    }

    catalog_ensure_tombstones($dbCms);
    $reused = [];
    foreach ($dbCms->query("SELECT cancion_id, himnario_id, numero_en_himnario FROM cancion_tombstone") as $tomb) {
        $id = (int)$tomb['cancion_id'];
        if (!isset($current[$id])) continue;
        $song = $current[$id];
        $sameHymn = (string)$song['himnario_id'] === (string)$tomb['himnario_id']
            && (string)$song['numero_en_himnario'] === (string)$tomb['numero_en_himnario'];
        if (!$sameHymn) $reused[] = $id;
    }
    if ($reused) {
        throw new CatalogPublishException(
            "IDs de canciones eliminadas reutilizados por otras canciones: " . implode(', ', $reused) .
            ". Las listas de los usuarios mostrarían una canción distinta."
        );
    }
}

/** Copies the working DB into $target without modifying the working DB. */
function catalog_snapshot_copy(PDO $dbCatalog, $workingPath, $target) {
    try {
        $dbCatalog->exec("VACUUM INTO " . $dbCatalog->quote($target));
        return 'vacuum_into';
    } catch (PDOException $e) {
        // SQLite < 3.27: block writers while copying, then compact the copy.
        @unlink($target);
        if ($dbCatalog->query("PRAGMA journal_mode")->fetchColumn() === 'wal') {
            $dbCatalog->exec("PRAGMA wal_checkpoint(TRUNCATE)");
        }
        $dbCatalog->exec("BEGIN IMMEDIATE");
        try {
            if (!copy($workingPath, $target)) {
                throw new CatalogPublishException("No se pudo copiar la base de trabajo.");
            }
        } finally {
            $dbCatalog->exec("ROLLBACK");
        }
        $copy = catalog_open($target);
        $copy->exec("VACUUM");
        $copy = null;
        return 'copy_vacuum';
    }
}

/** Writes a file atomically (tmp + rename in the same directory). */
function catalog_write_atomic($path, $contents) {
    $tmp = $path . '.tmp';
    if (file_put_contents($tmp, $contents) === false || !rename($tmp, $path)) {
        @unlink($tmp);
        throw new CatalogPublishException("No se pudo escribir " . basename($path) . ".");
    }
}

/** Keeps the newest $retain snapshots (clients may still be downloading them) and removes stale temp files. */
function catalog_prune_snapshots($publishDir, $retain) {
    $snapshots = [];
    foreach (glob($publishDir . '/' . CATALOG_SNAPSHOT_PREFIX . '*.sqlite') as $file) {
        if (preg_match('/' . CATALOG_SNAPSHOT_PREFIX . '(\d{10})\.sqlite$/', $file, $m)) {
            $snapshots[(int)$m[1]] = $file;
        }
    }
    krsort($snapshots);
    $removed = [];
    foreach (array_slice($snapshots, $retain, null, true) as $file) {
        if (@unlink($file)) $removed[] = basename($file);
    }
    foreach (glob($publishDir . '/' . CATALOG_SNAPSHOT_PREFIX . '*.sqlite.tmp') as $tmp) {
        @unlink($tmp);
    }
    return $removed;
}

/**
 * Publishes the working catalog as an immutable snapshot.
 *
 * $config keys (all required except assets_db_path, now, retain):
 *   working_db_path, cms_db (PDO), version_path, publish_dir, public_base_url,
 *   assets_db_path (copy of the snapshot bundled into clients), now (DateTimeInterface), retain (int)
 */
function catalog_publish(array $config) {
    foreach (['working_db_path', 'cms_db', 'version_path', 'publish_dir', 'public_base_url'] as $key) {
        if (empty($config[$key])) throw new CatalogPublishException("Configuración de publicación incompleta: falta '$key'.");
    }
    $workingPath = $config['working_db_path'];
    $publishDir = rtrim($config['publish_dir'], '/');
    $versionPath = $config['version_path'];
    $dbCms = $config['cms_db'];
    $now = $config['now'] ?? new DateTimeImmutable('now');
    $retain = $config['retain'] ?? CATALOG_SNAPSHOT_RETAIN;

    if (!is_file($workingPath)) throw new CatalogPublishException("No existe la base de trabajo.");
    if (!is_dir($publishDir) || !is_writable($publishDir)) throw new CatalogPublishException("El directorio de publicación no es escribible.");

    // One publish at a time.
    $lock = fopen($publishDir . '/.publish.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) {
        throw new CatalogPublishException("Ya hay una publicación en curso.");
    }

    $tmp = null;
    try {
        $previous = is_file($versionPath) ? (json_decode(file_get_contents($versionPath), true) ?? []) : [];
        $catalogVersion = catalog_next_version($previous, $now);
        $label = catalog_label_from_version($catalogVersion);

        $previousSnapshot = null;
        if (!empty($previous['url'])) {
            $candidate = $publishDir . '/' . basename(parse_url($previous['url'], PHP_URL_PATH));
            if (is_file($candidate) && realpath($candidate) !== realpath($workingPath)) $previousSnapshot = $candidate;
        }

        $dbCatalog = catalog_open($workingPath);
        // The FTS index is derived data: it is rebuilt in the snapshot, so a stale index
        // in the working DB only affects CMS search and is reported, not fatal.
        catalog_validate($dbCatalog, 'Base de trabajo', false);
        $workingFtsInSync = catalog_fts_in_sync($dbCatalog);
        catalog_guard_id_reuse($dbCatalog, $dbCms, $previousSnapshot);

        $fileName = CATALOG_SNAPSHOT_PREFIX . $catalogVersion . '.sqlite';
        $finalPath = $publishDir . '/' . $fileName;
        $tmp = $finalPath . '.tmp';
        @unlink($tmp);
        $method = catalog_snapshot_copy($dbCatalog, $workingPath, $tmp);
        $dbCatalog = null;

        $snapshot = catalog_open($tmp);
        $snapshot->exec("INSERT INTO estrofa_fts(estrofa_fts) VALUES('rebuild')");
        $snapshot->exec("VACUUM");
        $snapshot->exec("PRAGMA user_version = " . CATALOG_SCHEMA_VERSION);
        catalog_validate($snapshot, 'Snapshot');
        $snapshot = null;

        $size = filesize($tmp);
        $md5 = md5_file($tmp);
        if (!rename($tmp, $finalPath)) throw new CatalogPublishException("No se pudo finalizar el snapshot.");
        $tmp = null;

        // Fields are only ever added; version, url and size are read by released app binaries.
        $manifest = array_merge($previous, [
            'version' => $label,
            'catalogVersion' => $catalogVersion,
            'schemaVersion' => CATALOG_SCHEMA_VERSION,
            'url' => rtrim($config['public_base_url'], '/') . '/' . $fileName,
            'size' => $size,
            'md5' => $md5,
            'publishedAt' => $now->format(DateTimeInterface::ATOM),
        ]);
        catalog_write_atomic($versionPath, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");

        if (!empty($config['assets_db_path'])) {
            @copy($finalPath, $config['assets_db_path']);
        }

        $pruned = catalog_prune_snapshots($publishDir, $retain);

        return [
            'old_version' => $previous['version'] ?? null,
            'new_version' => $label,
            'catalog_version' => $catalogVersion,
            'schema_version' => CATALOG_SCHEMA_VERSION,
            'snapshot' => $fileName,
            'snapshot_path' => $finalPath,
            'url' => $manifest['url'],
            'db_size' => $size,
            'md5' => $md5,
            'copy_method' => $method,
            'working_fts_in_sync' => $workingFtsInSync,
            'pruned' => $pruned,
        ];
    } finally {
        if ($tmp) @unlink($tmp);
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}
