import { renderFooter } from './components/footer.js';

const API_URL = '/api/public';
let currentHymnals = [];
let currentSong = null;
let currentLangArray = ['es'];
// --- PLAYLISTS MIGRATION ---
function initLists() {
  let lists = JSON.parse(localStorage.getItem('lalira_lists'));
  if (!lists) {
    // Migration from old array format
    const oldPlaylist = JSON.parse(localStorage.getItem('lalira_playlist'));
    if (oldPlaylist && oldPlaylist.length > 0) {
      const now = new Date().toISOString();
      lists = [{
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        name: window.t('lists.first_list', 'Mi Primera Lista'),
        createdAt: now,
        updatedAt: now,
        hymns: oldPlaylist.map((s, idx) => ({
          id: s.id,
          number: s.numero_en_himnario || '',
          title: s.title || s.titulo || 'Sin título',
          hymnary: s.codigo || s.himnario_codigo || '',
          orden: idx + 1
        }))
      }];
      localStorage.removeItem('lalira_playlist');
    } else {
      lists = [];
    }
    localStorage.setItem('lalira_lists', JSON.stringify(lists));
  }
  return lists;
}

let userLists = initLists();
let currentSongForModal = null;
const channel = new BroadcastChannel('lalira_projector');
let isProjectorOpen = false;

// DOM Elements
const viewHome = document.getElementById('view-home');
const viewHymnal = document.getElementById('view-hymnal');
const viewLists = document.getElementById('view-lists');
const viewSearch = document.getElementById('view-search');
const viewSong = document.getElementById('view-song');
const searchInput = document.getElementById('search-input');
const btnLang = document.getElementById('btn-lang');
const btnShare = document.getElementById('btn-share');
const btnProjector = document.getElementById('btn-projector');
const projectorSettings = document.getElementById('projector-settings');
const toggleBilingual = document.getElementById('toggle-bilingual');
const bgColorPicker = document.getElementById('bgColorPicker');
const btnUploadBg = document.getElementById('btn-upload-bg');
const bgFileInput = document.getElementById('bg-file-input');
const btnAddToList = document.getElementById('btn-add-to-list');

// Sidebar Elements
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

// Sidebar Logic
function toggleSidebar() {
  if(sidebar) sidebar.classList.toggle('active');
  if(sidebarOverlay) sidebarOverlay.classList.toggle('active');
}
if(menuToggle) menuToggle.onclick = toggleSidebar;
if(sidebarOverlay) sidebarOverlay.onclick = toggleSidebar;

// Init
window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', async () => {
  if (window.initI18n) {
    await window.initI18n();
    // Escuchar el cambio de idioma
    window.addEventListener('appLanguageChanged', () => {
      // Refrescar vistas o datos
      fetchCategories();
      loadHymnOfTheDay();
      loadRecentHymns();
      if(window.location.hash.startsWith('#song-') && currentSong) {
        renderSong();
      } else if (window.location.hash === '#hymnal') {
        const catId = document.querySelector('.category-item.active')?.getAttribute('data-id');
        if (catId) loadCategorySongs(catId);
        else loadAZ();
      } else if (!window.location.hash || window.location.hash === '#home') {
        // En home, ya los recargamos arriba
      }
    });
  }
  
  // Setup global lang selector UI if present
  document.querySelectorAll('#global-lang-selector .lang-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('#global-lang-selector .lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const lang = btn.getAttribute('data-lang');
      if (window.setAppLanguage) window.setAppLanguage(lang);
    };
    // set initial active state
    if (window.getAppLanguage && btn.getAttribute('data-lang') === window.getAppLanguage()) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  renderFooter();
  fetchCategories();
  loadFilters();
  loadHymnOfTheDay();
  loadRecentHymns();
  loadRecentLists();
  
  // SPA Nav Links setup
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = e.target.getAttribute('data-view');
      window.location.hash = view;
    });
  });

  handleRoute();
});

// Routing
function handleRoute() {
  // Close sidebar when navigating
  if(sidebar && sidebar.classList.contains('active')) {
    toggleSidebar();
  }

  const hash = window.location.hash;
  hideAllViews();
  if(btnLang) btnLang.style.display = 'none';
  if(btnShare) btnShare.style.display = 'none';

  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  if (hash.startsWith('#song-')) {
    const id = hash.replace('#song-', '');
    loadSong(id);
    viewSong.classList.add('active');
  } else if (hash.startsWith('#search')) {
    viewSearch.classList.add('active');
  } else if (hash === '#hymnal') {
    viewHymnal.classList.add('active');
    document.querySelector('.nav-link[data-view="hymnal"]')?.classList.add('active');
  } else if (hash.startsWith('#lists')) {
    viewLists.classList.add('active');
    document.querySelector('.nav-link[data-view="lists"]')?.classList.add('active');
    
    const listId = hash.replace('#lists', '').replace('/', '');
    if (listId) {
      renderListDetail(listId);
    } else {
      renderListsMaster();
    }
  } else {
    viewHome.classList.add('active');
    document.querySelector('.nav-link[data-view="home"]')?.classList.add('active');
  }
}

function hideAllViews() {
  viewHome.classList.remove('active');
  viewHymnal.classList.remove('active');
  viewLists.classList.remove('active');
  viewSearch.classList.remove('active');
  viewSong.classList.remove('active');
}

// Tabs Logic
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    
    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab');
    document.getElementById(tabId).style.display = 'block';
    
    if (tabId === 'tab-az' && !window.azLoaded) {
      fetchAZ();
    }
  };
});

function renderSongListItem(s, container) {
  const sEl = document.createElement('div');
  sEl.className = 'list-item';
  sEl.style.padding = '0.75rem';
  sEl.style.marginBottom = '0';
  sEl.style.display = 'flex';
  sEl.style.justifyContent = 'space-between';
  sEl.style.alignItems = 'center';
  sEl.innerHTML = `
    <div style="flex:1; cursor:pointer;" onclick="window.location.hash = 'song-${s.id}'">
      <span>${s.titulo || 'Sin Título'}</span>
      <span style="color:var(--text-muted); font-size:0.9rem; margin-left:0.5rem;">${s.himnario_codigo || ''} #${s.numero_en_himnario || ''}</span>
    </div>
    <button class="btn-add-to-list-icon" title="Añadir a lista">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 10h6m-3-3v6M3 6h10M3 12h7M3 18h14"/></svg>
    </button>
  `;
  sEl.querySelector('.btn-add-to-list-icon').onclick = (e) => {
    e.stopPropagation();
    openAddToListModal(s);
  };
  container.appendChild(sEl);
}

let allSongsCache = null;
async function fetchAllSongs() {
  if (!allSongsCache) {
    const res = await fetch(`${API_URL}/songs?limit=3000`);
    allSongsCache = await res.json();
  }
  return allSongsCache;
}

// Fetch Categories
async function fetchCategories() {
  try {
    const [resSec, songs] = await Promise.all([
      fetch(`${API_URL}/sections`),
      fetchAllSongs()
    ]);
    const sections = await resSec.json();
    const container = document.getElementById('hymnals-container');
    container.innerHTML = '';
    
    // Calculate min, max, count
    const groups = {};
    songs.forEach(h => {
      const num = parseInt(h.numero_en_himnario, 10);
      if (isNaN(num)) return;
      if (!groups[h.seccion_id]) {
        groups[h.seccion_id] = { count: 0, min: num, max: num, songs: [] };
      }
      groups[h.seccion_id].count += 1;
      groups[h.seccion_id].min = Math.min(groups[h.seccion_id].min, num);
      groups[h.seccion_id].max = Math.max(groups[h.seccion_id].max, num);
      groups[h.seccion_id].songs.push(h);
    });
    
    sections.forEach(h => {
      if (!groups[h.id]) return; // Skip empty sections
      const g = groups[h.id];
      const el = document.createElement('div');
      el.className = 'accordion-item glass-panel';
      el.innerHTML = `
        <div class="accordion-header" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer; padding: 1.5rem;">
          <h3 style="margin:0; font-size:1.2rem; color:var(--text-primary); flex:1;">${h.nombre} <span style="font-size:0.9rem; font-weight:normal; color:var(--text-secondary);">(${g.min} - ${g.max})</span></h3>
          <span style="font-size:0.9rem; font-weight:bold; color:var(--text-secondary); background:var(--bg-glass); padding:0.2rem 0.6rem; border-radius:12px; margin-right:1rem;">${g.count}</span>
          <svg class="accordion-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="accordion-content" style="display:none; padding: 0 1.5rem 1.5rem; border-top: 1px solid var(--border-glass);">
          <div class="hymnal-songs-list" style="display:flex; flex-direction:column; gap:0.5rem; max-height:400px; overflow-y:auto; margin-top:1rem;"></div>
        </div>
      `;
      
      const header = el.querySelector('.accordion-header');
      const content = el.querySelector('.accordion-content');
      const songsList = el.querySelector('.hymnal-songs-list');
      
      const sortedSongs = g.songs.sort((a,b) => parseInt(a.numero_en_himnario) - parseInt(b.numero_en_himnario));
      sortedSongs.forEach(s => renderSongListItem(s, songsList));
      
      header.onclick = () => {
        const isOpen = content.style.display === 'block';
        document.querySelectorAll('#tab-categories .accordion-content').forEach(c => c.style.display = 'none');
        document.querySelectorAll('#tab-categories .accordion-icon').forEach(i => i.style.transform = 'rotate(0deg)');
        
        if (!isOpen) {
          content.style.display = 'block';
          header.querySelector('.accordion-icon').style.transform = 'rotate(180deg)';
        }
      };
      container.appendChild(el);
    });
  } catch (e) {
    console.error(e);
  }
}

// Fetch A-Z
async function fetchAZ() {
  try {
    const songs = await fetchAllSongs();
    const container = document.getElementById('az-container');
    container.innerHTML = '';
    
    // Group by first letter
    const grouped = {};
    songs.forEach(s => {
      let title = s.titulo || '';
      // Encuentra la primera letra del alfabeto (A-Z) ignorando acentos y símbolos
      let firstCharMatch = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[A-Za-z]/);
      let letter = firstCharMatch ? firstCharMatch[0].toUpperCase() : '#';
      
      if(!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(s);
    });
    
    // Sort letters
    const letters = Object.keys(grouped).sort((a,b) => a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b));
    
    letters.forEach(letter => {
      const el = document.createElement('div');
      el.className = 'accordion-item glass-panel';
      el.innerHTML = `
        <div class="accordion-header" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer; padding: 1rem 1.5rem;">
          <h3 style="margin:0; font-size:1.5rem; color:var(--accent);">${letter}</h3>
          <span style="font-size:0.9rem; color:var(--text-secondary); margin-right:auto; margin-left:1rem;">${grouped[letter].length}</span>
          <svg class="accordion-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="accordion-content" style="display:none; padding: 0 1.5rem 1.5rem; border-top: 1px solid var(--border-glass);">
          <div class="hymnal-songs-list" style="display:flex; flex-direction:column; gap:0.5rem; max-height:400px; overflow-y:auto; margin-top:1rem;"></div>
        </div>
      `;
      
      const header = el.querySelector('.accordion-header');
      const content = el.querySelector('.accordion-content');
      const songsList = el.querySelector('.hymnal-songs-list');
      
      grouped[letter].forEach(s => renderSongListItem(s, songsList));
      
      header.onclick = () => {
        const isOpen = content.style.display === 'block';
        if (!isOpen) {
          content.style.display = 'block';
          header.querySelector('.accordion-icon').style.transform = 'rotate(180deg)';
        } else {
          content.style.display = 'none';
          header.querySelector('.accordion-icon').style.transform = 'rotate(0deg)';
        }
      };
      
      container.appendChild(el);
    });
    
    window.azLoaded = true;
  } catch(e) {
    console.error(e);
  }
}

// Search
let searchTimeout;
function triggerSearch() {
  clearTimeout(searchTimeout);
  const q = searchInput.value.trim();
  const hasFilters = Array.from(document.querySelectorAll('.filter-select')).some(s => s.value !== '');
  
  if (q.length > 0 || hasFilters) {
    window.location.hash = 'search';
    document.querySelector('.list-group h2[style="display:none;"]')?.removeAttribute('style');
    searchTimeout = setTimeout(() => performSearch(q), 300);
  } else {
    document.getElementById('search-empty-state').style.display = 'block';
    document.getElementById('search-results-container').style.display = 'none';
    if(window.location.hash === '#search' && q.length === 0) {
        window.location.hash = '';
    }
  }
}

searchInput.addEventListener('input', triggerSearch);

// Attach events to filters
document.querySelectorAll('.filter-select').forEach(sel => {
  sel.addEventListener('change', triggerSearch);
});

async function loadFilters() {
  try {
    const [hymnalsRes, sectionsRes, filtersRes] = await Promise.all([
      fetch(`${API_URL}/hymnals`),
      fetch(`${API_URL}/sections`),
      fetch(`${API_URL}/filters`)
    ]);
    const hymnals = await hymnalsRes.json();
    const sections = await sectionsRes.json();
    const filters = await filtersRes.json();
    
    const hymnalSel = document.getElementById('filter-hymnary');
    hymnals.forEach(h => { hymnalSel.innerHTML += `<option value="${h.id}">${h.nombre}</option>`; });
    
    const sectionSel = document.getElementById('filter-section');
    sections.forEach(s => { sectionSel.innerHTML += `<option value="${s.id}">${s.nombre}</option>`; });
    
    const ritmoSel = document.getElementById('filter-ritmo');
    filters.ritmos.forEach(r => { ritmoSel.innerHTML += `<option value="${r}">${r}</option>`; });
    
    const tonSel = document.getElementById('filter-tonalidad');
    filters.tonalidades.forEach(t => { tonSel.innerHTML += `<option value="${t}">${t}</option>`; });
    
    const tiempoSel = document.getElementById('filter-tiempo');
    filters.tiempos.forEach(t => { tiempoSel.innerHTML += `<option value="${t}">${t}</option>`; });
    
    const bpmSel = document.getElementById('filter-bpm');
    filters.tempos.forEach(b => { bpmSel.innerHTML += `<option value="${b}">${b} bpm</option>`; });
    
  } catch(e) {
    console.error('Error loading filters', e);
  }
}

function formatSmartSnippet(rawSnippet) {
  if (!rawSnippet) return '';
  const lines = rawSnippet.split('\n').map(line => line.replace(/\|/g, '').trim()).filter(line => line.length > 0);
  const termIndex = lines.findIndex(line => line.includes('<mark>'));
  if (termIndex <= 0) return lines.slice(0, 2).join('<br>');
  return lines.slice(termIndex - 1, termIndex + 1).join('<br>');
}

async function performSearch(query) {
  try {
    const emptyState = document.getElementById('search-empty-state');
    const container = document.getElementById('search-results-container');
    
    emptyState.style.display = 'none';
    container.style.display = 'block';
    container.innerHTML = `<p style="text-align:center; padding:2rem; color:var(--text-muted);">${window.t('common.loading', 'Buscando...')}</p>`;
    
    const params = new URLSearchParams();
    if (query) params.append('search', query);
    
    const himnarioId = document.getElementById('filter-hymnary').value;
    if (himnarioId) params.append('himnario_id', himnarioId);
    
    const seccionId = document.getElementById('filter-section').value;
    if (seccionId) params.append('seccion_id', seccionId);
    
    const ritmo = document.getElementById('filter-ritmo').value;
    if (ritmo) params.append('ritmo', ritmo);
    
    const tonalidad = document.getElementById('filter-tonalidad').value;
    if (tonalidad) params.append('tonalidad', tonalidad);
    
    const tiempo = document.getElementById('filter-tiempo').value;
    if (tiempo) params.append('tiempo', tiempo);
    
    const bpm = document.getElementById('filter-bpm').value;
    if (bpm) params.append('bpm', bpm);
    
    const res = await fetch(`${API_URL}/songs?${params.toString()}`);
    const data = await res.json();
    container.innerHTML = '';
    
    if (data.length === 0) {
      emptyState.style.display = 'block';
      container.style.display = 'none';
      document.getElementById('search-empty-text').textContent = window.t('search.no_results', 'No se encontraron resultados para los filtros seleccionados.');
      return;
    }
    
    data.forEach(s => {
      const el = document.createElement('div');
      el.className = 'list-item';
      
      const snippetHtml = s.snippet ? `<div class="song-snippet" style="font-size:0.9rem; color:var(--text-secondary); margin-top:4px; font-style:italic;">${formatSmartSnippet(s.snippet)}</div>` : '';
      
      el.style.display = 'flex';
      el.style.justifyContent = 'space-between';
      el.style.alignItems = 'center';
      
      el.innerHTML = `
        <div style="flex:1; cursor:pointer;" onclick="window.location.hash = 'song-${s.id}'">
          <div class="song-title" style="font-weight:600; color:var(--text-primary);">${s.titulo || window.t('common.untitled', 'Sin título')}</div>
          ${snippetHtml}
        </div>
        <div class="song-meta" style="text-align:right; margin-left:1rem; margin-right: 0.5rem;">
          <div style="color:var(--text-muted); font-size:0.85rem;">${s.himnario_codigo}</div>
          <div style="font-weight:bold; color:var(--accent); font-size:1.1rem;">#${s.numero_en_himnario}</div>
        </div>
        <button class="btn-add-to-list-icon" title="Añadir a lista">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 10h6m-3-3v6M3 6h10M3 12h7M3 18h14"/></svg>
        </button>
      `;
      el.querySelector('.btn-add-to-list-icon').onclick = (e) => {
        e.stopPropagation();
        openAddToListModal(s);
      };
      container.appendChild(el);
    });
    
  } catch(e) {
    console.error(e);
    document.getElementById('search-results-container').innerHTML = '<p>Error de conexión.</p>';
  }
}

// Song Load
async function loadSong(id) {
  try {
    document.getElementById('song-title').textContent = window.t('common.loading', 'Cargando...');
    document.getElementById('lyrics-container').innerHTML = '';
    
    const res = await fetch(`${API_URL}/songs/${id}`);
    if(!res.ok) throw new Error('Not found');
    currentSong = await res.json();
    
    currentLangArray = Object.keys(currentSong.metadata);
    if(currentLangArray.length === 0) currentLangArray = ['es'];
    
    const toggleBil = document.getElementById('toggle-bilingual');
    if (toggleBil) toggleBil.checked = false;
    
    renderSong();
    addToHistory(currentSong, currentSong.metadata[currentLangArray[0]] || currentSong.metadata['es']);
    
    // UI Updates
    btnShare.style.display = 'inline-flex';
    if(currentLangArray.length > 1) {
      btnLang.style.display = 'inline-flex';
      const containerBilingual = document.getElementById('container-toggle-bilingual');
      if (containerBilingual) containerBilingual.style.display = 'inline-flex';
    } else {
      const containerBilingual = document.getElementById('container-toggle-bilingual');
      if (containerBilingual) containerBilingual.style.display = 'none';
    }
    
    if(isProjectorOpen) projectorSettings.classList.add('open');
    else projectorSettings.classList.remove('open');
    
    // Navigation logic (Prev/Next)
    const btnPrev = document.getElementById('btn-prev-song');
    const btnNext = document.getElementById('btn-next-song');
    if (btnPrev && btnNext) {
      const allSongs = await fetchAllSongs();
      const currentNum = parseInt(currentSong.numero_en_himnario, 10);
      const code = currentSong.himnario_codigo;
      
      const prevSong = allSongs.find(s => s.himnario_codigo === code && parseInt(s.numero_en_himnario, 10) === currentNum - 1);
      const nextSong = allSongs.find(s => s.himnario_codigo === code && parseInt(s.numero_en_himnario, 10) === currentNum + 1);
      
      if (prevSong) {
        btnPrev.style.display = 'flex';
        btnPrev.onclick = () => window.location.hash = `song-${prevSong.id}`;
      } else {
        btnPrev.style.display = 'none';
      }
      
      if (nextSong) {
        btnNext.style.display = 'flex';
        btnNext.onclick = () => window.location.hash = `song-${nextSong.id}`;
      } else {
        btnNext.style.display = 'none';
      }
    }
    
  } catch(e) {
    document.getElementById('song-title').textContent = window.t('common.error', 'Error al cargar');
  }
}

function formatStanza(stanza) {
  if (!stanza) return '';
  let texto = stanza.texto;
  let isRepeat = false;
  if (texto.match(/\[bis\]|\(x2\)|\(2x\)/i)) {
    isRepeat = true;
  }
  // Formatear instrumentos
  texto = texto.replace(/(\(Instrumentos\)|\[Coro\]|<inst>.*?<\/inst>|\[Acordes.*?\])/ig, '<span class="stanza-inst">$1</span>');
  
  return `<span class="stanza-type">${stanza.tipo}</span><div class="stanza-text ${isRepeat ? 'stanza-repeat' : ''}">${texto}</div>`;
}

function renderSong() {
  if(!currentSong) return;
  const isBilingual = document.getElementById('toggle-bilingual') && document.getElementById('toggle-bilingual').checked && currentLangArray.length > 1;
  const primaryLang = currentLangArray[0];
  const secondaryLang = currentLangArray[1] || primaryLang;
  const meta = currentSong.metadata[primaryLang] || currentSong.metadata['es'];
  
  if (btnLang) {
    if (isBilingual) {
      btnLang.textContent = `${primaryLang.toUpperCase()} / ${secondaryLang.toUpperCase()}`;
    } else {
      btnLang.textContent = primaryLang.toUpperCase();
    }
  }
  
  document.getElementById('song-title').textContent = meta.titulo;
  document.getElementById('song-meta').textContent = `${currentSong.himnario_codigo} ${currentSong.numero_en_himnario} • ${meta.autor || ''}`;
  
  const container = document.getElementById('lyrics-container');
  container.innerHTML = '';
  
  if (isBilingual) {
    container.classList.add('bilingual-grid');
    const stanzasL1 = currentSong.estrofas.filter(s => s.idioma === primaryLang).sort((a,b) => a.orden - b.orden);
    const stanzasL2 = currentSong.estrofas.filter(s => s.idioma === secondaryLang).sort((a,b) => a.orden - b.orden);
    
    const maxStanzas = Math.max(stanzasL1.length, stanzasL2.length);
    for (let i = 0; i < maxStanzas; i++) {
       const row = document.createElement('div');
       row.className = 'bilingual-row';
       row.innerHTML = `
         <div class="stanza">${formatStanza(stanzasL1[i])}</div>
         <div class="stanza">${formatStanza(stanzasL2[i])}</div>
       `;
       row.onclick = () => {
         document.querySelectorAll('.bilingual-row, .stanza').forEach(s => s.classList.remove('active-projector'));
         row.classList.add('active-projector');
         channel.postMessage({
           type: 'STANZA',
           text: stanzasL1[i]?.texto || '',
           isBilingual: true,
           secondaryText: stanzasL2[i]?.texto || null
         });
       };
       container.appendChild(row);
    }
  } else {
    container.classList.remove('bilingual-grid');
    const stanzas = currentSong.estrofas.filter(s => s.idioma === primaryLang).sort((a,b) => a.orden - b.orden);
    
    stanzas.forEach((stanza, idx) => {
      const el = document.createElement('div');
      el.className = 'stanza';
      el.innerHTML = formatStanza(stanza);
      
      el.onclick = () => {
        document.querySelectorAll('.bilingual-row, .stanza').forEach(s => s.classList.remove('active-projector'));
        el.classList.add('active-projector');
        
        let secondaryText = null;
        if(toggleBilingual && toggleBilingual.checked) {
          const otherLang = Object.keys(currentSong.metadata).find(l => l !== primaryLang);
          if(otherLang) {
            const secStanzas = currentSong.estrofas.filter(s => s.idioma === otherLang).sort((a,b) => a.orden - b.orden);
            if(secStanzas[idx]) secondaryText = secStanzas[idx].texto;
          }
        }
        
        channel.postMessage({
          type: 'STANZA',
          text: stanza.texto,
          isBilingual: toggleBilingual && toggleBilingual.checked,
          secondaryText: secondaryText
        });
      };
      
      container.appendChild(el);
    });
  }
}

// Projector Logic
btnProjector.onclick = () => {
  window.open('projector.html', 'lalira_projector', 'width=800,height=600');
  isProjectorOpen = true;
  if(currentSong) projectorSettings.classList.add('open');
};

document.getElementById('bg-color-picker').onchange = (e) => {
  channel.postMessage({ type: 'BACKGROUND', bgType: 'color', value: e.target.value });
};

btnUploadBg.onclick = () => bgFileInput.click();
bgFileInput.onchange = (e) => {
  const file = e.target.files[0];
  if(file) {
    const url = URL.createObjectURL(file);
    channel.postMessage({ type: 'BACKGROUND', bgType: 'image', value: url });
  }
};

// Language Toggle
btnLang.onclick = () => {
  if (currentLangArray.length > 1) {
    currentLangArray.push(currentLangArray.shift());
    renderSong();
  }
};

const toggleBil = document.getElementById('toggle-bilingual');
if (toggleBil) {
  toggleBil.onchange = () => {
    renderSong();
  };
}

// Share
btnShare.onclick = () => {
  const url = window.location.href;
  if (navigator.share) {
    navigator.share({ title: 'La Lira', url });
  } else {
    navigator.clipboard.writeText(url);
    alert('Enlace copiado!');
  }
};

// --- PLAYLIST / LISTS MODULE ---

function saveLists() {
  localStorage.setItem('lalira_lists', JSON.stringify(userLists));
}

// Render Master View (All Lists)
window.renderListsMaster = function() {
  document.getElementById('lists-master-view').style.display = 'block';
  document.getElementById('lists-detail-view').style.display = 'none';
  
  const grid = document.getElementById('lists-grid');
  grid.innerHTML = '';
  
  if (userLists.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1; text-align:center; padding: 2rem;">No tienes listas creadas.</p>';
    return;
  }
  
  userLists.forEach(list => {
    const el = document.createElement('div');
    el.className = 'list-card';
    el.innerHTML = `
      <div class="list-card-title">${list.name}</div>
      <div class="list-card-meta">${list.hymns.length} himnos • Creada el ${new Date(list.createdAt).toLocaleDateString()}</div>
    `;
    el.onclick = () => window.location.hash = `lists/${list.id}`;
    grid.appendChild(el);
  });
};

document.getElementById('btn-create-list').onclick = () => {
  const name = prompt(window.t('lists.list_name_placeholder', 'Nombre de la nueva lista:'));
  if (name && name.trim()) {
    const now = new Date().toISOString();
    const newList = { id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(), name: name.trim(), hymns: [], createdAt: now, updatedAt: now };
    userLists.unshift(newList);
    saveLists();
    renderListsMaster();
  }
};

// Render Detail View (Single List)
let currentDetailListId = null;
window.renderListDetail = function(id) {
  const list = userLists.find(l => l.id === id);
  if (!list) {
    window.location.hash = 'lists';
    return;
  }
  currentDetailListId = id;
  document.getElementById('lists-master-view').style.display = 'none';
  document.getElementById('lists-detail-view').style.display = 'block';
  
  document.getElementById('detail-list-name').textContent = list.name;
  document.getElementById('detail-list-meta').textContent = `${list.hymns.length} himnos • Actualizada el ${new Date(list.updatedAt).toLocaleDateString()}`;
  
  renderListHymns(list);
};

document.getElementById('btn-back-lists').onclick = () => window.location.hash = 'lists';

document.getElementById('btn-rename-list').onclick = () => {
  if (!currentDetailListId) return;
  const list = userLists.find(l => l.id === currentDetailListId);
  const newName = prompt('Nuevo nombre:', list.name);
  if (newName && newName.trim() && newName !== list.name) {
    list.name = newName.trim();
    list.updatedAt = new Date().toISOString();
    saveLists();
    renderListDetail(currentDetailListId);
  }
};

document.getElementById('btn-delete-list').onclick = () => {
  if (!currentDetailListId) return;
  if (confirm('¿Estás seguro de que quieres eliminar esta lista permanentemente?')) {
    userLists = userLists.filter(l => l.id !== currentDetailListId);
    saveLists();
    window.location.hash = 'lists';
  }
};

let draggedItemIndex = null;
function renderListHymns(list) {
  const container = document.getElementById('playlist-container');
  container.innerHTML = '';
  
  if (list.hymns.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 2rem;">La lista está vacía.</p>';
    return;
  }
  
  list.hymns.forEach((s, idx) => {
    const el = document.createElement('div');
    el.className = 'list-item';
    el.draggable = true; // For Drag and Drop
    el.dataset.index = idx;
    
    el.innerHTML = `
      <div style="cursor: grab; margin-right: 1rem; color: var(--text-muted);">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
      </div>
      <div style="flex:1;">
        <div class="song-title">${s.title}</div>
        <div class="song-meta">${s.hymnary} #${s.number}</div>
      </div>
      <button class="btn-remove-hymn" style="background:transparent; border:none; color:#ff3b30; cursor:pointer; padding:0.5rem;" title="Quitar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    `;
    
    // Drag & Drop events
    el.addEventListener('dragstart', (e) => {
      draggedItemIndex = idx;
      setTimeout(() => el.style.opacity = '0.5', 0);
    });
    el.addEventListener('dragend', () => {
      el.style.opacity = '1';
      draggedItemIndex = null;
      document.querySelectorAll('.list-item').forEach(i => i.style.borderTop = '');
    });
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.style.borderTop = '2px solid var(--accent)';
    });
    el.addEventListener('dragleave', () => {
      el.style.borderTop = '';
    });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.style.borderTop = '';
      const dropIndex = idx;
      if (draggedItemIndex !== null && draggedItemIndex !== dropIndex) {
        const item = list.hymns.splice(draggedItemIndex, 1)[0];
        list.hymns.splice(dropIndex, 0, item);
        
        // Update Order
        list.hymns.forEach((h, i) => h.orden = i + 1);
        list.updatedAt = new Date().toISOString();
        saveLists();
        renderListHymns(list);
      }
    });
    
    el.querySelector('.btn-remove-hymn').onclick = (e) => {
      e.stopPropagation();
      list.hymns.splice(idx, 1);
      list.updatedAt = new Date().toISOString();
      saveLists();
      renderListDetail(list.id);
    };
    
    // Navigate to song
    el.querySelector('div[style="flex:1;"]').onclick = () => window.location.hash = `song-${s.id}`;
    
    container.appendChild(el);
  });
}

// --- MODAL LOGIC ---
const modalAddList = document.getElementById('modal-add-list');

window.openAddToListModal = function(songObj) {
  currentSongForModal = songObj;
  
  const container = document.getElementById('modal-lists-container');
  container.innerHTML = '';
  
  if (userLists.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">No tienes listas.</p>';
  } else {
    userLists.forEach(list => {
      const isAlreadyIn = list.hymns.some(h => h.id == songObj.id);
      const btn = document.createElement('button');
      btn.style.cssText = `width: 100%; padding: 1rem; background: var(--bg-glass); border: 1px solid var(--border-glass); border-radius: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; color: var(--text-primary);`;
      btn.innerHTML = `
        <span style="font-weight: 500;">${list.name}</span>
        ${isAlreadyIn ? '<span style="color:var(--text-muted); font-size:0.8rem;">Añadido</span>' : '<span style="color:var(--primary); font-size:1.2rem;">+</span>'}
      `;
      if (!isAlreadyIn) {
        btn.onclick = () => {
          list.hymns.push({
            id: songObj.id,
            number: songObj.numero_en_himnario || '',
            title: songObj.titulo || songObj.title || window.t('common.untitled', 'Sin título'),
            hymnary: songObj.himnario_codigo || songObj.codigo || '',
            orden: list.hymns.length + 1
          });
          list.updatedAt = new Date().toISOString();
          saveLists();
          closeModal();
          alert('¡Añadido a la lista!');
        };
      } else {
        btn.style.opacity = '0.6';
        btn.style.cursor = 'default';
      }
      container.appendChild(btn);
    });
  }
  
  modalAddList.style.display = 'flex';
};

function closeModal() {
  modalAddList.style.display = 'none';
  currentSongForModal = null;
}

document.getElementById('btn-close-modal').onclick = closeModal;
modalAddList.onclick = (e) => { if (e.target === modalAddList) closeModal(); };

document.getElementById('btn-modal-create-list').onclick = () => {
  const name = prompt(window.t('lists.list_name_placeholder', 'Nombre de la nueva lista:'));
  if (name && name.trim()) {
    const now = new Date().toISOString();
    const newList = { id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(), name: name.trim(), hymns: [], createdAt: now, updatedAt: now };
    userLists.unshift(newList);
    saveLists();
    // Refresh modal
    openAddToListModal(currentSongForModal);
  }
};

// Song View Button
btnAddToList.onclick = () => {
  if(!currentSong) return;
  const meta = currentSong.metadata['es'] || currentSong.metadata[Object.keys(currentSong.metadata)[0]];
  openAddToListModal({
    id: currentSong.id,
    titulo: meta.titulo,
    numero_en_himnario: currentSong.numero_en_himnario,
    himnario_codigo: currentSong.himnario_codigo
  });
};

// --- Home Screen Logic ---
async function loadHymnOfTheDay() {
  try {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    
    // Simplification for prototype: fetch a chunk of songs and pick based on seed
    const res = await fetch(`${API_URL}/songs?limit=100`); 
    if(!res.ok) return;
    const songs = await res.json();
    if(songs.length === 0) return;

    const index = seed % songs.length;
    const hodSummary = songs[index];

    // Fetch full song details to get lyrics
    const fullRes = await fetch(`${API_URL}/songs/${hodSummary.id}`);
    if(!fullRes.ok) return;
    const hod = await fullRes.json();
    
    const meta = hod.metadata['es'] || hod.metadata[Object.keys(hod.metadata)[0]];

    document.getElementById('hod-title').textContent = meta.titulo || window.t('common.untitled', 'Sin título');
    document.getElementById('hod-meta').textContent = `${hod.himnario_codigo} ${hod.numero_en_himnario} • ${meta.autor || ''}`;
    
    const lyricsContainer = document.getElementById('hod-full-lyrics');
    // Extract text from stanzas (es)
    const stanzas = hod.estrofas.filter(s => s.idioma === 'es').sort((a,b) => a.orden - b.orden);
    if(stanzas.length > 0) {
      lyricsContainer.style.display = 'block';
      const fullText = stanzas.map(s => s.texto).join('\n\n');
      lyricsContainer.textContent = fullText;
    } else {
      lyricsContainer.style.display = 'none';
    }
    
    document.getElementById('btn-hod-open').onclick = (e) => {
      e.stopPropagation();
      window.location.hash = `song-${hod.id}`;
    };
  } catch(e) {
    console.error("Error loading Hymn of the Day", e);
    document.getElementById('hod-title').textContent = 'No disponible';
  }
}

function loadRecentHymns() {
  const container = document.getElementById('recent-hymns-container');
  if(!container) return;
  const emptyMsg = document.getElementById('recent-hymns-empty');
  
  const history = JSON.parse(localStorage.getItem('lalira_history') || '[]');
  
  if(history.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }
  
  emptyMsg.style.display = 'none';
  // Prevent duplicate rendering if called multiple times
  container.querySelectorAll('.history-card').forEach(c => c.remove());
  
  // Show only top 5
  history.slice(0, 5).forEach(s => {
    const el = document.createElement('div');
    el.className = 'glass-panel history-card';
    el.style.cssText = 'padding: 0.75rem 1rem; cursor: pointer; transition: transform 0.2s; display:flex; justify-content:space-between; align-items:center;';
    el.innerHTML = `
      <div>
        <div style="font-weight:600; margin-bottom:0.2rem;">${s.title}</div>
        <div style="font-size:0.8rem; color:var(--text-secondary);">${s.codigo}</div>
      </div>
      <div style="color:var(--text-secondary); opacity:0.5;">❯</div>
    `;
    el.onclick = () => window.location.hash = `song-${s.id}`;
    container.appendChild(el);
  });
}

function addToHistory(song, meta) {
  let history = JSON.parse(localStorage.getItem('lalira_history') || '[]');
  history = history.filter(s => s.id !== song.id);
  history.unshift({ id: song.id, title: meta.titulo, codigo: `${song.himnario_codigo} ${song.numero_en_himnario}` });
  
  if(history.length > 20) history.pop();
  localStorage.setItem('lalira_history', JSON.stringify(history));
  loadRecentHymns(); // Refresh home screen immediately
}

function loadRecentLists() {
  const container = document.getElementById('recent-lists-container');
  if(!container) return;
  const emptyMsg = document.getElementById('recent-lists-empty');
  
  if(userLists.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }
  
  emptyMsg.style.display = 'none';
  container.querySelectorAll('.history-card').forEach(c => c.remove());
  
  // Show up to 3 most recent lists
  const recentLists = userLists.slice(0, 3);
  recentLists.forEach(list => {
    const el = document.createElement('div');
    el.className = 'glass-panel history-card';
    el.style.cssText = 'padding: 0.75rem 1rem; cursor: pointer; transition: transform 0.2s; display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;';
    el.innerHTML = `
      <div>
        <div style="font-weight:600; margin-bottom:0.2rem;">${list.name}</div>
        <div style="font-size:0.8rem; color:var(--text-secondary);">${list.hymns.length} ${window.t('lists.hymns_saved', 'himno(s) guardados')}</div>
      </div>
      <div style="color:var(--text-secondary); opacity:0.5;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    `;
    el.onclick = () => window.location.hash = `lists/${list.id}`;
    container.appendChild(el);
  });
}
