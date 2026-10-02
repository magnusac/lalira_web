// Minimal catalog with the production schema (catalogo_v2.sqlite) for publisher tests.
import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
CREATE TABLE himnario (id INTEGER PRIMARY KEY, nombre TEXT, codigo TEXT UNIQUE);
CREATE TABLE seccion (id INTEGER PRIMARY KEY, nombre TEXT UNIQUE, orden INTEGER);
CREATE TABLE cancion (
  id INTEGER PRIMARY KEY, himnario_id INTEGER, seccion_id INTEGER,
  numero_en_himnario TEXT, tonalidad TEXT, intro TEXT,
  UNIQUE(himnario_id, numero_en_himnario),
  FOREIGN KEY(himnario_id) REFERENCES himnario(id),
  FOREIGN KEY(seccion_id) REFERENCES seccion(id)
);
CREATE TABLE cancion_metadata (
  cancion_id INTEGER, idioma TEXT, titulo TEXT, autor TEXT, compositor TEXT, adaptador TEXT, traductor TEXT,
  PRIMARY KEY(cancion_id, idioma), FOREIGN KEY(cancion_id) REFERENCES cancion(id)
);
CREATE TABLE estrofa (
  id INTEGER PRIMARY KEY, cancion_id INTEGER, idioma TEXT, orden INTEGER, tipo TEXT, texto TEXT, repeticiones INTEGER,
  UNIQUE(cancion_id, idioma, orden), FOREIGN KEY(cancion_id) REFERENCES cancion(id)
);
CREATE TABLE seccion_metadata (
  seccion_id INTEGER, idioma TEXT, nombre TEXT, PRIMARY KEY (seccion_id, idioma), FOREIGN KEY (seccion_id) REFERENCES seccion(id)
);
CREATE TABLE cifra (
  cancion_id INTEGER NOT NULL REFERENCES cancion(id), idioma TEXT NOT NULL DEFAULT 'es', contenido TEXT NOT NULL,
  tonalidad TEXT, tiempo INTEGER DEFAULT 0, bpm INTEGER, ritmo TEXT, PRIMARY KEY (cancion_id, idioma)
);
CREATE TABLE nota (
  id INTEGER PRIMARY KEY AUTOINCREMENT, cancion_id INTEGER NOT NULL REFERENCES cancion(id), tipo TEXT NOT NULL,
  marcador_numero INTEGER NOT NULL, fragmento_letra TEXT, texto TEXT, referencia TEXT, versiculo_texto TEXT, autor TEXT,
  UNIQUE(cancion_id, tipo, marcador_numero)
);
CREATE VIRTUAL TABLE estrofa_fts USING fts5(texto, idioma, content='estrofa', content_rowid='id');
CREATE TRIGGER estrofa_ai AFTER INSERT ON estrofa BEGIN
  INSERT INTO estrofa_fts(rowid, texto, idioma) VALUES (new.id, new.texto, new.idioma);
END;
CREATE TRIGGER estrofa_ad AFTER DELETE ON estrofa BEGIN
  INSERT INTO estrofa_fts(estrofa_fts, rowid, texto, idioma) VALUES('delete', old.id, old.texto, old.idioma);
END;
CREATE TRIGGER estrofa_au AFTER UPDATE ON estrofa BEGIN
  INSERT INTO estrofa_fts(estrofa_fts, rowid, texto, idioma) VALUES('delete', old.id, old.texto, old.idioma);
  INSERT INTO estrofa_fts(rowid, texto, idioma) VALUES (new.id, new.texto, new.idioma);
END;
`;

/** Songs: 100001 and 100002 (himnario 1, custom IDs) and 3 (himnario 3, implicit ID — the highest non-custom). */
export function createCatalogFixture(dbPath) {
  const db = new DatabaseSync(dbPath);
  db.exec(SCHEMA);
  db.exec(`
    INSERT INTO himnario VALUES (1, 'Himnario', 'H'), (3, 'Coros', 'C');
    INSERT INTO seccion VALUES (1, 'Alabanza', 1);
    INSERT INTO cancion VALUES (100001, 1, 1, '1', 'G', ''), (100002, 1, 1, '2', 'D', ''), (3, 3, 1, '7', 'C', '');
    INSERT INTO cancion_metadata VALUES
      (100001, 'es', 'Santo, Santo, Santo', 'R. Heber', '', '', ''),
      (100002, 'es', 'Cuán grande es Él', 'C. Boberg', '', '', ''),
      (3, 'es', 'Coro de prueba', '', '', '', '');
    INSERT INTO estrofa (cancion_id, idioma, orden, tipo, texto, repeticiones) VALUES
      (100001, 'es', 1, 'estrofa', 'Santo, santo, santo, Señor omnipotente', 1),
      (100002, 'es', 1, 'estrofa', 'Señor mi Dios, al contemplar los cielos', 1),
      (3, 'es', 1, 'coro', 'Texto del coro de prueba', 1);
  `);
  db.close();
}

export function openCatalog(dbPath) {
  return new DatabaseSync(dbPath);
}
