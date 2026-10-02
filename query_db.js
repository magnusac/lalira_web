import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('/Users/magnus.carlos/Documents/GitHub/lalira/himnario/himnario/catalogo_v2.sqlite');
const song = db.prepare("SELECT c.id, m.titulo FROM cancion c JOIN cancion_metadata m ON c.id = m.cancion_id WHERE m.titulo LIKE '%Oigo el Son%'").all();
console.log(song);
