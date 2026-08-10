import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';

const PORT = 8000;
const API_URL = `http://localhost:${PORT}/api`;

test('API Endpoints Return Required Schema', async (t) => {
  await t.test('GET /public/songs returns seccion_id for hymnal categories', async () => {
    // Make sure your backend (node server.js o npm run dev) is running before running this test.
    const res = await fetch(`${API_URL}/public/songs?limit=5`);
    
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}. Is the server running?`);
    }

    assert.strictEqual(res.status, 200, 'Endpoint should return 200 OK');
    
    const songs = await res.json();
    assert(Array.isArray(songs), 'Response should be an array');
    assert(songs.length > 0, 'Should return at least one song');
    
    songs.forEach(song => {
      assert('id' in song, 'Song must have an id');
      assert('titulo' in song, 'Song must have a titulo');
      assert('numero_en_himnario' in song, 'Song must have numero_en_himnario');
      // The core issue: seccion_id was missing
      assert('seccion_id' in song, 'Song must have a seccion_id to be grouped in categories');
    });
  });
});
