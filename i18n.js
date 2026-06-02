// i18n.js - Client side internationalization system for La Lira landing page
const translations = {
  es: {
    // Nav & Meta
    meta_title: "La Lira - Himnario & Acordes Aplicación Móvil",
    meta_desc: "La Lira es una aplicación móvil premium para letras y acordes de himnarios y música de adoración. Transpón tonos, crea listas y accede sin conexión.",
    nav_features: "Características",
    nav_faq: "FAQ",
    nav_download: "Descargar App",
    nav_back: "Volver al Inicio",
    back_to_home: "Volver al Inicio",
    copyright: "© 2026 La Lira. Todos los derechos reservados.",

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
    footer_desc: "La Alabanza en tus manos.",
    footer_resources: "Recursos",
    footer_legal: "Legal",
    footer_terms: "Términos y Condiciones",
    footer_privacy: "Política de Privacidad",
    footer_support: "Contacto de Soporte",

    // Legal Documents Shared
    last_updated: "Última actualización: 1 de junio de 2026",

    // Terms and Conditions page
    terms_title: "Términos y Condiciones - La Lira",
    terms_h1: "Términos y Condiciones",
    terms_sec1_h2: "1. Aceptación de los Términos",
    terms_sec1_p: "Al descargar, instalar o utilizar la aplicación móvil La Lira ('Aplicación', 'Servicio'), usted acepta estar sujeto a estos Términos y Condiciones. Si no está de acuerdo con estos términos, no descargue ni utilice la Aplicación.",
    terms_sec2_h2: "2. Licencia de Uso",
    terms_sec2_p: "Le otorgamos una licencia limitada, no exclusiva, no transferible y revocable para utilizar la Aplicación para sus fines personales y no comerciales en dispositivos móviles compatibles de su propiedad o bajo su control.",
    terms_sec2_li1: "Modificar, adaptar, traducir o realizar ingeniería inversa de cualquier parte de la Aplicación.",
    terms_sec2_li2: "Distribuir, alquilar, sublicenciar o arrendar la Aplicación a terceros.",
    terms_sec2_li3: "Intentar eludir las medidas de seguridad integradas en el Servicio.",
    terms_sec3_h2: "3. Contenido de Usuario y Propiedad Intelectual",
    terms_sec3_p1: "La Aplicación le permite visualizar letras de himnos y, en versiones futuras, importar sus propias cifras en formato de texto ('Contenido de Usuario'). Usted conserva todos los derechos de propiedad del Contenido de Usuario que cargue o cree.",
    terms_sec3_p2: "La Lira no distribuye, aloja ni pone a disposición del público partituras o letras protegidas por derechos de autor sin autorización. Usted es el único responsable de garantizar que tiene el derecho legal de importar y visualizar cualquier canción personalizada en la base de datos de su dispositivo personal.",
    terms_sec4_h2: "4. Suscripciones y Facturación",
    terms_sec4_p: "La Lira ofrece un plan gratuito, así como un plan premium opcional facturado mensual o anualmente. Las suscripciones se renuevan automáticamente a través de su cuenta de Apple App Store o Google Play Store a menos que se cancelen al menos 24 horas antes de la fecha de renovación. Los pagos se gestionan de forma segura a través de las plataformas de cobro de App Store y Google Play.",
    terms_sec5_h2: "5. Limitación de Responsabilidad",
    terms_sec5_p: "La Aplicación se proporciona 'tal cual' y 'según disponibilidad' sin garantías de ningún tipo. La Lira no será responsable de ningún daño directo, indirecto, incidental o consecuente resultante del uso o la imposibilidad de usar la Aplicación, incluidas las interrupciones de rendimiento durante cultos en vivo o ensayos.",
    terms_sec6_h2: "6. Actualizaciones y Modificaciones",
    terms_sec6_p: "Nos reservamos el derecho de modificar estos Términos en cualquier momento. Los cambios se publicarán en esta página y serán efectivos de inmediato. El uso continuado de La Lira tras las modificaciones constituye la aceptación de los Términos actualizados.",
    terms_sec7_h2: "7. Información de Contacto",
    terms_sec7_p: "Para cualquier pregunta relacionada con estos Términos y Condiciones, póngase en contacto con nosotros en:",

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
    meta_title: "La Lira - Hinário & Acordes Aplicativo Móvel",
    meta_desc: "La Lira é um aplicativo móvel premium para letras e cifras de hinários e música de adoração. Transponha tons, crie playlists e acesse offline.",
    nav_features: "Recursos",
    nav_faq: "FAQ",
    nav_download: "Baixar App",
    nav_back: "Voltar ao Início",
    back_to_home: "Voltar ao Início",
    copyright: "© 2026 La Lira. Todos os direitos reservados.",

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
    footer_desc: "O Louvor em suas mãos.",
    footer_resources: "Recursos",
    footer_legal: "Legal",
    footer_terms: "Termos e Condições",
    footer_privacy: "Política de Privacidade",
    footer_support: "Contato de Suporte",

    // Legal Documents Shared
    last_updated: "Última atualização: 1 de junho de 2026",

    // Terms and Conditions page
    terms_title: "Termos e Condições - La Lira",
    terms_h1: "Termos e Condições",
    terms_sec1_h2: "1. Aceitação dos Termos",
    terms_sec1_p: "Ao baixar, instalar ou usar o aplicativo móvel La Lira ('Aplicativo', 'Serviço'), você concorda em cumprir estes Termos e Condições. Se você não concorda com estes termos, não baixe ou use o Aplicativo.",
    terms_sec2_h2: "2. Licença de Uso",
    terms_sec2_p: "Concedemos a você uma licença limitada, não exclusiva, não transferível e revogável para usar o Aplicativo para fins pessoais e não comerciais em dispositivos móveis compatíveis de sua propriedade ou sob seu controle.",
    terms_sec2_li1: "Modificar, adaptar, traduzir ou fazer engenharia reversa de qualquer parte do Aplicativo.",
    terms_sec2_li2: "Distribuir, alugar, sublicenciar ou arrendar o Aplicativo para terceiros.",
    terms_sec2_li3: "Tentar burlar as medidas de segurança integradas ao Serviço.",
    terms_sec3_h2: "3. Conteúdo do Usuário e Propriedade Intelectual",
    terms_sec3_p1: "O Aplicativo permite que você visualize letras de hinos e, em versões futuras, importe suas próprias cifras em formato de texto ('Conteúdo do Usuário'). Você retém todos os direitos de propriedade sobre o Conteúdo do Usuário que enviar ou criar.",
    terms_sec3_p2: "O La Lira não distribui, hospeda ou disponibiliza ao público partituras ou letras protegidas por direitos autorais sem autorização. Você é o único responsável por garantir que possui o direito legal de importar e visualizar qualquer música personalizada no banco de dados do seu dispositivo pessoal.",
    terms_sec4_h2: "4. Assinaturas e Faturamento",
    terms_sec4_p: "O La Lira oferece um plano gratuito, bem como um plano premium opcional faturado mensal ou anualmente. As assinaturas são renovadas automaticamente por meio de sua conta da Apple App Store ou Google Play Store, a menos que sejam canceladas pelo menos 24 horas antes da data de renovação. Os pagamentos são processados de forma segura pelas plataformas de cobrança da App Store e Google Play.",
    terms_sec5_h2: "5. Limitação de Responsabilidade",
    terms_sec5_p: "O Aplicativo é fornecido 'como está' e 'conforme disponível', sem garantias de qualquer tipo. O La Lira não será responsável por quaisquer danos diretos, indiretos, incidentais ou consequentes resultantes do uso ou da incapacidade de usar o Aplicativo, incluindo falhas de funcionamento durante cultos ao vivo ou ensaios.",
    terms_sec6_h2: "6. Atualizações e Modificações",
    terms_sec6_p: "Reservamo-nos o direito de modificar estes Termos a qualquer momento. As alterações serão publicadas nesta página e entrarão em vigor imediatamente. O uso contínuo do La Lira após as modificações constitui a aceitação dos Termos atualizados.",
    terms_sec7_h2: "7. Informações de Contato",
    terms_sec7_p: "Para qualquer dúvida sobre estes Termos e Condições, entre em contato conosco em:",

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
