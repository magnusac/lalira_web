export function renderFooter() {
  const footerHTML = `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <a href="#" class="logo">
              <img src="../assets/logo.svg" alt="La Lira App" class="logo-icon">
              La Lira App
            </a>
            <p class="footer-desc" data-i18n="footer_desc">La Alabanza en tus manos. Una herramienta simple y moderna diseñada para llevar la adoración contigo a donde vayas.</p>
          </div>

          <div class="footer-legal-col">
            <h4 class="footer-links-title" data-i18n="footer_legal">Legal</h4>
            <ul class="footer-links-list">
              <li><a href="../terms.html" class="footer-link" id="footer-terms-link" data-i18n="footer_terms">Términos y Condiciones</a></li>
              <li><a href="../privacy.html" class="footer-link" id="footer-privacy-link" data-i18n="footer_privacy">Política de Privacidad</a></li>
              <li><a href="mailto:contacto@lalira.app" class="footer-link" data-i18n="footer_support">Contacto de Soporte</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <p data-i18n="copyright">© 2026 La Lira App. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  `;

  const footerContainer = document.getElementById('global-footer');
  if (footerContainer) {
    footerContainer.innerHTML = footerHTML;
  }
}
