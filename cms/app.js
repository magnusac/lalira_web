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
const API_BASE = window.location.pathname.includes('/lalira/') ? '/lalira/api' : '/api';


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
const dashboardPanel = document.getElementById('dashboard-panel');
const sidebarDashboardBtn = document.getElementById('sidebar-dashboard-btn');
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
  
  // Dashboard Navigation
  if (sidebarDashboardBtn) {
    sidebarDashboardBtn.addEventListener('click', () => showDashboard(true));
  }


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

  // Helper to auto-extract directives from ChordPro
  const extractDirectives = (text) => {
    const timeMatch = text.match(/\{time:\s*([^}]+)\}/i) || text.match(/\{compas:\s*([^}]+)\}/i);
    const tempoMatch = text.match(/\{tempo:\s*([^}]+)\}/i) || text.match(/\{bpm:\s*([^}]+)\}/i);
    const keyMatch = text.match(/\{key:\s*([^}]+)\}/i) || text.match(/\{tono:\s*([^}]+)\}/i) || text.match(/\{tonalidad:\s*([^}]+)\}/i);
    const ritmoMatch = text.match(/\{ritmo:\s*([^}]+)\}/i) || text.match(/\{rhythm:\s*([^}]+)\}/i);
    return {
      time: timeMatch ? timeMatch[1].trim() : null,
      tempo: tempoMatch ? parseInt(tempoMatch[1].trim()) || null : null,
      key: keyMatch ? keyMatch[1].trim() : null,
      ritmo: ritmoMatch ? ritmoMatch[1].trim() : null
    };
  };

  // ChordPro Textarea live preview
  document.getElementById('chordpro-textarea').addEventListener('input', () => {
    const targetObj = state.activeDraft ? state.activeDraft.data : state.currentSong;
    if (targetObj) {
      const lang = state.currentCifraLang;
      const text = document.getElementById('chordpro-textarea').value;
      targetObj.cifras[lang].contenido = text;

      // Auto-extract directives
      const extracted = extractDirectives(text);
      if (extracted.time) {
        targetObj.cifras[lang].tiempo = extracted.time;
        document.getElementById('cifra-tiempo').value = extracted.time;
      }
      if (extracted.tempo) {
        targetObj.cifras[lang].bpm = extracted.tempo;
        document.getElementById('cifra-bpm').value = extracted.tempo;
      }
      if (extracted.ritmo) {
        targetObj.cifras[lang].ritmo = extracted.ritmo;
        document.getElementById('cifra-ritmo').value = extracted.ritmo;
      }
      if (extracted.key) {
        targetObj.cifras[lang].tonalidad = extracted.key;
        document.getElementById('cifra-key').value = extracted.key;
        // Sync to overall song metadata tone field (Tab 3)
        targetObj.tonalidad = extracted.key;
        const inputKeyEl = document.getElementById('input-key');
        if (inputKeyEl) inputKeyEl.value = extracted.key;
      }

      adjustTextareaHeight();
      renderChordProPreview();
    }
  });

  // Chords key/bpm/capo listeners to keep working data updated
  document.getElementById('cifra-key').addEventListener('input', (e) => {
    const targetObj = state.activeDraft ? state.activeDraft.data : state.currentSong;
    if (targetObj) {
      targetObj.cifras[state.currentCifraLang].tonalidad = e.target.value;
      targetObj.tonalidad = e.target.value;
      const inputKeyEl = document.getElementById('input-key');
      if (inputKeyEl) inputKeyEl.value = e.target.value;
    }
  });
  const inputKeyEl = document.getElementById('input-key');
  if (inputKeyEl) {
    inputKeyEl.addEventListener('input', (e) => {
      const targetObj = state.activeDraft ? state.activeDraft.data : state.currentSong;
      if (targetObj) {
        targetObj.tonalidad = e.target.value;
        if (targetObj.cifras && targetObj.cifras[state.currentCifraLang]) {
          targetObj.cifras[state.currentCifraLang].tonalidad = e.target.value;
        }
        const cifraKeyEl = document.getElementById('cifra-key');
        if (cifraKeyEl) cifraKeyEl.value = e.target.value;
      }
    });
  }
  document.getElementById('cifra-bpm').addEventListener('input', (e) => {
    const targetObj = state.activeDraft ? state.activeDraft.data : state.currentSong;
    if (targetObj) targetObj.cifras[state.currentCifraLang].bpm = parseInt(e.target.value) || 0;
  });
  document.getElementById('cifra-tiempo').addEventListener('input', (e) => {
    const targetObj = state.activeDraft ? state.activeDraft.data : state.currentSong;
    if (targetObj) targetObj.cifras[state.currentCifraLang].tiempo = e.target.value;
  });
  document.getElementById('cifra-ritmo').addEventListener('input', (e) => {
    const targetObj = state.activeDraft ? state.activeDraft.data : state.currentSong;
    if (targetObj) targetObj.cifras[state.currentCifraLang].ritmo = e.target.value;
  });

  // Save Draft, Submit, Approve, Reject buttons
  saveDraftBtn.addEventListener('click', () => saveDraftSong(false));
  submitApprovalBtn.addEventListener('click', () => saveDraftSong(true));
  approveBtn.addEventListener('click', approveDraftSong);
  rejectBtn.addEventListener('click', rejectDraftSong);
  const deleteSongBtn = document.getElementById('delete-song-btn');
  if (deleteSongBtn) deleteSongBtn.addEventListener('click', deleteSong);

  // Mobile Back Button & Floating Save/Submit Actions
  const mobileBackBtn = document.getElementById('mobile-back-btn');
  if (mobileBackBtn) {
    mobileBackBtn.addEventListener('click', showMobileSidebar);
  }

  const mobileSaveDraftBtn = document.getElementById('mobile-save-draft-btn');
  if (mobileSaveDraftBtn) {
    mobileSaveDraftBtn.addEventListener('click', () => saveDraftSong(false));
  }

  const mobileSubmitApprovalBtn = document.getElementById('mobile-submit-approval-btn');
  if (mobileSubmitApprovalBtn) {
    mobileSubmitApprovalBtn.addEventListener('click', () => saveDraftSong(true));
  }

  // Segmented View Toggle (Editor vs Preview on mobile)
  const btnShowEditor = document.getElementById('btn-show-editor');
  const btnShowPreview = document.getElementById('btn-show-preview');
  const paneChordEditor = document.getElementById('pane-chord-editor');
  const paneChordPreview = document.getElementById('pane-chord-preview');

  if (btnShowEditor && btnShowPreview && paneChordEditor && paneChordPreview) {
    btnShowEditor.addEventListener('click', () => {
      btnShowEditor.classList.add('active');
      btnShowPreview.classList.remove('active');
      paneChordEditor.classList.remove('hidden-mobile');
      paneChordPreview.classList.add('hidden-mobile');
    });

    btnShowPreview.addEventListener('click', () => {
      btnShowPreview.classList.add('active');
      btnShowEditor.classList.remove('active');
      paneChordPreview.classList.remove('hidden-mobile');
      paneChordEditor.classList.add('hidden-mobile');
      renderChordProPreview();
    });
  }

  // Chord Assistant Toolbar Event Listeners
  const btnOpenChordBuilder = document.getElementById('btn-open-chord-builder');
  if (btnOpenChordBuilder) {
    btnOpenChordBuilder.addEventListener('click', (e) => {
      e.preventDefault();
      openChordBuilderModal();
    });
  }

  const btnMarkIntro = document.getElementById('btn-mark-intro');
  if (btnMarkIntro) {
    btnMarkIntro.addEventListener('click', (e) => {
      e.preventDefault();
      markSelectionAsIntro();
    });
  }

  const btnRemoveIntro = document.getElementById('btn-remove-intro');
  if (btnRemoveIntro) {
    btnRemoveIntro.addEventListener('click', (e) => {
      e.preventDefault();
      removeIntroMarkers();
    });
  }

  const btnAddFootnote = document.getElementById('btn-add-footnote');
  if (btnAddFootnote) {
    btnAddFootnote.addEventListener('click', (e) => {
      e.preventDefault();
      addSelectionToFootnote();
    });
  }

  // Chord Builder Modal Event Listeners
  const closeChordBuilderX = document.getElementById('close-chord-builder-x');
  const cancelChordBuilder = document.getElementById('cancel-chord-builder');
  const applyChordBuilder = document.getElementById('apply-chord-builder');
  const btnResetChordBuilder = document.getElementById('btn-reset-chord-builder');

  if (closeChordBuilderX) closeChordBuilderX.addEventListener('click', closeChordBuilderModal);
  if (cancelChordBuilder) cancelChordBuilder.addEventListener('click', closeChordBuilderModal);
  if (applyChordBuilder) applyChordBuilder.addEventListener('click', insertBuiltChord);
  if (btnResetChordBuilder) btnResetChordBuilder.addEventListener('click', resetChordBuilder);

  // Builder Chip Grid Listeners
  setupBuilderChipGroup('#builder-roots-grid', 'data-root', (val) => { chordBuilderState.root = val; });
  setupBuilderChipGroup('#builder-acc-grid', 'data-acc', (val) => { chordBuilderState.accidental = val; });
  setupBuilderChipGroup('#builder-qual-grid', 'data-qual', (val) => { chordBuilderState.quality = val; });
  setupBuilderChipGroup('#builder-slash-grid', 'data-slash', (val) => { chordBuilderState.slash = val; });

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

  // New Song and Navigation button listeners
  document.getElementById('prev-song-btn').addEventListener('click', () => navigateSong(-1));
  document.getElementById('next-song-btn').addEventListener('click', () => navigateSong(1));

  const addSongBtn = document.getElementById('add-song-btn');
  const newSongModal = document.getElementById('new-song-modal');
  const cancelNewSong = document.getElementById('cancel-new-song');
  const newSongForm = document.getElementById('new-song-form');
  const newSongError = document.getElementById('new-song-error');

  if (addSongBtn) {
    addSongBtn.addEventListener('click', () => {
      document.getElementById('new-song-number').value = '';
      document.getElementById('new-song-title').value = '';
      newSongError.classList.add('hidden');
      
      const newSongHymnary = document.getElementById('new-song-hymnary');
      if (newSongHymnary && state.hymnals) {
        newSongHymnary.innerHTML = state.hymnals.map(h => `<option value="${h.id}">${h.nombre} (${h.codigo})</option>`).join('');
      }

      newSongModal.classList.remove('hidden');
    });
  }

  if (cancelNewSong) {
    cancelNewSong.addEventListener('click', () => {
      newSongModal.classList.add('hidden');
    });
  }

  if (newSongForm) {
    newSongForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      newSongError.classList.add('hidden');

      const himnarioId = parseInt(document.getElementById('new-song-hymnary').value);
      const numero = document.getElementById('new-song-number').value.trim();
      const titulo = document.getElementById('new-song-title').value.trim();

      if (!himnarioId || !numero || !titulo) {
        newSongError.textContent = "Todos los campos son obligatorios.";
        newSongError.classList.remove('hidden');
        return;
      }

      // SAFEGUARD: Check if song already exists in state.songs for this himnarioId and numero
      const existingSong = (state.songs || []).find(s => s.himnario_id === himnarioId && String(s.numero_en_himnario).trim() === String(numero).trim());
      if (existingSong) {
        const confirmOverwrite = confirm(
          `⚠️ La alabanza N° ${numero} ya existe en este himnario ("${existingSong.titulo || 'Sin título'}").\n\n` +
          `¿Deseas cargar la canción existente para editarla y sobrescribir sus datos?`
        );
        if (!confirmOverwrite) return;

        newSongModal.classList.add('hidden');
        showToast(`Cargando alabanza N° ${numero} para edición y sobrescritura...`);
        await loadSong(existingSong.id);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/songs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`
          },
          body: JSON.stringify({
            himnario_id: himnarioId,
            numero_en_himnario: numero,
            titulo: titulo
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Error al crear borrador");
        }

        const data = await res.json();
        newSongModal.classList.add('hidden');
        showToast(`Borrador creado exitosamente.`);
        await fetchSongs();
        await loadSong(data.id);
      } catch (err) {
        newSongError.textContent = err.message;
        newSongError.classList.remove('hidden');
      }
    });
  }
}

function navigateSong(direction) {
  if (!state.songs || state.songs.length === 0 || state.currentSongId === undefined) return;
  const currentIndex = state.songs.findIndex(s => s.id === state.currentSongId);
  if (currentIndex === -1) return;

  const nextIndex = currentIndex + direction;
  if (nextIndex >= 0 && nextIndex < state.songs.length) {
    loadSong(state.songs[nextIndex].id);
  } else {
    showToast(direction === -1 ? "Ya estás en la primera alabanza." : "Ya estás en la última alabanza.");
  }
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
    const res = await fetch(`${API_BASE}/auth/me`, {
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
    const res = await fetch(`${API_BASE}/auth/login`, {
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
  if (dashboardPanel) dashboardPanel.classList.add('hidden');
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
  if (window.innerWidth <= 768) {
    showMobileSidebar();
  } else {
    showMobileWorkspace();
  }
  showDashboard();
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
      fetch(`${API_BASE}/hymnals`, { headers: { 'Authorization': `Bearer ${state.token}` } }),
      fetch(`${API_BASE}/sections`, { headers: { 'Authorization': `Bearer ${state.token}` } })
    ]);

    state.hymnals = await hymnalsRes.json();
    state.sections = await sectionsRes.json();

    hymnarySelect.innerHTML = '<option value="">Todos</option>' + 
      state.hymnals.map(h => `<option value="${h.id}">${h.nombre} (${h.codigo})</option>`).join('');

    sectionSelect.innerHTML = '<option value="">Todas</option>' + 
      state.sections.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');

    const inputSection = document.getElementById('input-section');
    if (inputSection) {
      inputSection.innerHTML = state.sections.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
    }

    const inputHymnary = document.getElementById('input-hymnary');
    if (inputHymnary) {
      inputHymnary.innerHTML = '<option value="">(Sin Colección / Huérfana)</option>' + 
        state.hymnals.map(h => `<option value="${h.id}">${h.nombre} (${h.codigo})</option>`).join('');
    }

    await loadVersionInfo();
  } catch (err) {
    showToast("Error al cargar metadatos.", true);
  }
}

async function loadVersionInfo() {
  try {
    const res = await fetch(`${API_BASE}/version`, { headers: { 'Authorization': `Bearer ${state.token}` } });
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

    const res = await fetch(`${API_BASE}/songs?${params.toString()}`, {
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
    const activeClass = (state.currentSongId === song.id) ? 'active' : '';
    
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

function showMobileWorkspace() {
  const container = document.getElementById('app-container');
  if (container) {
    container.classList.add('show-workspace');
    container.classList.remove('show-sidebar');
  }
}

function showMobileSidebar() {
  const container = document.getElementById('app-container');
  if (container) {
    container.classList.add('show-sidebar');
    container.classList.remove('show-workspace');
  }
}

// Load Song Detail
window.loadSong = async function(songId) {
  try {
    showMobileWorkspace();
    const items = document.querySelectorAll('.song-item');
    items.forEach(item => item.classList.remove('active'));

    const res = await fetch(`${API_BASE}/songs/${songId}`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!res.ok) throw new Error();

    const data = await res.json();
    state.currentSong = data.production;
    state.activeDraft = data.draft; // Can be null
    state.currentSongId = songId;
    state.currentCifraLang = 'es';
    state.notesList = state.activeDraft ? (state.activeDraft.data.notas || []) : (state.currentSong?.notas || []);

    // Sync active highlight
    fetchSongsListSync();

    if (sidebarDashboardBtn) sidebarDashboardBtn.classList.remove('active');
    if (dashboardPanel) dashboardPanel.classList.add('hidden');
    emptyState.classList.add('hidden');
    editorPanel.classList.remove('hidden');

    // Populate UI fields
    const workingData = state.activeDraft ? state.activeDraft.data : state.currentSong;
    
    document.getElementById('song-display-title').textContent = workingData.metadata.es.titulo || workingData.metadata.pt.titulo || "Sin título";
    
    const himnarioId = workingData.himnario_id || 1;
    const himnarioObj = state.hymnals.find(h => h.id == himnarioId) || { codigo: 'P', nombre: 'Personalizado' };
    const himnarioCodigo = state.currentSong ? state.currentSong.himnario_codigo : himnarioObj.codigo;

    document.getElementById('song-display-meta').textContent = `Himnario ${himnarioCodigo} — Número ${workingData.numero_en_himnario}`;
    
    const badge = document.getElementById('hymnary-badge');
    badge.textContent = himnarioCodigo;
    badge.className = `song-hymnary-tag badge-${state.currentSong?.himnary_badge || state.currentSong?.himnario_codigo || himnarioCodigo}`;

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
    const deleteSongBtn = document.getElementById('delete-song-btn');
    if (deleteSongBtn) {
      deleteSongBtn.classList.toggle('hidden', !(isAdmin && state.currentSongId));
    }

    // Inputs population
    document.getElementById('input-number').value = workingData.numero_en_himnario;
    document.getElementById('input-key').value = workingData.tonalidad || "";
    document.getElementById('input-section').value = workingData.seccion_id || "";
    document.getElementById('input-intro').value = workingData.intro || "";

    const inputHymnary = document.getElementById('input-hymnary');
    if (inputHymnary) {
      inputHymnary.value = workingData.himnario_id || "";
    }

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

    // Default to ChordPro Tab
    tabLinks[0].click();
  } catch (err) {
    showToast("Error al cargar la alabanza.", true);
  }
};

function fetchSongsListSync() {
  const items = Array.from(songsList.children);
  items.forEach(item => {
    item.classList.remove('active');
    if (state.currentSongId !== undefined && item.outerHTML.includes(`loadSong(${state.currentSongId})`)) {
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
  const cifra = workingData.cifras[lang] || { contenido: '', tonalidad: '', tiempo: '', bpm: 0, ritmo: '' };
  
  document.getElementById('chordpro-textarea').value = cifra.contenido || "";
  document.getElementById('cifra-key').value = cifra.tonalidad || workingData.tonalidad || "";
  document.getElementById('cifra-bpm').value = cifra.bpm || "";
  document.getElementById('cifra-tiempo').value = cifra.tiempo || "";
  document.getElementById('cifra-ritmo').value = cifra.ritmo || "";

  adjustTextareaHeight();
  renderChordProPreview();
}

function adjustTextareaHeight() {
  const textarea = document.getElementById('chordpro-textarea');
  if (textarea) {
    textarea.style.height = 'auto';
    const newHeight = Math.max(350, textarea.scrollHeight + 10);
    textarea.style.height = `${newHeight}px`;
  }
}

// --- Chord Assistant & Chord Builder (Option 1) Helpers ---

let chordBuilderState = {
  root: 'C',
  accidental: '',
  quality: '',
  slash: ''
};

function setupBuilderChipGroup(containerSelector, attrName, callback) {
  const chips = document.querySelectorAll(`${containerSelector} .builder-chip`);
  chips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const val = chip.getAttribute(attrName) || '';
      callback(val);
      updateChordBuilderPreview();
    });
  });
}

function getBuiltChordString() {
  return `[${chordBuilderState.root}${chordBuilderState.accidental}${chordBuilderState.quality}${chordBuilderState.slash}]`;
}

function updateChordBuilderPreview() {
  const previewEl = document.getElementById('chord-builder-preview');
  if (previewEl) {
    previewEl.textContent = getBuiltChordString();
  }
}

function openChordBuilderModal() {
  const modal = document.getElementById('chord-builder-modal');
  if (modal) {
    updateChordBuilderPreview();
    modal.classList.remove('hidden');
  }
}

function closeChordBuilderModal() {
  const modal = document.getElementById('chord-builder-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function insertBuiltChord() {
  const chordStr = getBuiltChordString(); // e.g. [F#m7/C#]
  const textarea = document.getElementById('chordpro-textarea');
  if (textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.setRangeText(chordStr, start, end, 'end');
    textarea.focus();
    textarea.dispatchEvent(new Event('input'));
  }
  closeChordBuilderModal();
}

function resetChordBuilder() {
  chordBuilderState = { root: 'C', accidental: '', quality: '', slash: '' };
  
  document.querySelectorAll('#builder-roots-grid .builder-chip').forEach(c => c.classList.toggle('active', c.getAttribute('data-root') === 'C'));
  document.querySelectorAll('#builder-acc-grid .builder-chip').forEach(c => c.classList.toggle('active', c.getAttribute('data-acc') === ''));
  document.querySelectorAll('#builder-qual-grid .builder-chip').forEach(c => c.classList.toggle('active', c.getAttribute('data-qual') === ''));
  document.querySelectorAll('#builder-slash-grid .builder-chip').forEach(c => c.classList.toggle('active', c.getAttribute('data-slash') === ''));

  updateChordBuilderPreview();
}

function markSelectionAsIntro() {
  const textarea = document.getElementById('chordpro-textarea');
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;

  if (start !== end) {
    const selectedText = text.substring(start, end);
    const wrapped = `{start_of_intro}${selectedText}{end_of_intro}`;
    textarea.setRangeText(wrapped, start, end, 'end');
  } else {
    const insertion = `{start_of_intro}{end_of_intro}`;
    textarea.setRangeText(insertion, start, end, 'end');
  }

  textarea.focus();
  textarea.dispatchEvent(new Event('input'));
}

function removeIntroMarkers() {
  const textarea = document.getElementById('chordpro-textarea');
  if (!textarea) return;

  let text = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  if (start !== end) {
    // If text selected -> strip intro tags from selection
    const selectedText = text.substring(start, end);
    const cleaned = selectedText.replace(/\{start_of_intro\}|\{end_of_intro\}|\{intro\}|\{\/intro\}/gi, '');
    textarea.setRangeText(cleaned, start, end, 'end');
  } else {
    // 1-Click: No text selected -> automatically strip intro tags from whole document
    const cleaned = text.replace(/\{start_of_intro\}|\{end_of_intro\}|\{intro\}|\{\/intro\}/gi, '');
    textarea.value = cleaned;
  }

  textarea.focus();
  textarea.dispatchEvent(new Event('input'));
  showToast("Etiquetas de intro eliminadas.");
}

function addSelectionToFootnote() {
  const textarea = document.getElementById('chordpro-textarea');
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  let selectedText = textarea.value.substring(start, end).trim();

  // Clean out any [chords] from selection
  selectedText = selectedText.replace(/\[[^\]]+\]/g, '').trim();

  if (!selectedText) {
    showToast("Selecciona primero un fragmento de texto en el editor.", true);
    return;
  }

  document.getElementById('note-input-fragment').value = selectedText;

  // Switch to Tab 4
  const tabNotesLink = Array.from(tabLinks).find(l => l.getAttribute('data-tab') === 'tab-notes');
  if (tabNotesLink) tabNotesLink.click();

  showToast(`Fragmento "${selectedText.length > 25 ? selectedText.substring(0, 25) + '...' : selectedText}" copiado a la nota.`);
}

// --- ChordPro Line Parser & Renderer ---

function parseChordProLine(line) {
  const regex = /\[([^\]]+)\]/g;
  let match;
  const tokens = [];
  const trimmed = line.trim().toLowerCase();

  if (trimmed === '{start_of_intro}' || trimmed === '{intro}') {
    return { type: 'intro_start' };
  }
  if (trimmed === '{end_of_intro}' || trimmed === '{/intro}') {
    return { type: 'intro_end' };
  }

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
  let inIntroBlock = false;

  for (let rawLine of lines) {
    let line = rawLine;

    // Handle inline {start_of_intro} and {end_of_intro} tags
    if (line.includes('{start_of_intro}') || line.includes('{end_of_intro}')) {
      line = line.replace(/\{start_of_intro\}/gi, '___INTRO_START___');
      line = line.replace(/\{end_of_intro\}/gi, '___INTRO_END___');
    }

    const parsed = parseChordProLine(line);

    if (parsed.type === 'intro_start') {
      if (!inIntroBlock) {
        html += '<div class="preview-intro-container"><div class="preview-intro-badge">Intro</div>';
        inIntroBlock = true;
      }
    } else if (parsed.type === 'intro_end') {
      if (inIntroBlock) {
        html += '</div>';
        inIntroBlock = false;
      }
    } else if (parsed.type === 'empty') {
      html += '<div class="preview-empty"></div>';
    } else if (parsed.type === 'header') {
      html += `<div class="preview-header">${parsed.text}</div>`;
    } else if (parsed.type === 'directive') {
      html += `<div style="font-size: 0.75rem; color: var(--color-text-muted); font-family: monospace;">${parsed.text}</div>`;
    } else if (parsed.type === 'lyrics') {
      let lineHtml = '<div class="preview-line">';
      for (let token of parsed.tokens) {
        let lyricText = token.text || '';
        lyricText = lyricText.replace(/___INTRO_START___/g, '<span class="preview-intro-span"><span class="preview-intro-badge">Intro</span> ');
        lyricText = lyricText.replace(/___INTRO_END___/g, '</span>');

        const chordHtml = token.chord ? `<span class="preview-chord">${token.chord}</span>` : '<span class="preview-chord">&nbsp;</span>';
        lineHtml += `
          <div class="preview-token">
            ${chordHtml}
            <span class="preview-lyric">${lyricText}</span>
          </div>
        `;
      }
      lineHtml += '</div>';
      html += lineHtml;
    }
  }

  if (inIntroBlock) {
    html += '</div>';
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
      <input type="hidden" class="stanza-type-select" value="estrofa">
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
  if (state.currentSongId === undefined) return;

  const btn = submitForApproval ? submitApprovalBtn : saveDraftBtn;
  const oldText = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = "Guardando...";

  try {
    // Collect working draft schema
    const workingData = {
      himnario_id: parseInt(document.getElementById('input-hymnary').value) || null,
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
      const rawTitle = document.getElementById(`meta-${lang}-titulo`).value.trim();
      const existingTitle = state.activeDraft?.data?.metadata?.[lang]?.titulo || state.currentSong?.metadata?.[lang]?.titulo || "";
      const finalTitle = rawTitle || existingTitle || (lang === 'es' ? "Sin título" : "");

      workingData.metadata[lang] = {
        idioma: lang,
        titulo: finalTitle,
        autor: document.getElementById(`meta-${lang}-autor`).value.trim(),
        compositor: document.getElementById(`meta-${lang}-compositor`).value.trim(),
        adaptador: document.getElementById(`meta-${lang}-adaptador`).value.trim(),
        traductor: document.getElementById(`meta-${lang}-traductor`).value.trim()
      };
    }

    // Chords (Cifras)
    // Synchronize active fields in UI first
    const activeL = state.currentCifraLang;
    const oldCifras = state.activeDraft ? state.activeDraft.data.cifras : (state.currentSong?.cifras || {});
    for (const lang of ['es', 'pt', 'en']) {
      if (lang === activeL) {
        workingData.cifras[lang] = {
          idioma: lang,
          contenido: document.getElementById('chordpro-textarea').value,
          tonalidad: document.getElementById('cifra-key').value.trim(),
          bpm: parseInt(document.getElementById('cifra-bpm').value) || 0,
          tiempo: document.getElementById('cifra-tiempo').value.trim(),
          ritmo: document.getElementById('cifra-ritmo').value.trim()
        };
      } else {
        workingData.cifras[lang] = oldCifras[lang] || { idioma: lang, contenido: '', tonalidad: '', tiempo: '', bpm: 0, ritmo: '' };
      }
    }

    // Stanzas (plain text stanzas editor)
    ['es', 'pt', 'en'].forEach(lang => {
      const container = document.getElementById(`container-stanzas-${lang}`);
      if (container) {
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
      }
    });

    // SAFEGUARD: If no stanzas were read from the UI editor, fall back to existing draft/production stanzas
    if (workingData.estrofas.length === 0) {
      const existingStanzas = state.activeDraft?.data?.estrofas || state.currentSong?.estrofas || [];
      if (existingStanzas.length > 0) {
        workingData.estrofas = existingStanzas;
      }
    }

    // POST Save Draft
    let res = await fetch(`${API_BASE}/drafts/${state.currentSongId}`, {
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
      res = await fetch(`${API_BASE}/drafts/${state.currentSongId}/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      if (!res.ok) throw new Error();
      showToast("Borrador enviado para aprobación.");
    } else {
      showToast("Borrador guardado localmente.");
    }

    // Reload active song detail
    await fetchSongs();
    await loadSong(state.currentSongId);
  } catch {
    showToast("Error al guardar borrador.", true);
  } finally {
    btn.disabled = false;
    btn.innerHTML = oldText;
  }
}

async function approveDraftSong() {
  if (!state.currentSongId || !confirm("¿Estás seguro de aprobar este borrador? Se aplicará directamente en la base de datos de producción.")) return;

  try {
    const res = await fetch(`${API_BASE}/drafts/${state.currentSongId}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }

    const data = await res.json();
    const newSongId = data.targetSongId || state.currentSongId;

    showToast("Borrador aprobado e integrado a producción.");
    await fetchSongs();
    await loadSong(newSongId);
  } catch (err) {
    showToast(`Error al aprobar: ${err.message}`, true);
  }
}

async function rejectDraftSong() {
  if (!state.currentSongId) return;
  const motivo = prompt("Especifica el motivo del rechazo del borrador:");
  if (motivo === null) return; // Cancelled

  try {
    const res = await fetch(`${API_BASE}/drafts/${state.currentSongId}/reject`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ motivo })
    });
    if (!res.ok) throw new Error();

    showToast("Borrador rechazado y devuelto a edición.");
    await fetchSongs();
    await loadSong(state.currentSongId);
  } catch {
    showToast("Error al rechazar borrador.", true);
  }
}

async function deleteSong() {
  if (!state.currentSongId) return;
  if (!confirm("¿ESTÁS SEGURO? Esta acción borrará la canción y todos sus datos asociados permanentemente de la base de datos de producción. ¡Esta acción no se puede deshacer!")) return;

  try {
    const res = await fetch(`${API_BASE}/songs/${state.currentSongId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    
    showToast("Canción eliminada exitosamente.");
    state.currentSongId = null;
    state.currentSong = null;
    state.activeDraft = null;
    document.getElementById('editor-panel').classList.add('hidden');
    document.getElementById('empty-state').classList.remove('hidden');
    await fetchSongs();
  } catch (err) {
    showToast(`Error al eliminar: ${err.message}`, true);
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

  if (!state.activeDraft) {
    prodView.innerHTML = 'No hay borrador cargado.';
    draftView.innerHTML = 'No hay borrador cargado.';
    return;
  }

  const p = state.currentSong;
  const d = state.activeDraft.data;

  // Let's print clean side-by-side textual comparative JSON outputs
  const getComparativeText = (songObj, isProdObj = false) => {
    if (!songObj) return "";
    let out = `Himno ID: ${songObj.id || (isProdObj ? (p ? p.id : '') : (state.currentSongId))}\n`;
    out += `Número: ${songObj.numero_en_himnario || ''}\n`;
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
      out += `BPM: ${cifra.bpm || 0} / Compás: ${cifra.tiempo || ''}\n`;
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

  const prodText = p ? getComparativeText(p, true) : "";
  const draftText = getComparativeText(d, false);

  if (!p) {
    prodView.innerHTML = '<div style="color: var(--color-text-muted); font-style: italic; padding: 20px;">Nueva alabanza inédita (no existe en producción)</div>';
    draftView.textContent = draftText;
  } else {
    // Highlighting lines side-by-side using the line helper
    prodView.innerHTML = generateLineDiff(prodText, draftText).replace(/\+ .*/g, ''); // Hide added lines in production view
    draftView.innerHTML = generateLineDiff(prodText, draftText);
  }
}

// ── AUDIT LOGS MODAL ─────────────────────────────────────────────────────────

async function openAuditModalView() {
  auditModal.classList.remove('hidden');
  auditLogsRows.innerHTML = '<tr><td colspan="5" style="text-align:center;">Cargando...</td></tr>';

  try {
    const res = await fetch(`${API_BASE}/audit-logs`, {
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
    const res = await fetch(`${API_BASE}/publish`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const logData = await res.json();

    if (!res.ok) throw new Error(logData.error || "Publicación fallida");

    if (logData.uploaded_to_server) {
      publishStatusText.textContent = `¡Publicación completa! Servidores web y app móviles actualizados (v${logData.version}).`;
      publishStatusText.style.color = 'var(--color-success)';
    } else {
      publishStatusText.textContent = `⚠️ Base de datos compilada localmente en assets/ (v${logData.version}). ATENCIÓN: No se subió al servidor remoto por falta de credenciales SSH. Sube los archivos manualmente si es necesario.`;
      publishStatusText.style.color = '#f39c12';
    }

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



// ── USER MANAGEMENT MODAL & CRUD ─────────────────────────────────────────────

async function openUsersModalView() {
  usersModal.classList.remove('hidden');
  usersListRows.innerHTML = '<tr><td colspan="6" style="text-align:center;">Cargando colaboradores...</td></tr>';

  try {
    const res = await fetch(`${API_BASE}/users`, {
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
    const res = await fetch(`${API_BASE}/users/${userId}`, {
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
  userFormProvider.value = 'local';
  userFormPassword.value = '';
  userFormPasswordGroup.classList.remove('hidden');
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
  userFormProvider.value = 'local';
  userFormPassword.value = '';
  userFormPasswordGroup.classList.remove('hidden');
  userFormStatus.value = user.estado;
  userFormStatusGroup.classList.remove('hidden');
  userFormError.classList.add('hidden');
};

async function handleUserFormSubmit(e) {
  e.preventDefault();
  userFormError.classList.add('hidden');

  const id = userFormId.value;
  const isEdit = !!id;
  const url = isEdit ? `${API_BASE}/users/${id}` : `${API_BASE}/users`;
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

// --- Dashboard Logic ---
window.showDashboard = function(forceWorkspace = false) {
  if (forceWorkspace || window.innerWidth > 768) {
    showMobileWorkspace();
  }
  // Clear selected song reference
  state.currentSong = null;
  state.activeDraft = null;

  // Clear any active class from song items
  document.querySelectorAll('.song-item').forEach(item => item.classList.remove('active'));
  
  // Highlight the dashboard button in sidebar
  if (sidebarDashboardBtn) sidebarDashboardBtn.classList.add('active');
  
  // Hide editor and empty state, show dashboard
  if (emptyState) emptyState.classList.add('hidden');
  if (editorPanel) editorPanel.classList.add('hidden');
  if (dashboardPanel) dashboardPanel.classList.remove('hidden');
  
  // Update dashboard date
  const dashboardDate = document.getElementById('dashboard-date');
  if (dashboardDate) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dashboardDate.textContent = new Date().toLocaleDateString('es-ES', options);
  }

  // Calculate stats dynamically from state.songs
  const totalSongs = state.songs.length;
  const isSongWithChords = (s) => (s.has_chords === 1 || s.has_chords === '1' || s.has_chords === true || Number(s.has_chords) === 1);
  const draftsList = state.songs.filter(s => s.draft_status === 'draft');
  const pendingList = state.songs.filter(s => s.draft_status === 'pending_approval');
  const missingChordsList = state.songs.filter(s => !isSongWithChords(s));
  const withChordsList = state.songs.filter(s => isSongWithChords(s));
  
  // Update UI values
  const totalSongsEl = document.getElementById('stat-total-songs');
  const totalDraftsEl = document.getElementById('stat-total-drafts');
  const totalPendingEl = document.getElementById('stat-total-pending');
  const totalMissingChordsEl = document.getElementById('stat-missing-chords');
  const totalWithChordsEl = document.getElementById('stat-with-chords');
  const draftsCountBadge = document.getElementById('drafts-count-badge');
  const pendingCountBadge = document.getElementById('pending-count-badge');
  const missingChordsCountBadge = document.getElementById('missing-chords-count-badge');
  const withChordsCountBadge = document.getElementById('with-chords-count-badge');

  if (totalSongsEl) totalSongsEl.textContent = totalSongs;
  if (totalDraftsEl) totalDraftsEl.textContent = draftsList.length;
  if (totalPendingEl) totalPendingEl.textContent = pendingList.length;
  if (totalMissingChordsEl) totalMissingChordsEl.textContent = missingChordsList.length;
  if (totalWithChordsEl) totalWithChordsEl.textContent = withChordsList.length;
  if (draftsCountBadge) draftsCountBadge.textContent = draftsList.length;
  if (pendingCountBadge) pendingCountBadge.textContent = pendingList.length;
  if (missingChordsCountBadge) missingChordsCountBadge.textContent = missingChordsList.length;
  if (withChordsCountBadge) withChordsCountBadge.textContent = withChordsList.length;
  
  // Render Pending List
  const pendingContainer = document.getElementById('dashboard-pending-list');
  if (pendingContainer) {
    if (pendingList.length === 0) {
      pendingContainer.innerHTML = '<div class="empty-list-message">No hay alabanzas pendientes de aprobación.</div>';
    } else {
      pendingContainer.innerHTML = pendingList.map(song => {
        const isAdmin = state.user && state.user.rol === 'admin';
        const approveBtnHtml = isAdmin 
          ? `<button class="btn btn-sm btn-success" onclick="dashboardApprove(${song.id}, event)">Aprobar</button>` 
          : '';
        return `
          <div class="dashboard-item-card" onclick="dashboardReview(${song.id}, event)">
            <div class="dashboard-item-info">
              <div class="dashboard-item-title">[${song.himnario_codigo}] #${song.numero_en_himnario} - ${song.titulo || '(Sin título)'}</div>
              <div class="dashboard-item-meta">
                <span>ID: ${song.id}</span>
                <span class="badge-role editor">Pendiente</span>
              </div>
            </div>
            <div class="dashboard-item-actions">
              <button class="btn btn-sm btn-secondary" onclick="dashboardReview(${song.id}, event)">Revisar</button>
              ${approveBtnHtml}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Render Drafts List
  const draftsContainer = document.getElementById('dashboard-drafts-list');
  if (draftsContainer) {
    if (draftsList.length === 0) {
      draftsContainer.innerHTML = '<div class="empty-list-message">No hay borradores recientes.</div>';
    } else {
      draftsContainer.innerHTML = draftsList.map(song => {
        return `
          <div class="dashboard-item-card" onclick="loadSong(${song.id})">
            <div class="dashboard-item-info">
              <div class="dashboard-item-title">[${song.himnario_codigo}] #${song.numero_en_himnario} - ${song.titulo || '(Sin título)'}</div>
              <div class="dashboard-item-meta">
                <span>ID: ${song.id}</span>
                <span class="badge-role admin">Borrador</span>
              </div>
            </div>
            <div class="dashboard-item-actions">
              <button class="btn btn-sm btn-primary" onclick="loadSong(${song.id}, event)">Editar</button>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Render Missing Chords List
  const missingChordsContainer = document.getElementById('dashboard-missing-chords-list');
  if (missingChordsContainer) {
    if (missingChordsList.length === 0) {
      missingChordsContainer.innerHTML = '<div class="empty-list-message">Todas las alabanzas tienen acordes.</div>';
    } else {
      const showLimit = 50;
      const slicedList = missingChordsList.slice(0, showLimit);
      const suffixMsg = missingChordsList.length > showLimit
        ? `<div class="empty-list-message" style="padding: 10px 0 0 0; font-size: 0.75rem;">Mostrando ${showLimit} primeras de ${missingChordsList.length}. Usa el buscador lateral para ver otras.</div>`
        : '';
      
      missingChordsContainer.innerHTML = slicedList.map(song => {
        let badgeHtml = '';
        if (song.draft_status === 'draft') {
          badgeHtml = '<span class="badge-role editor">Borrador</span>';
        } else if (song.draft_status === 'pending_approval') {
          badgeHtml = '<span class="badge-role admin">Pendiente</span>';
        } else {
          badgeHtml = '<span class="badge-role" style="background: rgba(0,0,0,0.04); color: var(--color-text-muted);">Sin cifras</span>';
        }
        return `
          <div class="dashboard-item-card" onclick="loadSong(${song.id})">
            <div class="dashboard-item-info">
              <div class="dashboard-item-title">[${song.himnario_codigo}] #${song.numero_en_himnario} - ${song.titulo || '(Sin título)'}</div>
              <div class="dashboard-item-meta">
                <span>ID: ${song.id}</span>
                ${badgeHtml}
              </div>
            </div>
            <div class="dashboard-item-actions">
              <button class="btn btn-sm btn-primary" onclick="loadSong(${song.id}, event)">Editar</button>
            </div>
          </div>
        `;
      }).join('') + suffixMsg;
    }
  }

  // Render With Chords List
  const withChordsContainer = document.getElementById('dashboard-with-chords-list');
  if (withChordsContainer) {
    if (withChordsList.length === 0) {
      withChordsContainer.innerHTML = '<div class="empty-list-message">No hay alabanzas con acordes.</div>';
    } else {
      const showLimit = 50;
      const slicedList = withChordsList.slice(0, showLimit);
      const suffixMsg = withChordsList.length > showLimit
        ? `<div class="empty-list-message" style="padding: 10px 0 0 0; font-size: 0.75rem;">Mostrando ${showLimit} primeras de ${withChordsList.length}. Usa el buscador lateral para ver otras.</div>`
        : '';
      
      withChordsContainer.innerHTML = slicedList.map(song => {
        let badgeHtml = '';
        if (song.draft_status === 'draft') {
          badgeHtml = '<span class="badge-role editor">Borrador</span>';
        } else if (song.draft_status === 'pending_approval') {
          badgeHtml = '<span class="badge-role admin">Pendiente</span>';
        } else {
          badgeHtml = '<span class="badge-role active" style="background: rgba(46, 204, 113, 0.12); color: var(--color-success);">Con cifra</span>';
        }
        return `
          <div class="dashboard-item-card" onclick="loadSong(${song.id})">
            <div class="dashboard-item-info">
              <div class="dashboard-item-title">[${song.himnario_codigo}] #${song.numero_en_himnario} - ${song.titulo || '(Sin título)'}</div>
              <div class="dashboard-item-meta">
                <span>ID: ${song.id}</span>
                ${badgeHtml}
              </div>
            </div>
            <div class="dashboard-item-actions">
              <button class="btn btn-sm btn-primary" onclick="loadSong(${song.id}, event)">Editar</button>
            </div>
          </div>
        `;
      }).join('') + suffixMsg;
    }
  }
};

window.dashboardReview = async function(songId, event) {
  if (event) event.stopPropagation();
  await loadSong(songId);
  
  // Programmatically click the Diff tab
  const diffTab = document.getElementById('tab-diff-link');
  if (diffTab) {
    diffTab.click();
  }
};

window.dashboardApprove = async function(songId, event) {
  if (event) event.stopPropagation();
  
  if (!confirm("¿Estás seguro de que deseas aprobar este borrador de forma instantánea?")) {
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/drafts/${songId}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Error al aprobar.");
    }
    
    showToast("Borrador aprobado con éxito.");
    await fetchSongs(); // Refresh state list
    showDashboard(); // Re-render dashboard
  } catch (err) {
    showToast(err.message, true);
  }
};
