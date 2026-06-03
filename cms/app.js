// App Logic for La Lira CMS
let state = {
  token: localStorage.getItem('lalira_token') || null,
  user: null,
  songs: [],
  hymnals: [],
  sections: [],
  currentSong: null, // Production song details
  activeDraft: null, // Active draft details if exists
  currentCifraLang: 'es', // es, pt, en
  notesList: [] // Local working array of footnotes
};

let oauthConfig = { googleClientId: null, devBypass: false };

// DOM Elements
const loginOverlay = document.getElementById('login-overlay');
const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginError = document.getElementById('login-error');

const appHeader = document.getElementById('app-header');
const appContainer = document.getElementById('app-container');
const userDisplayName = document.getElementById('user-display-name');
const logoutBtn = document.getElementById('logout-btn');

// User Management DOM elements
const viewUsersBtn = document.getElementById('view-users-btn');
const usersModal = document.getElementById('users-modal');
const usersListRows = document.getElementById('users-list-rows');
const closeUsersModal = document.getElementById('close-users-modal');
const inviteUserBtn = document.getElementById('invite-user-btn');

const userFormModal = document.getElementById('user-form-modal');
const userEditForm = document.getElementById('user-edit-form');
const userFormId = document.getElementById('user-form-id');
const userFormName = document.getElementById('user-form-name');
const userFormEmail = document.getElementById('user-form-email');
const userFormRole = document.getElementById('user-form-role');
const userFormProvider = document.getElementById('user-form-provider');
const userFormPassword = document.getElementById('user-form-password');
const userFormPasswordGroup = document.getElementById('user-form-password-group');
const userFormStatus = document.getElementById('user-form-status');
const userFormStatusGroup = document.getElementById('user-form-status-group');
const userFormError = document.getElementById('user-form-error');
const cancelUserForm = document.getElementById('cancel-user-form');

const searchInput = document.getElementById('search-input');
const hymnarySelect = document.getElementById('hymnary-select');
const sectionSelect = document.getElementById('section-select');
const songsList = document.getElementById('songs-list');
const songsCount = document.getElementById('songs-count');
const versionLabel = document.getElementById('version-label');
const publishBtn = document.getElementById('publish-btn');
const viewAuditBtn = document.getElementById('view-audit-btn');

const emptyState = document.getElementById('empty-state');
const editorPanel = document.getElementById('editor-panel');
const saveDraftBtn = document.getElementById('save-draft-btn');
const submitApprovalBtn = document.getElementById('submit-approval-btn');
const adminApprovalActions = document.getElementById('admin-approval-actions');
const approveBtn = document.getElementById('approve-btn');
const rejectBtn = document.getElementById('reject-btn');
const draftStatusBadge = document.getElementById('draft-status-badge');

const tabLinks = document.querySelectorAll('.tab-link');
const tabContents = document.querySelectorAll('.tab-content');
const tabDiffLink = document.getElementById('tab-diff-link');
const toastEl = document.getElementById('toast');

// Modal Elements
const publishModal = document.getElementById('publish-modal');
const publishStatusText = document.getElementById('publish-status-text');
const publishLog = document.getElementById('publish-log');
const closePublishModal = document.getElementById('close-publish-modal');

const auditModal = document.getElementById('audit-modal');
const auditLogsRows = document.getElementById('audit-logs-rows');
const closeAuditModal = document.getElementById('close-audit-modal');

// Page Load Setup
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  initOAuth();
  if (state.token) {
    const ok = await fetchUserProfile();
    if (ok) {
      initializeDashboard();
    } else {
      showLoginScreen();
    }
  } else {
    showLoginScreen();
  }
});

// Setup Events
function setupEventListeners() {
  // Login Submit
  loginForm.addEventListener('submit', handleLoginSubmit);
  
  // Local bypass login form toggle
  const toggleLocalLoginLink = document.getElementById('toggle-local-login');
  toggleLocalLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.toggle('hidden');
    if (loginForm.classList.contains('hidden')) {
      toggleLocalLoginLink.textContent = 'Iniciar con credenciales locales';
    } else {
      toggleLocalLoginLink.textContent = 'Ocultar credenciales locales';
    }
  });

  // Logout Trigger
  logoutBtn.addEventListener('click', handleLogout);

  // User Management Modal triggers
  viewUsersBtn.addEventListener('click', openUsersModalView);
  closeUsersModal.addEventListener('click', () => usersModal.classList.add('hidden'));
  inviteUserBtn.addEventListener('click', openInviteUserForm);
  cancelUserForm.addEventListener('click', () => userFormModal.classList.add('hidden'));
  userEditForm.addEventListener('submit', handleUserFormSubmit);

  // Authentication provider change toggle for password input
  userFormProvider.addEventListener('change', () => {
    if (userFormProvider.value === 'local') {
      userFormPasswordGroup.classList.remove('hidden');
    } else {
      userFormPasswordGroup.classList.add('hidden');
    }
  });

  // Search and filters
  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fetchSongs, 300);
  });
  hymnarySelect.addEventListener('change', fetchSongs);
  sectionSelect.addEventListener('change', fetchSongs);

  // Tabs navigation
  tabLinks.forEach(link => {
    link.addEventListener('click', () => {
      tabLinks.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      link.classList.add('active');
      const tabId = link.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');

      if (tabId === 'tab-chordpro') {
        renderChordProPreview();
      } else if (tabId === 'tab-diff') {
        renderDiffView();
      }
    });
  });

  // Chords language switcher (ES, PT, EN)
  document.getElementById('cifra-lang-es').addEventListener('click', () => switchCifraLang('es'));
  document.getElementById('cifra-lang-pt').addEventListener('click', () => switchCifraLang('pt'));
  document.getElementById('cifra-lang-en').addEventListener('click', () => switchCifraLang('en'));

  // ChordPro Textarea live preview
  document.getElementById('chordpro-textarea').addEventListener('input', () => {
    const targetObj = state.activeDraft ? state.activeDraft.data : state.currentSong;
    if (targetObj) {
      const lang = state.currentCifraLang;
      targetObj.cifras[lang].contenido = document.getElementById('chordpro-textarea').value;
      renderChordProPreview();
    }
  });

  // Chords key/bpm/capo listeners to keep working data updated
  document.getElementById('cifra-key').addEventListener('input', (e) => {
    const targetObj = state.activeDraft ? state.activeDraft.data : state.currentSong;
    if (targetObj) targetObj.cifras[state.currentCifraLang].tonalidad = e.target.value;
  });
  document.getElementById('cifra-bpm').addEventListener('input', (e) => {
    const targetObj = state.activeDraft ? state.activeDraft.data : state.currentSong;
    if (targetObj) targetObj.cifras[state.currentCifraLang].bpm = parseInt(e.target.value) || 0;
  });
  document.getElementById('cifra-capo').addEventListener('input', (e) => {
    const targetObj = state.activeDraft ? state.activeDraft.data : state.currentSong;
    if (targetObj) targetObj.cifras[state.currentCifraLang].capotraste = parseInt(e.target.value) || 0;
  });

  // Save Draft, Submit, Approve, Reject buttons
  saveDraftBtn.addEventListener('click', () => saveDraftSong(false));
  submitApprovalBtn.addEventListener('click', () => saveDraftSong(true));
  approveBtn.addEventListener('click', approveDraftSong);
  rejectBtn.addEventListener('click', rejectDraftSong);

  // Publish Database trigger
  publishBtn.addEventListener('click', triggerPublishAll);
  closePublishModal.addEventListener('click', () => {
    publishModal.classList.add('hidden');
    loadVersionInfo();
  });

  // Audit Logs modal trigger
  viewAuditBtn.addEventListener('click', openAuditModalView);
  closeAuditModal.addEventListener('click', () => auditModal.classList.add('hidden'));

  // Footnote Type Selector Toggle
  const noteTypeSelect = document.getElementById('note-input-type');
  noteTypeSelect.addEventListener('change', () => {
    const noteType = noteTypeSelect.value;
    document.getElementById('biblical-fields').classList.toggle('hidden', noteType !== 'biblica');
    document.getElementById('author-fields').classList.toggle('hidden', noteType === 'biblica');
  });

  // Add note to list button
  document.getElementById('add-note-list-btn').addEventListener('click', addNoteToWorkingList);
}

// ── AUTHENTICATION LIFECYCLE ──────────────────────────────────────────────────

function showLoginScreen() {
  loginOverlay.classList.remove('hidden');
  appHeader.classList.add('hidden');
  appContainer.classList.add('hidden');
}

function hideLoginScreen() {
  loginOverlay.classList.add('hidden');
  appHeader.classList.remove('hidden');
  appContainer.classList.remove('hidden');
}

async function fetchUserProfile() {
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    state.user = data.user;
    userDisplayName.textContent = `${state.user.nombre} (${state.user.rol === 'admin' ? 'Admin' : 'Editor'})`;
    syncRoleVisibility();
    return true;
  } catch {
    state.token = null;
    state.user = null;
    localStorage.removeItem('lalira_token');
    return false;
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  loginError.classList.add('hidden');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail.value, password: loginPassword.value })
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Login failed');

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('lalira_token', data.token);

    userDisplayName.textContent = `${state.user.nombre} (${state.user.rol === 'admin' ? 'Admin' : 'Editor'})`;
    syncRoleVisibility();
    hideLoginScreen();
    await initializeDashboard();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.classList.remove('hidden');
  }
}

function handleLogout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('lalira_token');
  showLoginScreen();
}

function syncRoleVisibility() {
  const isAdmin = state.user && state.user.rol === 'admin';
  document.querySelectorAll('.admin-only').forEach(el => {
    el.classList.toggle('hidden', !isAdmin);
  });
}

async function initializeDashboard() {
  hideLoginScreen();
  await loadMetadata();
  await fetchSongs();
}

// Show Toast message
function showToast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.className = 'toast';
  if (isError) toastEl.classList.add('toast-error');
  toastEl.classList.remove('hidden');

  setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 4000);
}

// Fetch Metadata
async function loadMetadata() {
  try {
    const [hymnalsRes, sectionsRes] = await Promise.all([
      fetch('/api/hymnals', { headers: { 'Authorization': `Bearer ${state.token}` } }),
      fetch('/api/sections', { headers: { 'Authorization': `Bearer ${state.token}` } })
    ]);

    state.hymnals = await hymnalsRes.json();
    state.sections = await sectionsRes.json();

    hymnarySelect.innerHTML = '<option value="">Todos</option>' + 
      state.hymnals.map(h => `<option value="${h.id}">${h.nombre} (${h.codigo})</option>`).join('');

    sectionSelect.innerHTML = '<option value="">Todas</option>' + 
      state.sections.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');

    const inputSection = document.getElementById('input-section');
    inputSection.innerHTML = state.sections.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');

    await loadVersionInfo();
  } catch (err) {
    showToast("Error al cargar metadatos.", true);
  }
}

async function loadVersionInfo() {
  try {
    const res = await fetch('/api/version', { headers: { 'Authorization': `Bearer ${state.token}` } });
    const vdata = await res.json();
    const sizeMB = (vdata.db_size / (1024 * 1024)).toFixed(2);
    versionLabel.textContent = `v${vdata.version || '0.0.0'} (${sizeMB} MB)`;
  } catch {
    versionLabel.textContent = "Error de versión";
  }
}

// Fetch Songs
async function fetchSongs() {
  try {
    songsList.innerHTML = '<div class="loading-spinner"></div>';
    
    const params = new URLSearchParams();
    if (hymnarySelect.value) params.append('himnario_id', hymnarySelect.value);
    if (sectionSelect.value) params.append('seccion_id', sectionSelect.value);
    if (searchInput.value.trim()) params.append('search', searchInput.value.trim());

    const res = await fetch(`/api/songs?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    state.songs = await res.json();

    songsCount.textContent = state.songs.length;
    renderSongsList();
  } catch (err) {
    songsList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--color-primary);">Error cargando canciones.</div>';
  }
}

function renderSongsList() {
  if (state.songs.length === 0) {
    songsList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--color-text-muted);">No se encontraron alabanzas</div>';
    return;
  }

  songsList.innerHTML = state.songs.map(song => {
    const activeClass = (state.currentSong && state.currentSong.id === song.id) ? 'active' : '';
    
    let draftStatusDot = '';
    if (song.draft_status === 'draft') {
      draftStatusDot = '<span class="status-indicator-dot status-draft" title="Borrador pendiente"></span>';
    } else if (song.draft_status === 'pending_approval') {
      draftStatusDot = '<span class="status-indicator-dot status-pending_approval" title="Esperando aprobación"></span>';
    }

    return `
      <div class="song-item ${activeClass}" onclick="loadSong(${song.id})">
        <div class="song-item-badge badge-${song.himnario_codigo}">${song.himnario_codigo}</div>
        <div class="song-item-number">#${song.numero_en_himnario}</div>
        <div class="song-item-details">
          <div class="song-item-title">${song.titulo || '(Sin título)'}</div>
          <div class="song-item-sub">
            <span>Tono: ${song.tonalidad || '—'}</span>
            <span>ID: ${song.id}</span>
          </div>
        </div>
        ${draftStatusDot}
      </div>
    `;
  }).join('');
}

// Load Song Detail
window.loadSong = async function(songId) {
  try {
    const items = document.querySelectorAll('.song-item');
    items.forEach(item => item.classList.remove('active'));

    const res = await fetch(`/api/songs/${songId}`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!res.ok) throw new Error();

    const data = await res.json();
    state.currentSong = data.production;
    state.activeDraft = data.draft; // Can be null
    state.currentCifraLang = 'es';
    state.notesList = state.activeDraft ? (state.activeDraft.data.notas || []) : (state.currentSong.notas || []);

    // Sync active highlight
    fetchSongsListSync();

    emptyState.classList.add('hidden');
    editorPanel.classList.remove('hidden');

    // Populate UI fields
    const workingData = state.activeDraft ? state.activeDraft.data : state.currentSong;
    
    document.getElementById('song-display-title').textContent = workingData.metadata.es.titulo || workingData.metadata.pt.titulo || "Sin título";
    document.getElementById('song-display-meta').textContent = `Himnario ${state.currentSong.himnario_codigo} — Número ${workingData.numero_en_himnario}`;
    
    const badge = document.getElementById('hymnary-badge');
    badge.textContent = state.currentSong.himnario_codigo;
    badge.className = `song-hymnary-tag badge-${state.currentSong.himnary_badge || state.currentSong.himnario_codigo}`;

    // Status Badge & Controls
    if (state.activeDraft) {
      draftStatusBadge.classList.remove('hidden');
      if (state.activeDraft.status === 'draft') {
        draftStatusBadge.textContent = "Borrador Inédito";
        draftStatusBadge.style.backgroundColor = "var(--color-secondary)";
        draftStatusBadge.style.color = "var(--color-text-bright)";
      } else if (state.activeDraft.status === 'pending_approval') {
        draftStatusBadge.textContent = "Esperando Aprobación";
        draftStatusBadge.style.backgroundColor = "var(--color-warning)";
        draftStatusBadge.style.color = "#000";
      }
    } else {
      draftStatusBadge.classList.add('hidden');
    }

    // Toggle approval buttons and Diff Tab link for admins
    const isAdmin = state.user.rol === 'admin';
    const isPending = state.activeDraft && state.activeDraft.status === 'pending_approval';
    
    adminApprovalActions.classList.toggle('hidden', !(isAdmin && isPending));
    tabDiffLink.classList.toggle('hidden', !(isAdmin && state.activeDraft));

    // Inputs population
    document.getElementById('input-number').value = workingData.numero_en_himnario;
    document.getElementById('input-key').value = workingData.tonalidad || "";
    document.getElementById('input-section').value = workingData.seccion_id || "";
    document.getElementById('input-intro').value = workingData.intro || "";

    // Translations
    for (const lang of ['es', 'pt', 'en']) {
      const meta = workingData.metadata[lang] || { titulo: '', autor: '', compositor: '', adaptador: '', traductor: '' };
      document.getElementById(`meta-${lang}-titulo`).value = meta.titulo || "";
      document.getElementById(`meta-${lang}-autor`).value = meta.autor || "";
      document.getElementById(`meta-${lang}-compositor`).value = meta.compositor || "";
      document.getElementById(`meta-${lang}-adaptador`).value = meta.adaptador || "";
      document.getElementById(`meta-${lang}-traductor`).value = meta.traductor || "";
    }

    // Load tabs contents
    switchCifraLang('es');
    renderStanzasLists();
    renderNotesList();

    // Default to Metadata Tab
    tabLinks[0].click();
  } catch (err) {
    showToast("Error al cargar la alabanza.", true);
  }
};

function fetchSongsListSync() {
  const items = Array.from(songsList.children);
  items.forEach(item => {
    if (item.outerHTML.includes(`loadSong(${state.currentSong.id})`)) {
      item.classList.add('active');
    }
  });
}

function switchCifraLang(lang) {
  state.currentCifraLang = lang;

  document.getElementById('cifra-lang-es').classList.toggle('active', lang === 'es');
  document.getElementById('cifra-lang-pt').classList.toggle('active', lang === 'pt');
  document.getElementById('cifra-lang-en').classList.toggle('active', lang === 'en');

  const workingData = state.activeDraft ? state.activeDraft.data : state.currentSong;
  const cifra = workingData.cifras[lang] || { contenido: '', tonalidad: '', capotraste: 0, bpm: 0 };
  
  document.getElementById('chordpro-textarea').value = cifra.contenido || "";
  document.getElementById('cifra-key').value = cifra.tonalidad || "";
  document.getElementById('cifra-bpm').value = cifra.bpm || "";
  document.getElementById('cifra-capo').value = cifra.capotraste || 0;

  renderChordProPreview();
}

// --- ChordPro Line Parser & Renderer ---

function parseChordProLine(line) {
  const regex = /\[([^\]]+)\]/g;
  let match;
  const tokens = [];

  if (line.startsWith('{') && line.endsWith('}')) {
    return { type: 'directive', text: line };
  }

  if (line.trim() === '') {
    return { type: 'empty' };
  }

  if (!line.includes('[') && (
    line.endsWith(':') || 
    line.toLowerCase() === 'coro' || 
    line.toLowerCase().startsWith('estrofa') || 
    line.toLowerCase().startsWith('final') || 
    line.toLowerCase().startsWith('instrumentos') ||
    line.toLowerCase().startsWith('introducción') ||
    line.toLowerCase().startsWith('intro')
  )) {
    return { type: 'header', text: line };
  }

  let hasChords = false;
  let matches = [];
  while ((match = regex.exec(line)) !== null) {
    matches.push({
      chord: match[1],
      index: match.index,
      fullLength: match[0].length
    });
    hasChords = true;
  }

  if (!hasChords) {
    return {
      type: 'lyrics',
      tokens: [{ chord: null, text: line }]
    };
  }

  let currentPos = 0;
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    
    if (m.index > currentPos) {
      const text = line.substring(currentPos, m.index);
      if (tokens.length === 0) {
        tokens.push({ chord: null, text: text });
      } else {
        tokens[tokens.length - 1].text += text;
      }
    }

    const nextChordPos = (i + 1 < matches.length) ? matches[i + 1].index : line.length;
    const startOfTextAfterChord = m.index + m.fullLength;
    const textAfterChord = line.substring(startOfTextAfterChord, nextChordPos);

    tokens.push({
      chord: m.chord,
      text: textAfterChord
    });

    currentPos = nextChordPos;
  }

  return { type: 'lyrics', tokens: tokens };
}

function renderChordProPreview() {
  const text = document.getElementById('chordpro-textarea').value;
  const previewContainer = document.getElementById('chords-preview');
  
  if (!text.trim()) {
    previewContainer.innerHTML = '<div style="color: var(--color-text-muted); font-size: 0.9rem;">No hay cifrado para previsualizar.</div>';
    return;
  }

  const lines = text.split('\n');
  let html = '';

  for (let line of lines) {
    const parsed = parseChordProLine(line);

    if (parsed.type === 'empty') {
      html += '<div class="preview-empty"></div>';
    } else if (parsed.type === 'header') {
      html += `<div class="preview-header">${parsed.text}</div>`;
    } else if (parsed.type === 'directive') {
      html += `<div style="font-size: 0.75rem; color: var(--color-text-muted); font-family: monospace;">${parsed.text}</div>`;
    } else if (parsed.type === 'lyrics') {
      html += '<div class="preview-line">';
      for (let token of parsed.tokens) {
        const chordHtml = token.chord ? `<span class="preview-chord">${token.chord}</span>` : '<span class="preview-chord">&nbsp;</span>';
        html += `
          <div class="preview-token">
            ${chordHtml}
            <span class="preview-lyric">${token.text}</span>
          </div>
        `;
      }
      html += '</div>';
    }
  }

  previewContainer.innerHTML = html;
}

// --- Stanzas Tab management ---

function renderStanzasLists() {
  const containerEs = document.getElementById('container-stanzas-es');
  const containerPt = document.getElementById('container-stanzas-pt');
  const containerEn = document.getElementById('container-stanzas-en');

  containerEs.innerHTML = '';
  containerPt.innerHTML = '';
  containerEn.innerHTML = '';

  const workingData = state.activeDraft ? state.activeDraft.data : state.currentSong;
  const stanzas = workingData.estrofas || [];

  stanzas.filter(s => s.idioma === 'es').forEach(s => addStanzaToContainer(containerEs, s, 'es'));
  stanzas.filter(s => s.idioma === 'pt').forEach(s => addStanzaToContainer(containerPt, s, 'pt'));
  stanzas.filter(s => s.idioma === 'en').forEach(s => addStanzaToContainer(containerEn, s, 'en'));

  if (containerEs.innerHTML === '') containerEs.innerHTML = '<div class="empty-substate">No hay estrofas en Español</div>';
  if (containerPt.innerHTML === '') containerPt.innerHTML = '<div class="empty-substate">No hay estrofas en Portugués</div>';
  if (containerEn.innerHTML === '') containerEn.innerHTML = '<div class="empty-substate">No hay estrofas en Inglés</div>';
}

function addStanzaToContainer(container, stanza, lang) {
  if (container.querySelector('.empty-substate')) {
    container.innerHTML = '';
  }

  const div = document.createElement('div');
  div.className = 'stanza-edit-item';
  div.dataset.id = stanza.id || '';
  
  div.innerHTML = `
    <div class="stanza-item-header">
      <span class="stanza-index-label">Orden: <input type="number" class="stanza-order-input" value="${stanza.orden}" style="width: 50px; padding: 2px 4px; display: inline;"></span>
      <select class="stanza-type-select">
        <option value="estrofa" ${stanza.tipo === 'estrofa' ? 'selected' : ''}>Estrofa</option>
        <option value="coro" ${stanza.tipo === 'coro' ? 'selected' : ''}>Coro</option>
        <option value="final" ${stanza.tipo === 'final' ? 'selected' : ''}>Final</option>
        <option value="instrumentos" ${stanza.tipo === 'instrumentos' ? 'selected' : ''}>Instrumental</option>
      </select>
      <button class="stanza-delete-btn" onclick="this.closest('.stanza-edit-item').remove()">Eliminar</button>
    </div>
    <textarea class="stanza-textarea" placeholder="Texto de la estrofa...">${stanza.texto || ''}</textarea>
  `;
  container.appendChild(div);
}

window.addStanzaRow = function(lang) {
  const container = document.getElementById(lang === 'es' ? 'container-stanzas-es' : (lang === 'pt' ? 'container-stanzas-pt' : 'container-stanzas-en'));
  const count = container.querySelectorAll('.stanza-edit-item').length + 1;
  const dummyStanza = {
    orden: count,
    tipo: 'estrofa',
    texto: '',
    repeticiones: 1,
    idioma: lang
  };
  addStanzaToContainer(container, dummyStanza, lang);
};

// --- Footnotes / Notes Tab management ---

function renderNotesList() {
  const container = document.getElementById('notes-list-items');
  container.innerHTML = '';

  if (state.notesList.length === 0) {
    container.innerHTML = '<div class="empty-substate">No hay notas configuradas.</div>';
    return;
  }

  state.notesList.forEach((note, index) => {
    const div = document.createElement('div');
    div.className = `note-card note-${note.tipo}`;
    
    let detailsHtml = '';
    if (note.tipo === 'biblica') {
      detailsHtml = `
        <div class="note-card-ref">${note.referencia || ''}</div>
        ${note.versiculo_texto ? `<div class="note-card-verse">"${note.versiculo_texto}"</div>` : ''}
      `;
    } else if ((note.tipo === 'autor' || note.tipo === 'traductor') && note.autor) {
      detailsHtml = `<div class="note-card-ref">Autor/Comentario: ${note.autor}</div>`;
    }

    div.innerHTML = `
      <div class="note-card-header">
        <span class="note-badge">${note.tipo} — #${note.marcador_numero}</span>
        <div class="note-actions">
          <button class="note-action-btn" onclick="editNoteInForm(${index})">Editar</button>
          <button class="note-action-btn delete" onclick="deleteNote(${index})">Eliminar</button>
        </div>
      </div>
      ${note.fragmento_letra ? `<div class="note-card-fragment">"${note.fragmento_letra}"</div>` : ''}
      <div class="note-card-body">${note.texto || ''}</div>
      ${detailsHtml}
    `;
    container.appendChild(div);
  });
}

window.deleteNote = function(index) {
  state.notesList.splice(index, 1);
  renderNotesList();
};

window.editNoteInForm = function(index) {
  const note = state.notesList[index];
  
  document.getElementById('note-input-type').value = note.tipo;
  document.getElementById('note-input-index').value = note.marcador_numero;
  document.getElementById('note-input-fragment').value = note.fragmento_letra || '';
  document.getElementById('note-input-text').value = note.texto || '';
  document.getElementById('note-input-ref').value = note.referencia || '';
  document.getElementById('note-input-verse').value = note.versiculo_texto || '';
  document.getElementById('note-input-author').value = note.autor || '';

  document.getElementById('note-input-type').dispatchEvent(new Event('change'));
  document.getElementById('note-input-type').focus();
};

function addNoteToWorkingList() {
  const tipo = document.getElementById('note-input-type').value;
  const index = parseInt(document.getElementById('note-input-index').value) || 1;
  const fragment = document.getElementById('note-input-fragment').value.trim();
  const text = document.getElementById('note-input-text').value.trim();
  const ref = document.getElementById('note-input-ref').value.trim();
  const verse = document.getElementById('note-input-verse').value.trim();
  const author = document.getElementById('note-input-author').value.trim();

  if (!text && !ref) {
    showToast("Completa la nota con detalles.", true);
    return;
  }

  const noteData = {
    tipo,
    marcador_numero: index,
    fragmento_letra: fragment,
    texto: text,
    referencia: tipo === 'biblica' ? ref : '',
    versiculo_texto: tipo === 'biblica' ? verse : '',
    autor: (tipo === 'autor' || tipo === 'traductor') ? author : ''
  };

  const existingIdx = state.notesList.findIndex(n => n.tipo === tipo && n.marcador_numero === index);
  if (existingIdx !== -1) {
    state.notesList[existingIdx] = noteData;
  } else {
    state.notesList.push(noteData);
  }

  state.notesList.sort((a,b) => a.marcador_numero - b.marcador_numero);
  renderNotesList();

  // Reset inputs
  document.getElementById('note-input-index').value = state.notesList.length + 1;
  document.getElementById('note-input-fragment').value = '';
  document.getElementById('note-input-text').value = '';
  document.getElementById('note-input-ref').value = '';
  document.getElementById('note-input-verse').value = '';
  document.getElementById('note-input-author').value = '';
}

// ── SAVE & APPROVAL INTEGRATION ─────────────────────────────────────────────

async function saveDraftSong(submitForApproval = false) {
  if (!state.currentSong) return;

  const btn = submitForApproval ? submitApprovalBtn : saveDraftBtn;
  const oldText = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = "Guardando...";

  try {
    // Collect working draft schema
    const workingData = {
      numero_en_himnario: document.getElementById('input-number').value.trim(),
      tonalidad: document.getElementById('input-key').value.trim(),
      seccion_id: parseInt(document.getElementById('input-section').value) || null,
      intro: document.getElementById('input-intro').value.trim(),
      metadata: {},
      cifras: {},
      estrofas: [],
      notas: state.notesList
    };

    // Translations Metadata
    for (const lang of ['es', 'pt', 'en']) {
      workingData.metadata[lang] = {
        idioma: lang,
        titulo: document.getElementById(`meta-${lang}-titulo`).value.trim(),
        autor: document.getElementById(`meta-${lang}-autor`).value.trim(),
        compositor: document.getElementById(`meta-${lang}-compositor`).value.trim(),
        adaptador: document.getElementById(`meta-${lang}-adaptador`).value.trim(),
        traductor: document.getElementById(`meta-${lang}-traductor`).value.trim()
      };
    }

    // Chords (Cifras)
    // Synchronize active fields in UI first
    const activeL = state.currentCifraLang;
    const oldCifras = state.activeDraft ? state.activeDraft.data.cifras : state.currentSong.cifras;
    for (const lang of ['es', 'pt', 'en']) {
      if (lang === activeL) {
        workingData.cifras[lang] = {
          idioma: lang,
          contenido: document.getElementById('chordpro-textarea').value,
          tonalidad: document.getElementById('cifra-key').value.trim(),
          bpm: parseInt(document.getElementById('cifra-bpm').value) || 0,
          capotraste: parseInt(document.getElementById('cifra-capo').value) || 0
        };
      } else {
        workingData.cifras[lang] = oldCifras[lang] || { idioma: lang, contenido: '', tonalidad: '', capotraste: 0, bpm: 0 };
      }
    }

    // Stanzas (plain text stanzas editor)
    ['es', 'pt', 'en'].forEach(lang => {
      const container = document.getElementById(`container-stanzas-${lang}`);
      const rows = container.querySelectorAll('.stanza-edit-item');
      rows.forEach(row => {
        const order = parseInt(row.querySelector('.stanza-order-input').value) || 1;
        const tipo = row.querySelector('.stanza-type-select').value;
        const texto = row.querySelector('.stanza-textarea').value.trim();
        if (texto) {
          workingData.estrofas.push({
            orden: order,
            tipo: tipo,
            texto: texto,
            repeticiones: 1,
            idioma: lang
          });
        }
      });
    });

    // POST Save Draft
    let res = await fetch(`/api/drafts/${state.currentSong.id}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify(workingData)
    });
    if (!res.ok) throw new Error();

    // POST Submit if flagged
    if (submitForApproval) {
      res = await fetch(`/api/drafts/${state.currentSong.id}/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      if (!res.ok) throw new Error();
      showToast("Borrador enviado para aprobación.");
    } else {
      showToast("Borrador guardado localmente.");
    }

    // Reload active song detail
    await loadSong(state.currentSong.id);
    await fetchSongs();
  } catch {
    showToast("Error al guardar borrador.", true);
  } finally {
    btn.disabled = false;
    btn.innerHTML = oldText;
  }
}

async function approveDraftSong() {
  if (!state.currentSong || !confirm("¿Estás seguro de aprobar este borrador? Se aplicará directamente en la base de datos de producción.")) return;

  try {
    const res = await fetch(`/api/drafts/${state.currentSong.id}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }

    showToast("Borrador aprobado e integrado a producción.");
    await loadSong(state.currentSong.id);
    await fetchSongs();
  } catch (err) {
    showToast(`Error al aprobar: ${err.message}`, true);
  }
}

async function rejectDraftSong() {
  if (!state.currentSong) return;
  const motivo = prompt("Especifica el motivo del rechazo del borrador:");
  if (motivo === null) return; // Cancelled

  try {
    const res = await fetch(`/api/drafts/${state.currentSong.id}/reject`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ motivo })
    });
    if (!res.ok) throw new Error();

    showToast("Borrador rechazado y devuelto a edición.");
    await loadSong(state.currentSong.id);
    await fetchSongs();
  } catch {
    showToast("Error al rechazar borrador.", true);
  }
}

// ── COMPARATIVE DIFF VIEWER ──────────────────────────────────────────────────

function escapeHtml(text) {
  return (text || '')
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateLineDiff(txt1, txt2) {
  const lines1 = (txt1 || '').split('\n');
  const lines2 = (txt2 || '').split('\n');
  let html = '';
  const max = Math.max(lines1.length, lines2.length);

  for (let i = 0; i < max; i++) {
    const l1 = lines1[i];
    const l2 = lines2[i];

    if (l1 === l2) {
      html += `<div>  ${escapeHtml(l1)}</div>`;
    } else {
      if (l1 !== undefined) html += `<div class="diff-removed">- ${escapeHtml(l1)}</div>`;
      if (l2 !== undefined) html += `<div class="diff-added">+ ${escapeHtml(l2)}</div>`;
    }
  }
  return html;
}

function renderDiffView() {
  const prodView = document.getElementById('diff-production-view');
  const draftView = document.getElementById('diff-draft-view');

  if (!state.currentSong || !state.activeDraft) {
    prodView.innerHTML = 'No hay borrador cargado.';
    draftView.innerHTML = 'No hay borrador cargado.';
    return;
  }

  const p = state.currentSong;
  const d = state.activeDraft.data;

  // Let's print clean side-by-side textual comparative JSON outputs
  const getComparativeText = (songObj) => {
    let out = `Himno ID: ${songObj.id || p.id}\n`;
    out += `Número: ${songObj.numero_en_himnario}\n`;
    out += `Tono: ${songObj.tonalidad || '—'}\n`;
    out += `Intro: ${songObj.intro || '—'}\n\n`;

    ['es', 'pt', 'en'].forEach(lang => {
      const meta = songObj.metadata[lang] || {};
      out += `=== Metadatos (${lang.toUpperCase()}) ===\n`;
      out += `Título: ${meta.titulo || ''}\n`;
      out += `Autor: ${meta.autor || ''}\n`;
      out += `Compositor: ${meta.compositor || ''}\n`;
      out += `Traductor: ${meta.traductor || ''}\n\n`;

      const cifra = songObj.cifras[lang] || {};
      out += `=== Cifrado ChordPro (${lang.toUpperCase()}) ===\n`;
      out += `BPM: ${cifra.bpm || 0} / Capo: ${cifra.capotraste || 0}\n`;
      out += `${cifra.contenido || '(Vacío)'}\n\n`;
    });

    out += `=== Notas Referenciales ===\n`;
    const notes = songObj.notas || [];
    notes.forEach(n => {
      out += `[${n.tipo.toUpperCase()} #${n.marcador_numero}] Fragmento: ${n.fragmento_letra || '—'}\n`;
      out += `Texto: ${n.texto || ''}\n`;
      if (n.referencia) out += `Referencia: ${n.referencia}\n`;
      out += `\n`;
    });

    return out;
  };

  const prodText = getComparativeText(p);
  const draftText = getComparativeText(d);

  // Highlighting lines side-by-side using the line helper
  prodView.innerHTML = generateLineDiff(prodText, draftText).replace(/\+ .*/g, ''); // Hide added lines in production view
  draftView.innerHTML = generateLineDiff(prodText, draftText);
}

// ── AUDIT LOGS MODAL ─────────────────────────────────────────────────────────

async function openAuditModalView() {
  auditModal.classList.remove('hidden');
  auditLogsRows.innerHTML = '<tr><td colspan="5" style="text-align:center;">Cargando...</td></tr>';

  try {
    const res = await fetch('/api/audit-logs', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const logs = await res.json();

    if (logs.length === 0) {
      auditLogsRows.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay registros de auditoría.</td></tr>';
      return;
    }

    auditLogsRows.innerHTML = logs.map(l => {
      const date = new Date(l.fecha).toLocaleString('es-ES');
      return `
        <tr>
          <td>${date}</td>
          <td><strong>${l.usuario_nombre || 'Sistema'}</strong></td>
          <td><span class="note-badge">${l.accion}</span></td>
          <td>${l.cancion_id || '—'}</td>
          <td>${l.detalles || ''}</td>
        </tr>
      `;
    }).join('');
  } catch {
    auditLogsRows.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--color-primary);">Error cargando registros.</td></tr>';
  }
}

// ── PUBLISHING PIPELINE ──────────────────────────────────────────────────────

async function triggerPublishAll() {
  if (!confirm("¿Deseas compilar y subir los cambios aprobados de la base de datos?")) return;

  publishModal.classList.remove('hidden');
  publishStatusText.textContent = "Compilando tablas SQLite, limpiando índices y subiendo base de datos...";
  publishLog.classList.add('hidden');
  closePublishModal.classList.add('hidden');

  try {
    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const logData = await res.json();

    if (!res.ok) throw new Error(logData.error || "Publicación fallida");

    publishStatusText.textContent = logData.uploaded_to_server 
      ? "¡Publicación completa! Servidores web y app móviles actualizados."
      : "Base de datos compilada y copiada localmente en assets/.";

    publishLog.textContent = JSON.stringify(logData, null, 2);
    publishLog.classList.remove('hidden');
  } catch (err) {
    publishStatusText.textContent = "Error durante el proceso de publicación";
    publishLog.textContent = err.message;
    publishLog.classList.remove('hidden');
  } finally {
    closePublishModal.classList.remove('hidden');
  }
}

// ── OAUTH IDENTITY INITIALIZATION & HANDLERS ─────────────────────────────────

async function initOAuth() {
  try {
    const res = await fetch('/api/auth/config');
    oauthConfig = await res.json();

    // Init Google Identity Services
    if (oauthConfig.googleClientId) {
      if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        google.accounts.id.initialize({
          client_id: oauthConfig.googleClientId,
          callback: handleGoogleLoginResponse
        });
        
        google.accounts.id.renderButton(
          document.getElementById('google-signin-btn-container'),
          { theme: 'outline', size: 'large', width: 280 }
        );
      } else {
        console.warn('[AUTH] Google SDK not loaded yet. Retrying in 1s...');
        setTimeout(initOAuth, 1000);
      }
    } else {
      console.log('[AUTH] Google Client ID not configured. Using custom button for bypass.');
      const googleCustomBtn = document.getElementById('google-custom-btn');
      googleCustomBtn.addEventListener('click', () => {
        if (oauthConfig.devBypass) {
          handleOAuthLogin('google', 'mock_google_dev');
        } else {
          showToast('Google OAuth no está configurado en este servidor', true);
        }
      });
    }

  } catch (err) {
    console.error('[AUTH] Failed to initialize OAuth configuration', err);
  }
}

function handleGoogleLoginResponse(response) {
  if (response && response.credential) {
    handleOAuthLogin('google', response.credential);
  }
}

async function handleOAuthLogin(provider, token) {
  loginError.classList.add('hidden');
  try {
    const res = await fetch('/api/auth/oauth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, token })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Authentication failed');

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('lalira_token', data.token);

    userDisplayName.textContent = `${state.user.nombre} (${state.user.rol === 'admin' ? 'Admin' : 'Editor'})`;
    syncRoleVisibility();
    hideLoginScreen();
    await initializeDashboard();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.classList.remove('hidden');
  }
}

// ── USER MANAGEMENT MODAL & CRUD ─────────────────────────────────────────────

async function openUsersModalView() {
  usersModal.classList.remove('hidden');
  usersListRows.innerHTML = '<tr><td colspan="6" style="text-align:center;">Cargando colaboradores...</td></tr>';

  try {
    const res = await fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const users = await res.json();

    if (users.length === 0) {
      usersListRows.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay colaboradores registrados.</td></tr>';
      return;
    }

    usersListRows.innerHTML = users.map(u => {
      const isSelf = u.id === state.user.id;
      const deleteActionHtml = isSelf ? '' : `<button class="note-action-btn delete" onclick="deleteUser(${u.id})">Eliminar</button>`;
      const editActionHtml = `<button class="note-action-btn" onclick="editUserInForm(${JSON.stringify(u).replace(/"/g, '&quot;')})">Editar</button>`;
      
      return `
        <tr>
          <td><strong>${escapeHtml(u.nombre)}</strong>${isSelf ? ' <span style="font-size:0.75rem; color:var(--color-text-muted);">(Tú)</span>' : ''}</td>
          <td>${escapeHtml(u.email)}</td>
          <td><span class="badge-role ${u.rol}">${u.rol}</span></td>
          <td><span class="note-badge">${escapeHtml(u.auth_provider || 'google')}</span></td>
          <td><span class="badge-state ${u.estado}">${u.estado}</span></td>
          <td>
            <div class="note-actions">
              ${editActionHtml}
              ${deleteActionHtml}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    usersListRows.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--color-primary);">Error al cargar colaboradores.</td></tr>';
  }
}

window.deleteUser = async function(userId) {
  if (!confirm('¿Estás seguro de que deseas eliminar permanentemente a este colaborador?')) return;

  try {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('Colaborador eliminado correctamente.');
    openUsersModalView();
  } catch (err) {
    showToast(err.message || 'Error al eliminar colaborador.', true);
  }
};

function openInviteUserForm() {
  userFormModal.classList.remove('hidden');
  document.getElementById('user-modal-title').textContent = 'Invitar Colaborador';
  userFormId.value = '';
  userFormName.value = '';
  userFormEmail.value = '';
  userFormEmail.disabled = false;
  userFormRole.value = 'editor';
  userFormProvider.value = 'google';
  userFormPassword.value = '';
  userFormPasswordGroup.classList.add('hidden');
  userFormStatusGroup.classList.add('hidden');
  userFormError.classList.add('hidden');
}

window.editUserInForm = function(user) {
  userFormModal.classList.remove('hidden');
  document.getElementById('user-modal-title').textContent = 'Editar Colaborador';
  userFormId.value = user.id;
  userFormName.value = user.nombre;
  userFormEmail.value = user.email;
  userFormEmail.disabled = true; // Email is the identifier and cannot be edited
  userFormRole.value = user.rol;
  userFormProvider.value = user.auth_provider || 'google';
  userFormPassword.value = '';
  if (userFormProvider.value === 'local') {
    userFormPasswordGroup.classList.remove('hidden');
  } else {
    userFormPasswordGroup.classList.add('hidden');
  }
  userFormStatus.value = user.estado;
  userFormStatusGroup.classList.remove('hidden');
  userFormError.classList.add('hidden');
};

async function handleUserFormSubmit(e) {
  e.preventDefault();
  userFormError.classList.add('hidden');

  const id = userFormId.value;
  const isEdit = !!id;
  const url = isEdit ? `/api/users/${id}` : '/api/users';
  const method = isEdit ? 'PUT' : 'POST';

  const provider = userFormProvider.value;
  const passwordVal = userFormPassword.value;

  if (provider === 'local' && !isEdit && (!passwordVal || passwordVal.trim().length < 6)) {
    userFormError.textContent = 'La contraseña local debe tener al menos 6 caracteres.';
    userFormError.classList.remove('hidden');
    return;
  }

  const body = {
    nombre: userFormName.value.trim(),
    rol: userFormRole.value,
    auth_provider: provider,
    estado: isEdit ? userFormStatus.value : 'activo'
  };
  if (!isEdit) {
    body.email = userFormEmail.value.trim();
  }
  if (passwordVal && passwordVal.trim().length >= 6) {
    body.password = passwordVal;
  }

  try {
    const res = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al guardar colaborador');

    showToast(isEdit ? 'Colaborador actualizado con éxito.' : 'Colaborador invitado con éxito.');
    userFormModal.classList.add('hidden');
    openUsersModalView();
  } catch (err) {
    userFormError.textContent = err.message;
    userFormError.classList.remove('hidden');
  }
}
