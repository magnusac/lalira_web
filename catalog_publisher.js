// Catalog snapshot publisher (ADR-005) — Node.js mirror of api/catalog_publisher.php
// for local development (ADR-002: the PHP implementation is canonical).
//
//   working DB ──VACUUM INTO──> catalogo_v2_<catalogVersion>.sqlite.tmp
//              ──user_version, quick_check, md5──> rename to final name
//              ──> version_v2.json written last (tmp + rename)

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Bump only together with a mobile app release that supports the new schema.
// Breaking schema changes must be published under version_v3.json (ADR-005).
export const CATALOG_SCHEMA_VERSION = 1;
export const CATALOG_SNAPSHOT_PREFIX = 'catalogo_v2_';
export const CATALOG_SNAPSHOT_RETAIN = 3;

export class CatalogPublishError extends Error {}

const REQUIRED_TABLES = ['himnario', 'cancion', 'cancion_metadata', 'estrofa', 'estrofa_fts', 'cifra', 'nota', 'seccion'];

export function ensureTombstones(dbCms) {
  dbCms.exec(`
    CREATE TABLE IF NOT EXISTS cancion_tombstone (
      cancion_id INTEGER PRIMARY KEY,
      himnario_id INTEGER,
      numero_en_himnario TEXT,
      eliminado_en DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function recordTombstones(dbCms, songs) {
  ensureTombstones(dbCms);
  const stmt = dbCms.prepare(`
    INSERT OR IGNORE INTO cancion_tombstone (cancion_id, himnario_id, numero_en_himnario) VALUES (?, ?, ?)
  `);
  for (const song of songs) {
    stmt.run(Number(song.id), song.himnario_id ?? null, song.numero_en_himnario ?? null);
  }
}

/** Next ID for a song without a custom ID; never reuses the ID of a deleted song. */
export function nextSongId(dbCatalog, dbCms) {
  ensureTombstones(dbCms);
  const maxCatalog = Number(dbCatalog.prepare('SELECT COALESCE(MAX(id), 0) AS m FROM cancion').get().m);
  const maxTombstone = Number(dbCms.prepare('SELECT COALESCE(MAX(cancion_id), 0) AS m FROM cancion_tombstone').get().m);
  return Math.max(maxCatalog, maxTombstone) + 1;
}

/** "2026.10.02" → 2026100200, "2026.10.02.3" → 2026100203, legacy/unknown → 0. */
export function catalogVersionFromLabel(label) {
  const m = typeof label === 'string' && label.match(/^(\d{4})\.(\d{2})\.(\d{2})(?:\.(\d+))?$/);
  if (!m) return 0;
  const rev = m[4] ? parseInt(m[4], 10) : 0;
  if (rev > 99) return 0;
  return parseInt(`${m[1]}${m[2]}${m[3]}`, 10) * 100 + rev;
}

/** 2026100200 → "2026.10.02", 2026100203 → "2026.10.02.3" (ADR-004 label format). */
export function labelFromCatalogVersion(catalogVersion) {
  const date = String(Math.floor(catalogVersion / 100));
  const rev = catalogVersion % 100;
  const label = `${date.slice(0, 4)}.${date.slice(4, 6)}.${date.slice(6, 8)}`;
  return rev === 0 ? label : `${label}.${rev}`;
}

function yyyymmdd(now) {
  return parseInt(
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`,
    10
  );
}

/** Next monotonic catalogVersion: YYYYMMDD * 100 + revision of the day. */
export function nextCatalogVersion(previous, now) {
  const previousVersion = previous.catalogVersion != null
    ? Number(previous.catalogVersion)
    : catalogVersionFromLabel(previous.version);
  const todayBase = yyyymmdd(now) * 100;
  const next = Math.max(todayBase, previousVersion + 1);
  if (next % 100 === 0 && next !== todayBase) {
    throw new CatalogPublishError('Se alcanzó el máximo de 99 publicaciones en un día.');
  }
  return next;
}

/** FTS5 check against the external content table (rank = 1 compares index and content). */
function ftsInSync(db) {
  try {
    db.exec("INSERT INTO estrofa_fts(estrofa_fts, rank) VALUES('integrity-check', 1)");
    return true;
  } catch {
    return false;
  }
}

function validate(db, label, checkFts = true) {
  const integrity = db.prepare('PRAGMA integrity_check').get().integrity_check;
  if (integrity !== 'ok') throw new CatalogPublishError(`${label}: integrity_check falló (${integrity}).`);
  for (const table of REQUIRED_TABLES) {
    const exists = db.prepare('SELECT COUNT(*) AS c FROM sqlite_master WHERE name = ?').get(table).c;
    if (!exists) throw new CatalogPublishError(`${label}: falta la tabla '${table}'.`);
  }
  if (Number(db.prepare('SELECT COUNT(*) AS c FROM cancion').get().c) === 0) {
    throw new CatalogPublishError(`${label}: la tabla 'cancion' está vacía.`);
  }
  if (checkFts && !ftsInSync(db)) {
    throw new CatalogPublishError(`${label}: el índice FTS de estrofas está corrupto o desincronizado.`);
  }
}

function songIdentities(db) {
  const songs = new Map();
  for (const row of db.prepare('SELECT id, himnario_id, numero_en_himnario FROM cancion').all()) {
    songs.set(Number(row.id), row);
  }
  return songs;
}

/** Fails if a deleted song ID is now used by a different song (same hymnal number is allowed). */
function guardIdReuse(dbCatalog, dbCms, previousSnapshotPath) {
  const current = songIdentities(dbCatalog);

  if (previousSnapshotPath && fs.existsSync(previousSnapshotPath)) {
    const previousDb = new DatabaseSync(previousSnapshotPath, { readOnly: true });
    const deleted = [...songIdentities(previousDb).values()].filter(s => !current.has(Number(s.id)));
    previousDb.close();
    if (deleted.length) recordTombstones(dbCms, deleted);
  }

  ensureTombstones(dbCms);
  const reused = [];
  for (const tomb of dbCms.prepare('SELECT cancion_id, himnario_id, numero_en_himnario FROM cancion_tombstone').all()) {
    const song = current.get(Number(tomb.cancion_id));
    if (!song) continue;
    const sameHymn = String(song.himnario_id) === String(tomb.himnario_id)
      && String(song.numero_en_himnario) === String(tomb.numero_en_himnario);
    if (!sameHymn) reused.push(Number(tomb.cancion_id));
  }
  if (reused.length) {
    throw new CatalogPublishError(
      `IDs de canciones eliminadas reutilizados por otras canciones: ${reused.join(', ')}. ` +
      'Las listas de los usuarios mostrarían una canción distinta.'
    );
  }
}

function writeAtomic(filePath, contents) {
  const tmp = `${filePath}.tmp`;
  try {
    fs.writeFileSync(tmp, contents, 'utf8');
    fs.renameSync(tmp, filePath);
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    throw new CatalogPublishError(`No se pudo escribir ${path.basename(filePath)}.`);
  }
}

function pruneSnapshots(publishDir, retain) {
  const pattern = new RegExp(`^${CATALOG_SNAPSHOT_PREFIX}(\\d{10})\\.sqlite$`);
  const snapshots = fs.readdirSync(publishDir)
    .map(name => ({ name, m: name.match(pattern) }))
    .filter(s => s.m)
    .sort((a, b) => Number(b.m[1]) - Number(a.m[1]));
  const removed = [];
  for (const s of snapshots.slice(retain)) {
    fs.rmSync(path.join(publishDir, s.name), { force: true });
    removed.push(s.name);
  }
  for (const name of fs.readdirSync(publishDir)) {
    if (name.startsWith(CATALOG_SNAPSHOT_PREFIX) && name.endsWith('.sqlite.tmp')) {
      fs.rmSync(path.join(publishDir, name), { force: true });
    }
  }
  return removed;
}

/**
 * Publishes the working catalog as an immutable snapshot.
 * config: { workingDbPath, cmsDb, versionPath, publishDir, publicBaseUrl, assetsDbPath?, now?, retain? }
 */
export function publishCatalog(config) {
  for (const key of ['workingDbPath', 'cmsDb', 'versionPath', 'publishDir', 'publicBaseUrl']) {
    if (!config[key]) throw new CatalogPublishError(`Configuración de publicación incompleta: falta '${key}'.`);
  }
  const { workingDbPath, cmsDb, versionPath } = config;
  const publishDir = config.publishDir.replace(/\/+$/, '');
  const now = config.now ?? new Date();
  const retain = config.retain ?? CATALOG_SNAPSHOT_RETAIN;

  if (!fs.existsSync(workingDbPath)) throw new CatalogPublishError('No existe la base de trabajo.');

  // One publish at a time. A lock left behind by a crashed process expires after 10 minutes.
  const lockPath = path.join(publishDir, '.publish.node.lock');
  try {
    if (Date.now() - fs.statSync(lockPath).mtimeMs > 10 * 60 * 1000) fs.rmSync(lockPath, { force: true });
  } catch { /* no lock */ }
  let lockFd;
  try {
    lockFd = fs.openSync(lockPath, 'wx');
  } catch {
    throw new CatalogPublishError('Ya hay una publicación en curso.');
  }

  let tmp = null;
  try {
    const previous = fs.existsSync(versionPath) ? JSON.parse(fs.readFileSync(versionPath, 'utf8')) : {};
    const catalogVersion = nextCatalogVersion(previous, now);
    const label = labelFromCatalogVersion(catalogVersion);

    let previousSnapshot = null;
    if (previous.url) {
      const candidate = path.join(publishDir, path.basename(new URL(previous.url).pathname));
      if (fs.existsSync(candidate) && fs.realpathSync(candidate) !== fs.realpathSync(workingDbPath)) {
        previousSnapshot = candidate;
      }
    }

    const fileName = `${CATALOG_SNAPSHOT_PREFIX}${catalogVersion}.sqlite`;
    const finalPath = path.join(publishDir, fileName);

    let workingFtsInSync;
    const dbCatalog = new DatabaseSync(workingDbPath);
    try {
      // The FTS index is derived data: it is rebuilt in the snapshot, so a stale index
      // in the working DB only affects CMS search and is reported, not fatal.
      validate(dbCatalog, 'Base de trabajo', false);
      workingFtsInSync = ftsInSync(dbCatalog);
      guardIdReuse(dbCatalog, cmsDb, previousSnapshot);

      tmp = `${finalPath}.tmp`;
      fs.rmSync(tmp, { force: true });
      dbCatalog.prepare('VACUUM INTO ?').run(tmp);
    } finally {
      dbCatalog.close();
    }

    const snapshot = new DatabaseSync(tmp);
    try {
      snapshot.exec("INSERT INTO estrofa_fts(estrofa_fts) VALUES('rebuild')");
      snapshot.exec('VACUUM');
      snapshot.exec(`PRAGMA user_version = ${CATALOG_SCHEMA_VERSION}`);
      validate(snapshot, 'Snapshot');
    } finally {
      snapshot.close();
    }

    const size = fs.statSync(tmp).size;
    const md5 = crypto.createHash('md5').update(fs.readFileSync(tmp)).digest('hex');
    fs.renameSync(tmp, finalPath);
    tmp = null;

    // Fields are only ever added; version, url and size are read by released app binaries.
    const manifest = {
      ...previous,
      version: label,
      catalogVersion,
      schemaVersion: CATALOG_SCHEMA_VERSION,
      url: `${config.publicBaseUrl.replace(/\/+$/, '')}/${fileName}`,
      size,
      md5,
      publishedAt: now.toISOString(),
    };
    writeAtomic(versionPath, JSON.stringify(manifest, null, 4) + '\n');

    if (config.assetsDbPath) {
      try { fs.copyFileSync(finalPath, config.assetsDbPath); } catch { /* best effort, as in PHP */ }
    }

    const pruned = pruneSnapshots(publishDir, retain);

    return {
      old_version: previous.version ?? null,
      new_version: label,
      catalog_version: catalogVersion,
      schema_version: CATALOG_SCHEMA_VERSION,
      snapshot: fileName,
      snapshot_path: finalPath,
      url: manifest.url,
      db_size: size,
      md5,
      copy_method: 'vacuum_into',
      working_fts_in_sync: workingFtsInSync,
      pruned,
    };
  } finally {
    if (tmp) fs.rmSync(tmp, { force: true });
    fs.closeSync(lockFd);
    fs.rmSync(lockPath, { force: true });
  }
}
