// Catalog snapshot publisher (ADR-005). The same cases run against the canonical
// PHP implementation (api/catalog_publisher.php) and the Node mirror (catalog_publisher.js).
//
// Every run uses an isolated temp directory: no default paths are ever used.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { publishCatalog, recordTombstones, CatalogPublishError } from '../catalog_publisher.js';
import { createCatalogFixture, openCatalog } from './fixtures/catalog_fixture.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PHP_CLI = path.join(ROOT, 'tests', 'php', 'publish_cli.php');
const BASE_URL = 'https://lalira.test/catalogo';

const md5 = (file) => crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');

function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lalira-publish-'));
  const publishDir = path.join(dir, 'public');
  fs.mkdirSync(publishDir);
  const env = {
    dir,
    publishDir,
    workingDbPath: path.join(dir, 'catalogo_v2_working.sqlite'),
    cmsDbPath: path.join(dir, 'cms_internal.sqlite'),
    versionPath: path.join(publishDir, 'version_v2.json'),
    assetsDbPath: path.join(dir, 'assets_catalogo_v2.sqlite'),
  };
  createCatalogFixture(env.workingDbPath);
  new DatabaseSync(env.cmsDbPath).close();
  return env;
}

const implementations = {
  php(env, { now, retain, tombstones } = {}) {
    const cfg = { ...env, publicBaseUrl: BASE_URL, now, retain, tombstones };
    const out = spawnSync('php', [PHP_CLI, JSON.stringify(cfg)], { encoding: 'utf8' });
    if (out.status !== 0) throw new Error(`php falló: ${out.stderr || out.stdout}`);
    return JSON.parse(out.stdout);
  },
  node(env, { now, retain, tombstones } = {}) {
    const cmsDb = new DatabaseSync(env.cmsDbPath);
    try {
      if (tombstones) recordTombstones(cmsDb, tombstones);
      const result = publishCatalog({
        workingDbPath: env.workingDbPath,
        cmsDb,
        versionPath: env.versionPath,
        publishDir: env.publishDir,
        publicBaseUrl: BASE_URL,
        assetsDbPath: env.assetsDbPath,
        now: new Date(now),
        retain,
      });
      return { ok: true, result };
    } catch (err) {
      if (err instanceof CatalogPublishError) return { ok: false, error: err.message };
      throw err;
    } finally {
      cmsDb.close();
    }
  },
};

const readManifest = (env) => JSON.parse(fs.readFileSync(env.versionPath, 'utf8'));
const DAY1 = '2026-10-02T12:00:00';
const DAY2 = '2026-10-03T12:00:00';

const phpAvailable = spawnSync('php', ['-v']).status === 0;

for (const [name, publish] of Object.entries(implementations)) {
  test(`publicador ${name}`, { skip: name === 'php' && !phpAvailable && 'php no instalado' }, async (t) => {
    await t.test('genera un snapshot inmutable y un manifiesto que lo describe', () => {
      const env = setup();
      const workingMd5 = md5(env.workingDbPath);
      const out = publish(env, { now: DAY1 });
      assert.ok(out.ok, out.error);

      const manifest = readManifest(env);
      assert.strictEqual(manifest.catalogVersion, 2026100200);
      assert.strictEqual(manifest.version, '2026.10.02');
      assert.strictEqual(manifest.schemaVersion, 1);
      assert.strictEqual(manifest.url, `${BASE_URL}/catalogo_v2_2026100200.sqlite`);

      const snapshot = path.join(env.publishDir, 'catalogo_v2_2026100200.sqlite');
      assert.ok(fs.existsSync(snapshot));
      assert.strictEqual(manifest.size, fs.statSync(snapshot).size);
      assert.strictEqual(manifest.md5, md5(snapshot));

      const snap = openCatalog(snapshot);
      assert.strictEqual(snap.prepare('PRAGMA user_version').get().user_version, 1);
      assert.strictEqual(snap.prepare('SELECT COUNT(*) AS c FROM cancion').get().c, 3);
      assert.strictEqual(snap.prepare("SELECT COUNT(*) AS c FROM estrofa_fts WHERE estrofa_fts MATCH 'santo'").get().c, 1);
      snap.close();

      assert.strictEqual(md5(env.workingDbPath), workingMd5, 'la base de trabajo no debe modificarse');
      const working = openCatalog(env.workingDbPath);
      assert.strictEqual(working.prepare('PRAGMA user_version').get().user_version, 0);
      working.close();

      assert.strictEqual(md5(env.assetsDbPath), manifest.md5, 'el asset empaquetado es el snapshot publicado');
      assert.deepStrictEqual(fs.readdirSync(env.publishDir).filter(f => f.endsWith('.tmp')), []);
      assert.strictEqual(out.result.working_fts_in_sync, true);
    });

    await t.test('conserva los campos del manifiesto anterior y los que leen los binarios publicados', () => {
      const env = setup();
      fs.writeFileSync(env.versionPath, JSON.stringify({
        version: '2026.09.28', url: 'https://lalira.app/catalogo/catalogo_v2.sqlite', size: 1, extra: 'x',
      }));
      assert.ok(publish(env, { now: DAY1 }).ok);
      const manifest = readManifest(env);
      assert.strictEqual(manifest.extra, 'x');
      for (const key of ['version', 'url', 'size', 'catalogVersion', 'schemaVersion', 'md5']) {
        assert.ok(key in manifest, `falta ${key}`);
      }
    });

    await t.test('catalogVersion es monotónico con varias publicaciones en el mismo día', () => {
      const env = setup();
      const versions = [];
      for (let i = 0; i < 12; i++) {
        const out = publish(env, { now: DAY1, retain: 20 });
        assert.ok(out.ok, out.error);
        versions.push(readManifest(env).catalogVersion);
      }
      assert.deepStrictEqual(versions, Array.from({ length: 12 }, (_, i) => 2026100200 + i));
      assert.strictEqual(readManifest(env).version, '2026.10.02.11');

      assert.ok(publish(env, { now: DAY2 }).ok);
      assert.strictEqual(readManifest(env).catalogVersion, 2026100300);
    });

    await t.test('una publicación del mismo día sin catalogVersion previo no repite la etiqueta', () => {
      const env = setup();
      fs.writeFileSync(env.versionPath, JSON.stringify({ version: '2026.10.02', url: `${BASE_URL}/x.sqlite`, size: 1 }));
      assert.ok(publish(env, { now: DAY1 }).ok);
      const manifest = readManifest(env);
      assert.strictEqual(manifest.catalogVersion, 2026100201);
      assert.strictEqual(manifest.version, '2026.10.02.1');
    });

    await t.test('rechaza más de 99 publicaciones en un día', () => {
      const env = setup();
      fs.writeFileSync(env.versionPath, JSON.stringify({ version: '2026.10.02.99', catalogVersion: 2026100299 }));
      const out = publish(env, { now: DAY1 });
      assert.strictEqual(out.ok, false);
      assert.match(out.error, /99 publicaciones/);
    });

    await t.test('conserva solo los últimos snapshots', () => {
      const env = setup();
      for (let i = 0; i < 5; i++) assert.ok(publish(env, { now: DAY1 }).ok);
      const snapshots = fs.readdirSync(env.publishDir).filter(f => /^catalogo_v2_\d{10}\.sqlite$/.test(f)).sort();
      assert.deepStrictEqual(snapshots, [
        'catalogo_v2_2026100202.sqlite', 'catalogo_v2_2026100203.sqlite', 'catalogo_v2_2026100204.sqlite',
      ]);
    });

    await t.test('reconstruye el índice FTS en el snapshot sin modificar la base de trabajo', () => {
      const env = setup();
      const db = openCatalog(env.workingDbPath);
      db.exec('DROP TRIGGER estrofa_ai');
      db.exec("INSERT INTO estrofa (cancion_id, idioma, orden, tipo, texto, repeticiones) VALUES (3, 'es', 2, 'estrofa', 'aleluya fuera del indice', 1)");
      db.close();
      const workingMd5 = md5(env.workingDbPath);

      const out = publish(env, { now: DAY1 });
      assert.ok(out.ok, out.error);
      assert.strictEqual(out.result.working_fts_in_sync, false, 'reporta el índice desincronizado de la base de trabajo');
      assert.strictEqual(md5(env.workingDbPath), workingMd5);

      const snap = openCatalog(path.join(env.publishDir, out.result.snapshot));
      assert.strictEqual(snap.prepare("SELECT COUNT(*) AS c FROM estrofa_fts WHERE estrofa_fts MATCH 'aleluya'").get().c, 1);
      snap.exec("INSERT INTO estrofa_fts(estrofa_fts, rank) VALUES('integrity-check', 1)");
      snap.close();
    });

    await t.test('aborta si la base de trabajo está dañada y no toca lo publicado', () => {
      const env = setup();
      assert.ok(publish(env, { now: DAY1 }).ok);
      const before = fs.readFileSync(env.versionPath, 'utf8');

      const db = openCatalog(env.workingDbPath);
      db.exec('DELETE FROM estrofa; DELETE FROM cancion_metadata; DELETE FROM cancion;');
      db.close();

      const out = publish(env, { now: DAY1 });
      assert.strictEqual(out.ok, false);
      assert.match(out.error, /vacía/);
      assert.strictEqual(fs.readFileSync(env.versionPath, 'utf8'), before);
      assert.ok(!fs.existsSync(path.join(env.publishDir, 'catalogo_v2_2026100201.sqlite')));
      assert.deepStrictEqual(fs.readdirSync(env.publishDir).filter(f => f.endsWith('.tmp')), []);
    });

    await t.test('aborta si un ID eliminado entre publicaciones es reutilizado por otra canción', () => {
      const env = setup();
      assert.ok(publish(env, { now: DAY1 }).ok);

      const db = openCatalog(env.workingDbPath);
      db.exec('DELETE FROM estrofa WHERE cancion_id = 100002; DELETE FROM cancion_metadata WHERE cancion_id = 100002; DELETE FROM cancion WHERE id = 100002;');
      assert.ok(publish(env, { now: DAY1 }).ok, 'el borrado se publica y queda registrado');

      // SQLite's implicit rowid (MAX(id) + 1) hands the freed highest ID to the next song.
      db.exec("INSERT INTO cancion (himnario_id, seccion_id, numero_en_himnario) VALUES (3, 1, '99')");
      assert.strictEqual(db.prepare("SELECT id FROM cancion WHERE numero_en_himnario = '99'").get().id, 100002);
      db.close();

      const out = publish(env, { now: DAY1 });
      assert.strictEqual(out.ok, false);
      assert.match(out.error, /reutilizados.*100002/);
    });

    await t.test('aborta ante reutilización registrada por el CMS aunque ocurra entre dos publicaciones', () => {
      const env = setup();
      const db = openCatalog(env.workingDbPath);
      db.exec("UPDATE cancion SET numero_en_himnario = '99' WHERE id = 3");
      db.close();
      const out = publish(env, { now: DAY1, tombstones: [{ id: 3, himnario_id: 3, numero_en_himnario: '7' }] });
      assert.strictEqual(out.ok, false);
      assert.match(out.error, /reutilizados/);
    });

    await t.test('permite recrear el mismo himno con su ID estructurado', () => {
      const env = setup();
      const out = publish(env, { now: DAY1, tombstones: [{ id: 100001, himnario_id: 1, numero_en_himnario: '1' }] });
      assert.ok(out.ok, out.error);
    });
  });
}

test('paridad PHP / Node: mismo manifiesto para la misma secuencia', { skip: !phpAvailable && 'php no instalado' }, () => {
  const envs = { php: setup(), node: setup() };
  const manifests = {};
  for (const [name, env] of Object.entries(envs)) {
    implementations[name](env, { now: DAY1 });
    implementations[name](env, { now: DAY1 });
    const { md5: _md5, size: _size, publishedAt, ...rest } = readManifest(env);
    manifests[name] = { ...rest, publishedAtDate: publishedAt.slice(0, 10) };
  }
  assert.deepStrictEqual(manifests.php, manifests.node);
});
