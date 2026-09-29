// ========================================
// KONEKSI DATABASE GOOGLE SHEETS
// ========================================
const API_URL = "https://script.google.com/macros/s/AKfycbxJrvl66sU41y72ZgIaKi9_cbqxmjpQd2BmmliF7H2JC3eS_3DnlCBa1y6cmQDX5eZNFA/exec";

const KUNCI_SISWA = "dataSiswa";
const KUNCI_ABSENSI = "dataAbsensi";
const KUNCI_PIKET = "dataPiket";
const KUNCI_PENGATURAN = "dataPengaturan";

const namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// ========================================
// FUNGSI SINKRONISASI CLOUD & G-DRIVE
// ========================================
async function syncDataFromCloud() {
    if (!API_URL || API_URL.trim() === "") return initData();

    try {
        const response = await fetch(API_URL);
        const cloudData = await response.json();
        let adaDataBaru = false;

        if (cloudData[KUNCI_PENGATURAN]) { localStorage.setItem(KUNCI_PENGATURAN, cloudData[KUNCI_PENGATURAN]); adaDataBaru = true; }
        if (cloudData[KUNCI_SISWA]) { localStorage.setItem(KUNCI_SISWA, cloudData[KUNCI_SISWA]); adaDataBaru = true; }
        if (cloudData[KUNCI_ABSENSI]) { localStorage.setItem(KUNCI_ABSENSI, cloudData[KUNCI_ABSENSI]); adaDataBaru = true; }
        if (cloudData[KUNCI_PIKET]) { localStorage.setItem(KUNCI_PIKET, cloudData[KUNCI_PIKET]); adaDataBaru = true; }

        if (adaDataBaru) {
            renderDashboard();
            const activeNavLink = document.querySelector('.nav-link.active');
            if (activeNavLink) jalankanFungsiHalaman(activeNavLink.getAttribute('data-target'));
        } else { initData(); }
    } catch (e) { console.error("Gagal sync:", e); initData(); }
}

function simpanKeCloud(key, dataObj) {
    localStorage.setItem(key, JSON.stringify(dataObj));
    if (API_URL && API_URL.trim() !== "") {
        let cloudDataObj = JSON.parse(JSON.stringify(dataObj));

        // FILTER ANTI-JEBOL: Cegah Base64 nyangkut
        if (key === KUNCI_SISWA && Array.isArray(cloudDataObj)) {
            cloudDataObj = cloudDataObj.map(s => {
                if (s.foto && s.foto.startsWith("data:image")) { s.foto = ""; }
                return s;
            });
        }

        fetch(API_URL, {
            method: 'POST',
            redirect: 'follow', 
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ key: key, value: JSON.stringify(cloudDataObj) })
        }).catch(e => console.error("Cloud error", e));
    }
}

async function uploadFotoKeDrive(base64Data, namaSiswa) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: "upload",
                base64: base64Data,
                fileName: "Foto_" + namaSiswa.replace(/\s+/g, '_') + "_" + Date.now() + ".jpg",
                mimeType: "image/jpeg"
            })
        });
        const result = await response.json();
        if (result.status === "sukses") return result.url;
        return "";
    } catch (e) { console.error("Gagal upload foto:", e); return ""; }
}

function initData() {
    if (!localStorage.getItem(KUNCI_PENGATURAN)) simpanKeCloud(KUNCI_PENGATURAN, { sekolah: "", kelas: "", wali: "" });
    if (!localStorage.getItem(KUNCI_SISWA)) simpanKeCloud(KUNCI_SISWA, []);
    if (!localStorage.getItem(KUNCI_PIKET)) simpanKeCloud(KUNCI_PIKET, { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] });
    if (!localStorage.getItem(KUNCI_ABSENSI)) simpanKeCloud(KUNCI_ABSENSI, {});
    renderDashboard();
}

function resetDatabase() {
    if(confirm("Hapus SELURUH database dari sistem secara permanen?")) {
        localStorage.clear();
        simpanKeCloud(KUNCI_PENGATURAN, { sekolah: "", kelas: "", wali: "" });
        simpanKeCloud(KUNCI_SISWA, []);
        simpanKeCloud(KUNCI_PIKET, { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] });
        simpanKeCloud(KUNCI_ABSENSI, {});
        showToast("Selesai", "Database dikosongkan. Memuat ulang...", "success");
        setTimeout(() => location.reload(), 1500);
    }
}

function getSiswa() { return JSON.parse(localStorage.getItem(KUNCI_SISWA)) || []; }
function getAbsensi() { return JSON.parse(localStorage.getItem(KUNCI_ABSENSI)) || {}; }
function getPiket() { return JSON.parse(localStorage.getItem(KUNCI_PIKET)) || {}; }
function getPengaturan() { return JSON.parse(localStorage.getItem(KUNCI_PENGATURAN)) || {}; }

// ========================================
// UI UTILITIES
// ========================================
function renderAvatar(nama, fotoSrc) {
    if (fotoSrc && fotoSrc.trim() !== "") return `<div class="avatar"><img src="${fotoSrc}" alt="${nama}"></div>`;
    let inisial = nama ? nama.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : "?";
    return `<div class="avatar">${inisial}</div>`;
}

function showToast(title, message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-content"><h4>${title}</h4><p>${message}</p></div>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('hide'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// ========================================
// ROLE LOGIN & NAVIGASI
// ========================================
const ADMIN_PASS = "admin123";
let isAdminMode = false;

function handleAuthClick() {
    if (isAdminMode) {
        isAdminMode = false;
        document.body.classList.add('viewer-mode');
        document.getElementById('btnLoginLogout').innerText = "Login Admin";
        if(document.querySelector('.nav-link.active').getAttribute('data-target') === 'pengaturan') {
            document.querySelector('[data-target="dashboard"]').click();
        }
    } else {
        document.getElementById('inputPassword').value = "";
        document.getElementById('modalLogin').classList.add('active');
    }
}

function prosesLogin() {
    if (document.getElementById('inputPassword').value === ADMIN_PASS) {
        isAdminMode = true;
        document.body.classList.remove('viewer-mode');
        document.getElementById('btnLoginLogout').innerText = "Logout Admin";
        tutupModal('modalLogin');
    } else { showToast("Akses Ditolak", "Kata sandi salah.", "error"); }
}

const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.page-section');
const mainNav = document.getElementById('mainNav');

document.getElementById('mobileToggle').addEventListener('click', () => mainNav.classList.toggle('open'));

navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        navLinks.forEach(n => n.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        this.classList.add('active');
        document.getElementById(this.getAttribute('data-target')).classList.add('active');
        mainNav.classList.remove('open');
        jalankanFungsiHalaman(this.getAttribute('data-target'));
    });
});

function jalankanFungsiHalaman(id) {
    if (id === 'dashboard') renderDashboard();
    if (id === 'data-siswa') renderDataSiswa();
    if (id === 'absensi') { document.getElementById('tanggalAbsen').valueAsDate = new Date(); renderFormAbsensi(); }
    if (id === 'riwayat-absensi') renderRiwayat();
    if (id === 'rekap-absensi') renderRekap();
    if (id === 'jadwal-piket') renderJadwalPiket();
    if (id === 'kalender') renderKalender();
    if (id === 'pengaturan') renderFormPengaturan();
}

// ========================================
// DASHBOARD
// ========================================
function renderDashboard() {
    const config = getPengaturan(); const siswa = getSiswa(); const absensi = getAbsensi(); const piket = getPiket();
    const tgl = new Date(); const tglStrYMD = tgl.toISOString().split('T')[0];
    
    document.getElementById('dashKelas').innerText = config.kelas || "Kelas Belum Diatur";
    document.getElementById('dashSekolah').innerText = config.sekolah || "-";
    document.getElementById('dashWali').innerText = config.wali || "-";
    document.getElementById('dashTotalSiswa').innerText = siswa.length;
    document.getElementById('dashTanggal').innerText = `${namaHari[tgl.getDay()]}, ${tgl.getDate()} ${namaBulan[tgl.getMonth()]} ${tgl.getFullYear()}`;
    
    let h=0, i=0, s=0, a=0;
    if (absensi[tglStrYMD]) {
        absensi[tglStrYMD].forEach(ab => {
            if(ab.status==='Hadir') h++; else if(ab.status==='Izin') i++; else if(ab.status==='Sakit') s++; else if(ab.status==='Alpa') a++;
        });
    }
    document.getElementById('dashHadir').innerText = h; document.getElementById('dashIzin').innerText = i;
    document.getElementById('dashSakit').innerText = s; document.getElementById('dashAlpa').innerText = a;

    const hariIniInt = tgl.getDay();
    const containerPiket = document.getElementById('dashPiketList'); containerPiket.innerHTML = "";
    
    // Sesuaikan: Jika hari Minggu (0) atau Sabtu (6), libur.
    if (hariIniInt === 0 || hariIniInt === 6) {
        containerPiket.innerHTML = "<p class='empty-state'>Libur.</p>";
    } else {
        const idSiswaPiket = piket[hariIniInt] || [];
        if (idSiswaPiket.length === 0) containerPiket.innerHTML = "<p class='empty-state'>Tidak ada piket.</p>";
        else {
            idSiswaPiket.forEach(no => {
                const sv = siswa.find(x => x.no === no);
                if (sv) containerPiket.innerHTML += `<div class="piket-item">${renderAvatar(sv.nama, sv.foto)} <span class="piket-name">${sv.nama}</span></div>`;
            });
        }
    }
}

// ========================================
// DATA SISWA (SEARCH PINTAR & ANTI-ERROR)
// ========================================
let tempBase64Foto = "";
function prosesFoto(event) {
    const file = event.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 400; const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            tempBase64Foto = canvas.toDataURL('image/jpeg', 0.6); 
            const preview = document.getElementById('previewFoto');
            preview.src = tempBase64Foto; preview.classList.remove('hide');
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

function renderDataSiswa() {
    const siswa = getSiswa(); 
    
    // Cegah error jika kotak pencarian belum dimuat oleh HTML
    const kotakCari = document.getElementById('cariSiswa');
    if (!kotakCari) return; 

    const inputCari = kotakCari.value.toLowerCase().trim();
    const tbody = document.getElementById('tabelSiswaBody'); 
    if (!tbody) return;

    tbody.innerHTML = "";
    let filtered = siswa;

    // LOGIKA PENCARIAN PINTAR
    if (inputCari !== "") {
        // Cek apakah user HANYA mengetik angka
        const isMurniAngka = /^\d+$/.test(inputCari);

        filtered = siswa.filter(s => {
            // Ubah semua data ke String agar tidak error saat dicari
            const noAbsen = String(s.no || "");
            const nisSiswa = String(s.nis || "").toLowerCase();
            const namaSiswa = String(s.nama || "").toLowerCase();

            if (isMurniAngka) {
                // JIKA ANGKA: Harus sama PERSIS dengan No. Absen ATAU ada di dalam NIS
                return noAbsen === inputCari || nisSiswa.includes(inputCari);
            } else {
                // JIKA HURUF: Cari kemiripan di Nama atau NIS
                return namaSiswa.includes(inputCari) || nisSiswa.includes(inputCari);
            }
        });
    }

    // Urutkan selalu dari absen 1 ke bawah
    filtered.sort((a, b) => (parseInt(a.no) || 0) - (parseInt(b.no) || 0));
    
    // Jika tidak ada yang cocok
    if (filtered.length === 0) {
        return tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">Siswa tidak ditemukan.</div></td></tr>`;
    }
    
    // Tampilkan hasil
    filtered.forEach(s => {
        tbody.innerHTML += `
            <tr>
                <td>${s.no}</td>
                <td><div class="siswa-cell">${renderAvatar(s.nama, s.foto)}<span>${s.nama}</span></div></td>
                <td><span class="badge badge-neutral">${s.jabatan || 'Siswa'}</span></td>
                <td>${s.jk === 'L' ? 'L' : 'P'}</td>
                <td class="text-right">
                    <button class="btn btn-info-outline btn-sm" onclick="lihatDetailSiswa(${s.no})">Profil</button>
                    <button class="btn btn-outline btn-sm admin-only" onclick="editSiswa(${s.no})">Edit</button>
                    <button class="btn btn-danger-outline btn-sm admin-only" onclick="hapusSiswa(${s.no})">Hapus</button>
                </td>
            </tr>`;
    });
}

// PASTIKAN KOTAK PENCARIAN LANGSUNG BEREAKSI SAAT DIKETIK
document.addEventListener("DOMContentLoaded", () => {
    const kotakCari = document.getElementById('cariSiswa');
    if (kotakCari) {
        // Setiap kali ada huruf/angka yang diketik, langsung jalankan pencarian!
        kotakCari.addEventListener('input', renderDataSiswa);
    }
});

function bukaModalSiswa() {
    document.getElementById('modalSiswaTitle').innerText = "Data Siswa";
    ['editOldNoAbsen','inputNoAbsen','inputNIS','inputNamaLengkap','inputTglLahir','inputFoto'].forEach(id => document.getElementById(id).value = "");
    document.getElementById('inputJK').value = "L"; document.getElementById('inputJabatan').value = "Siswa";
    document.getElementById('previewFoto').classList.add('hide'); tempBase64Foto = "";
    document.getElementById('modalSiswa').classList.add('active');
}

function tutupModal(id) { document.getElementById(id).classList.remove('active'); }

async function simpanSiswa() {
    const no = parseInt(document.getElementById('inputNoAbsen').value);
    const nis = document.getElementById('inputNIS').value.trim();
    const nama = document.getElementById('inputNamaLengkap').value.trim();
    const jk = document.getElementById('inputJK').value;
    const jabatan = document.getElementById('inputJabatan').value;
    const tglLahir = document.getElementById('inputTglLahir').value;
    const oldNo = document.getElementById('editOldNoAbsen').value;
    
    if (!no || !nama || !jk) return showToast("Error", "Isi nomor, nama, dan gender!", "error");
    
    let siswa = getSiswa();
    if (siswa.find(s => s.no === no) && (!oldNo || parseInt(oldNo) !== no)) return showToast("Error", "No Absen duplikat!", "error");
    
    const btnSimpan = document.querySelector('#modalSiswa .btn-primary');
    btnSimpan.innerText = "Mengunggah..."; btnSimpan.disabled = true;

    let finalLinkFoto = "";
    if (tempBase64Foto !== "") {
        showToast("Proses", "Mengunggah foto ke Google Drive...", "success");
        finalLinkFoto = await uploadFotoKeDrive(tempBase64Foto, nama);
        if(finalLinkFoto === "") showToast("Peringatan", "Upload foto gagal. Lanjut simpan teks.", "error");
    } else if (oldNo) {
        const sLama = siswa.find(s => s.no === parseInt(oldNo));
        if (sLama && sLama.foto) finalLinkFoto = sLama.foto;
    }

    if (oldNo) {
        const idx = siswa.findIndex(s => s.no === parseInt(oldNo));
        if(idx !== -1) siswa[idx] = { no, nis, nama, jk, jabatan, tglLahir, foto: finalLinkFoto };
    } else {
        siswa.push({ no, nis, nama, jk, jabatan, tglLahir, foto: finalLinkFoto });
    }
    
    simpanKeCloud(KUNCI_SISWA, siswa);
    
    btnSimpan.innerText = "Simpan"; btnSimpan.disabled = false;
    tutupModal('modalSiswa'); renderDataSiswa();
    showToast("Berhasil", "Data siswa disimpan.", "success");
}

function editSiswa(noLama) {
    const s = getSiswa().find(x => x.no === noLama); if (!s) return;
    document.getElementById('modalSiswaTitle').innerText = "Edit Siswa";
    document.getElementById('editOldNoAbsen').value = s.no; document.getElementById('inputNoAbsen').value = s.no;
    document.getElementById('inputNIS').value = s.nis || ""; document.getElementById('inputNamaLengkap').value = s.nama;
    document.getElementById('inputJK').value = s.jk; document.getElementById('inputJabatan').value = s.jabatan || "Siswa";
    document.getElementById('inputTglLahir').value = s.tglLahir || "";
    document.getElementById('inputFoto').value = ""; tempBase64Foto = "";
    
    const preview = document.getElementById('previewFoto');
    if(s.foto) { preview.src = s.foto; preview.classList.remove('hide'); } else { preview.classList.add('hide'); }
    document.getElementById('modalSiswa').classList.add('active');
}

function hapusSiswa(no) {
    if (confirm("Hapus data siswa ini secara permanen?")) {
        let siswa = getSiswa().filter(s => s.no !== no);
        simpanKeCloud(KUNCI_SISWA, siswa);
        renderDataSiswa(); showToast("Berhasil", "Data terhapus.");
    }
}

// ========================================
// DETAIL & ZOOM
// ========================================
function lihatDetailSiswa(no) {
    const s = getSiswa().find(x => x.no === no); if(!s) return;
    let totalHadir = 0; const db = getAbsensi();
    for (let tgl in db) { if(db[tgl].find(x => x.no === s.no && x.status === "Hadir")) totalHadir++; }
    
    document.getElementById('detailNama').innerText = s.nama; document.getElementById('detailNIS').innerText = s.nis || "-";
    document.getElementById('detailTglLahir').innerText = s.tglLahir ? new Date(s.tglLahir).toLocaleDateString('id-ID') : "-";
    document.getElementById('detailNo').innerText = s.no; document.getElementById('detailTotalHadir').innerText = totalHadir + " Hari";
    const bg = document.getElementById('detailGenderBadge'); bg.innerText = s.jk === 'L' ? 'Laki-laki' : 'Perempuan'; bg.className = s.jk === 'L' ? 'badge badge-izin' : 'badge badge-sakit';
    document.getElementById('detailJabatanBadge').innerText = s.jabatan || "Siswa";
    document.getElementById('detailFoto').src = s.foto && s.foto.startsWith("http") ? s.foto : `https://ui-avatars.com/api/?name=${encodeURIComponent(s.nama)}&background=F4F4F2&color=375A4E&size=300`;
    document.getElementById('modalDetailSiswa').classList.add('active');
}
function bukaZoomFoto() { document.getElementById('zoomImage').src = document.getElementById('detailFoto').src; document.getElementById('modalZoom').classList.add('active'); }

// ========================================
// ABSENSI & RIWAYAT
// ========================================
function renderFormAbsensi() {
    const siswa = getSiswa().sort((a,b) => a.no - b.no); const tgl = document.getElementById('tanggalAbsen').value;
    const tbody = document.getElementById('tabelAbsensiBody'); tbody.innerHTML = "";
    if (!tgl || siswa.length === 0) return;
    const dataHariIni = getAbsensi()[tgl] || [];
    siswa.forEach(s => {
        const status = (dataHariIni.find(x => x.no === s.no) || {}).status || 'Hadir';
        const ket = (dataHariIni.find(x => x.no === s.no) || {}).ket || '';
        tbody.innerHTML += `
            <tr data-no="${s.no}" data-nama="${s.nama}">
                <td>${s.no}</td>
                <td><div class="siswa-cell">${renderAvatar(s.nama, s.foto)}${s.nama}</div></td>
                <td>
                    <select class="input-control status-select">
                        <option value="Hadir" ${status==='Hadir'?'selected':''}>Hadir</option>
                        <option value="Izin" ${status==='Izin'?'selected':''}>Izin</option>
                        <option value="Sakit" ${status==='Sakit'?'selected':''}>Sakit</option>
                        <option value="Alpa" ${status==='Alpa'?'selected':''}>Alpa</option>
                    </select>
                </td>
                <td><input type="text" class="input-control ket-input" value="${ket}" placeholder="-"></td>
            </tr>`;
    });
}

function simpanAbsensi() {
    const tgl = document.getElementById('tanggalAbsen').value; if (!tgl) return showToast("Gagal", "Pilih tanggal absen", "error");
    let dataSimpan = [];
    document.querySelectorAll('#tabelAbsensiBody tr').forEach(r => {
        dataSimpan.push({ no: parseInt(r.dataset.no), nama: r.dataset.nama, status: r.querySelector('.status-select').value, ket: r.querySelector('.ket-input').value.trim() });
    });
    const absensiDb = getAbsensi(); absensiDb[tgl] = dataSimpan; simpanKeCloud(KUNCI_ABSENSI, absensiDb);
    showToast("Tersimpan", "Absensi dicatat.");
}

function renderRiwayat() {
    const db = getAbsensi(); const siswa = getSiswa();
    const fTgl = document.getElementById('filterTanggalRiwayat').value; const fNama = document.getElementById('filterNamaRiwayat').value.toLowerCase(); const fStatus = document.getElementById('filterStatusRiwayat').value;
    const tbody = document.getElementById('tabelRiwayatBody'); tbody.innerHTML = "";
    let all = []; for (let t in db) db[t].forEach(ab => all.push({ tanggal: t, ...ab }));
    all.sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal));
    if (fTgl) all = all.filter(d => d.tanggal === fTgl); if (fNama) all = all.filter(d => d.nama.toLowerCase().includes(fNama)); if (fStatus !== "Semua") all = all.filter(d => d.status === fStatus);
    
    if (all.length === 0) return tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state">Kosong.</div></td></tr>`;
    all.forEach(d => {
        let sv = siswa.find(x => x.no === d.no);
        tbody.innerHTML += `<tr><td>${d.tanggal}</td><td><div class="siswa-cell">${renderAvatar(d.nama, sv ? sv.foto : "")}${d.nama}</div></td><td><span class="badge badge-${d.status.toLowerCase()}">${d.status}</span></td><td>${d.ket || '-'}</td></tr>`;
    });
}

function renderRekap() {
    const siswa = getSiswa().sort((a,b) => a.no - b.no); const db = getAbsensi(); const periode = document.getElementById('filterPeriodeRekap').value;
    const tbody = document.getElementById('tabelRekapBody'); tbody.innerHTML = "";
    let rekap = {}; siswa.forEach(s => rekap[s.no] = { nama: s.nama, h: 0, i: 0, s: 0, a: 0, foto: s.foto });
    const now = new Date();
    for (let tgl in db) {
        let t = new Date(tgl);
        if ((periode === 'semua') || (periode === 'bulanan' && t.getMonth() === now.getMonth()) || (periode === 'mingguan' && Math.ceil(Math.abs(now - t) / (1000 * 60 * 60 * 24)) <= 7)) {
            db[tgl].forEach(ab => { if(rekap[ab.no]) { if(ab.status === 'Hadir') rekap[ab.no].h++; else if(ab.status === 'Izin') rekap[ab.no].i++; else if(ab.status === 'Sakit') rekap[ab.no].s++; else if(ab.status === 'Alpa') rekap[ab.no].a++; } });
        }
    }
    siswa.forEach(s => {
        const r = rekap[s.no];
        tbody.innerHTML += `<tr><td class="text-left"><div class="siswa-cell">${renderAvatar(r.nama, r.foto)}${r.nama}</div></td><td>${r.h}</td><td>${r.i}</td><td>${r.s}</td><td>${r.a}</td></tr>`;
    });
}

// ========================================
// JADWAL PIKET (HANYA SENIN-JUMAT)
// ========================================
function renderJadwalPiket() {
    const piket = getPiket(); const siswa = getSiswa(); const container = document.getElementById('piketGridContainer'); container.innerHTML = "";
    // Looping hanya 1 (Senin) sampai 5 (Jumat)
    for(let i = 1; i <= 5; i++) {
        const idTerpilih = piket[i] || [];
        let listSiswa = idTerpilih.length === 0 ? "<div class='empty-state'>Tidak ada piket</div>" : idTerpilih.map(no => { const s = siswa.find(x => x.no === no); return s ? `<div class="piket-item mb-2">${renderAvatar(s.nama, s.foto)}<span class="piket-name">${s.nama}</span></div>` : ''; }).join('');
        container.innerHTML += `<div class="piket-card"><div class="piket-card-header"><h3>${namaHari[i]}</h3><button class="btn btn-outline btn-sm admin-only" onclick="bukaModalPiket(${i})">Atur</button></div><div class="piket-card-body">${listSiswa}</div></div>`;
    }
}
function bukaModalPiket(hariInt) {
    document.getElementById('modalPiketTitle').innerText = "Piket " + namaHari[hariInt]; document.getElementById('editHariPiket').value = hariInt;
    const terpilih = getPiket()[hariInt] || []; const container = document.getElementById('listCheckboxSiswa'); container.innerHTML = "";
    getSiswa().sort((a,b) => a.no - b.no).forEach(s => { container.innerHTML += `<label class="checkbox-item"><input type="checkbox" class="cb-piket" value="${s.no}" ${terpilih.includes(s.no) ? 'checked' : ''}> ${s.no} - ${s.nama}</label>`; });
    document.getElementById('modalPiket').classList.add('active');
}
function simpanJadwalPiket() {
    const hari = document.getElementById('editHariPiket').value;
    const arrNo = Array.from(document.querySelectorAll('.cb-piket:checked')).map(cb => parseInt(cb.value));
    const piket = getPiket(); piket[hari] = arrNo; simpanKeCloud(KUNCI_PIKET, piket);
    tutupModal('modalPiket'); renderJadwalPiket();
}

let kalBulan = new Date().getMonth(); let kalTahun = new Date().getFullYear();
function renderKalender() {
    document.getElementById('namaBulanTahun').innerText = `${namaBulan[kalBulan]} ${kalTahun}`;
    const grid = document.getElementById('kalenderGrid'); grid.innerHTML = "";
    const hariPertama = new Date(kalTahun, kalBulan, 1).getDay(); const jmlHari = new Date(kalTahun, kalBulan + 1, 0).getDate();
    const absensiDb = getAbsensi(); const piketDb = getPiket(); const now = new Date();
    for (let i = 0; i < hariPertama; i++) grid.innerHTML += `<div class="cal-day empty"></div>`;
    for (let i = 1; i <= jmlHari; i++) {
        let isToday = (i === now.getDate() && kalBulan === now.getMonth() && kalTahun === now.getFullYear()) ? "today" : "";
        let dateStr = `${kalTahun}-${(kalBulan+1).toString().padStart(2,'0')}-${i.toString().padStart(2,'0')}`;
        let dayOfWeek = new Date(kalTahun, kalBulan, i).getDay();
        let indicators = "";
        if (absensiDb[dateStr]) indicators += `<span class="dot dot-absen"></span>`;
        if (piketDb[dayOfWeek] && piketDb[dayOfWeek].length > 0 && dayOfWeek !== 0 && dayOfWeek !== 6) indicators += `<span class="dot dot-piket"></span>`;
        grid.innerHTML += `<div class="cal-day ${isToday}"><div class="cal-date">${i}</div><div class="indicator-area">${indicators}</div></div>`;
    }
}
function ubahBulan(step) { kalBulan += step; if(kalBulan < 0){kalBulan=11;kalTahun--;} else if(kalBulan > 11){kalBulan=0;kalTahun++;} renderKalender(); }

function renderFormPengaturan() {
    const config = getPengaturan();
    document.getElementById('setSekolah').value = config.sekolah || ""; document.getElementById('setKelas').value = config.kelas || ""; document.getElementById('setWali').value = config.wali || "";
}
function simpanPengaturan() {
    simpanKeCloud(KUNCI_PENGATURAN, { sekolah: document.getElementById('setSekolah').value, kelas: document.getElementById('setKelas').value, wali: document.getElementById('setWali').value });
    showToast("Berhasil", "Pengaturan disimpan."); renderDashboard();
}

window.onload = () => { syncDataFromCloud(); };
``