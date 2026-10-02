<?php
header('Content-Type: text/plain');
ini_set('display_errors', 1);
error_reporting(E_ALL);
try {
    $db = new PDO("sqlite:/home3/magnusal/public_html/lalira/catalogo/catalogo_v2.sqlite");
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $stmt = $db->query("SELECT c.id, CAST(EXISTS(SELECT 1 FROM cifra WHERE cancion_id = c.id AND contenido IS NOT NULL AND TRIM(contenido) != '') AS INTEGER) as has_chords FROM cancion c WHERE c.id IN (SELECT cancion_id FROM cifra) LIMIT 10");
    $res = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Query Result:\n";
    print_r($res);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
