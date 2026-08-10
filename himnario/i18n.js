// himnario/i18n.js

let translations = {};
let currentAppLanguage = 'es';

// Resolve nested keys e.g. "home.hymn_of_day"
function getNestedValue(obj, keyPath) {
  return keyPath.split('.').reduce((o, k) => (o || {})[k], obj);
}

// Global translation function
window.t = function(key, fallback) {
  const value = getNestedValue(translations, key);
  return value !== undefined ? value : (fallback || key);
};

// Scan the DOM and apply translations to elements with data-i18n
window.applyTranslations = function() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translatedText = window.t(key);
    
    if (translatedText !== key) {
      if (el.tagName === 'INPUT' && el.getAttribute('type') === 'text') {
        el.setAttribute('placeholder', translatedText);
      } else {
        el.innerHTML = translatedText;
      }
    }
  });
};

// Change language globally
window.setAppLanguage = async function(lang) {
  try {
    const res = await fetch(`locales/${lang}.json`);
    if (!res.ok) throw new Error('Locale not found');
    translations = await res.json();
    currentAppLanguage = lang;
    localStorage.setItem('lalira_app_lang', lang);
    window.applyTranslations();
    
    // Dispatch an event so app.js knows the language changed
    window.dispatchEvent(new Event('appLanguageChanged'));
  } catch (error) {
    console.error(`Error loading locale ${lang}:`, error);
  }
};

// Initialize i18n
window.initI18n = async function() {
  let savedLang = localStorage.getItem('lalira_app_lang');
  if (!savedLang) {
    const browserLang = navigator.language || navigator.userLanguage;
    savedLang = browserLang.startsWith('pt') ? 'pt' : 'es';
  }
  await window.setAppLanguage(savedLang);
};

// Export the getter for the current language
window.getAppLanguage = function() {
  return currentAppLanguage;
};
