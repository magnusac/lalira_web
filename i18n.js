// i18n.js - Client side internationalization system for La Lira landing page
const translations = {
  es: {
    // Nav & Meta
    meta_title: "La Lira App - Himnario & Acordes",
    meta_desc: "La Lira es una aplicación móvil premium para letras y acordes de himnarios y música de adoración. Transpón tonos, crea listas y accede sin conexión.",
    nav_features: "Características",
    nav_faq: "FAQ",
    nav_download: "Descargar App",
    nav_back: "Volver al Inicio",
    back_to_home: "Volver al Inicio",
    copyright: "© 2026 La Lira App. Todos los derechos reservados.",

    // Hero Section
    hero_tag: "Disponible Pronto",
    hero_title: "La Alabanza <br><span>en tus manos.</span>",
    hero_desc: "Tus alabanzas favoritas, siempre contigo. Accede a letras y acordes sin conexión, organiza tus listas al instante y descarga partituras completas para instrumentos y voces en una interfaz simple y moderna.",
    download_app_store: "Disponible pronto en",
    download_google_play: "Disponible pronto en",
    scan_to_download: "Próximamente",
    scan_compatible: "Para dispositivos iOS y Android",

    // Features Section
    features_tag: "Diseñado para la Adoración",
    features_title: "Todo lo que necesitas, dondequiera que estés",
    features_desc: "Hemos desarrollado La Lira desde cero para resolver los problemas reales que enfrentan los músicos durante las sesiones en vivo y los ensayos.",
    
    feat_transpose_title: "Cifras (Hoja de Ruta)",
    feat_transpose_desc: "Las cifras alineadas con las sílabas y la transposición dinámica de tonos están en desarrollo activo y programadas para la versión V3.",
    
    feat_offline_title: "Siempre Disponible",
    feat_offline_desc: "¿Mala señal en la iglesia? No hay problema. La Lira funciona de forma local en tu dispositivo, cargando letras al instante y almacenando todo sin necesidad de internet.",
    
    feat_playlists_title: "Listas de Alabanzas",
    feat_playlists_desc: "Organiza fácilmente listas de alabanzas para los cultos. Arrastra y suelta canciones para reordenarlas, y desliza entre páginas limpiamente durante la adoración.",
    
    feat_search_title: "Búsquedas Avanzadas",
    feat_search_desc: "Encuentra himnos al instante por número, título o letra. Los resultados se filtran de forma rápida y con mejores resultados en los himnarios Principal, Niños y Anexo.",



    // FAQ Section
    faq_tag: "Preguntas Frecuentes",
    faq_title: "¿Tienes Preguntas? Tenemos Respuestas",
    
    faq_1_q: "¿La Lira admite otros idiomas?",
    faq_1_a: "¡Sí! La Lira incluye soporte completo de traducción e himnos en español y portugués, lo que te permite cambiar de biblioteca fácilmente desde el panel de configuración.",
    
    faq_2_q: "¿Cuándo estarán disponibles las cifras y la transposición de tonos?",
    faq_2_a: "La Lira V1.0.0 está enfocada en ofrecer un lector de letras rápido y sin conexión. Las cifras alineadas, importadores ChordPro y transposición de tonos están programados para el lanzamiento de la versión V3.",
    
    faq_3_q: "¿Tiene algún costo usar la aplicación La Lira?",
    faq_3_a: "La Lira es 100% gratuita para descargar y usar de forma local. La sincronización colaborativa de listas y copias de seguridad en la nube están planeadas para un plan premium en la versión V2.",

    // CTA Box
    cta_title: "¿Listo para tener la alabanza en tus manos?",
    cta_desc: "La primera versión de La Lira estará disponible pronto. Prepárate para acceder a tus himnos favoritos de forma fácil y rápida, directamente en tu dispositivo.",

    // Footer Links
    footer_desc: "La Alabanza en tus manos. Una herramienta simple y moderna diseñada para llevar la adoración contigo a donde vayas.",
    footer_resources: "Recursos",
    footer_legal: "Legal",
    footer_terms: "Términos y Condiciones",
    footer_privacy: "Política de Privacidad",
    footer_support: "Contacto de Soporte",

    // Legal Documents Shared
    last_updated: "Última actualización: 1 de junio de 2026",

    // Terms and Conditions page
    terms_title: "Términos y Condiciones - La Lira App",
    terms_h1: "Términos y Condiciones",
    terms_sec1_h2: "1. Aceptación de los Términos",
    terms_sec1_p: "Al descargar, instalar o utilizar La Lira App (en adelante, 'la Aplicación'), usted ('el Usuario') acepta quedar vinculado por estos Términos y Condiciones de Uso (en adelante, 'los Términos'). Si no está de acuerdo con alguna de estas disposiciones, deberá abstenerse de usar la Aplicación.<br><br>Estos Términos constituyen un acuerdo legal entre el Usuario y el Titular, con domicilio en Chile, y se rigen íntegramente por las leyes de la República de Chile.",
    terms_sec2_h2: "2. Descripción del Servicio",
    terms_sec2_p: "La Lira App es una aplicación móvil gratuita que proporciona acceso a un repertorio de himnos, incluyendo letras y textos litúrgicos. La Aplicación se ofrece sin costo para el Usuario y no despliega publicidad de ningún tipo.<br><br>El acceso a la Aplicación y a la totalidad de su contenido —letras de himnos y textos litúrgicos— es permanentemente gratuito. La Aplicación no contiene publicidad ni ofrece compras dentro de la aplicación en esta versión.",
    terms_sec3_h2: "3. Definiciones",
    terms_sec3_p: "Para efectos de estos Términos:<br><br><strong>La Lira App / la Aplicación:</strong> el software móvil denominado La Lira App, disponible en plataformas iOS y Android, desarrollado y operado por el Titular.<br><strong>Contenido:</strong> las letras de himnos y textos litúrgicos disponibles en la Aplicación, siempre de acceso gratuito.<br><strong>Dominio Público:</strong> condición de una obra cuya letra, melodía y arreglo han sido publicados antes de 1930, liberándola de restricciones de derechos de autor conforme a la legislación aplicable.<br><strong>Titular:</strong> el propietario y operador de La Lira App.<br><strong>Usuario:</strong> toda persona natural que descargue, instale o utilice la Aplicación.",
    terms_sec4_h2: "4. Licencia de Uso",
    terms_sec4_p: "El Titular otorga al Usuario una licencia limitada, personal, no exclusiva, no transferible y revocable para utilizar la Aplicación con fines personales, litúrgicos o educativos, de conformidad con estos Términos.<br><br>Esta licencia no transfiere al Usuario ningún derecho de propiedad sobre la Aplicación ni sobre el Contenido que ella alberga.",
    terms_sec5_h2: "5. Acceso al Contenido",
    terms_sec5_p: "El Titular garantiza que la totalidad del Contenido de La Lira App es de acceso libre y gratuito para todos los Usuarios. Ningún himno, letra ni texto quedará bloqueado, restringido ni condicionado por razones económicas. Las actualizaciones del Contenido —nuevos himnos, correcciones de letra— serán igualmente gratuitas. La Aplicación no requiere registro para acceder al Contenido en esta versión.",
    terms_sec6_h2: "6. Derechos de Autor del Contenido",
    terms_sec6_p: "Los himnos y textos en dominio público —cuya letra, melodía y arreglo original son anteriores a 1930— se reproducen sin restricción de derechos de autor, de conformidad con la legislación aplicable. Los himnos o arreglos sujetos a derechos de autor vigentes se incluyen bajo las licencias correspondientes obtenidas por el Titular. El estado de cada himno —dominio público o con licencia— se indica en su ficha informativa dentro de la Aplicación.<br><br>El Usuario no adquiere ningún derecho de reproducción, distribución ni ejecución pública sobre el Contenido por el solo uso de la Aplicación. La impresión, copia o uso del Contenido en contextos de ejecución pública puede requerir licencias adicionales ante organismos de gestión colectiva que el Usuario deberá gestionar por su cuenta.",
    terms_sec7_h2: "7. Propiedad Intelectual de la Aplicación",
    terms_sec7_p: "La Aplicación en sí misma —incluyendo su código fuente, diseño, interfaces, logotipos y nombre La Lira App— es propiedad exclusiva del Titular y está protegida por las leyes de propiedad intelectual. Queda expresamente prohibida su reproducción, modificación o distribución sin autorización escrita del Titular.",
    terms_sec8_h2: "8. Conducta del Usuario",
    terms_sec8_p: "El Usuario se compromete a:<br>• Utilizar La Lira App exclusivamente para fines personales, litúrgicos o educativos.<br>• No reproducir, distribuir ni ejecutar públicamente el Contenido protegido por derechos de autor sin contar con las licencias correspondientes.<br>• No intentar extraer ni redistribuir el Contenido de la Aplicación de forma masiva o automatizada.<br>• No realizar ingeniería inversa sobre el software de la Aplicación.<br>• No interferir con el funcionamiento de la Aplicación, sus servidores o redes asociadas.",
    terms_sec9_h2: "9. Servicios de Terceros",
    terms_sec9_p: "La Aplicación puede contener enlaces a sitios web o servicios de terceros. El Titular no tiene control sobre el contenido ni las prácticas de dichos terceros y no asume responsabilidad alguna respecto de ellos. El acceso a servicios de terceros es de exclusiva responsabilidad del Usuario.",
    terms_sec10_h2: "10. Descargo de Garantías",
    terms_sec10_p: "La Aplicación se proporciona 'tal cual' y 'según disponibilidad'. El Titular no garantiza que La Lira App estará libre de errores o interrupciones en todo momento. El uso de la Aplicación es bajo el exclusivo riesgo del Usuario.<br><br>El Titular no garantiza la exactitud absoluta de la clasificación de dominio público de cada himno, aunque adopta medidas razonables de verificación.",
    terms_sec11_h2: "11. Limitación de Responsabilidad",
    terms_sec11_p: "En la máxima medida permitida por la ley, el Titular no será responsable por: el uso del Contenido por el Usuario en contextos que requieran licencias adicionales de ejecución pública; daños indirectos, incidentales, especiales o consecuentes derivados del uso o imposibilidad de uso de la Aplicación; interrupciones del servicio por causas ajenas al Titular, incluyendo fallas de conectividad o mantenimiento de infraestructura de terceros.",
    terms_sec12_h2: "12. Terminación del Acceso",
    terms_sec12_p: "El Titular podrá suspender o terminar el acceso de un Usuario a la Aplicación en caso de incumplimiento grave de estos Términos, especialmente en lo relativo a la conducta del Usuario, sin perjuicio de las acciones legales que correspondan.",
    terms_sec13_h2: "13. Privacidad y Datos Personales",
    terms_sec13_p: "El tratamiento de los datos personales del Usuario se rige por la Política de Privacidad de La Lira App. En esta versión, la Aplicación no requiere registro para acceder al Contenido. Los datos recopilados se limitan a los estrictamente necesarios para el funcionamiento técnico, conforme a lo detallado en la Política de Privacidad.",
    terms_sec14_h2: "14. Modificaciones a estos Términos",
    terms_sec14_p: "El Titular se reserva el derecho de modificar estos Términos en cualquier momento. Toda modificación será notificada al Usuario mediante aviso dentro de la Aplicación con un mínimo de 15 días de anticipación a su entrada en vigor. El uso continuado de La Lira App tras la notificación implica la aceptación de los Términos modificados.",
    terms_sec15_h2: "15. Divisibilidad",
    terms_sec15_p: "Si alguna disposición de estos Términos fuere declarada inválida o inaplicable por un tribunal competente, dicha disposición será modificada en la medida mínima necesaria para hacerla aplicable, y las restantes disposiciones continuarán en pleno vigor.",
    terms_sec16_h2: "16. Ley Aplicable y Jurisdicción",
    terms_sec16_p: "Estos Términos se rigen e interpretan de conformidad con las leyes de la República de Chile. Para la resolución de cualquier controversia derivada del uso de la Aplicación o de la interpretación de estos Términos, las partes se someten a la jurisdicción de los Tribunales Ordinarios de Justicia de la ciudad de Santiago, Chile.",
    terms_sec17_h2: "17. Información de Contacto",
    terms_sec17_p: "Para cualquier pregunta relacionada con estos Términos y Condiciones, póngase en contacto con nosotros en:",

    // Privacy Policy page
    privacy_title: "Política de Privacidad - La Lira",
    privacy_h1: "Política de Privacidad",
    privacy_sec1_h2: "1. Introducción",
    privacy_sec1_p: "La Lira ('nosotros', 'nuestro') valora su privacidad. Esta Política de Privacidad describe qué información recopilamos, cómo la almacenamos y utilizamos, y sus opciones con respecto a sus datos personales al usar la aplicación móvil La Lira y la página web asociada.",
    privacy_sec2_h2: "2. Información que Recopilamos",
    privacy_sec2_p: "Recopilamos datos para proporcionar una experiencia de visualización de cantos mejor y más personalizada. Esto incluye:",
    privacy_sec2_li1: "<strong>Información de la Cuenta:</strong> Si se registra para las funciones de nube premium, recopilamos su nombre, dirección de correo electrónico y tokens de autenticación.",
    privacy_sec2_li2: "<strong>Personalizaciones del Usuario:</strong> Almacenamos listas locales de sus himnos favoritos, listas de reproducción personalizadas (setlists), importaciones de cantos propios y ajustes del tono seleccionado.",
    privacy_sec2_li3: "<strong>Datos de Uso y del Dispositivo:</strong> Podemos recopilar datos de uso del sistema anonimizados, como el modelo del dispositivo, la versión del sistema operativo y diagnósticos de errores para ayudarnos a solucionar fallas.",
    privacy_sec3_h2: "3. Cómo Utilizamos sus Datos",
    privacy_sec3_p: "Utilizamos la información recopilada para los siguientes propósitos:",
    privacy_sec3_li1: "Para sincronizar sus listas de canciones favoritas y setlists en todos sus dispositivos.",
    privacy_sec3_li2: "Para enviar actualizaciones del sistema y alertas de seguridad.",
    privacy_sec3_li3: "Para monitorear el rendimiento de la aplicación y prevenir fallas técnicas durante cultos o ensayos.",
    privacy_sec3_li4: "Para procesar suscripciones de forma segura a través de las plataformas App Store y Google Play.",
    privacy_sec4_h2: "4. Compartir Datos y Terceros",
    privacy_sec4_p: "No vendemos, alquilamos ni arrendamos su información personal a terceros. Los datos analíticos anonimizados pueden compartirse con proveedores de análisis de confianza (por ejemplo, Firebase Crashlytics) únicamente para diagnosticar errores de software y analizar tendencias de uso del aplicativo.",
    privacy_sec5_h2: "5. Seguridad de los Datos",
    privacy_sec5_p: "Implementamos protocolos de cifrado estándar de la industria (SSL/TLS) para los datos transferidos entre la Aplicación y nuestro almacenamiento en la nube. Las bases de datos locales guardadas en su dispositivo físico están protegidas por los controles nativos del sistema de archivos de iOS y Android.",
    privacy_sec6_h2: "6. Sus Derechos",
    privacy_sec6_p: "Tiene derecho a acceder, editar o eliminar cualquier información personal almacenada en su cuenta de La Lira. Puede solicitar la eliminación de su cuenta y los datos de respaldo asociados en cualquier momento enviando un correo electrónico a nuestro equipo de soporte o seleccionando el botón 'Eliminar cuenta' dentro del panel de configuración de la aplicación.",
    privacy_sec7_h2: "7. Información de Contacto",
    privacy_sec7_p: "Si tiene alguna pregunta o comentario sobre esta Política de Privacidad, póngase en contacto con nosotros en:"
  },
  pt: {
    // Nav & Meta
    meta_title: "La Lira App - Hinário & Acordes",
    meta_desc: "La Lira é um aplicativo móvel premium para letras e cifras de hinários e música de adoração. Transponha tons, crie playlists e acesse offline.",
    nav_features: "Recursos",
    nav_faq: "FAQ",
    nav_download: "Baixar App",
    nav_back: "Voltar ao Início",
    back_to_home: "Voltar ao Início",
    copyright: "© 2026 La Lira App. Todos os direitos reservados.",

    // Hero Section
    hero_tag: "Disponível em Breve",
    hero_title: "O Louvor <br><span>em suas mãos.</span>",
    hero_desc: "Seus louvores favoritos, sempre com você. Acesse letras e acordes sem conexão, organize suas listas instantaneamente e baixe partituras completas para instrumentos e vozes em uma interface simples e moderna.",
    download_app_store: "Disponível em breve na",
    download_google_play: "Disponível em breve no",
    scan_to_download: "Em Breve",
    scan_compatible: "Para dispositivos iOS e Android",

    // Features Section
    features_tag: "Projetado para Adoração",
    features_title: "Tudo o que você precisa, onde quer que esteja",
    features_desc: "Desenvolvemos o La Lira do zero para resolver os problemas reais que os músicos enfrentam em apresentações ao vivo e ensaios.",
    
    feat_transpose_title: "Cifras (Roadmap)",
    feat_transpose_desc: "Cifras alinhadas por sílaba e transposição dinâmica de tons estão em desenvolvimento ativo e planejadas para a versão V3.",
    
    feat_offline_title: "Sempre Disponível",
    feat_offline_desc: "Sinal ruim na igreja? Sem problemas. O La Lira funciona de forma local no seu dispositivo, carregando as letras instantaneamente e armazenando tudo sem necessidade de internet.",
    
    feat_playlists_title: "Listas de Louvores",
    feat_playlists_desc: "Monte e ordene facilmente listas de hinos para os cultos. Arraste e solte músicas para reordená-las e passe de página de forma limpa durante a adoração.",
    
    feat_search_title: "Buscas Avançadas",
    feat_search_desc: "Encontre hinos instantaneamente por número, título ou letra. Os resultados são filtrados de forma rápida e com melhores resultados nos hinários Principal, Infantil e Anexo.",



    // FAQ Section
    faq_tag: "Perguntas Frequentes",
    faq_title: "Dúvidas? Nós Temos as Respostas",
    
    faq_1_q: "O La Lira suporta outros idiomas?",
    faq_1_a: "Sim! O La Lira oferece suporte completo de tradução e hinários em espanhol e português, permitindo que você alterne as bibliotecas facilmente no painel de configurações.",
    
    faq_2_q: "Quando as cifras e a transposição de tons estarão disponíveis?",
    faq_2_a: "O La Lira V1.0.0 é focado em oferecer um leitor de letras rápido e offline. Cifras alinhadas, importadores ChordPro e transposição de tons estão planejados para o lançamento da versão V3.",
    
    faq_3_q: "O aplicativo La Lira é gratuito?",
    faq_3_a: "O La Lira é 100% gratuito para baixar e usar localmente. O compartilhamento de listas colaborativas e backup em nuvem estão planejados para um plano premium na versão V2.",

    // CTA Box
    cta_title: "Pronto para ter o louvor em suas mãos?",
    cta_desc: "A primeira versão do La Lira estará disponível em breve. Prepare-se para acessar seus hinos favoritos de forma fácil e rápida, diretamente no seu dispositivo.",

    // Footer Links
    footer_desc: "O Louvor em suas mãos. Uma ferramenta simples e moderna projetada para levar a adoração com você aonde for.",
    footer_resources: "Recursos",
    footer_legal: "Legal",
    footer_terms: "Termos e Condições",
    footer_privacy: "Política de Privacidade",
    footer_support: "Contato de Suporte",

    // Legal Documents Shared
    last_updated: "Última atualização: 1 de junho de 2026",

    // Terms and Conditions page
    terms_title: "Termos e Condições - La Lira App",
    terms_h1: "Termos e Condições",
    terms_sec1_h2: "1. Aceitação dos Termos",
    terms_sec1_p: "Ao baixar, instalar ou usar o La Lira App (doravante denominado 'o Aplicativo'), você ('o Usuário') aceita ficar vinculado por estes Termos e Condições de Uso (doravante denominados 'os Termos'). Se você não concordar com qualquer uma destas disposições, deverá abster-se de usar o Aplicativo.<br><br>Estes Termos constituem um acordo legal entre o Usuário e o Titular, com domicílio no Chile, e são regidos inteiramente pelas leis da República do Chile.",
    terms_sec2_h2: "2. Descrição do Serviço",
    terms_sec2_p: "O La Lira App é um aplicativo móvel gratuito que fornece acesso a um repertório de hinos, incluindo letras e textos litúrgicos. O Aplicativo é oferecido sem custos para o Usuário e não exibe publicidade de nenhum tipo.<br><br>O acesso ao Aplicativo e à totalidade do seu conteúdo —letras de hinos e textos litúrgicos— é permanentemente gratuito. O Aplicativo não contém publicidade nem oferece compras dentro do aplicativo nesta versão.",
    terms_sec3_h2: "3. Definições",
    terms_sec3_p: "Para os efeitos destes Termos:<br><br><strong>La Lira App / o Aplicativo:</strong> o software móvel denominado La Lira App, disponível nas plataformas iOS e Android, desenvolvido e operado pelo Titular.<br><strong>Conteúdo:</strong> as letras de hinos e textos litúrgicos disponíveis no Aplicativo, sempre de acesso gratuito.<br><strong>Domínio Público:</strong> condição de uma obra cuja letra, melodia e arranjo foram publicados antes de 1930, liberando-a de restrições de direitos autorais de acordo com a legislação aplicável.<br><strong>Titular:</strong> o proprietário e operador do La Lira App.<br><strong>Usuário:</strong> toda pessoa física que baixe, instale ou use o Aplicativo.",
    terms_sec4_h2: "4. Licença de Uso",
    terms_sec4_p: "O Titular concede ao Usuário uma licença limitada, pessoal, não exclusiva, não transferível e revogável para usar o Aplicativo para fins pessoais, litúrgicos ou educacionais, em conformidade com estes Termos.<br><br>Esta licença não transfere ao Usuário nenhum direito de propriedade sobre o Aplicativo ou sobre o Conteúdo que ele hospeda.",
    terms_sec5_h2: "5. Acesso ao Conteúdo",
    terms_sec5_p: "O Titular garante que a totalidade do Conteúdo do La Lira App é de acesso livre e gratuito para todos os Usuários. Nenhum hino, letra ou texto será bloqueado, restrito ou condicionado por razões econômicas. As atualizações de Conteúdo —novos hinos, correções de letras— serão igualmente gratuitas. O Aplicativo não requer registro para acessar o Conteúdo nesta versão.",
    terms_sec6_h2: "6. Direitos Autorais do Conteúdo",
    terms_sec6_p: "Os hinos e textos em domínio público —cuja letra, melodia e arranjo original são anteriores a 1930— são reproduzidos sem restrição de direitos autorais, de acordo com a legislação aplicável. Os hinos ou arranjos sujeitos a direitos autorais vigentes são incluídos sob as licenças correspondentes obtidas pelo Titular. O status de cada hino —domínio público ou licenciado— é indicado em sua ficha informativa no Aplicativo.<br><br>O Usuário não adquire nenhum direito de reprodução, distribuição ou execução pública sobre o Conteúdo pelo simples uso do Aplicativo. A impressão, cópia ou uso do Conteúdo em contextos de execução pública pode exigir licenças adicionais de órgãos de gestão coletiva que o Usuário deverá gerenciar por conta própria.",
    terms_sec7_h2: "7. Propriedade Intelectual do Aplicativo",
    terms_sec7_p: "O Aplicativo em si —incluindo seu código-fonte, design, interfaces, logotipos e o nome La Lira App— é de propriedade exclusiva do Titular e está protegido pelas leis chilenas e internacionais de propriedade intelectual. É expressamente proibida sua reprodução, modificação ou distribuição sem autorização por escrito do Titular.",
    terms_sec8_h2: "8. Conduta do Usuário",
    terms_sec8_p: "O Usuário compromete-se a:<br>• Usar o La Lira App exclusivamente para fins pessoais, litúrgicos ou educacionais.<br>• Não reproduzir, distribuir ou executar publicamente o Conteúdo protegido por direitos autorais sem as devidas licenças.<br>• Não tentar extrair ou redistribuir o Conteúdo do Aplicativo de forma massiva ou automatizada.<br>• Não realizar engenharia reversa no software do Aplicativo.<br>• Não interferir no funcionamento do Aplicativo, de seus servidores ou redes associadas.",
    terms_sec9_h2: "9. Serviços de Terceiros",
    terms_sec9_p: "O Aplicativo pode conter links para sites ou serviços de terceiros. O Titular não tem controle sobre o conteúdo ou práticas de terceiros e não assume qualquer responsabilidade por eles. O acesso a serviços de terceiros é de inteira responsabilidade do Usuário.",
    terms_sec10_h2: "10. Isenção de Garantias",
    terms_sec10_p: "O Aplicativo é fornecido 'como está' e 'conforme disponível'. O Titular não garante que o La Lira App estará livre de erros ou interrupções em todos os momentos. O uso do Aplicativo é de inteira responsabilidade e risco do Usuário.<br><br>O Titular não garante a precisão absoluta da classificação de domínio público de cada hino, embora adote medidas razoáveis de verificação.",
    terms_sec11_h2: "11. Limitação de Responsabilidade",
    terms_sec11_p: "Na extensão máxima permitida pela lei, o Titular não será responsável por: o uso do Conteúdo pelo Usuário em contextos que exijam licenças adicionais de execução pública; danos indiretos, incidentais, especiais ou consequentes decorrentes do uso ou da impossibilidade de uso do Aplicativo; interrupções do serviço por causas alheias ao Titular, incluindo falhas de conexão ou manutenção da infraestrutura de terceiros.",
    terms_sec12_h2: "12. Rescisão do Acesso",
    terms_sec12_p: "O Titular poderá suspender ou rescindir o acesso de um Usuário ao Aplicativo em caso de descumprimento grave destes Termos, especialmente quanto à conduta do Usuário, sem prejuízo das ações legais cabíveis.",
    terms_sec13_h2: "13. Privacidade e Dados Pessoais",
    terms_sec13_p: "O tratamento dos dados pessoais do Usuário é regido pela Política de Privacidade do La Lira App. Nesta versão, o Aplicativo não requer registro para acessar o Conteúdo. Os dados coletados limitam-se aos estritamente necessários para o funcionamento técnico, conforme detalhado na Política de Privacidade.",
    terms_sec14_h2: "14. Modificações destes Termos",
    terms_sec14_p: "O Titular reserva-se o direito de modificar estes Termos a qualquer momento. Qualquer modificação será notificada ao Usuário mediante aviso no Aplicativo com, no mínimo, 15 dias de antecedência antes de entrar em vigor. O uso contínuo do La Lira App após a notificação implica a aceitação dos Termos modificados.",
    terms_sec15_h2: "15. Divisibilidade",
    terms_sec15_p: "Se qualquer disposição destes Termos for declarada inválida ou inexequível por um tribunal competente, tal disposição será modificada na extensão mínima necessária para torná-la aplicável, e as demais disposições continuarão em vigor.",
    terms_sec16_h2: "16. Lei Aplicável e Jurisdição",
    terms_sec16_p: "Estes Termos são regidos e interpretados de acordo com as leis da República do Chile. Para a resolução de qualquer controvérsia decorrente do uso do Aplicativo ou da interpretação destes Termos, as partes se submetem à jurisdição dos Tribunais Ordinários de Justiça da cidade de Santiago, Chile.",
    terms_sec17_h2: "17. Informação de Contato",
    terms_sec17_p: "Para dúvidas sobre estes Termos, direitos autorais ou suporte técnico, entre em contato em:",

    // Privacy Policy page
    privacy_title: "Política de Privacidade - La Lira",
    privacy_h1: "Política de Privacidade",
    privacy_sec1_h2: "1. Introdução",
    privacy_sec1_p: "O La Lira ('nós', 'nosso') valoriza sua privacidade. Esta Política de Privacidade descreve quais informações coletamos, como as armazenamos e usamos, e suas opções em relação aos seus dados pessoais ao usar o aplicativo móvel La Lira e a página web associada.",
    privacy_sec2_h2: "2. Informações que Coletamos",
    privacy_sec2_p: "Coletamos dados para fornecer uma experiência de visualização de hinos melhor e mais personalizada. Isso inclui:",
    privacy_sec2_li1: "<strong>Informações da Conta:</strong> Se você se registrar para os recursos de nuvem premium, coletamos seu nome, endereço de e-mail e tokens de autenticação.",
    privacy_sec2_li2: "<strong>Personalizações do Usuário:</strong> Armazenamos listas locais de seus hinos favoritos, listas de reprodução personalizadas (setlists), importações de músicas próprias e ajustes de transposição de tons.",
    privacy_sec2_li3: "<strong>Dados de Uso e do Dispositivo:</strong> Podemos coletar dados de uso do sistema anonimizados, como o modelo do dispositivo, versão do sistema operacional e diagnósticos de travamentos para nos ajudar a corrigir falhas.",
    privacy_sec3_h2: "3. Como Usamos seus Dados",
    privacy_sec3_p: "Usamos as informações coletadas para os seguintes propósitos:",
    privacy_sec3_li1: "Para sincronizar suas listas de músicas favoritas e setlists em todos os seus dispositivos.",
    privacy_sec3_li2: "Para enviar atualizações do sistema e alertas de segurança.",
    privacy_sec3_li3: "Para monitorar o desempenho do aplicativo e prevenir falhas técnicas durante cultos ou ensaios.",
    privacy_sec3_li4: "Para processar assinaturas de forma segura através das plataformas App Store e Google Play.",
    privacy_sec4_h2: "4. Compartilhamento de Dados e Terceiros",
    privacy_sec4_p: "Não vendemos, alugamos ou arrendamos suas informações pessoais para terceiros. Dados analíticos anonimizados podem ser compartilhados com provedores de análise confiáveis (por exemplo, Firebase Crashlytics) unicamente para diagnosticar erros de software e analisar tendências de uso do aplicativo.",
    privacy_sec5_h2: "5. Segurança dos Dados",
    privacy_sec5_p: "Implementamos protocolos de criptografia padrão da indústria (SSL/TLS) para dados transferidos entre o Aplicativo e nosso armazenamento em nuvem. Os bancos de dados locais armazenados em seu dispositivo físico são protegidos pelos controles nativos do sistema de arquivos do iOS e Android.",
    privacy_sec6_h2: "6. Seus Direitos",
    privacy_sec6_p: "Você tem o direito de acessar, editar ou excluir qualquer informação pessoal armazenada em sua conta do La Lira. Você pode solicitar a exclusão de sua conta e dos dados de backup associados a qualquer momento enviando um e-mail para nossa equipe de suporte ou selecionando o botão 'Excluir conta' no painel de configurações do aplicativo.",
    privacy_sec7_h2: "7. Informações de Contato",
    privacy_sec7_p: "Se você tiver alguma dúvida ou comentário sobre esta Política de Privacidade, entre em contato conosco em:"
  }
};

function applyTranslations(lang) {
  // Translate title tags
  const titleEl = document.querySelector('title');
  if (titleEl && translations[lang][titleEl.getAttribute('data-i18n') || 'meta_title']) {
    titleEl.textContent = translations[lang][titleEl.getAttribute('data-i18n') || 'meta_title'];
  }
  
  // Translate meta description tag
  const descEl = document.querySelector('meta[name="description"]');
  if (descEl && translations[lang]['meta_desc']) {
    descEl.setAttribute('content', translations[lang]['meta_desc']);
  }

  // Translate all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang][key]) {
      el.innerHTML = translations[lang][key];
    }
  });

  // Update active state on language switcher buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    if (btn.getAttribute('data-lang') === lang) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function initLang() {
  let savedLang = localStorage.getItem('la-lira-lang');
  
  // Fallback to browser language if no preference is saved
  if (!savedLang) {
    const browserLang = navigator.language || navigator.userLanguage;
    savedLang = browserLang.startsWith('pt') ? 'pt' : 'es';
  }

  // Ensure language switch buttons are working
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const selected = btn.getAttribute('data-lang');
      localStorage.setItem('la-lira-lang', selected);
      applyTranslations(selected);
    });
  });

  // Apply initial translations
  applyTranslations(savedLang);
}

// Initialize on DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  initLang();
});
