#!/bin/bash

# Extract the PHP block using awk and modify it
cat api/index.php | awk '
BEGIN { in_pdf_block = 0; }
/\/\/ POST \/pdf-extract/ {
    print "// POST /pdf-extract";
    print "if ($path === '\''/pdf-extract'\'' && $request_method === '\''POST'\'') {";
    print "    $user = require_auth();";
    print "    ";
    print "    if (!isset($_FILES['\''pdf'\'']) || $_FILES['\''pdf'\'']['\''error'\''] !== UPLOAD_ERR_OK) {";
    print "        json_response([\"error\" => \"Archivo no proporcionado o inválido\"], 400);";
    print "    }";
    print "    ";
    print "    $letras = $_POST['\''letras'\''] ?? '\'''\'';";
    print "    $cancionId = $_POST['\''cancion_id'\''] ?? '\''temp'\'';";
    print "    $modo = $_POST['\''modo'\''] ?? '\''partitura'\'';";
    print "    ";
    print "    $mimeType = mime_content_type($_FILES['\''pdf'\'']['\''tmp_name'\'']);";
    print "    if (!$mimeType) $mimeType = '\''application/pdf'\'';";
    print "    ";
    print "    $pdfBase64 = base64_encode(file_get_contents($_FILES['\''pdf'\'']['\''tmp_name'\'']));";
    print "    $geminiApiKey = $_ENV['\''GEMINI_API_KEY'\''] ?? '\'''\'';";
    print "    ";
    print "    if (empty($geminiApiKey)) {";
    print "        json_response([\"error\" => \"GEMINI_API_KEY no configurada en el servidor\"], 500);";
    print "    }";
    print "    ";
    print "    $fileName = \"cancion_\" . preg_replace('\''/[^a-zA-Z0-9_-]/'\'', '\'''\'', $cancionId) . \".pdf\";";
    print "    if ($modo === '\''partitura'\'') {";
    print "        $partituras_dir = dirname(__DIR__) . '\''/assets/partituras'\'';";
    print "        if (!is_dir($partituras_dir)) @mkdir($partituras_dir, 0755, true);";
    print "        $destPath = $partituras_dir . '\''/'\'' . $fileName;";
    print "        move_uploaded_file($_FILES['\''pdf'\'']['\''tmp_name'\''], $destPath);";
    print "    }";
    print "    ";
    print "    if ($modo === '\''cifrado'\'') {";
    print "        $prompt = \"Analiza la imagen o documento adjunto que contiene un cifrado de acordes sobre la letra de una canción.\\n\";";
    print "        $prompt .= \"Toma el texto plano proporcionado e inserta los acordes en formato ChordPro (ej. `[Am]`) alineándolos exactamente sobre las palabras donde caen en la imagen.\\n\\n\";";
    print "        $prompt .= \"REGLAS ESTRICTAS E IRROMPIBLES:\\n\";";
    print "        $prompt .= \"0. CADENA DE PENSAMIENTO: Llena primero el campo '\\''analisis_silabico'\\'' en el JSON analizando dónde cae cada acorde sobre cada sílaba en la foto.\\n\";";
    print "        $prompt .= \"1. NO modifiques ni una sola palabra del texto plano proporcionado. Úsalo como base estricta.\\n\";";
    print "        $prompt .= \"2. TRADUCCIÓN A SISTEMA AMERICANO: Si los acordes en la imagen están en notación latina (Do, Re, Mim, Sol#), DEBES convertirlos automáticamente a notación americana (C, D, Em, G#) en tu salida.\\n\";";
    print "        $prompt .= \"3. Encapsula las extensiones de acordes en paréntesis (ej. si dice Cmaj7, escribe `[C(maj7)]`).\\n\";";
    print "        $prompt .= \"4. METADATOS VACÍOS: A diferencia de las partituras, en estos cifrados es probable que no esté escrito el tempo, BPM, compás o tonalidad. Si NO están explícitamente escritos en la imagen, DEJA ESOS CAMPOS VACÍOS (\"\"). NO alucines ni inventes un ritmo o BPM.\\n\";";
    print "        $prompt .= \"5. Si el documento usa guiones para separar acordes de paso, ignóralos y posiciona el acorde en la sílaba correcta o al final con espacio.\\n\";";
    print "        $prompt .= \"\\nTexto Plano proporcionado:\\n\" . $letras;";
    print "    } else {";
    in_pdf_block = 1;
    next;
}

in_pdf_block && /\$payload = \[/ {
    print "    $prompt = \"Analiza el PDF adjunto (una partitura) para identificar los acordes, tonalidad, compás (tiempo), bpm y ritmo.\\n\" .";
    print "    \"Luego, toma el texto plano proporcionado e inserta los acordes en formato ChordPro (ej. `[Am]`) en las posiciones silábicas correctas basándote visualmente en la partitura.\\n\\n\" .";
    print "    \"REGLAS ESTRICTAS E IRROMPIBLES:\\n\" .";
    print "    \"0. CADENA DE PENSAMIENTO (analisis_silabico): OBLIGATORIAMENTE antes de generar el chordpro, debes llenar el campo '\\''analisis_silabico'\\'' en el JSON. Realiza un mapa paso a paso de tu razonamiento espacial para cada estrofa. Traza una línea vertical imaginaria desde la letra del acorde en la partitura, pasando por la cabeza de la nota musical, hasta la sílaba exacta del texto plano. Ejemplo de razonamiento esperado: '\\''Línea 1: El acorde D cae sobre la sílaba Si. El acorde D(maj7) cae sobre la vocal o de oramos. El acorde Em/D cae sobre ñor. Línea 2: El acorde D/F# cae a contratiempo después de ores, por ende se posiciona al final con un espacio.'\\''\\n\" .";
    print "    \"1. NO modifiques ni una sola palabra del texto plano proporcionado. Usa exactamente ese texto como base estructural.\\n\" .";
    print "    \"2. Transcripción Literal de Acordes: NO simplifiques la armonía. Copia los acordes con la sintaxis de la partitura. ADEMÁS, DEBES encapsular las extensiones de acordes como maj7, sus4, add9 en paréntesis obligatoriamente (ej. si la partitura dice `Dmaj7` tú debes escribir `[D(maj7)]`; si dice `Asus4` debes escribir `[A(sus4)]`). Inversiones van con slash (ej. `[G7(#5)/D#]`).\\n\" .";
    print "    \"3. Expansión de Repeticiones: Si el texto plano tiene marcas como `| (3x)` o `Repetir desde la 2da estrofa`, y los acordes varían en las repeticiones, expande el texto copiando la letra para ponerle los acordes exactos. Si el texto plano dice instruccionalmente `Repetir el himno` en línea separada, consérvalo tal cual como texto plano sin añadirle acordes si no es necesario.\\n\" .";
    print "    \"4. PROHIBICIÓN DE GUIONES ARTIFICIALES: Tienes estrictamente prohibido copiar los guiones (`-`) visuales de la partitura. NUNCA insertes un guion dentro de una palabra para separar sílabas. Si un acorde cae exactamente sobre una sílaba, ponlo pegado: `Si can[D(maj7)]tamos` (CORRECTO) en vez de `Si can[D(maj7)]-tamos` (INCORRECTO). ÚNICAMENTE insertarás un guion si el acorde cae a contratiempo en un vacío musical *entre* dos sílabas de una misma palabra (acorde de paso), formateándolo así: `Espí [D/F#]- ritu`. Si hay acordes instrumentales al final de una línea, ponlos al final con un espacio: `fer[G]vor, [D7]`.\\n\" .";
    print "    \"5. Intros con Símbolos visuales: Busca los corchetes horizontales `┌` y `┐` en la partitura que marcan la introducción (o intermedios/finales). TODO el bloque de letras y acordes que quede comprendido visualmente entre esos dos símbolos deberá ser envuelto usando las etiquetas `{start_of_intro}` y `{end_of_intro}`.\\n\" .";
    print "    \"6. Voces Secundarias: Si el texto plano tiene voces secundarias en paréntesis `(ven a perdonar)`, y la partitura muestra acordes para esa voz, pon los acordes DENTRO del paréntesis: `(ven [G/F]a perdonar)`.\\n\" .";
    print "    \"7. Contracantos no registrados: Si la partitura tiene letras de voces secundarias o contracantos que NO están en el texto plano original, IGNORA la letra (no la agregues). Sin embargo, DEBES conservar los acordes de ese contracanto intercalándolos en la posición rítmica correcta sobre la voz principal o durante los silencios.\\n\" .";
    print "    \"8. Extracción Literal del Ritmo: NO adivines el género musical. El '\\''ritmo'\\'' se encuentra explícitamente entre paréntesis junto a la marca de BPM/Tempo (ej. `(Nuevo)`, `(Básico)`). Si existe, cópialo textualmente. Si NO hay ningún texto entre paréntesis al lado del tempo, deja el campo de ritmo completamente vacío en el JSON. ¡No inventes ritmos!\\n\" .";
    print "    \"9. Extracción de BPM/Tempo: Si la partitura indica un rango de velocidad (por ejemplo `q = 75 - 85`), debes extraer SIEMPRE el valor mínimo (el primer número, ej. 75) como tu valor de BPM en el JSON. NUNCA saques promedios ni tomes el valor más alto.\\n\" .";
    print "    \"10. Dinámicas: IGNORA por completo las marcas de dinámica (p, f, mf) y términos de expresión (legato, agitato, subito p, espress).\\n\" .";
    print "    \"11. Etiquetas de Voces: Conserva intactas las etiquetas de género `(H)`, `(M)` o `(T)` que aparecen al final de las líneas en el texto plano.\\n\" .";
    print "    \"12. Discrepancias: Si notas que la partitura tiene letras explícitamente diferentes al texto plano original (por ejemplo, palabras distintas, versos faltantes), obedece SIEMPRE al texto plano para no romperlo. Haz tu mejor esfuerzo para mapear los acordes sobre el texto plano, pero LISTA TODAS LAS DIFERENCIAS en el arreglo '\\''discrepancias'\\''. Si este arreglo no está vacío, el usuario recibirá una alerta roja de que el resultado no es confiable.\\n\" .";
    print "    \"13. Formato de salida de metadatos al inicio del chordpro: {key: Em}, {tempo: 55}, {time: 6/8}, {ritmo: Balada}, {intro: [Em][C]...}. (Nota: Si el ritmo estaba vacío en la partitura, simplemente omite la etiqueta {ritmo}).\\n\\n\" .";
    print "    \"EJEMPLO DE SALIDA MAESTRO 1 (Canción 24):\\n\" .";
    print "    \"{title: He aquí el Cordero de Dios}\\n\" .";
    print "    \"{key: C}\\n\" .";
    print "    \"{tempo: 75}\\n\" .";
    print "    \"{time: 2/4}\\n\\n\" .";
    print "    \"[C9]He aquí el Cor[G/B]dero de Dios [Am] [Am/G]\\n\" .";
    print "    \"Que [F(maj7)]quita el pe[Dm7]cado del [G(sus4)]mundo, [G7]\\n\" .";
    print "    \"[C9]Que murió [G/B]en mi lugar, [Am] [Am/G]\\n\" .";
    print "    \"En[F(maj7)]tonces me pue[Dm7]de perdonar. [G] \\n\\n\" .";
    print "    \"Coro\\n\" .";
    print "    \"[G#°]Clamo a[Am]hora pi[Gm7(add11)]dien[C7]do:\\n\" .";
    print "    \"Ven [F9]a perdonar, (ven [G/F]a perdonar)\\n\" .";
    print "    \"[Em]Purificar, ([Am7]purificar)\\n\" .";
    print "    \"{start_of_intro}Ven [F9]a transformar [G/F]  [E]y renovar, [Am]  [Am/G]\\n\" .";
    print "    \"[Dm7]Ven a [G7]restau[C]rar. [G]{end_of_intro}\\n\\n\" .";
    print "    \"[C9]Delante [G/B]de tu altar [Am]   [Am/G]\\n\" .";
    print "    \"[F(maj7)]Dejo [Dm7]mi ansie[G(sus4)]dad, [G7]\\n\" .";
    print "    \"[C9]Por la san[G/B]gre de Jesús [Am] [Am/G]tengo [F(maj7)]vi [Dm7]- [G]da.\\n\\n\" .";
    print "    \"Coro\\n\" .";
    print "    \"[G#°]Clamo a[Am]hora pi[Gm7(add11)]dien[C7]do:\\n\" .";
    print "    \"Ven [F9]a perdonar, (ven [G/F]a perdonar)\\n\" .";
    print "    \"[Em]Purificar, ([Am7]purificar)\\n\" .";
    print "    \"Ven [F9]a transformar [G/F]   [E]y renovar, [Am][Am/G]\\n\" .";
    print "    \"[Dm7]Ven a [G7]restau[C]rar. [Am]\\n\\n\" .";
    print "    \"Final:\\n\" .";
    print "    \"[Dm7]Ven a [G7]restau[C]rar.\\n\\n\" .";
    print "    \"EJEMPLO DE SALIDA MAESTRO 2 (Canción 442, atención al ritmo y símbolos visuales):\\n\" .";
    print "    \"{title: Más de tu Santo Espíritu (Doble porción)}\\n\" .";
    print "    \"{key: D}\\n\" .";
    print "    \"{tempo: 40}\\n\" .";
    print "    \"{time: 2/2}\\n\" .";
    print "    \"{ritmo: Básico}\\n\\n\" .";
    print "    \"[D]Más de tu San[Em7]to Espí [D/F#]- ritu, [G]danos, Señor,  [A(sus4)] [A]\\n\" .";
    print "    \"[Bm7]Más de los te[G]soros es [D/F#]- condi [Em]- dos de [G/A]tu amor; [A]\\n\" .";
    print "    \"[D]Más, mucho [A/C#]más nos tienes [Bm]para dar\\n\" .";
    print "    \"Si bus[Bm/A]camos sin cesar, [Bm/G#]\\n\" .";
    print "    \"Más, mucho [D/A]más, nos [G/A]quieres ben [A]- decir. [D] [D(sus4)] [D]\\n\\n\" .";
    print "    \"Coro\\n\" .";
    print "    \"Por eso [A/G]te roga [D/F#]- mos, [A/G] con fe ora [D/F#]- mos,\\n\" .";
    print "    \"Mani[Bm7]fiesta de [Bm/A] tu gra [Bm/G#]- cia hoy a[Em/A]quí; [A]\\n\" .";
    print "    \"Da[D/F#]nos do[A/G]ble porción [D/F#] de tu [F#]Santo Espí [F#/A#]- ritu, [Bm]\\n\" .";
    print "    \"[Bm7]Para que [G(sus2)]más, [G] mucho [D/F#]más,\\n\" .";
    print "    \"Te [Em]poda [G/A]- mos servir. [Bm7]\\n\" .";
    print "    \"{start_of_intro}Para que [G(sus2)]más, [G] mucho [D/F#]más,\\n\" .";
    print "    \"Te [Em]poda [G/A]- mos servir. [D]{end_of_intro}\\n\\n\" .";
    print "    \"[D]Ven y re[Em7]vela a es [D/F#]- ta [G]generación [A(sus4)] [A]\\n\" .";
    print "    \"[Bm7]Las maravi[G]llas y [D/F#] seña [Em]- les de la [G/A]salvación; [A]\\n\" .";
    print "    \"[D]Tal como a [A/C#]nuestros padres mos[Bm]traste\\n\" .";
    print "    \"Abun[Bm/A]dante gracia y amor, [Bm/G#]\\n\" .";
    print "    \"Más, mucho [D/A]más, con[G/A]cédenos, [A] Señor. [D] [D(sus4)] [D]\\n\\n\" .";
    print "    \"EJEMPLO DE SALIDA MAESTRO 3 (Canción 29, Versos apilados musicalmente bajo los mismos acordes):\\n\" .";
    print "    \"{title: Oh, Señor, tú eres mi Pastor}\\n\" .";
    print "    \"{key: E}\\n\" .";
    print "    \"{tempo: 60}\\n\" .";
    print "    \"{time: 4/4}\\n\" .";
    print "    \"{ritmo: Básico}\\n\" .";
    print "    \"{intro: [E9][B/D#][C#m7][C#m/B][A][F#m7][A/B]}\\n\\n\" .";
    print "    \"[E9] Oh, Señor, tú eres [E(sus4)]mi Pas[E]tor, [A(maj7)(add9)]\\n\" .";
    print "    \"Nada me faltará. [E/G#]\\n\" .";
    print "    \"[F#m] Estoy sufriendo en el [F#m/E]valle; [B/D#]\\n\" .";
    print "    \"Ven a [A/C#]conso[A6/B]larme. \\n\\n\" .";
    print "    \"[E9] Todos los días [E(sus4)]sien[E]to [A(maj7)(add9)] tu bondad \\n\" .";
    print "    \"Y misericordia que me [E/G#]siguen. [F#m]\\n\" .";
    print "    \"Yo no teme[F#m/E]ré [B/D#]\\n\" .";
    print "    \"Y la vic[A/C#]toria al[A/B]canza[B7]ré.\\n\\n\" .";
    print "    \"Coro\\n\" .";
    print "    \"[E9]Mas yo tengo que esperar\\n\" .";
    print "    \"Que este [B/D#]tiempo [C#m7]pase,\\n\" .";
    print "    \"Du[C#m/B]rante este [A9]tiempo preciso [E/G#]descan[F#m]sar. \\n\" .";
    print "    \"Je[A/B]sús lleva mi [E9]alma a [B/D#]las aguas tran[C#m]quilas\\n\" .";
    print "    \"Y [C#m/B]por los verdes [A9]pastos, conmigo [E/G#]quéda[F#m7]te. \\n\" .";
    print "    \"En [A/B]ti descansa[E9]ré. \\n\\n\" .";
    print "    \"Instrumentos: [B/D#][C#m7][C#m/B][A][F#m7][A/B]\\n\\n\" .";
    print "    \"Texto Plano proporcionado:\\n\" . $letras;";
    print "    }";
    in_pdf_block = 0;
    print $0;
    next;
}

in_pdf_block && /\$payload = \[/ {
    # Skip until payload definition
    next;
}

in_pdf_block {
    next;
}

!in_pdf_block {
    if ($0 ~ /"inline_data" => \["mime_type" => "application\/pdf", "data" => \$pdfBase64\]/) {
        print "                    [\"inline_data\" => [\"mime_type\" => $mimeType, \"data\" => $pdfBase64]]";
    } else if ($0 ~ /\$resultJson\['\''pdf_url'\''\] = '\'\/assets\/partituras\/'\'' \. \$fileName;/) {
        print "        if ($modo === '\''partitura'\'') {";
        print "            $resultJson['\''pdf_url'\''] = '\''/assets/partituras/'\'' . $fileName;";
        print "        }";
    } else {
        print $0;
    }
}
' > patch_api.php
