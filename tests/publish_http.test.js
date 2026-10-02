// End-to-end: POST /publish and DELETE /songs/:id through the real api/index.php (php -S).
//
// SAFETY: api/index.php falls back to real files of the himnario repo when its path
// variables are missing. This harness refuses to start unless every path points into
// an isolated temp directory, and points ENV_FILE to a test-only .env.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { createCatalogFixture } from './fixtures/catalog_fixture.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const JWT_SECRET = 'test-only-secret';
const REQUIRED_PATH_VARS = ['DB_PATH', 'CMS_DB_PATH', 'VERSION_PATH', 'ASSETS_DB_PATH', 'CATALOG_PUBLISH_DIR', 'ENV_FILE'];

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function adminToken() {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ id: 1, email: 'admin@lalira.test', rol: 'admin', exp: Math.floor(Date.now() / 1000) + 600 }));
  const sig = b64url(crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${sig}`;
}

function freePort() {
  return new Promise((resolve) => {
    const srv = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function startPhpApi() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lalira-http-'));
  const publishDir = path.join(dir, 'public');
  fs.mkdirSync(publishDir);
  const envFile = path.join(dir, 'test.env');
  fs.writeFileSync(envFile, `JWT_SECRET=${JWT_SECRET}\n`);

  const vars = {
    DB_PATH: path.join(dir, 'catalogo_v2_working.sqlite'),
    CMS_DB_PATH: path.join(dir, 'cms_internal.sqlite'),
    VERSION_PATH: path.join(publishDir, 'version_v2.json'),
    ASSETS_DB_PATH: path.join(dir, 'assets_catalogo_v2.sqlite'),
    CATALOG_PUBLISH_DIR: publishDir,
    CATALOG_PUBLIC_BASE_URL: 'https://lalira.test/catalogo',
    CATALOG_PUBLISH_UPLOAD: '0',
    ENV_FILE: envFile,
  };
  for (const key of REQUIRED_PATH_VARS) {
    if (!vars[key] || !vars[key].startsWith(dir)) throw new Error(`Arnés inseguro: ${key} no apunta al directorio temporal`);
  }

  createCatalogFixture(vars.DB_PATH);
  const port = await freePort();
  const proc = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', ROOT, path.join(ROOT, 'api', 'index.php')], {
    env: { ...process.env, ...vars },
    stdio: 'ignore',
  });

  const base = `http://127.0.0.1:${port}/api`;
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`${base}/auth/config`);
      break;
    } catch {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  return { base, vars, publishDir, stop: () => proc.kill() };
}

const phpAvailable = spawnSync('php', ['-v']).status === 0;

test('api/index.php publica snapshots y registra canciones eliminadas', { skip: !phpAvailable && 'php no instalado' }, async (t) => {
  const api = await startPhpApi();
  t.after(() => api.stop());
  const auth = { Authorization: `Bearer ${adminToken()}` };

  await t.test('POST /publish sin token es rechazado', async () => {
    const res = await fetch(`${api.base}/publish`, { method: 'POST' });
    assert.strictEqual(res.status, 401);
  });

  await t.test('POST /publish genera snapshot y manifiesto sin subir a ningún servidor', async () => {
    const res = await fetch(`${api.base}/publish`, { method: 'POST', headers: auth });
    const body = await res.json();
    assert.strictEqual(res.status, 200, JSON.stringify(body));
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.uploaded_to_server, false);
    assert.match(body.upload_log, /Publicación local/);
    assert.ok(!('snapshot_path' in body), 'no expone rutas del servidor');

    const manifest = JSON.parse(fs.readFileSync(api.vars.VERSION_PATH, 'utf8'));
    assert.strictEqual(manifest.catalogVersion, body.catalog_version);
    assert.strictEqual(manifest.url, `https://lalira.test/catalogo/${body.snapshot}`);
    assert.ok(fs.existsSync(path.join(api.publishDir, body.snapshot)));
  });

  await t.test('DELETE /songs/:id registra el ID y una canción nueva no lo reutiliza', async () => {
    const res = await fetch(`${api.base}/songs/100002`, { method: 'DELETE', headers: auth });
    assert.strictEqual(res.status, 200);

    const cms = new DatabaseSync(api.vars.CMS_DB_PATH);
    const tomb = cms.prepare('SELECT * FROM cancion_tombstone WHERE cancion_id = 100002').get();
    cms.close();
    assert.ok(tomb, 'el ID eliminado queda registrado');
    assert.strictEqual(String(tomb.numero_en_himnario), '2');

    const publish = await fetch(`${api.base}/publish`, { method: 'POST', headers: auth });
    assert.strictEqual(publish.status, 200);
  });

  await t.test('una publicación rechazada responde 422 y no cambia el manifiesto', async () => {
    const before = fs.readFileSync(api.vars.VERSION_PATH, 'utf8');
    const db = new DatabaseSync(api.vars.DB_PATH);
    db.exec("INSERT INTO cancion (id, himnario_id, seccion_id, numero_en_himnario) VALUES (100002, 3, 1, '50')");
    db.close();

    const res = await fetch(`${api.base}/publish`, { method: 'POST', headers: auth });
    const body = await res.json();
    assert.strictEqual(res.status, 422);
    assert.match(body.error, /reutilizados/);
    assert.strictEqual(fs.readFileSync(api.vars.VERSION_PATH, 'utf8'), before);
  });
});
