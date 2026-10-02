<?php
$content = file_get_contents(__DIR__ . '/index.php');
if (strpos($content, 'has_chords') !== false) {
    echo "has_chords IS present in index.php\n";
} else {
    echo "has_chords is MISSING in index.php\n";
}
