import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cp from 'node:child_process';
import os from 'node:os';
import { OAuth2Client } from 'google-auth-library';
import jwksClient from 'jwks-rsa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = 'lalira_cms_secret_token_key_2026';
const DB_PATH = '/Users/magnus.carlos/Documents/GitHub/lalira/himnario/himnario/catalogo.sqlite';
const CMS_DB_PATH = '/Users/magnus.carlos/Documents/GitHub/lalira/himnario/himnario/cms_internal.sqlite';
const VERSION_PATH = '/Users/magnus.carlos/Documents/GitHub/lalira/himnario/himnario/server/catalogo/version.json';
const ASSETS_DB_PATH = '/Users/magnus.carlos/Documents/GitHub/lalira/himnario/himnario/assets/catalogo.sqlite';
const ENV_PATH = '/Users/magnus.carlos/Documents/GitHub/lalira/himnario/himnario/exports/.env';

const app = express();
app.use(express.json());

// Initialize Database Connections
const dbCatalog = new DatabaseSync(DB_PATH);
const dbCms = new DatabaseSync(CMS_DB_PATH);

// Initialize Internal Tables
function initInternalDB() {
  // Drop table if it's the old schema (lacks auth_provider column)
  try {
    dbCms.prepare("SELECT auth_provider FROM usuario LIMIT 1").get();
  } catch (e) {
    console.log("Old usuario schema detected. Upgrading database schema...");
    dbCms.exec("DROP TABLE IF EXISTS usuario;");
  }

  dbCms.exec(`
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
  `);

  dbCms.exec(`
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
  `);

  dbCms.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      accion TEXT NOT NULL,
      cancion_id INTEGER,
      detalles TEXT,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default admin if no users exist
  const checkUserStmt = dbCms.prepare("SELECT COUNT(*) as count FROM usuario");
  const result = checkUserStmt.get();
  if (result.count === 0) {
    const passwordHash = bcrypt.hashSync('admin123', 10);
    const insertStmt = dbCms.prepare(`
      INSERT INTO usuario (email, password_hash, nombre, rol, auth_provider, estado)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertStmt.run('admin@lalira.com', passwordHash, 'Administrador Inicial', 'admin', 'local', 'activo');
    console.log("Seeded initial Admin user: admin@lalira.com / admin123 (local bypass enabled)");
  }
}
initInternalDB();

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token de acceso faltante' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Permisos de administrador requeridos' });
  }
  next();
}

// Helper to log audit trail
function logAudit(userId, action, songId, details) {
  const stmt = dbCms.prepare("INSERT INTO audit_log (usuario_id, accion, cancion_id, detalles) VALUES (?, ?, ?, ?)");
  stmt.run(userId, action, songId, details);
}

// ── AUTH & OAUTH VERIFICATION HELPERS ────────────────────────────────────────

const googleClient = new OAuth2Client();

async function verifyGoogleToken(token, expectedClientId) {
  const ticket = await googleClient.verifyIdToken({
    idToken: token,
    audience: expectedClientId,
  });
  const payload = ticket.getPayload();
  return {
    sub: payload.sub,
    email: payload.email,
    nombre: payload.name || payload.email,
  };
}

// ── AUTH ENDPOINTS ───────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  try {
    const stmt = dbCms.prepare("SELECT * FROM usuario WHERE email = ?");
    const user = stmt.get(email);
    if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (user.estado !== 'activo') {
      return res.status(403).json({ error: 'Tu cuenta de usuario ha sido desactivada por un administrador.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ token, user: { email: user.email, rol: user.rol, nombre: user.nombre } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/oauth', async (req, res) => {
  const { provider, token } = req.body;
  if (!provider || !token) {
    return res.status(400).json({ error: 'Proveedor y token requeridos' });
  }

  try {
    let profile;
    const config = { ...process.env, ...loadEnv() };

    // Dev Bypass Check
    if (config.DEV_BYPASS === 'true' && token.startsWith('mock_')) {
      console.log(`[AUTH] OAuth verification bypassed for dev: ${token}`);
      const mockEmail = token.replace('mock_', '') + '@lalira.com';
      profile = {
        sub: token,
        email: mockEmail,
        nombre: token.replace('mock_', ''),
      };
    } else if (provider === 'google') {
      const clientId = config.GOOGLE_CLIENT_ID;
      if (!clientId) {
        return res.status(500).json({ error: 'Google Client ID no configurado en el servidor' });
      }
      profile = await verifyGoogleToken(token, clientId);
    } else {
      return res.status(400).json({ error: 'Proveedor de autenticación no soportado' });
    }

    if (!profile || !profile.email) {
      return res.status(401).json({ error: 'No se pudo obtener el correo electrónico del proveedor' });
    }

    // Check allowlist (case-insensitive email matching)
    const emailLower = profile.email.toLowerCase().trim();
    const stmt = dbCms.prepare("SELECT * FROM usuario WHERE LOWER(email) = ?");
    let user = stmt.get(emailLower);

    if (!user) {
      return res.status(403).json({ error: 'Acceso denegado: Tu correo electrónico no está invitado en este CMS.' });
    }

    if (user.estado !== 'activo') {
      return res.status(403).json({ error: 'Tu cuenta de usuario ha sido desactivada por un administrador.' });
    }

    // Link user if provider_user_id is not set
    if (!user.provider_user_id) {
      const updateStmt = dbCms.prepare("UPDATE usuario SET auth_provider = ?, provider_user_id = ? WHERE id = ?");
      updateStmt.run(provider, profile.sub, user.id);
      // Reload user data
      user = stmt.get(emailLower);
    }

    // Generate CMS Token
    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ token: jwtToken, user: { email: user.email, rol: user.rol, nombre: user.nombre } });

  } catch (err) {
    console.error('[AUTH ERROR]', err);
    res.status(401).json({ error: `Fallo de autenticación: ${err.message}` });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/auth/config', (req, res) => {
  const config = { ...process.env, ...loadEnv() };
  res.json({
    googleClientId: config.GOOGLE_CLIENT_ID || null,
    devBypass: config.DEV_BYPASS === 'true'
  });
});

// ── USER MANAGEMENT ENDPOINTS (Admin Only) ───────────────────────────────────

app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const stmt = dbCms.prepare("SELECT id, email, nombre, rol, auth_provider, provider_user_id, estado, creado_en FROM usuario ORDER BY creado_en DESC");
    const users = stmt.all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', authenticateToken, requireAdmin, (req, res) => {
  const { email, nombre, rol, auth_provider, password } = req.body;
  if (!email || !nombre || !rol) {
    return res.status(400).json({ error: 'Nombre, email y rol son requeridos' });
  }

  const provider = auth_provider || 'google';
  if (provider === 'local' && (!password || password.trim().length < 6)) {
    return res.status(400).json({ error: 'La contraseña local es requerida y debe tener al menos 6 caracteres.' });
  }

  try {
    const emailLower = email.toLowerCase().trim();
    const checkStmt = dbCms.prepare("SELECT id FROM usuario WHERE LOWER(email) = ?");
    if (checkStmt.get(emailLower)) {
      return res.status(400).json({ error: 'Este correo electrónico ya está registrado' });
    }

    const passwordHash = provider === 'local' ? bcrypt.hashSync(password, 10) : null;

    const insertStmt = dbCms.prepare(`
      INSERT INTO usuario (email, nombre, rol, auth_provider, password_hash, estado)
      VALUES (?, ?, ?, ?, ?, 'activo')
    `);
    const result = insertStmt.run(emailLower, nombre.trim(), rol, provider, passwordHash);
    
    logAudit(req.user.id, 'INVITE_USER', result.lastInsertRowid, `Usuario ${emailLower} registrado con proveedor ${provider} como ${rol}.`);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  const { nombre, rol, estado, auth_provider, password } = req.body;

  try {
    const checkUser = dbCms.prepare("SELECT rol, estado FROM usuario WHERE id = ?");
    const targetUser = checkUser.get(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Prevent deactivating or changing role of the last active admin
    if (targetUser.rol === 'admin' && (rol === 'editor' || estado === 'inactivo')) {
      const activeAdminsStmt = dbCms.prepare("SELECT COUNT(*) as count FROM usuario WHERE rol = 'admin' AND estado = 'activo'");
      const activeAdmins = activeAdminsStmt.get();
      if (activeAdmins.count <= 1 && targetUser.estado === 'activo') {
        return res.status(400).json({ error: 'No se puede desactivar o rebajar al último administrador activo.' });
      }
    }

    let passwordHash = null;
    if (password && password.trim().length >= 6) {
      passwordHash = bcrypt.hashSync(password, 10);
    }

    const updateStmt = dbCms.prepare(`
      UPDATE usuario
      SET nombre = COALESCE(?, nombre),
          rol = COALESCE(?, rol),
          estado = COALESCE(?, estado),
          auth_provider = COALESCE(?, auth_provider),
          password_hash = CASE WHEN ? THEN ? ELSE password_hash END
      WHERE id = ?
    `);
    updateStmt.run(
      nombre ? nombre.trim() : null,
      rol || null,
      estado || null,
      auth_provider || null,
      password ? 1 : 0,
      passwordHash,
      userId
    );

    logAudit(req.user.id, 'UPDATE_USER', userId, `Usuario modificado. Rol: ${rol || 'sin cambios'}, Estado: ${estado || 'sin cambios'}, Proveedor: ${auth_provider || 'sin cambios'}.`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);

  try {
    const checkUser = dbCms.prepare("SELECT rol FROM usuario WHERE id = ?");
    const targetUser = checkUser.get(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Prevent deleting the last admin
    if (targetUser.rol === 'admin') {
      const totalAdminsStmt = dbCms.prepare("SELECT COUNT(*) as count FROM usuario WHERE rol = 'admin'");
      const totalAdmins = totalAdminsStmt.get();
      if (totalAdmins.count <= 1) {
        return res.status(400).json({ error: 'No se puede eliminar al único administrador del sistema.' });
      }
    }

    // Prevent deleting yourself
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario.' });
    }

    const deleteStmt = dbCms.prepare("DELETE FROM usuario WHERE id = ?");
    deleteStmt.run(userId);

    logAudit(req.user.id, 'DELETE_USER', userId, `Usuario ID ${userId} eliminado del sistema.`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── METADATA ENDPOINTS ────────────────────────────────────────────────────────

app.get('/api/hymnals', authenticateToken, (req, res) => {
  try {
    const stmt = dbCatalog.prepare("SELECT id, nombre, codigo FROM himnario ORDER BY id");
    const rows = stmt.all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sections', authenticateToken, (req, res) => {
  try {
    const stmt = dbCatalog.prepare("SELECT id, nombre, orden FROM seccion ORDER BY orden");
    const rows = stmt.all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SONGS & DRAFTS ENDPOINTS ──────────────────────────────────────────────────

// List songs (combining approved state with draft state indicators)
app.get('/api/songs', authenticateToken, (req, res) => {
  const { himnario_id, seccion_id, search } = req.query;

  try {
    let sql = `
      SELECT c.id, c.numero_en_himnario, c.tonalidad, c.himnario_id, h.codigo as himnario_codigo,
             m.titulo, m.autor
      FROM cancion c
      JOIN himnario h ON c.himnario_id = h.id
      LEFT JOIN cancion_metadata m ON c.id = m.cancion_id AND m.idioma = 'es'
      WHERE 1=1
    `;
    const params = [];

    if (himnario_id) {
      sql += " AND c.himnario_id = ?";
      params.push(himnario_id);
    }
    if (seccion_id) {
      sql += " AND c.seccion_id = ?";
      params.push(seccion_id);
    }
    if (search) {
      sql += " AND (m.titulo LIKE ? OR c.numero_en_himnario LIKE ? OR c.id IN (SELECT cancion_id FROM estrofa WHERE texto LIKE ?))";
      const likeParam = `%${search}%`;
      params.push(likeParam, likeParam, likeParam);
    }

    sql += " ORDER BY c.himnario_id, CAST(c.numero_en_himnario AS INTEGER), c.id";

    const stmt = dbCatalog.prepare(sql);
    const songs = stmt.all(...params);

    // Fetch active drafts to overlay status badges
    const draftsStmt = dbCms.prepare("SELECT cancion_id, status FROM draft_hymn");
    const drafts = draftsStmt.all();
    const draftMap = new Map(drafts.map(d => [d.cancion_id, d.status]));

    const songsWithDraftStatus = songs.map(s => ({
      ...s,
      draft_status: draftMap.get(s.id) || null // 'draft', 'pending_approval' or null
    }));

    res.json(songsWithDraftStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to fetch full production song structure
function getProductionSong(songId) {
  const stmt = dbCatalog.prepare(`
    SELECT c.id, c.himnario_id, c.seccion_id, c.numero_en_himnario, c.tonalidad, c.intro, h.codigo as himnario_codigo
    FROM cancion c
    JOIN himnario h ON c.himnario_id = h.id
    WHERE c.id = ?
  `);
  const song = stmt.get(songId);
  if (!song) return null;

  // Metadata
  const metaStmt = dbCatalog.prepare("SELECT idioma, titulo, autor, compositor, adaptador, traductor FROM cancion_metadata WHERE cancion_id = ?");
  const metadata = {};
  metaStmt.all(songId).forEach(r => {
    metadata[r.idioma] = r;
  });
  for (const lang of ['es', 'pt', 'en']) {
    if (!metadata[lang]) {
      metadata[lang] = { idioma: lang, titulo: '', autor: '', compositor: '', adaptador: '', traductor: '' };
    }
  }
  song.metadata = metadata;

  // Stanzas
  const stanzasStmt = dbCatalog.prepare("SELECT id, orden, tipo, texto, repeticiones, idioma FROM estrofa WHERE cancion_id = ? ORDER BY orden");
  song.estrofas = stanzasStmt.all(songId);

  // Chords
  const cifraStmt = dbCatalog.prepare("SELECT idioma, contenido, tonalidad, capotraste, bpm FROM cifra WHERE cancion_id = ?");
  const cifras = {};
  cifraStmt.all(songId).forEach(r => {
    cifras[r.idioma] = r;
  });
  for (const lang of ['es', 'pt', 'en']) {
    if (!cifras[lang]) {
      cifras[lang] = { idioma: lang, contenido: '', tonalidad: '', capotraste: 0, bpm: 0 };
    }
  }
  song.cifras = cifras;

  // Notes
  const notesStmt = dbCatalog.prepare("SELECT id, tipo, marcador_numero, fragmento_letra, texto, referencia, versiculo_texto, autor FROM nota WHERE cancion_id = ? ORDER BY marcador_numero");
  song.notas = notesStmt.all(songId);

  return song;
}

// Get detailed song (merges production with draft if draft exists)
app.get('/api/songs/:id', authenticateToken, (req, res) => {
  const songId = parseInt(req.params.id);

  try {
    const prodSong = getProductionSong(songId);
    if (!prodSong) return res.status(404).json({ error: 'Alabanza no encontrada' });

    // Check if there is an active draft
    const draftStmt = dbCms.prepare("SELECT * FROM draft_hymn WHERE cancion_id = ?");
    const draft = draftStmt.get(songId);

    res.json({
      production: prodSong,
      draft: draft ? {
        id: draft.id,
        status: draft.status,
        editor_id: draft.editor_id,
        modificado_en: draft.modificado_en,
        data: JSON.parse(draft.data_json)
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save or edit a draft
app.post('/api/drafts/:songId', authenticateToken, (req, res) => {
  const songId = parseInt(req.params.songId);
  const songData = req.body; // Full JSON payload

  try {
    const checkStmt = dbCms.prepare("SELECT id FROM draft_hymn WHERE cancion_id = ?");
    const existing = checkStmt.get(songId);

    const now = new Date().toISOString();
    if (existing) {
      const updateStmt = dbCms.prepare(`
        UPDATE draft_hymn
        SET data_json = ?, status = 'draft', modificado_en = ?
        WHERE cancion_id = ?
      `);
      updateStmt.run(JSON.stringify(songData), now, songId);
    } else {
      const insertStmt = dbCms.prepare(`
        INSERT INTO draft_hymn (cancion_id, editor_id, status, data_json, creado_en, modificado_en)
        VALUES (?, ?, 'draft', ?, ?, ?)
      `);
      insertStmt.run(songId, req.user.id, JSON.stringify(songData), now, now);
    }

    logAudit(req.user.id, 'SAVE_DRAFT', songId, `Borrador guardado.`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit draft for approval
app.post('/api/drafts/:songId/submit', authenticateToken, (req, res) => {
  const songId = parseInt(req.params.songId);

  try {
    const updateStmt = dbCms.prepare("UPDATE draft_hymn SET status = 'pending_approval' WHERE cancion_id = ?");
    const result = updateStmt.run(songId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Borrador no encontrado' });
    }

    logAudit(req.user.id, 'SUBMIT_APPROVAL', songId, `Enviado para aprobación.`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve and Merge draft to Production (Admin Only)
app.post('/api/drafts/:songId/approve', authenticateToken, requireAdmin, (req, res) => {
  const songId = parseInt(req.params.songId);

  try {
    const draftStmt = dbCms.prepare("SELECT data_json FROM draft_hymn WHERE cancion_id = ?");
    const draft = draftStmt.get(songId);
    if (!draft) {
      return res.status(404).json({ error: 'Borrador no encontrado para aprobación' });
    }

    const songData = JSON.parse(draft.data_json);

    // Run catalog database updates in an exact transaction
    dbCatalog.exec("BEGIN TRANSACTION");

    // 1. Update basic fields
    const updateSongStmt = dbCatalog.prepare(`
      UPDATE cancion
      SET seccion_id = ?, tonalidad = ?, intro = ?, numero_en_himnario = ?
      WHERE id = ?
    `);
    updateSongStmt.run(
      songData.seccion_id,
      songData.tonalidad,
      songData.intro,
      songData.numero_en_himnario,
      songId
    );

    // 2. Metadata (es / pt / en)
    for (const lang of ['es', 'pt', 'en']) {
      const meta = songData.metadata[lang];
      if (meta && meta.titulo) {
        const metaStmt = dbCatalog.prepare(`
          INSERT OR REPLACE INTO cancion_metadata (cancion_id, idioma, titulo, autor, compositor, adaptador, traductor)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        metaStmt.run(
          songId,
          lang,
          meta.titulo.trim(),
          (meta.autor || '').trim(),
          (meta.compositor || '').trim(),
          (meta.adaptador || '').trim(),
          (meta.traductor || '').trim()
        );
      }
    }

    // 3. Extract stanzas from ChordPro chords (automatically sync)
    dbCatalog.prepare("DELETE FROM estrofa WHERE cancion_id = ?").run(songId);
    
    // We process both languages to write to stanzas
    for (const lang of ['es', 'pt', 'en']) {
      const cifra = songData.cifras[lang];
      if (cifra && cifra.contenido && cifra.contenido.trim()) {
        // Strip out chords and bracket directives
        let cleaned = cifra.contenido.replace(/\[[^\]]+\]/g, '');
        cleaned = cleaned.replace(/\{[^\}]+\}/g, '');

        const blocks = cleaned.split(/\n\s*\n/);
        let order = 1;
        for (let block of blocks) {
          block = block.trim();
          if (!block) continue;

          const lines = block.split('\n').map(l => l.trim()).filter(l => l);
          if (lines.length === 0) continue;

          let tipo = 'estrofa';
          let contentStart = 0;

          const firstLine = lines[0].toLowerCase();
          if (firstLine.startsWith('coro')) {
            tipo = 'coro';
            contentStart = 1;
          } else if (firstLine.startsWith('final:')) {
            tipo = 'final';
            lines[0] = lines[0].substring(6).trim();
          } else if (firstLine.startsWith('instrumentos')) {
            tipo = 'instrumentos';
            if (lines.length > 1) {
              contentStart = 1;
            } else {
              lines[0] = '(Instrumental)';
            }
          }

          const textLines = lines.slice(contentStart).join('\n');
          dbCatalog.prepare(`
            INSERT INTO estrofa (cancion_id, idioma, orden, tipo, texto, repeticiones)
            VALUES (?, ?, ?, ?, ?, 1)
          `).run(songId, lang, order++, tipo, textLines);
        }
      } else {
        // If ChordPro is empty, fall back to whatever is defined in the stanzas tab editor
        const stanzas = songData.estrofas || [];
        stanzas.filter(s => s.idioma === lang).forEach(s => {
          if (s.texto && s.texto.trim()) {
            dbCatalog.prepare(`
              INSERT INTO estrofa (cancion_id, idioma, orden, tipo, texto, repeticiones)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(songId, lang, s.orden, s.tipo, s.texto.trim(), s.repeticiones || 1);
          }
        });
      }
    }

    // 4. Update Chords (cifra)
    for (const lang of ['es', 'pt', 'en']) {
      const cifra = songData.cifras[lang];
      if (cifra && cifra.contenido && cifra.contenido.trim()) {
        const bpm = parseInt(cifra.bpm) || null;
        dbCatalog.prepare(`
          INSERT OR REPLACE INTO cifra (cancion_id, idioma, contenido, tonalidad, capotraste, bpm)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          songId,
          lang,
          cifra.contenido.trim(),
          cifra.tonalidad || null,
          cifra.capotraste || 0,
          bpm
        );
      } else {
        dbCatalog.prepare("DELETE FROM cifra WHERE cancion_id = ? AND idioma = ?").run(songId, lang);
      }
    }

    // 5. Update Notes (nota) supporting historical context
    dbCatalog.prepare("DELETE FROM nota WHERE cancion_id = ?").run(songId);
    const notes = songData.notas || [];
    notes.forEach(note => {
      if (note.texto || note.referencia) {
        dbCatalog.prepare(`
          INSERT INTO nota (cancion_id, tipo, marcador_numero, fragmento_letra, texto, referencia, versiculo_texto, autor)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          songId,
          note.tipo,
          note.marcador_numero,
          note.fragmento_letra || '',
          note.texto || '',
          note.referencia || '',
          note.versiculo_texto || '',
          note.autor || ''
        );
      }
    });

    dbCatalog.exec("COMMIT");

    // Clean up draft record
    dbCms.prepare("DELETE FROM draft_hymn WHERE cancion_id = ?").run(songId);

    logAudit(req.user.id, 'APPROVE', songId, `Borrador aprobado e integrado a producción.`);
    res.json({ success: true });

  } catch (err) {
    dbCatalog.exec("ROLLBACK");
    res.status(500).json({ error: err.message });
  }
});

// Reject draft
app.post('/api/drafts/:songId/reject', authenticateToken, requireAdmin, (req, res) => {
  const songId = parseInt(req.params.songId);
  const { motivo } = req.body;

  try {
    const result = dbCms.prepare("UPDATE draft_hymn SET status = 'draft' WHERE cancion_id = ?").run(songId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Borrador no encontrado' });
    }

    logAudit(req.user.id, 'REJECT', songId, `Borrador rechazado. Motivo: ${motivo || 'No especificado'}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── AUDIT LOGS ENDPOINTS ─────────────────────────────────────────────────────

app.get('/api/audit-logs', authenticateToken, requireAdmin, (req, res) => {
  try {
    const stmt = dbCms.prepare(`
      SELECT a.id, a.accion, a.cancion_id, a.detalles, a.fecha, u.nombre as usuario_nombre
      FROM audit_log a
      LEFT JOIN usuario u ON a.usuario_id = u.id
      ORDER BY a.fecha DESC LIMIT 100
    `);
    const logs = stmt.all();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── VERSION & PUBLISH ENDPOINTS ──────────────────────────────────────────────

app.get('/api/version', authenticateToken, (req, res) => {
  try {
    if (fs.existsSync(VERSION_PATH)) {
      const vdata = JSON.parse(fs.readFileSync(VERSION_PATH, 'utf8'));
      vdata.db_size = fs.statSync(DB_PATH).size;
      res.json(vdata);
    } else {
      res.json({ version: 'Desconocida', db_size: fs.statSync(DB_PATH).size });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to load env for SCP publishing
function loadEnv() {
  const env = {};
  if (fs.existsSync(ENV_PATH)) {
    const lines = fs.readFileSync(ENV_PATH, 'utf8').split('\n');
    lines.forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) return;
      const [key, ...parts] = line.split('=');
      env[key.trim()] = parts.join('=').trim();
    });
  }
  return env;
}

app.post('/api/publish', authenticateToken, requireAdmin, (req, res) => {
  try {
    if (!fs.existsSync(VERSION_PATH)) {
      return res.status(500).json({ error: 'Ruta version.json no encontrada' });
    }

    const vdata = JSON.parse(fs.readFileSync(VERSION_PATH, 'utf8'));
    const oldVersion = vdata.version || '2.0.0';
    
    // Bump version patch
    const parts = oldVersion.split('.');
    parts[parts.length - 1] = String(Number(parts[parts.length - 1]) + 1);
    const newVersion = parts.join('.');

    // Clean compile (Vacuum database file)
    dbCatalog.exec("VACUUM;");
    const newSize = fs.statSync(DB_PATH).size;

    vdata.version = newVersion;
    vdata.size = newSize;

    fs.writeFileSync(VERSION_PATH, JSON.stringify(vdata, null, 2) + '\n', 'utf8');

    // Copy to client assets
    fs.copyFileSync(DB_PATH, ASSETS_DB_PATH);

    // SCP upload integration
    const env = loadEnv();
    const sshHost = env.SSH_HOST;
    const sshUser = env.SSH_USER;
    const sshPort = env.SSH_PORT || '22';
    const sshKey = env.SSH_KEY ? env.SSH_KEY.replace(/^~/, os.homedir()) : null;
    const remotePath = env.SSH_REMOTE_PATH;

    let uploaded = false;
    let uploadLog = "No se configuraron las credenciales SSH en el archivo .env";

    if (sshHost && sshUser && remotePath) {
      const sshKeyPath = sshKey || path.join(process.env.HOME || '', '.ssh', 'id_rsa');
      const scpBase = [
        '-P', sshPort,
        '-i', sshKeyPath,
        '-o', 'StrictHostKeyChecking=accept-new',
        '-o', 'IdentitiesOnly=yes'
      ];
      const remoteTarget = `${sshUser}@${sshHost}:${remotePath}`;

      const runScp = (localFile) => {
        return cp.spawnSync('scp', [...scpBase, localFile, remoteTarget], { encoding: 'utf8' });
      };

      const resDb = runScp(DB_PATH);
      const resVer = runScp(VERSION_PATH);

      if (resDb.status === 0 && resVer.status === 0) {
        uploaded = true;
        uploadLog = "Carga SCP exitosa a " + sshHost;
      } else {
        uploadLog = `Error SCP. DB: ${resDb.stderr || 'OK'}. Ver: ${resVer.stderr || 'OK'}`;
      }
    }

    logAudit(req.user.id, 'PUBLISH', null, `Publicación v${newVersion} realizada.`);
    res.json({
      success: true,
      old_version: oldVersion,
      new_version: newVersion,
      db_size: newSize,
      copied_to_assets: true,
      uploaded_to_server: uploaded,
      upload_log: uploadLog
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Node.js REST API de La Lira CMS corriendo en puerto ${PORT}...`);
});
