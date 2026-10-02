<?php
$db = new PDO('sqlite:/Users/magnus.carlos/Documents/GitHub/lalira/himnario/himnario/catalogo_v2.sqlite');
$stmt = $db->query("SELECT c.id, m.titulo FROM cancion c JOIN cancion_metadata m ON c.id = m.cancion_id WHERE m.titulo LIKE '%Oigo el Son%'");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
