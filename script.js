// --- GLOBAL & DOM ---
let currentUserProfile = null;
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authError = document.getElementById('auth-error');
const userDisplayName = document.getElementById('user-display-name');
const userAvatar = document.getElementById('user-avatar');
const btnLogout = document.getElementById('btn-logout');

function renderIcons() { if (typeof lucide !== 'undefined') lucide.createIcons(); }
function toggleAuth() { loginForm.classList.toggle('hidden'); registerForm.classList.toggle('hidden'); authError.classList.add('hidden'); renderIcons(); }
function showError(msg) { authError.textContent = msg; authError.classList.remove('hidden'); }

function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    if (!email || !password) return showError("Email dan Password wajib diisi!");
    auth.signInWithEmailAndPassword(email, password).catch(e => showError("Gagal masuk: " + e.message));
}

async function handleRegister() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    if (name.length < 3) return showError("Nama minimal 3 karakter");
    if (password.length < 6) return showError("Password minimal 6 karakter");
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });
    } catch (e) { showError("Gagal daftar: " + e.message); }
}

btnLogout.addEventListener('click', () => auth.signOut());

async function loadUserProfile() {
    const user = auth.currentUser; if (!user) return;
    try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists) { currentUserProfile = doc.data(); }
        else { currentUserProfile = { nama: user.displayName || '', email: user.email || '', nim: '', prodi: '', fakultas: '', universitas: '', semester: '', pklKe: '' }; await db.collection('users').doc(user.uid).set({ ...currentUserProfile, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); }
    } catch (e) { console.error(e); currentUserProfile = { nama: user.displayName || '', email: user.email || '', nim: '', prodi: '', fakultas: '', universitas: '', semester: '', pklKe: '' }; }
}

auth.onAuthStateChanged(async user => {
    if (user) {
        authContainer.classList.add('hidden'); appContainer.classList.remove('hidden');
        userDisplayName.textContent = user.displayName || "User"; userAvatar.textContent = (user.displayName || "U").charAt(0).toUpperCase();
        await loadUserProfile(); switchPage('page-home', true); loadDashboardStats(); loadRecentActivity();
    } else { authContainer.classList.remove('hidden'); appContainer.classList.add('hidden'); currentUserProfile = null; }
    renderIcons();
});

// --- DARK MODE ---
const btnDarkMode = document.getElementById('btn-dark-mode');
const html = document.documentElement;
if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) { html.classList.add('dark'); } else { html.classList.remove('dark'); }
btnDarkMode.addEventListener('click', () => { html.classList.toggle('dark'); const isDark = html.classList.contains('dark'); localStorage.setItem('theme', isDark ? 'dark' : 'light'); btnDarkMode.querySelector('i').setAttribute('data-lucide', isDark ? 'sun' : 'moon'); renderIcons(); });

// --- NAVIGASI ---
const navButtons = document.querySelectorAll('.nav-btn');
const pages = document.querySelectorAll('.page');
const fabInput = document.getElementById('fab-input');
const btnBackInput = document.getElementById('btn-back-input');

function switchPage(targetId, showFab) {
    pages.forEach(p => p.classList.add('hidden')); document.getElementById(targetId).classList.remove('hidden');
    navButtons.forEach(btn => { btn.classList.remove('active', 'text-blue-600', 'dark:text-blue-400'); btn.classList.add('text-slate-400', 'dark:text-slate-500'); if (btn.dataset.target === targetId) { btn.classList.add('active', 'text-blue-600', 'dark:text-blue-400'); btn.classList.remove('text-slate-400', 'dark:text-slate-500'); } });
    if (showFab) { fabInput.classList.remove('hidden'); fabInput.classList.add('flex'); } else { fabInput.classList.add('hidden'); fabInput.classList.remove('flex'); }
    renderIcons();
}
navButtons.forEach(btn => { btn.addEventListener('click', () => { switchPage(btn.dataset.target, true); if (btn.dataset.target === 'page-home') { loadDashboardStats(); loadRecentActivity(); } else if (btn.dataset.target === 'page-draft') loadDrafts(); else if (btn.dataset.target === 'page-logbook') loadLogbooks(); else if (btn.dataset.target === 'page-profil') loadSettingInfo(); }); });
btnBackInput.addEventListener('click', () => switchPage('page-home', true));
renderIcons();

// --- FORM INPUT & FOTO ---
const formKegiatan = document.getElementById('form-kegiatan');
const kegiatanListContainer = document.getElementById('kegiatan-list-container');
const btnTambahKegiatan = document.getElementById('btn-tambah-kegiatan');
const todayReal = new Date().toISOString().split('T')[0];
let kegiatanCount = 0;

function renderKegiatanBlock() {
    kegiatanCount++; const id = kegiatanCount; const isFirst = id === 1;
    return `<div id="kegiatan-block-${id}" class="kegiatan-block bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 relative">
        ${!isFirst ? `<button type="button" onclick="removeKegiatanBlock(${id})" class="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"><i data-lucide="x" class="w-4 h-4"></i></button>` : ''}
        <p class="text-xs font-bold text-blue-500 uppercase tracking-wider flex items-center gap-2"><i data-lucide="file-plus" class="w-3.5 h-3.5"></i> Kegiatan #${id}</p>
        <div><label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tanggal</label><input type="date" id="inp-tanggal-${id}" value="${todayReal}" class="mt-1 w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"></div>
        <div class="grid grid-cols-2 gap-3"><div><label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jam Mulai</label><input type="time" id="inp-jam-mulai-${id}" class="mt-1 w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"></div><div><label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jam Selesai</label><input type="time" id="inp-jam-selesai-${id}" class="mt-1 w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"></div></div>
        <div><label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tempat</label><input type="text" id="inp-tempat-${id}" placeholder="Contoh: Ruang Server" class="mt-1 w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"></div>
        <div><label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kegiatan / Aktivitas</label><input type="text" id="inp-kegiatan-${id}" placeholder="Contoh: Maintenance server" class="mt-1 w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"></div>
        <div><label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Deskripsi Detail</label><textarea id="inp-deskripsi-${id}" rows="2" placeholder="Jelaskan secara singkat..." class="mt-1 w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"></textarea></div>
        <div><label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pembimbing (Opsional)</label><input type="text" id="inp-instruktur-${id}" placeholder="Contoh: Dr. Budi, M.Kom" class="mt-1 w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"></div>
        <div><label class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bukti Foto</label><input type="file" accept="image/*" id="inp-foto-${id}" class="hidden" onchange="handleFotoSelect(event, ${id})"><div onclick="document.getElementById('inp-foto-${id}').click()" class="mt-1 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4 text-center text-slate-400 dark:text-slate-500 text-sm hover:border-blue-400 hover:text-blue-500 transition cursor-pointer"><div id="foto-preview-${id}"><i data-lucide="image-plus" class="w-6 h-6 mx-auto mb-1"></i><p class="text-xs">Klik untuk ambil foto</p></div></div></div>
    </div>`;
}
function initKegiatanForm() { kegiatanCount = 0; kegiatanListContainer.innerHTML = renderKegiatanBlock(); renderIcons(); }
btnTambahKegiatan.addEventListener('click', () => { kegiatanListContainer.insertAdjacentHTML('beforeend', renderKegiatanBlock()); renderIcons(); const nb = document.getElementById(`kegiatan-block-${kegiatanCount}`); if (nb) nb.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
function removeKegiatanBlock(id) { const b = document.getElementById(`kegiatan-block-${id}`); if (b) b.remove(); }
fabInput.addEventListener('click', () => { switchPage('page-input', false); initKegiatanForm(); });

async function handleFotoSelect(event, id) {
    const file = event.target.files[0]; if (!file) return;
    const pv = document.getElementById(`foto-preview-${id}`), inp = document.getElementById(`inp-foto-${id}`);
    pv.innerHTML = `<svg class="animate-spin h-5 w-5 mx-auto text-blue-500" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg><p class="text-xs text-blue-500 mt-1">Memproses...</p>`;
    const reader = new FileReader();
    reader.onload = function (e) { const img = new Image(); img.onload = function () { const c = document.createElement('canvas'); let w = img.width, h = img.height; if (w > 1200) { h = (h / w) * 1200; w = 1200; } c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); const b64 = c.toDataURL('image/jpeg', 0.8); inp.dataset.base64 = b64; pv.innerHTML = `<img src="${b64}" class="w-20 h-20 object-cover mx-auto rounded-lg shadow-sm border border-slate-200 dark:border-slate-600"><p class="text-[10px] text-green-500 mt-1">Foto siap</p>`; }; img.src = e.target.result; };
    reader.readAsDataURL(file);
}

formKegiatan.addEventListener('submit', async (e) => {
    e.preventDefault(); const user = auth.currentUser; if (!user) return alert("Kamu belum login!");
    const blocks = document.querySelectorAll('.kegiatan-block'); if (!blocks.length) return alert("Tidak ada kegiatan!");
    let isValid = true; const batchData = [];
    blocks.forEach((block) => { const id = block.id.split('-').pop(); const jm = document.getElementById(`inp-jam-mulai-${id}`).value, js = document.getElementById(`inp-jam-selesai-${id}`).value; if (!jm || !js) isValid = false; if (!document.getElementById(`inp-foto-${id}`).dataset.base64) isValid = false; batchData.push({ userId: user.uid, tanggal: document.getElementById(`inp-tanggal-${id}`).value, jamMulai: jm, jamSelesai: js, tempat: document.getElementById(`inp-tempat-${id}`).value, kegiatan: document.getElementById(`inp-kegiatan-${id}`).value, deskripsi: document.getElementById(`inp-deskripsi-${id}`).value, instruktur: document.getElementById(`inp-instruktur-${id}`).value, foto: document.getElementById(`inp-foto-${id}`).dataset.base64 || "", status: "draft", createdAt: firebase.firestore.FieldValue.serverTimestamp() }); });
    if (!isValid) return alert("Pastikan Jam Mulai, Jam Selesai, dan Bukti Foto sudah diisi!");
    const btn = formKegiatan.querySelector('button[type="submit"]'), txt = btn.innerHTML; btn.innerHTML = `<svg class="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Mengupload...`; btn.disabled = true;
    try { const batch = db.batch(); batchData.forEach(d => batch.set(db.collection('logbooks').doc(), d)); await batch.commit(); alert(`Berhasil! ${batchData.length} kegiatan disimpan.`); initKegiatanForm(); switchPage('page-draft', true); loadDrafts(); } catch (err) { alert("Gagal: " + err.message); } finally { btn.innerHTML = txt; btn.disabled = false; renderIcons(); }
});

// --- DRAFT ---
const draftListContainer = document.getElementById('draft-list-container'), draftCountEl = document.getElementById('draft-count');
function formatTanggal(ds) { if (!ds) return '-'; const b = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"], d = new Date(ds + "T00:00:00"); return `${d.getDate()} ${b[d.getMonth()]} ${d.getFullYear()}`; }

function loadDrafts() {
    const user = auth.currentUser; if (!user || !user.uid) return;
    draftListContainer.innerHTML = `<div class="text-center text-slate-400 py-4 text-sm">Memuat data...</div>`;
    db.collection('logbooks').where('userId', '==', user.uid).where('status', '==', 'draft').get().then(snap => {
        let arr = []; snap.forEach(d => arr.push({ id: d.id, data: d.data() })); arr.sort((a, b) => (b.data.createdAt?.toMillis() || 0) - (a.data.createdAt?.toMillis() || 0));
        let html = '', c = 0;
        arr.forEach(i => { c++; const d = i.data; html += `<div id="card-${i.id}" data-tanggal="${d.tanggal}" data-jam-mulai="${d.jamMulai}" data-jam-selesai="${d.jamSelesai}" data-tempat="${d.tempat}" data-kegiatan="${d.kegiatan}" data-deskripsi="${d.deskripsi || ''}" data-instruktur="${d.instruktur || ''}" class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-3 transition hover:shadow-md"><div class="view-mode"><div class="flex justify-between items-start mb-2"><h3 class="font-semibold text-slate-800 dark:text-white text-sm leading-tight">${d.kegiatan || 'Tanpa Kegiatan'}</h3><span class="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full shrink-0 ml-2">Draft</span></div><div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mb-2"><span class="flex items-center gap-1"><i data-lucide="calendar-days" class="w-3 h-3"></i> ${formatTanggal(d.tanggal)}</span><span class="flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i> ${d.jamMulai} - ${d.jamSelesai}</span></div><p class="text-xs text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3 shrink-0"></i> ${d.tempat || '-'}</p>${d.deskripsi ? `<p class="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg mb-3">${d.deskripsi}</p>` : ''}${d.instruktur ? `<p class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-3"><i data-lucide="user-check" class="w-3 h-3 shrink-0"></i> Pembimbing: ${d.instruktur}</p>` : ''}${d.foto ? `<img src="${d.foto}" class="w-full h-32 object-cover rounded-lg mb-3 border border-slate-200 dark:border-slate-600">` : ''}<div class="flex gap-2"><button onclick="confirmDraft('${i.id}')" class="flex-1 text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 py-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition flex items-center justify-center gap-1"><i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Konfirmasi</button><button onclick="toggleEdit('${i.id}', true)" class="flex-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition flex items-center justify-center gap-1"><i data-lucide="pencil" class="w-3.5 h-3.5"></i> Edit</button><button onclick="deleteDraft('${i.id}')" class="flex-1 text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 py-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition flex items-center justify-center gap-1"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Hapus</button></div></div><div class="edit-mode hidden space-y-3"><p class="text-xs font-bold text-blue-500 uppercase tracking-wider">Mode Edit</p><div><label class="text-[10px] font-semibold text-slate-500 uppercase">Tanggal</label><input type="date" id="edit-tanggal-${i.id}" class="mt-1 w-full p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 text-xs"></div><div class="grid grid-cols-2 gap-2"><div><label class="text-[10px] font-semibold text-slate-500 uppercase">Mulai</label><input type="time" id="edit-mulai-${i.id}" class="mt-1 w-full p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 text-xs"></div><div><label class="text-[10px] font-semibold text-slate-500 uppercase">Selesai</label><input type="time" id="edit-selesai-${i.id}" class="mt-1 w-full p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 text-xs"></div></div><div><label class="text-[10px] font-semibold text-slate-500 uppercase">Tempat</label><input type="text" id="edit-tempat-${i.id}" class="mt-1 w-full p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 text-xs"></div><div><label class="text-[10px] font-semibold text-slate-500 uppercase">Kegiatan</label><input type="text" id="edit-kegiatan-${i.id}" class="mt-1 w-full p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 text-xs"></div><div><label class="text-[10px] font-semibold text-slate-500 uppercase">Deskripsi</label><textarea id="edit-deskripsi-${i.id}" rows="2" class="mt-1 w-full p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 text-xs resize-none"></textarea></div><div><label class="text-[10px] font-semibold text-slate-500 uppercase">Pembimbing</label><input type="text" id="edit-instruktur-${i.id}" class="mt-1 w-full p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 text-xs"></div><div class="flex gap-2 pt-1"><button onclick="toggleEdit('${i.id}', false)" class="flex-1 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition">Batal</button><button onclick="saveEdit('${i.id}')" class="flex-1 text-xs font-medium bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-500 transition">Simpan</button></div></div></div>`; });
        if (!c) html = `<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center shadow-sm"><i data-lucide="file-x" class="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2"></i><p class="text-sm text-slate-400 dark:text-slate-500">Tidak ada draft</p></div>`;
        draftListContainer.innerHTML = html; draftCountEl.textContent = `(${c})`; renderIcons();
    }).catch(e => { console.error(e); draftListContainer.innerHTML = `<p class="text-red-400 text-xs text-center py-4">Gagal memuat data.</p>`; });
}

function toggleEdit(id, isEdit) { const c = document.getElementById(`card-${id}`); if (isEdit) { document.getElementById(`edit-tanggal-${id}`).value = c.dataset.tanggal; document.getElementById(`edit-mulai-${id}`).value = c.dataset.jamMulai; document.getElementById(`edit-selesai-${id}`).value = c.dataset.jamSelesai; document.getElementById(`edit-tempat-${id}`).value = c.dataset.tempat; document.getElementById(`edit-kegiatan-${id}`).value = c.dataset.kegiatan; document.getElementById(`edit-deskripsi-${id}`).value = c.dataset.deskripsi; document.getElementById(`edit-instruktur-${id}`).value = c.dataset.instruktur; c.querySelector('.view-mode').classList.add('hidden'); c.querySelector('.edit-mode').classList.remove('hidden'); } else { c.querySelector('.view-mode').classList.remove('hidden'); c.querySelector('.edit-mode').classList.add('hidden'); } }
function saveEdit(id) { const d = { tanggal: document.getElementById(`edit-tanggal-${id}`).value, jamMulai: document.getElementById(`edit-mulai-${id}`).value, jamSelesai: document.getElementById(`edit-selesai-${id}`).value, tempat: document.getElementById(`edit-tempat-${id}`).value, kegiatan: document.getElementById(`edit-kegiatan-${id}`).value, deskripsi: document.getElementById(`edit-deskripsi-${id}`).value, instruktur: document.getElementById(`edit-instruktur-${id}`).value }; if (!d.kegiatan) return alert("Kegiatan tidak boleh kosong!"); db.collection('logbooks').doc(id).update(d).then(() => { alert("Berhasil diperbarui!"); loadDrafts(); }).catch(e => alert("Gagal: " + e.message)); }
function deleteDraft(id) { if (confirm("Yakin ingin menghapus draft ini?")) db.collection('logbooks').doc(id).delete().then(() => loadDrafts()).catch(e => alert("Gagal: " + e.message)); }
async function confirmDraft(id) { if (!confirm("Konfirmasi kegiatan ini? Data tidak dapat diubah lagi.")) return; try { await db.collection('logbooks').doc(id).update({ status: "logbook", confirmedAt: firebase.firestore.FieldValue.serverTimestamp() }); alert("Berhasil dikonfirmasi!"); setTimeout(() => { loadDrafts(); loadLogbooks(); loadDashboardStats(); loadRecentActivity(); }, 100); } catch (e) { alert("Gagal mengkonfirmasi: " + e.message); } }

// --- DASHBOARD & AKTIVITAS TERAKHIR ---
const statHari = document.getElementById('stat-hari'), statKegiatan = document.getElementById('stat-kegiatan'), statWaktu = document.getElementById('stat-waktu');
function loadDashboardStats() {
    const user = auth.currentUser; if (!user || !user.uid) return;
    db.collection('logbooks').where('userId', '==', user.uid).where('status', '==', 'logbook').get().then(snap => {
        let tk = 0, tm = 0; const hu = new Set();
        snap.forEach(d => { const dt = d.data(); tk++; if (dt.tanggal) hu.add(dt.tanggal); if (dt.jamMulai && dt.jamSelesai) { const [h1, m1] = dt.jamMulai.split(':').map(Number), [h2, m2] = dt.jamSelesai.split(':').map(Number); const ms = h2 * 60 + m2 - (h1 * 60 + m1); if (ms > 0) tm += ms; } });
        let wt = "0j"; if (tm > 0) { const j = Math.floor(tm / 60), m = tm % 60; wt = m > 0 ? `${j}j ${m}m` : `${j}j`; }
        statHari.textContent = hu.size; statKegiatan.textContent = tk; statWaktu.textContent = wt;
    }).catch(e => console.error(e));
}
async function loadRecentActivity() {
    const user = auth.currentUser; if (!user || !user.uid) return; const con = document.getElementById('recent-activity-container');
    try { const snap = await db.collection('logbooks').where('userId', '==', user.uid).where('status', '==', 'logbook').get(); let arr = []; snap.forEach(d => arr.push(d.data())); arr.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '')); arr = arr.slice(0, 3);
    if (!arr.length) { con.innerHTML = `<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center shadow-sm"><i data-lucide="inbox" class="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2"></i><p class="text-sm text-slate-400 dark:text-slate-500">Belum ada aktivitas</p></div>`; renderIcons(); return; }
    let html = ''; arr.forEach(d => { html += `<div class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"><h4 class="text-sm font-semibold text-slate-800 dark:text-white truncate">${d.kegiatan || '-'}</h4><p class="text-[10px] text-slate-500 dark:text-slate-400 mt-1">${formatTanggal(d.tanggal)} • ${d.jamMulai} - ${d.jamSelesai}</p></div>`; }); con.innerHTML = html; renderIcons();
    } catch (e) { console.error(e); }
}

// --- LOGBOOK ---
const logbookListContainer = document.getElementById('logbook-list-container'), searchLogbook = document.getElementById('search-logbook');
let allLogbooks = [], sortLogbookAsc = true;
const btnSortLogbook = document.getElementById('btn-sort-logbook'), sortLogbookText = document.getElementById('sort-logbook-text');
btnSortLogbook.addEventListener('click', () => { sortLogbookAsc = !sortLogbookAsc; sortLogbookText.textContent = sortLogbookAsc ? 'Terlama ke Terbaru' : 'Terbaru ke Terlama'; renderLogbooks(); });
function loadLogbooks() {
    const user = auth.currentUser; if (!user || !user.uid) return; logbookListContainer.innerHTML = `<div class="text-center text-slate-400 py-4 text-sm">Memuat data...</div>`;
    db.collection('logbooks').where('userId', '==', user.uid).where('status', '==', 'logbook').get().then(snap => { allLogbooks = []; snap.forEach(d => allLogbooks.push({ id: d.id, data: d.data() })); renderLogbooks(); }).catch(e => { console.error(e); logbookListContainer.innerHTML = `<p class="text-red-400 text-xs text-center py-4">Gagal memuat data.</p>`; });
}
function renderLogbooks(kw = '') {
    let html = '', c = 0; let fd = kw ? allLogbooks.filter(i => { const d = i.data; return `${d.kegiatan} ${d.tempat} ${d.deskripsi} ${d.instruktur}`.toLowerCase().includes(kw.toLowerCase()); }) : allLogbooks;
    fd.sort((a, b) => { const da = new Date((a.data.tanggal || '') + "T00:00:00").getTime(), db = new Date((b.data.tanggal || '') + "T00:00:00").getTime(); return sortLogbookAsc ? da - db : db - da; });
    fd.forEach(i => { c++; const d = i.data; html += `<div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-3"><div class="flex justify-between items-start mb-2"><h3 class="font-semibold text-slate-800 dark:text-white text-sm leading-tight">${d.kegiatan || 'Tanpa Kegiatan'}</h3><span class="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full shrink-0 ml-2 flex items-center gap-0.5"><i data-lucide="check" class="w-2.5 h-2.5"></i> Tercatat</span></div><div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mb-2"><span class="flex items-center gap-1"><i data-lucide="calendar-days" class="w-3 h-3"></i> ${formatTanggal(d.tanggal)}</span><span class="flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i> ${d.jamMulai} - ${d.jamSelesai}</span></div><p class="text-xs text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1"><i data-lucide="map-pin" class="w-3 h-3 shrink-0"></i> ${d.tempat || '-'}</p>${d.deskripsi ? `<p class="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg mb-2">${d.deskripsi}</p>` : ''}${d.instruktur ? `<p class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><i data-lucide="user-check" class="w-3 h-3 shrink-0"></i> Pembimbing: ${d.instruktur}</p>` : ''}${d.foto ? `<img src="${d.foto}" class="w-full h-32 object-cover rounded-lg mb-2 border border-slate-200 dark:border-slate-600">` : ''}</div>`; });
    if (!c) html = `<div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center shadow-sm"><i data-lucide="book-x" class="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2"></i><p class="text-sm text-slate-400 dark:text-slate-500">${kw ? 'Tidak ditemukan hasil untuk "' + kw + '"' : 'Belum ada logbook tercatat'}</p></div>`;
    logbookListContainer.innerHTML = html; renderIcons();
}
searchLogbook.addEventListener('input', e => renderLogbooks(e.target.value));

// --- SETTING ---
const settingMainView = document.getElementById('setting-main-view'), settingAvatar = document.getElementById('setting-avatar'), settingUserName = document.getElementById('setting-user-name'), settingUserEmail = document.getElementById('setting-user-email');
emailjs.init("PaKhGHfP6wcgCg9h5");
function loadSettingInfo() { const u = auth.currentUser; if (!u) return; const n = u.displayName || "User"; settingAvatar.textContent = n.charAt(0).toUpperCase(); settingUserName.textContent = n; settingUserEmail.textContent = u.email; }
function openSettingView(vid) {
    settingMainView.classList.add('hidden'); document.getElementById(`setting-${vid}`).classList.remove('hidden');
    if (vid === 'feedback') document.getElementById('fb-name').value = auth.currentUser.displayName || '';
    if (vid === 'identitas' && currentUserProfile) { document.getElementById('id-nama').value = currentUserProfile.nama || ''; document.getElementById('id-nim').value = currentUserProfile.nim || ''; document.getElementById('id-prodi').value = currentUserProfile.prodi || ''; document.getElementById('id-fakultas').value = currentUserProfile.fakultas || ''; document.getElementById('id-universitas').value = currentUserProfile.universitas || ''; document.getElementById('id-semester').value = currentUserProfile.semester || ''; document.getElementById('id-pkl-ke').value = currentUserProfile.pklKe || ''; }
    if (vid === 'export-pdf') { document.getElementById('pdf-tahun-akademik').value = localStorage.getItem('pkl_tahun_akademik') || ''; document.getElementById('pdf-tempat').value = localStorage.getItem('pkl_tempat') || ''; document.getElementById('pdf-tgl-mulai').value = localStorage.getItem('pkl_tgl_mulai') || ''; document.getElementById('pdf-tgl-selesai').value = localStorage.getItem('pkl_tgl_selesai') || ''; }
    renderIcons();
}
function closeSettingView() { document.querySelectorAll('[id^="setting-"]').forEach(el => { if (el.id !== 'setting-main-view' && el.id !== 'setting-avatar' && el.id !== 'setting-user-name' && el.id !== 'setting-user-email') el.classList.add('hidden'); }); settingMainView.classList.remove('hidden'); loadSettingInfo(); renderIcons(); }
async function saveIdentity() {
    const u = auth.currentUser; if (!u) return;
    const d = { nama: document.getElementById('id-nama').value.trim(), nim: document.getElementById('id-nim').value.trim(), prodi: document.getElementById('id-prodi').value.trim(), fakultas: document.getElementById('id-fakultas').value.trim(), universitas: document.getElementById('id-universitas').value.trim(), semester: document.getElementById('id-semester').value.trim(), pklKe: document.getElementById('id-pkl-ke').value.trim() };
    if (d.nama.length < 3) return alert("Nama minimal 3 karakter");
    try { await db.collection('users').doc(u.uid).set(d, { merge: true }); await u.updateProfile({ displayName: d.nama }); userDisplayName.textContent = d.nama; userAvatar.textContent = d.nama.charAt(0).toUpperCase(); currentUserProfile = { ...currentUserProfile, ...d }; alert("Identitas berhasil disimpan!"); closeSettingView(); } catch (e) { alert("Gagal menyimpan: " + e.message); }
}
function saveProfileName() { const n = document.getElementById('inp-edit-name').value.trim(); if (n.length < 3) return alert("Nama minimal 3 karakter"); auth.currentUser.updateProfile({ displayName: n }).then(() => { alert("Nama berhasil diubah!"); userDisplayName.textContent = n; userAvatar.textContent = n.charAt(0).toUpperCase(); if (currentUserProfile) currentUserProfile.nama = n; closeSettingView(); }).catch(e => alert("Gagal: " + e.message)); }
function sendFeedback() { const n = document.getElementById('fb-name').value.trim(), m = document.getElementById('fb-message').value.trim(); if (!n || !m) return alert("Nama dan pesan wajib diisi!"); const b = document.getElementById('btn-send-feedback'); b.disabled = true; b.innerText = "Mengirim..."; emailjs.send("service_yk30vzy", "template_gob8eil", { from_name: n, message: m }).then(() => { alert("Terima kasih! Feedback berhasil dikirim."); document.getElementById('fb-message').value = ''; closeSettingView(); }).catch(e => { alert("Gagal mengirim feedback: " + e.text); }).finally(() => { b.disabled = false; b.innerText = "Kirim Feedback"; }); }

// --- EXPORT PDF KAMPUS ---
function showPdfLoading(s) { let o = document.getElementById('pdf-loading-overlay'); if (s) { if (!o) { o = document.createElement('div'); o.id = 'pdf-loading-overlay'; o.className = 'fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center'; o.innerHTML = `<div class="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl text-center max-w-xs mx-4"><svg class="animate-spin h-10 w-10 mx-auto text-blue-600 mb-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg><p class="text-lg font-bold text-slate-800 dark:text-white mb-1">Membuat PDF</p><p class="text-sm text-slate-500 dark:text-slate-400">Mohon tunggu, sedang memproses data dan foto...</p></div>`; document.body.appendChild(o); } o.classList.remove('hidden'); } else { if (o) o.remove(); } }
function loadImage(src) { return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('Gagal memuat gambar')); img.src = src; }); }
function sanitizePdf(str) { if (!str) return ''; return String(str).replace(/–/g, '-').replace(/—/g, '-').replace(/"/g, '"').replace(/"/g, '"').replace(/'/g, "'").replace(/'/g, "'").replace(/…/g, '...').replace(/²/g, '2').replace(/³/g, '3').replace(/[\u0080-\uFFFF]/g, ''); }

async function generatePDF() {
    const user = auth.currentUser; if (!user || !currentUserProfile) return alert("Lengkapi Identitas Mahasiswa di Setting terlebih dahulu!");
    const p = currentUserProfile, ta = document.getElementById('pdf-tahun-akademik').value.trim(), tp = document.getElementById('pdf-tempat').value.trim(), tm = document.getElementById('pdf-tgl-mulai').value, ts = document.getElementById('pdf-tgl-selesai').value;
    if (!p.universitas || !tp || !ta) return alert("Universitas, Tempat PKL, dan Tahun Akademik wajib diisi!");
    localStorage.setItem('pkl_tahun_akademik', ta); localStorage.setItem('pkl_tempat', tp); localStorage.setItem('pkl_tgl_mulai', tm); localStorage.setItem('pkl_tgl_selesai', ts);
    showPdfLoading(true);
    try {
        const snap = await db.collection('logbooks').where('userId', '==', user.uid).where('status', '==', 'logbook').get();
        if (snap.empty) { showPdfLoading(false); return alert("Tidak ada data logbook yang sudah dikonfirmasi!"); }
        let allData = []; snap.forEach(doc => allData.push({ id: doc.id, ...doc.data() }));
        allData.sort((a, b) => { const dA = new Date((a.tanggal||'')+"T00:00:00").getTime(), dB = new Date((b.tanggal||'')+"T00:00:00").getTime(); if(dA!==dB) return dA-dB; return (a.jamMulai||'').localeCompare(b.jamMulai||''); });
        const grouped = {}; allData.forEach(i => { const k = i.tanggal || 'unknown'; if (!grouped[k]) grouped[k] = []; grouped[k].push(i); });
        const tglKeys = Object.keys(grouped).sort();
        
        const { jsPDF } = window.jspdf; const doc = new jsPDF('p', 'mm', 'a4');
        const pw=210, ph=297, ml=25, mr=25, mt=25, mb=25, cw=pw-ml-mr; let y=mt;
        const hName = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'], bName = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        const fmtTgl = ds => { if(!ds) return '-'; const d=new Date(ds+"T00:00:00"); return `${hName[d.getDay()]}, ${d.getDate()} ${bName[d.getMonth()]} ${d.getFullYear()}`; };
        const chk = n => { if(y+n > ph-mb) { doc.addPage(); y=mt; } };
        
        // --- HITUNG STATISTIK ---
        let totKeg=0, totMenit=0, hariUnik=new Set();
        allData.forEach(d => { totKeg++; if(d.tanggal) hariUnik.add(d.tanggal); if(d.jamMulai&&d.jamSelesai){const [h1,m1]=d.jamMulai.split(':').map(Number),[h2,m2]=d.jamSelesai.split(':').map(Number); const ms=(h2*60+m2)-(h1*60+m1); if(ms>0)totMenit+=ms;} });
        const totJam = Math.floor(totMenit/60), sisMnt = totMenit%60;
        const wktTxt = sisMnt > 0 ? `${totJam} jam ${sisMnt} menit` : `${totJam} jam`;

        // --- COVER ---
        y=40; doc.setDrawColor(0,102,204); doc.setLineWidth(1); doc.line(ml, y, pw-mr, y); y+=20;
        doc.setFontSize(28); doc.setFont(undefined,'bold'); doc.text('LAPORAN', pw/2, y, {align:'center'}); y+=12;
        doc.setFontSize(16); doc.text('PRAKTIK KERJA LAPANGAN', pw/2, y, {align:'center'}); y+=8;
        doc.setLineWidth(0.3); doc.line(ml+50, y, pw-mr-50, y); y+=30;
        doc.setFontSize(11); doc.setFont(undefined,'normal'); doc.text('Disusun oleh:', pw/2, y, {align:'center'}); y+=12;
        doc.setFontSize(12); doc.setFont(undefined,'bold'); doc.text(sanitizePdf(p.nama), pw/2, y, {align:'center'}); y+=7;
        doc.setFontSize(10); doc.setFont(undefined,'normal'); doc.text(`NIM: ${sanitizePdf(p.nim || '-')}`, pw/2, y, {align:'center'}); y+=7;
        doc.text(`Program Studi: ${sanitizePdf(p.prodi || '-')}`, pw/2, y, {align:'center'}); y+=7;
        doc.text(`Fakultas: ${sanitizePdf(p.fakultas || '-')}`, pw/2, y, {align:'center'}); y+=7;
        doc.setTextColor(80,80,80); doc.text(sanitizePdf(p.email || ''), pw/2, y, {align:'center'}); doc.setTextColor(0,0,0); y+=20;
        doc.setFontSize(11); doc.text('Di:', pw/2, y, {align:'center'}); y+=7;
        doc.setFontSize(12); doc.setFont(undefined,'bold'); doc.text(sanitizePdf(p.universitas), pw/2, y, {align:'center'}); y+=20;
        doc.setFontSize(11); doc.setFont(undefined,'normal'); doc.text(`Tempat: ${sanitizePdf(tp)}`, pw/2, y, {align:'center'}); y+=7;
        if(tm&&ts) { doc.text(`Periode: ${fmtTgl(tm)} s/d ${fmtTgl(ts)}`, pw/2, y, {align:'center'}); y+=7; }
        doc.text(`Tahun Akademik: ${sanitizePdf(ta)}`, pw/2, y, {align:'center'}); y+=7;
        if(p.semester) { doc.text(`Semester: ${sanitizePdf(p.semester)} (PKL ke-${p.pklKe || '-'})`, pw/2, y, {align:'center'}); }
        y+=25; doc.setDrawColor(0,102,204); doc.setLineWidth(1); doc.line(ml, y, pw-mr, y); y+=12;
        doc.setFontSize(14); doc.setFont(undefined,'bold'); doc.text(String(new Date().getFullYear()), pw/2, y, {align:'center'});

        // --- DAFTAR ISI ---
        doc.addPage(); y=mt; doc.setFontSize(18); doc.setFont(undefined,'bold'); doc.text('DAFTAR ISI', pw/2, y, {align:'center'}); y+=6; doc.setLineWidth(0.3); doc.line(ml, y, pw-mr, y); y+=14;
        const toc=[]; let dc=0;
        tglKeys.forEach(t => { dc++; const l=`Hari ke-${dc} - ${fmtTgl(t)}`; toc.push({l, tp:doc.internal.getNumberOfPages(), ty:y, cp:0}); y+=9; if(y>ph-mb-10){doc.addPage();y=mt;} });

        // --- ISI LOGBOOK ---
        dc=0;
        for(const t of tglKeys) {
            dc++; const items=grouped[t]; chk(35); toc[dc-1].cp=doc.internal.getNumberOfPages();
            doc.setFillColor(235,243,255); doc.roundedRect(ml, y-4, cw, 13, 2, 2, 'F');
            doc.setFontSize(12); doc.setFont(undefined,'bold'); doc.text(`Hari ke-${dc}`, ml+4, y+3);
            doc.setFontSize(9); doc.setFont(undefined,'normal'); doc.setTextColor(80,80,80); doc.text(fmtTgl(t), pw-mr-4, y+3, {align:'right'}); doc.setTextColor(0,0,0); y+=17;
            for(let i=0;i<items.length;i++) {
                const it=items[i], n=i+1; chk(20);
                doc.setFontSize(11); doc.setFont(undefined,'bold'); doc.text(`${n}. ${sanitizePdf(it.kegiatan||'Tanpa Kegiatan')}`, ml+4, y); y+=7;
                doc.setFontSize(10); doc.setFont(undefined,'normal'); doc.setTextColor(60,60,60);
                if(it.jamMulai&&it.jamSelesai){doc.text(`Waktu     : ${it.jamMulai} - ${it.jamSelesai}`, ml+6, y); y+=5;}
                if(it.tempat){doc.text(`Tempat    : ${sanitizePdf(it.tempat)}`, ml+6, y); y+=5;}
                if(it.instruktur){doc.text(`Pembimbing : ${sanitizePdf(it.instruktur)}`, ml+6, y); y+=5;}
                doc.setTextColor(0,0,0);
                if(it.deskripsi){chk(12); doc.setFont(undefined,'italic'); const ln=doc.splitTextToSize(sanitizePdf(it.deskripsi), cw-16); doc.text(ln, ml+6, y); y+=ln.length*5+2;}
                if(it.foto){try{chk(65);const img=await loadImage(it.foto);let iW=cw-12,iH=(img.naturalHeight/img.naturalWidth)*iW;const mH=85;if(iH>mH){iH=mH;iW=(img.naturalWidth/img.naturalHeight)*iH;}doc.addImage(it.foto,'JPEG',ml+(cw-iW)/2,y+2,iW,iH);y+=iH+8;}catch(e){}}
                y+=4;
            }
            y+=6;
        }

        // --- HALAMAN RINGKASAN ---
        doc.addPage(); y=mt; doc.setFontSize(18); doc.setFont(undefined,'bold'); doc.text('RINGKASAN', pw/2, y, {align:'center'}); y+=6; doc.setLineWidth(0.3); doc.line(ml, y, pw-mr, y); y+=20;
        doc.setFontSize(12); doc.setFont(undefined,'bold'); doc.text('Laporan ini merupakan dokumentasi kegiatan selama Praktik Kerja Lapangan yang dilaksanakan oleh:', pw/2, y, {align:'center'}); y+=10;
        doc.setFontSize(11); doc.setFont(undefined,'normal');
        const rLines = [ `Nama      : ${sanitizePdf(p.nama)}`, `NIM       : ${sanitizePdf(p.nim||'-')}`, `Prodi     : ${sanitizePdf(p.prodi||'-')}`, `Fakultas  : ${sanitizePdf(p.fakultas||'-')}`, `Universitas: ${sanitizePdf(p.universitas)}`, `Tempat    : ${sanitizePdf(tp)}`, `Periode   : ${tm&&ts ? fmtTgl(tm)+' s/d '+fmtTgl(ts) : '-'}`, `Tahun Akademik: ${sanitizePdf(ta)}` ];
        rLines.forEach(l => { doc.text(l, ml+10, y); y+=8; });
        y+=10; doc.setFont(undefined,'bold'); doc.text('Rekapitulasi Kegiatan:', ml+10, y); y+=8; doc.setFont(undefined,'normal');
        doc.text(`Total Hari Efektif  : ${hariUnik.size} hari`, ml+10, y); y+=7;
        doc.text(`Total Kegiatan     : ${totKeg} kegiatan`, ml+10, y); y+=7;
        doc.text(`Total Waktu         : ${wktTxt}`, ml+10, y);

        // --- HALAMAN PENGESAHAN ---
        doc.addPage(); y=mt; doc.setFontSize(18); doc.setFont(undefined,'bold'); doc.text('LEMBAR PENGESAHAN', pw/2, y, {align:'center'}); y+=6; doc.setLineWidth(0.3); doc.line(ml, y, pw-mr, y); y+=20;
        doc.setFontSize(11); doc.setFont(undefined,'normal'); doc.text(`Laporan ini telah diperiksa dan disahkan pada: ....................`, ml, y); y+=20;
        const colW = (cw-30) / 3;
        const signRoles = ['Mahasiswa', 'Dosen Pembimbing', 'Pembimbing Tempat PKL'];
        signRoles.forEach((role, idx) => {
            const x = ml + (idx * (colW + 15));
            doc.setFontSize(10); doc.setFont(undefined,'bold'); doc.text(`(${role})`, x + colW/2, y+40, {align:'center'});
            doc.setDrawColor(0,0,0); doc.line(x, y+45, x+colW, y+45);
            doc.setFontSize(10); doc.setFont(undefined,'normal'); doc.text(sanitizePdf(p.nama), x + colW/2, y+55, {align:'center'});
            doc.text(`NIM: ${sanitizePdf(p.nim||'....................')}`, x + colW/2, y+62, {align:'center'});
        });

        // --- ISI ULANG TOC ---
        toc.forEach(e => { doc.setPage(e.tp); doc.setFontSize(11); doc.setFont(undefined,'normal'); const ls=sanitizePdf(e.l), lw=doc.getTextWidth(ls), ps=String(e.cp), pw2=doc.getTextWidth(ps); const ds=ml+4+lw+3, de=pw-mr-4-pw2-3, nd=Math.max(0,Math.floor((de-ds)/1.1)); doc.text(ls, ml+4, e.ty); doc.setTextColor(170,170,170); doc.text('.'.repeat(nd), ds, e.ty); doc.setTextColor(0,0,0); doc.text(ps, pw-mr-4, e.ty, {align:'right'}); });

        // --- NOMOR HALAMAN ---
        const tp = doc.internal.getNumberOfPages();
        for(let i=2;i<=tp;i++){doc.setPage(i); doc.setFontSize(9); doc.setFont(undefined,'normal'); doc.setTextColor(130,130,130); doc.text(`Halaman ${i-1} dari ${tp-1}`, pw/2, ph-12, {align:'center'});}

        doc.save(`Laporan-PKL-${sanitizePdf(p.nama)}-${new Date().toISOString().split('T')[0]}.pdf`);
        showPdfLoading(false); alert("Laporan PDF berhasil diunduh!");
    } catch (e) { console.error(e); showPdfLoading(false); alert("Gagal membuat PDF: " + e.message); }
}

// --- MANAJEMEN DATA ---
async function backupJSON() {
    const user = auth.currentUser; if (!user) return; const btn = document.getElementById('btn-backup-json'); btn.disabled = true; btn.innerText = "Memproses...";
    try {
        const snap = await db.collection('logbooks').where('userId', '==', user.uid).get();
        const bd = { _meta: { app: 'TrekLog', exportedAt: new Date().toISOString(), userName: user.displayName, userEmail: user.email, totalRecords: snap.size }, data: [] };
        snap.forEach(doc => { const d = doc.data(); bd.data.push({ _docId: doc.id, tanggal: d.tanggal||'', jamMulai: d.jamMulai||'', jamSelesai: d.jamSelesai||'', tempat: d.tempat||'', kegiatan: d.kegiatan||'', deskripsi: d.deskripsi||'', instruktur: d.instruktur||'', foto: d.foto||'', status: d.status||'draft' }); });
        if (!bd.data.length) { btn.disabled = false; btn.innerText = "Backup Data (JSON)"; return alert("Tidak ada data."); }
        const blob = new Blob([JSON.stringify(bd, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = `treklog-backup-${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        alert(`Backup berhasil! ${bd.data.length} data didownload.`);
    } catch (e) { alert("Gagal backup: " + e.message); } finally { btn.disabled = false; btn.innerText = "Backup Data (JSON)"; }
}

async function handleRestoreFile(event) {
    const file = event.target.files[0]; if (!file) return;
    if (!confirm("Data dari backup akan ditambahkan sebagai data baru.\n\nLanjutkan?")) { event.target.value = ''; return; }
    const btn = document.getElementById('btn-restore-json'); btn.disabled = true; btn.innerText = "Memulihkan...";
    try {
        const text = await file.text(), bd = JSON.parse(text);
        if (!bd.data || !Array.isArray(bd.data)) throw new Error("Format file tidak valid.");
        const user = auth.currentUser; if (!user) throw new Error("Kamu belum login!");
        let batch = db.batch(), count = 0, restored = 0;
        for (const item of bd.data) { batch.set(db.collection('logbooks').doc(), { userId: user.uid, tanggal: item.tanggal||'', jamMulai: item.jamMulai||'', jamSelesai: item.jamSelesai||'', tempat: item.tempat||'', kegiatan: item.kegiatan||'', deskripsi: item.deskripsi||'', instruktur: item.instruktur||'', foto: item.foto||'', status: item.status||'draft', createdAt: firebase.firestore.FieldValue.serverTimestamp() }); restored++; count++; if (count % 400 === 0) { await batch.commit(); batch = db.batch(); } }
        if (count > 0) await batch.commit();
        alert(`Berhasil memulihkan ${restored} data!`); loadDashboardStats(); loadDrafts(); loadLogbooks();
    } catch (e) { alert("Gagal restore: " + e.message); } finally { btn.disabled = false; btn.innerText = "Restore Data (JSON)"; event.target.value = ''; }
}

async function hapusSemuaData() {
    if (!confirm("PERINGATAN!\n\nSemua data logbook DAN draft akan dihapus PERMANEN.\nTindakan ini TIDAK BISA dibatalkan!")) return;
    if (!confirm("Apakah kamu benar-benar yakin? Ketuk OK sekali lagi.")) return;
    const user = auth.currentUser; if (!user) return; const btn = document.getElementById('btn-hapus-semua'); btn.disabled = true; btn.innerText = "Menghapus...";
    try {
        const snap = await db.collection('logbooks').where('userId', '==', user.uid).get();
        if (snap.empty) { alert("Tidak ada data."); btn.disabled = false; btn.innerText = "Hapus Semua Data"; return; }
        let batch = db.batch(), count = 0, deleted = 0;
        snap.forEach(doc => { batch.delete(doc.ref); deleted++; count++; if (count % 400 === 0) { batch.commit(); batch = db.batch(); } });
        if (count > 0) await batch.commit();
        alert(`Berhasil menghapus ${deleted} data.`); loadDashboardStats(); loadDrafts(); loadLogbooks();
    } catch (e) { alert("Gagal menghapus: " + e.message); } finally { btn.disabled = false; btn.innerText = "Hapus Semua Data"; }
}
