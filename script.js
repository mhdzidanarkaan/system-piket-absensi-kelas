// ========================================
// KONEKSI & KONFIGURASI DATABASE
// ========================================
const API_URL = "https://script.google.com/macros/s/AKfycbxJrvl66sU41y72ZgIaKi9_cbqxmjpQd2BmmliF7H2JC3eS_3DnlCBa1y6cmQDX5eZNFA/exec";
const KUNCI_SISWA = "dataSiswa"; const KUNCI_ABSENSI = "dataAbsensi"; const KUNCI_PIKET = "dataPiket"; const KUNCI_PENGATURAN = "dataPengaturan";
const KUNCI_BUKTI_PIKET = "dataBuktiPiket"; 

const namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function updateJamRealtime() {
    const elJam = document.getElementById('dashJam');
    if(elJam) elJam.innerText = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateJamRealtime, 1000); 

function downloadExcel(tableId, namaLaporan, tipeFilter) {
    showToast("Memproses Excel", "Menyiapkan data...", "success");
    let periodeTeks = "Semua Waktu";
    if (tipeFilter === 'rekap') {
        const val = document.getElementById('filterPeriodeRekap').value;
        if (val === 'bulanan') periodeTeks = "Bulan Ini"; else if (val === 'mingguan') periodeTeks = "7 Hari Terakhir";
    } else if (tipeFilter === 'riwayat') {
        const tgl = document.getElementById('filterTanggalRiwayat').value; periodeTeks = tgl ? tgl : "Semua Waktu";
    }

    let excelData = []; const config = getPengaturan();
    excelData.push([namaLaporan.replace(/_/g, ' ').toUpperCase()]);
    excelData.push(["Kelas / Wali", ": " + (config.kelas || "-") + " / " + (config.wali || "-")]);
    excelData.push(["Periode Data", ": " + periodeTeks]);
    excelData.push(["Dicetak Pada", ": " + new Date().toLocaleString('id-ID')]);
    excelData.push([]); 

    const table = document.getElementById(tableId);
    let theadRow = []; table.querySelectorAll('thead th').forEach(th => {
        if(th.innerText !== "") theadRow.push(th.innerText.toUpperCase());
    }); 
    excelData.push(theadRow);
    
    table.querySelectorAll('tbody tr').forEach(tr => {
        if(!tr.classList.contains('date-separator-row') && !tr.classList.contains('sub-history-row')) {
            let rowData = [];
            tr.querySelectorAll('td').forEach(td => rowData.push(td.innerText.replace(/Lihat Bukti|▼|Riwayat|▲|Tutup/gi, '').trim()));
            excelData.push(rowData);
        }
    });

    const ws = XLSX.utils.aoa_to_sheet(excelData);
    // Kolom Excel disesuaikan karena Dispen sudah gabung Izin
    let wscols = tipeFilter === 'riwayat' ? [{wch: 12}, {wch: 10}, {wch: 35}, {wch: 15}, {wch: 30}] : [{wch: 35}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 8}]; 
    ws['!cols'] = wscols; 
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Data Kehadiran");
    XLSX.writeFile(wb, `${namaLaporan}_${periodeTeks.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.xlsx`);
}

async function syncDataFromCloud() {
    if (!API_URL || API_URL.trim() === "") return initData();
    try {
        const response = await fetch(API_URL); const cloudData = await response.json(); let adaDataBaru = false;
        if (cloudData[KUNCI_PENGATURAN]) { localStorage.setItem(KUNCI_PENGATURAN, cloudData[KUNCI_PENGATURAN]); adaDataBaru = true; }
        if (cloudData[KUNCI_SISWA]) { localStorage.setItem(KUNCI_SISWA, cloudData[KUNCI_SISWA]); adaDataBaru = true; }
        if (cloudData[KUNCI_ABSENSI]) { localStorage.setItem(KUNCI_ABSENSI, cloudData[KUNCI_ABSENSI]); adaDataBaru = true; }
        if (cloudData[KUNCI_PIKET]) { localStorage.setItem(KUNCI_PIKET, cloudData[KUNCI_PIKET]); adaDataBaru = true; }
        if (cloudData[KUNCI_BUKTI_PIKET]) { localStorage.setItem(KUNCI_BUKTI_PIKET, cloudData[KUNCI_BUKTI_PIKET]); adaDataBaru = true; }
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
        if (key === KUNCI_SISWA && Array.isArray(cloudDataObj)) { cloudDataObj = cloudDataObj.map(s => { if (s.foto && s.foto.startsWith("data:image")) s.foto = ""; return s; }); }
        fetch(API_URL, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ key: key, value: JSON.stringify(cloudDataObj) }) }).catch(e => console.error(e));
    }
}

async function uploadFotoKeDrive(base64Data, namaFileAsli, namaSubFolder) {
    try {
        const response = await fetch(API_URL, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ action: "upload", base64: base64Data, fileName: namaFileAsli.replace(/\s+/g, '_') + "_" + Date.now() + ".jpg", mimeType: "image/jpeg", folderName: namaSubFolder }) });
        const result = await response.json(); if (result.status === "sukses") return result.url; return "";
    } catch (e) { return ""; }
}

function initData() {
    if (!localStorage.getItem(KUNCI_PENGATURAN)) simpanKeCloud(KUNCI_PENGATURAN, { sekolah: "", kelas: "", wali: "", fotoSekolah: "", fotoWali: "" });
    if (!localStorage.getItem(KUNCI_SISWA)) simpanKeCloud(KUNCI_SISWA, []);
    if (!localStorage.getItem(KUNCI_PIKET)) simpanKeCloud(KUNCI_PIKET, { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] });
    if (!localStorage.getItem(KUNCI_ABSENSI)) simpanKeCloud(KUNCI_ABSENSI, {});
    if (!localStorage.getItem(KUNCI_BUKTI_PIKET)) simpanKeCloud(KUNCI_BUKTI_PIKET, {});
    renderDashboard();
}

function resetDatabase() { if(confirm("Hapus SELURUH database secara permanen?")) { localStorage.clear(); initData(); showToast("Selesai", "Database dikosongkan.", "success"); setTimeout(() => location.reload(), 1500); } }

function getSiswa() { return JSON.parse(localStorage.getItem(KUNCI_SISWA)) || []; }
function getAbsensi() { return JSON.parse(localStorage.getItem(KUNCI_ABSENSI)) || {}; }
function getPiket() { return JSON.parse(localStorage.getItem(KUNCI_PIKET)) || {}; }
function getPengaturan() { return JSON.parse(localStorage.getItem(KUNCI_PENGATURAN)) || {}; }
function getBuktiPiket() { return JSON.parse(localStorage.getItem(KUNCI_BUKTI_PIKET)) || {}; }

function renderAvatar(nama, fotoSrc) {
    if (fotoSrc && fotoSrc.trim() !== "") return `<div class="avatar"><img src="${fotoSrc}" alt="${nama}"></div>`;
    let inisial = nama ? nama.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : "?"; return `<div class="avatar">${inisial}</div>`;
}

function showToast(title, message, type = 'success') {
    const container = document.getElementById('toastContainer'); const toast = document.createElement('div'); toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-content"><h4>${title}</h4><p>${message}</p></div>`; container.appendChild(toast); setTimeout(() => { toast.classList.add('hide'); setTimeout(() => toast.remove(), 300); }, 3000);
}

const ADMIN_PASS = "admin123"; let isAdminMode = false;
function handleAuthClick() {
    if (isAdminMode) {
        isAdminMode = false; document.body.classList.add('viewer-mode'); document.getElementById('btnLoginLogout').innerText = "Login Admin";
        if(document.querySelector('.nav-link.active').getAttribute('data-target') === 'pengaturan') { document.querySelector('[data-target="dashboard"]').click(); }
        showToast("Info", "Anda sekarang berada dalam mode Penonton.", "success");
    } else { document.getElementById('inputPassword').value = ""; document.getElementById('modalLogin').classList.add('active'); }
}
function prosesLogin() {
    if (document.getElementById('inputPassword').value === ADMIN_PASS) { 
        isAdminMode = true; document.body.classList.remove('viewer-mode'); document.getElementById('btnLoginLogout').innerText = "Logout Admin"; tutupModal('modalLogin'); showToast("Berhasil", "Selamat datang Admin!", "success");
    } else { showToast("Ditolak", "Kata sandi salah.", "error"); }
}

const navLinks = document.querySelectorAll('.nav-link'); const sections = document.querySelectorAll('.page-section'); const mainNav = document.getElementById('mainNav');
document.getElementById('mobileToggle').addEventListener('click', () => mainNav.classList.toggle('open'));
navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault(); 
        if(!isAdminMode && this.classList.contains('admin-only')) return showToast("Akses Ditolak", "Silakan Login Admin terlebih dahulu.", "error");
        navLinks.forEach(n => n.classList.remove('active')); sections.forEach(s => s.classList.remove('active'));
        this.classList.add('active'); document.getElementById(this.getAttribute('data-target')).classList.add('active'); mainNav.classList.remove('open');
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

async function uploadBuktiPiketLangsung(event) {
    const file = event.target.files[0]; if(!file) return;
    const containerBukti = document.getElementById('dashBuktiPiketContainer');
    containerBukti.innerHTML = `<p style="font-size:0.9rem; color:var(--primary); font-weight:700;">Sedang mengunggah foto...</p>`;
    showToast("Proses", "Mengompres foto...", "success");

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image(); 
        img.onload = async function() {
            const canvas = document.createElement('canvas'); const scaleSize = 800 / img.width; canvas.width = 800; canvas.height = img.height * scaleSize;
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); const base64Data = canvas.toDataURL('image/jpeg', 0.6); 
            showToast("Proses", "Mengunggah bukti kelas ke Cloud...", "success"); const tgl = new Date().toISOString().split('T')[0];
            const linkDrive = await uploadFotoKeDrive(base64Data, "BuktiPiket_Kelas_" + tgl, "Bukti_Kebersihan_Piket");
            
            if (linkDrive !== "") {
                const dbBukti = getBuktiPiket(); dbBukti[tgl] = linkDrive; simpanKeCloud(KUNCI_BUKTI_PIKET, dbBukti); showToast("Berhasil", "Terima kasih! Bukti piket tersimpan.", "success");
            } else { showToast("Gagal", "Upload foto gagal.", "error"); }
            renderDashboard(); 
        }; img.src = e.target.result;
    }; reader.readAsDataURL(file);
}

function renderDashboard() {
    const config = getPengaturan(); const siswa = getSiswa(); const absensi = getAbsensi(); const piket = getPiket(); const tgl = new Date(); const tglStrYMD = tgl.toISOString().split('T')[0];
    
    document.getElementById('dashSekolah').innerText = config.sekolah || "Nama Sekolah"; document.getElementById('dashKelas').innerText = config.kelas || "Kelas";
    document.getElementById('dashWali').innerText = config.wali || "Nama Wali Kelas"; document.getElementById('dashTanggal').innerText = `${namaHari[tgl.getDay()]}, ${tgl.getDate()} ${namaBulan[tgl.getMonth()]} ${tgl.getFullYear()}`;
    const bannerFoto = document.getElementById('bannerFotoSekolah'); if(config.fotoSekolah && config.fotoSekolah.trim() !== "") bannerFoto.src = config.fotoSekolah;
    const dashFotoWali = document.getElementById('dashFotoWali'); if(config.fotoWali && config.fotoWali.trim() !== "") { dashFotoWali.src = config.fotoWali; } else { dashFotoWali.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(config.wali || 'Wali')}&background=0EA5E9&color=fff`; }
    
    let h=0, d=0, i=0, s=0, a=0;
    if (absensi[tglStrYMD]) {
        let latestStatus = {}; absensi[tglStrYMD].forEach(ab => { latestStatus[ab.no] = ab; });
        Object.values(latestStatus).forEach(ab => { if(ab.status==='Hadir') h++; else if(ab.status==='Dispensasi' || ab.status==='Izin') i++; else if(ab.status==='Sakit') s++; else if(ab.status==='Alpa') a++; });
    }
    document.getElementById('dashHadir').innerText = h; document.getElementById('dashIzin').innerText = i; document.getElementById('dashSakit').innerText = s; document.getElementById('dashAlpa').innerText = a;

    const hariIniInt = tgl.getDay(); const containerPiket = document.getElementById('dashPiketList'); const containerBukti = document.getElementById('dashBuktiPiketContainer');
    containerPiket.innerHTML = "";
    if (hariIniInt === 0 || hariIniInt === 6) { containerPiket.innerHTML = "<p class='empty-state'>Libur.</p>"; containerBukti.classList.add('hide'); 
    } else {
        containerBukti.classList.remove('hide'); const idSiswaPiket = piket[hariIniInt] || [];
        if (idSiswaPiket.length === 0) { 
            containerPiket.innerHTML = "<p class='empty-state'>Tidak ada piket.</p>"; containerBukti.innerHTML = "<p class='text-muted' style='font-size:0.9rem;'>Jadwal piket kosong.</p>";
        } else { 
            idSiswaPiket.forEach(no => { const sv = siswa.find(x => x.no === no); if (sv) containerPiket.innerHTML += `<div class="piket-item">${renderAvatar(sv.nama, sv.foto)} <span class="piket-name">${sv.nama}</span></div>`; }); 
            const dbBukti = getBuktiPiket(); const linkBuktiHariIni = dbBukti[tglStrYMD];
            if (linkBuktiHariIni) { containerBukti.innerHTML = `<p style="font-size:0.95rem; color:var(--c-hadir); font-weight:800; margin-bottom:12px;">✓ Kelas Sudah Bersih</p><a href="${linkBuktiHariIni}" target="_blank" class="btn btn-outline btn-sm" style="display:block; width:100%; border-radius:12px;">Lihat Foto Bukti</a>`;
            } else { containerBukti.innerHTML = `<p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:12px; font-weight:600;">Kelas belum dikonfirmasi bersih.</p><label class="btn btn-primary btn-sm" style="cursor:pointer; display:block; width:100%; border-radius:12px;"><input type="file" accept="image/*" class="hide" onchange="uploadBuktiPiketLangsung(event)">Upload Foto Kelas</label>`; }
        }
    }
}

let tempBase64Foto = "";
function prosesFoto(event) {
    const file = event.target.files[0]; if(!file) return; const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image(); img.onload = function() {
            const canvas = document.createElement('canvas'); const scaleSize = 400 / img.width; canvas.width = 400; canvas.height = img.height * scaleSize; canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            tempBase64Foto = canvas.toDataURL('image/jpeg', 0.6); document.getElementById('previewFoto').src = tempBase64Foto; document.getElementById('previewFoto').classList.remove('hide');
        }; img.src = e.target.result;
    }; reader.readAsDataURL(file);
}

function renderDataSiswa() {
    const siswa = getSiswa(); const kotakCari = document.getElementById('cariSiswa'); const inputCari = kotakCari ? kotakCari.value.toLowerCase().trim() : ""; const tbody = document.getElementById('tabelSiswaBody'); if (!tbody) return; tbody.innerHTML = "";
    let filtered = siswa;
    if (inputCari !== "") {
        const isAngka = /^\d+$/.test(inputCari);
        filtered = siswa.filter(s => {
            if (isAngka) return String(s.no||"") === inputCari || String(s.nis||"").toLowerCase().includes(inputCari);
            return String(s.nama||"").toLowerCase().includes(inputCari) || String(s.nis||"").toLowerCase().includes(inputCari);
        });
    }
    filtered.sort((a, b) => (parseInt(a.no) || 0) - (parseInt(b.no) || 0));
    if (filtered.length === 0) return tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">Data tidak ditemukan.</div></td></tr>`;
    filtered.forEach(s => {
        tbody.innerHTML += `<tr><td>${s.no}</td><td><div class="siswa-cell">${renderAvatar(s.nama, s.foto)}<span>${s.nama}</span></div></td><td><span class="badge badge-neutral">${s.jabatan || 'Siswa'}</span></td><td>${s.jk === 'L' ? 'L' : 'P'}</td><td class="text-right"><button class="btn btn-info-outline btn-sm" onclick="lihatDetailSiswa(${s.no})">Profil</button> <button class="btn btn-outline btn-sm admin-only" onclick="editSiswa(${s.no})">Edit</button> <button class="btn btn-danger-outline btn-sm admin-only" onclick="hapusSiswa(${s.no})">Hapus</button></td></tr>`;
    });
}
document.addEventListener("DOMContentLoaded", () => { const kc = document.getElementById('cariSiswa'); if (kc) kc.addEventListener('input', renderDataSiswa); updateJamRealtime();});

function bukaModalSiswa() { document.getElementById('modalSiswaTitle').innerText = "Data Siswa"; ['editOldNoAbsen','inputNoAbsen','inputNIS','inputNamaLengkap','inputTglLahir','inputFoto'].forEach(id => document.getElementById(id).value = ""); document.getElementById('inputJK').value = "L"; document.getElementById('inputJabatan').value = "Siswa"; document.getElementById('previewFoto').classList.add('hide'); tempBase64Foto = ""; document.getElementById('modalSiswa').classList.add('active'); }
function tutupModal(id) { document.getElementById(id).classList.remove('active'); }

async function simpanSiswa() {
    const no = parseInt(document.getElementById('inputNoAbsen').value); 
    const nis = document.getElementById('inputNIS').value.trim(); 
    const nama = document.getElementById('inputNamaLengkap').value.trim().toUpperCase(); 
    const jk = document.getElementById('inputJK').value; 
    const jabatan = document.getElementById('inputJabatan').value; 
    const tglLahir = document.getElementById('inputTglLahir').value; 
    const oldNo = document.getElementById('editOldNoAbsen').value;
    
    if (!no || !nama || !jk) return showToast("Error", "Isi nomor, nama, dan gender!", "error"); let siswa = getSiswa(); if (siswa.find(s => s.no === no) && (!oldNo || parseInt(oldNo) !== no)) return showToast("Error", "No Absen duplikat!", "error");
    
    const btnSimpan = document.querySelector('#modalSiswa .btn-primary'); btnSimpan.innerText = "Mengunggah..."; btnSimpan.disabled = true; let finalLinkFoto = "";
    if (tempBase64Foto !== "") { showToast("Proses", "Upload foto ke Drive...", "success"); finalLinkFoto = await uploadFotoKeDrive(tempBase64Foto, "FotoProfil_" + nama, "Foto_Profil_Siswa"); if(finalLinkFoto === "") showToast("Peringatan", "Upload foto gagal.", "error"); } else if (oldNo) { const sLama = siswa.find(s => s.no === parseInt(oldNo)); if (sLama && sLama.foto) finalLinkFoto = sLama.foto; }

    if (oldNo) { const idx = siswa.findIndex(s => s.no === parseInt(oldNo)); if(idx !== -1) siswa[idx] = { no, nis, nama, jk, jabatan, tglLahir, foto: finalLinkFoto }; } else { siswa.push({ no, nis, nama, jk, jabatan, tglLahir, foto: finalLinkFoto }); }
    simpanKeCloud(KUNCI_SISWA, siswa); btnSimpan.innerText = "Simpan"; btnSimpan.disabled = false; tutupModal('modalSiswa'); renderDataSiswa(); showToast("Berhasil", "Data siswa disimpan.", "success");
}
function editSiswa(noLama) { const s = getSiswa().find(x => x.no === noLama); if (!s) return; document.getElementById('modalSiswaTitle').innerText = "Edit Siswa"; document.getElementById('editOldNoAbsen').value = s.no; document.getElementById('inputNoAbsen').value = s.no; document.getElementById('inputNIS').value = s.nis || ""; document.getElementById('inputNamaLengkap').value = s.nama; document.getElementById('inputJK').value = s.jk; document.getElementById('inputJabatan').value = s.jabatan || "Siswa"; document.getElementById('inputTglLahir').value = s.tglLahir || ""; document.getElementById('inputFoto').value = ""; tempBase64Foto = ""; const preview = document.getElementById('previewFoto'); if(s.foto) { preview.src = s.foto; preview.classList.remove('hide'); } else { preview.classList.add('hide'); } document.getElementById('modalSiswa').classList.add('active'); }
function hapusSiswa(no) { if (confirm("Hapus siswa ini?")) { let siswa = getSiswa().filter(s => s.no !== no); simpanKeCloud(KUNCI_SISWA, siswa); renderDataSiswa(); showToast("Berhasil", "Terhapus."); } }

function lihatDetailSiswa(no) {
    const s = getSiswa().find(x => x.no === no); if(!s) return; let totalHadir = 0; const db = getAbsensi(); 
    for (let tgl in db) { let historySiswa = db[tgl].filter(x => x.no === s.no); if(historySiswa.length > 0) { let lastStatus = historySiswa[historySiswa.length - 1].status; if(lastStatus === "Hadir") totalHadir++; } }
    document.getElementById('detailNama').innerText = s.nama; document.getElementById('detailNIS').innerText = s.nis || "-"; document.getElementById('detailTglLahir').innerText = s.tglLahir ? new Date(s.tglLahir).toLocaleDateString('id-ID') : "-"; document.getElementById('detailNo').innerText = s.no; document.getElementById('detailTotalHadir').innerText = totalHadir + " Hari"; const bg = document.getElementById('detailGenderBadge'); bg.innerText = s.jk === 'L' ? 'Laki-laki' : 'Perempuan'; bg.className = s.jk === 'L' ? 'badge badge-izin' : 'badge badge-sakit'; document.getElementById('detailJabatanBadge').innerText = s.jabatan || "Siswa"; document.getElementById('detailFoto').src = s.foto && s.foto.startsWith("http") ? s.foto : `https://ui-avatars.com/api/?name=${encodeURIComponent(s.nama)}&background=F4F4F2&color=375A4E&size=300`; document.getElementById('modalDetailSiswa').classList.add('active');
}
function bukaZoomFoto() { document.getElementById('zoomImage').src = document.getElementById('detailFoto').src; document.getElementById('modalZoom').classList.add('active'); }

let tempBuktiAbsen = {}; 
function prosesBuktiAbsen(event, noSiswa) {
    const file = event.target.files[0]; if(!file) return; const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image(); img.onload = function() {
            const canvas = document.createElement('canvas'); const scaleSize = 600 / img.width; canvas.width = 600; canvas.height = img.height * scaleSize; canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            tempBuktiAbsen[noSiswa] = canvas.toDataURL('image/jpeg', 0.7); const btn = document.getElementById(`btnBukti_${noSiswa}`); btn.innerText = "✓ File Siap"; btn.classList.add("btn-info-outline"); btn.classList.remove("btn-outline");
        }; img.src = e.target.result;
    }; reader.readAsDataURL(file);
}

function toggleBuktiForm(noSiswa, statusTerpilih) { const btnLabel = document.getElementById(`btnBukti_${noSiswa}`); if (!btnLabel) return; if (['Sakit', 'Izin', 'Dispensasi'].includes(statusTerpilih)) { btnLabel.classList.remove('hide'); } else { btnLabel.classList.add('hide'); } }

function renderFormAbsensi() {
    const siswa = getSiswa().sort((a,b) => a.no - b.no); const tgl = document.getElementById('tanggalAbsen').value; const tbody = document.getElementById('tabelAbsensiBody'); tbody.innerHTML = ""; if (!tgl || siswa.length === 0) return;
    const dataHariIni = getAbsensi()[tgl] || []; let latestStatus = {}; dataHariIni.forEach(ab => { latestStatus[ab.no] = ab; });

    siswa.forEach(s => {
        const abData = latestStatus[s.no] || {}; const status = abData.status || 'Hadir'; const ket = abData.ket || '';
        const labelBukti = abData.bukti ? "Ganti File" : "Upload Bukti"; const warnaBtn = abData.bukti ? "btn-info-outline" : "btn-outline"; const displayBtn = ['Sakit', 'Izin', 'Dispensasi'].includes(status) ? '' : 'hide';

        tbody.innerHTML += `<tr data-no="${s.no}" data-nama="${s.nama}"><td>${s.no}</td><td><div class="siswa-cell">${renderAvatar(s.nama, s.foto)}${s.nama}</div></td><td><select class="input-control status-select" onchange="toggleBuktiForm(${s.no}, this.value)"><option value="Hadir" ${status==='Hadir'?'selected':''}>Hadir</option><option value="Dispensasi" ${status==='Dispensasi'?'selected':''}>Dispensasi</option><option value="Izin" ${status==='Izin'?'selected':''}>Izin</option><option value="Sakit" ${status==='Sakit'?'selected':''}>Sakit</option><option value="Alpa" ${status==='Alpa'?'selected':''}>Alpa</option></select></td><td><div style="display:flex; gap:10px; align-items:center;"><input type="text" class="input-control ket-input" value="${ket}" placeholder="Alasan..." style="width: 100%;"><label class="btn btn-sm ${warnaBtn} ${displayBtn}" id="btnBukti_${s.no}" style="cursor:pointer; font-size:12px; margin:0; white-space:nowrap;"><input type="file" accept="image/*" class="hide" onchange="prosesBuktiAbsen(event, ${s.no})">${labelBukti}</label></div></td></tr>`;
    });
}

async function simpanAbsensi() {
    const tgl = document.getElementById('tanggalAbsen').value; if (!tgl) return showToast("Gagal", "Pilih tanggal absen", "error");
    const btnSimpan = document.querySelector('#absensi .btn-primary'); btnSimpan.innerText = "Mengunggah & Menyimpan..."; btnSimpan.disabled = true;

    const jamSekarang = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const absensiDb = getAbsensi(); let existingData = absensiDb[tgl] || []; let adaPerubahan = false;
    const barisTabel = document.querySelectorAll('#tabelAbsensiBody tr');
    
    for (let r of barisTabel) {
        const no = parseInt(r.dataset.no); const nama = r.dataset.nama; const newStatus = r.querySelector('.status-select').value; const newKet = r.querySelector('.ket-input').value.trim();
        const historySiswa = existingData.filter(x => x.no === no); const latestData = historySiswa.length > 0 ? historySiswa[historySiswa.length - 1] : null;
        let finalBukti = latestData ? (latestData.bukti || "") : ""; const butuhBukti = ['Sakit', 'Izin', 'Dispensasi'].includes(newStatus);

        if (!butuhBukti) { finalBukti = ""; if (tempBuktiAbsen[no]) delete tempBuktiAbsen[no]; } else {
            if (tempBuktiAbsen[no]) { showToast("Proses", `Mengunggah surat ${nama}...`, "success"); const linkDrive = await uploadFotoKeDrive(tempBuktiAbsen[no], "Surat_" + nama, "Bukti_Surat_Izin_Sakit"); if (linkDrive !== "") finalBukti = linkDrive; }
        }

        if (!latestData || latestData.status !== newStatus || latestData.ket !== newKet || latestData.bukti !== finalBukti) {
            existingData.push({ no: no, nama: nama, status: newStatus, ket: newKet, jam: jamSekarang, bukti: finalBukti }); adaPerubahan = true;
        }
    }

    if (adaPerubahan) { absensiDb[tgl] = existingData; simpanKeCloud(KUNCI_ABSENSI, absensiDb); showToast("Tersimpan", `Absensi diperbarui!`, "success"); } else { showToast("Info", "Tidak ada perubahan data.", "success"); }
    tempBuktiAbsen = {}; btnSimpan.innerText = "Simpan Data"; btnSimpan.disabled = false; renderFormAbsensi(); 
}

window.toggleSubHistory = function(siswaNo, dateKey) {
    const classId = `sub-hist-${siswaNo}-${dateKey}`;
    const rows = document.querySelectorAll(`.${classId}`);
    const btn = document.getElementById(`btn-toggle-${siswaNo}-${dateKey}`);
    
    let isHidden = false;
    rows.forEach(r => {
        if(r.classList.contains('hide')) { r.classList.remove('hide'); isHidden = true; }
        else { r.classList.add('hide'); }
    });
    
    if(isHidden) btn.innerHTML = "Tutup Riwayat ▲"; else btn.innerHTML = "Lihat Perubahan ▼";
};


function renderRiwayat() {
    const db = getAbsensi(); 
    const siswa = getSiswa(); 
    const fTgl = document.getElementById('filterTanggalRiwayat').value; 
    const fStatus = document.getElementById('filterStatusRiwayat').value; 
    const tbody = document.getElementById('tabelRiwayatBody'); 
    tbody.innerHTML = "";
    
    let all = []; 
    for (let tgl in db) { db[tgl].forEach(ab => { all.push({ tanggal: tgl, ...ab }); }); }
    if (fTgl) all = all.filter(d => d.tanggal === fTgl); 
    if (fStatus !== "Semua") all = all.filter(d => d.status === fStatus);
    if (all.length === 0) return tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">Data tidak ditemukan.</div></td></tr>`;
    
    let groupedByDate = {};
    all.forEach(d => {
        if (!groupedByDate[d.tanggal]) groupedByDate[d.tanggal] = [];
        groupedByDate[d.tanggal].push(d);
    });

    let sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));

    sortedDates.forEach(tglString => {
        const tglObj = new Date(tglString);
        const tanggalRapih = `${namaHari[tglObj.getDay()]}, ${tglObj.getDate()} ${namaBulan[tglObj.getMonth()]} ${tglObj.getFullYear()}`;
        
        tbody.innerHTML += `
            <tr class="date-separator-row" style="background-color: #F8FAFC; border-bottom: 2px solid #E2E8F0;">
                <td colspan="5" style="padding: 12px 20px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="height: 10px; width: 10px; border-radius: 50%; background: var(--primary);"></div>
                        <h4 style="margin:0; font-size:1.05rem; color: #0F172A; font-weight:800; letter-spacing: -0.2px;">${tanggalRapih}</h4>
                    </div>
                </td>
            </tr>
        `;

        let muridDiTanggalIni = groupedByDate[tglString];
        
        let groupedByStudent = {};
        muridDiTanggalIni.forEach(m => {
            if(!groupedByStudent[m.no]) groupedByStudent[m.no] = [];
            groupedByStudent[m.no].push(m);
        });

        Object.values(groupedByStudent).forEach(historySiswa => {
            
            historySiswa.sort((a, b) => { 
                let jamA = a.jam || "00:00"; let jamB = b.jam || "00:00"; return jamA.localeCompare(jamB); 
            });

            const indexTerakhir = historySiswa.length - 1;
            const dataTerbaru = historySiswa[indexTerakhir]; 
            
            let sv = siswa.find(x => x.no === dataTerbaru.no); 
            let warnaBadge = dataTerbaru.status.toLowerCase(); 
            if(warnaBadge === "dispensasi") warnaBadge = "izin"; 
            const fileLink = dataTerbaru.bukti ? `<a href="${dataTerbaru.bukti}" target="_blank" class="badge badge-izin" style="text-decoration:none; margin-left: 8px;">Lihat Bukti</a>` : '';
            
            let toggleBtn = "";
            if(historySiswa.length > 1) {
                toggleBtn = `<br><span id="btn-toggle-${dataTerbaru.no}-${tglString}" onclick="toggleSubHistory('${dataTerbaru.no}', '${tglString}')" style="cursor:pointer; color:var(--primary); font-size:0.8rem; font-weight:700; display:inline-block; margin-top:8px;">Lihat Perubahan ▼</span>`;
            }

            tbody.innerHTML += `
                <tr>
                    <td style="color:var(--text-muted); font-weight:600;">${dataTerbaru.tanggal}</td>
                    <td style="font-family: monospace; font-weight:800; color:var(--primary);">${dataTerbaru.jam || '-'}</td>
                    <td><div class="siswa-cell">${renderAvatar(dataTerbaru.nama, sv ? sv.foto : "")} ${dataTerbaru.nama}</div></td>
                    <td><span class="badge badge-${warnaBadge}">${dataTerbaru.status}</span></td>
                    <td>${dataTerbaru.ket || '-'}${fileLink} ${toggleBtn}</td>
                </tr>
            `;

            if(historySiswa.length > 1) {
                for (let i = 0; i < indexTerakhir; i++) {
                    let oldData = historySiswa[i];
                    let wB = oldData.status.toLowerCase(); if(wB === "dispensasi") wB = "izin"; 
                    const oLink = oldData.bukti ? `<a href="${oldData.bukti}" target="_blank" class="badge badge-izin" style="text-decoration:none; margin-left: 8px;">Lihat Bukti</a>` : '';
                    
                    tbody.innerHTML += `
                        <tr class="hide sub-history-row sub-hist-${dataTerbaru.no}-${tglString}" style="background-color: #F8FAFC;">
                            <td></td>
                            <td style="font-family: monospace; font-weight:700; color:var(--text-muted); font-size:0.85rem;">↳ ${oldData.jam || '-'}</td>
                            <td style="color:var(--text-muted); font-size:0.85rem;">Status Sebelumnya</td>
                            <td><span class="badge badge-${wB}" style="opacity: 0.7;">${oldData.status}</span></td>
                            <td style="color:var(--text-muted); font-size:0.85rem;">${oldData.ket || '-'}${oLink}</td>
                        </tr>
                    `;
                }
            }
        });
    });
}

// LOGIKA REKAP YANG DIPERBARUI (DISPEN = IZIN)
function renderRekap() {
    const siswa = getSiswa().sort((a,b) => a.no - b.no); 
    const db = getAbsensi(); 
    const periode = document.getElementById('filterPeriodeRekap').value; 
    const tbody = document.getElementById('tabelRekapBody'); 
    tbody.innerHTML = "";
    
    // Siapkan object penampung (sudah tidak ada dispen)
    let rekap = {}; 
    siswa.forEach(s => rekap[s.no] = { nama: s.nama, h: 0, i: 0, s: 0, a: 0, foto: s.foto }); 
    const now = new Date();
    
    for (let tgl in db) {
        let t = new Date(tgl);
        if ((periode === 'semua') || (periode === 'bulanan' && t.getMonth() === now.getMonth()) || (periode === 'mingguan' && Math.ceil(Math.abs(now - t) / (1000 * 60 * 60 * 24)) <= 7)) {
            let latestStatusHariIni = {}; 
            db[tgl].forEach(ab => { latestStatusHariIni[ab.no] = ab; });
            
            Object.values(latestStatusHariIni).forEach(ab => { 
                if(rekap[ab.no]) { 
                    if(ab.status === 'Hadir') rekap[ab.no].h++; 
                    // Dispensasi digabung ke hitungan Izin
                    else if(ab.status === 'Dispensasi' || ab.status === 'Izin') rekap[ab.no].i++; 
                    else if(ab.status === 'Sakit') rekap[ab.no].s++; 
                    else if(ab.status === 'Alpa') rekap[ab.no].a++; 
                } 
            });
        }
    }
    
    siswa.forEach(s => { 
        const r = rekap[s.no]; 
        tbody.innerHTML += `<tr><td class="text-left"><div class="siswa-cell">${renderAvatar(r.nama, r.foto)}${r.nama}</div></td><td>${r.h}</td><td>${r.i}</td><td>${r.s}</td><td>${r.a}</td></tr>`; 
    });
}

// ========================================
// JADWAL PIKET & KALENDER
// ========================================
function renderJadwalPiket() {
    const piket = getPiket(); const siswa = getSiswa(); const container = document.getElementById('piketGridContainer'); container.innerHTML = "";
    for(let i = 1; i <= 5; i++) {
        const idTerpilih = piket[i] || [];
        let listSiswa = idTerpilih.length === 0 ? "<div class='empty-state'>Tidak ada piket</div>" : idTerpilih.map(no => { const s = siswa.find(x => x.no === no); return s ? `<div class="piket-item mb-2">${renderAvatar(s.nama, s.foto)}<span class="piket-name">${s.nama}</span></div>` : ''; }).join('');
        container.innerHTML += `<div class="piket-card"><div class="piket-card-header"><h3>${namaHari[i]}</h3><button class="btn btn-outline btn-sm admin-only" onclick="bukaModalPiket(${i})">Atur</button></div><div class="piket-card-body">${listSiswa}</div></div>`;
    }
}
function bukaModalPiket(hariInt) { document.getElementById('modalPiketTitle').innerText = "Piket " + namaHari[hariInt]; document.getElementById('editHariPiket').value = hariInt; const terpilih = getPiket()[hariInt] || []; const container = document.getElementById('listCheckboxSiswa'); container.innerHTML = ""; getSiswa().sort((a,b) => a.no - b.no).forEach(s => { container.innerHTML += `<label class="checkbox-item"><input type="checkbox" class="cb-piket" value="${s.no}" ${terpilih.includes(s.no) ? 'checked' : ''}> ${s.no} - ${s.nama}</label>`; }); document.getElementById('modalPiket').classList.add('active'); }
function simpanJadwalPiket() { const hari = document.getElementById('editHariPiket').value; const arrNo = Array.from(document.querySelectorAll('.cb-piket:checked')).map(cb => parseInt(cb.value)); const piket = getPiket(); piket[hari] = arrNo; simpanKeCloud(KUNCI_PIKET, piket); tutupModal('modalPiket'); renderJadwalPiket(); }

let kalBulan = new Date().getMonth(); let kalTahun = new Date().getFullYear();
function renderKalender() {
    document.getElementById('namaBulanTahun').innerText = `${namaBulan[kalBulan]} ${kalTahun}`;
    const grid = document.getElementById('kalenderGrid'); grid.innerHTML = "";
    const hariPertama = new Date(kalTahun, kalBulan, 1).getDay(); const jmlHari = new Date(kalTahun, kalBulan + 1, 0).getDate();
    const absensiDb = getAbsensi(); const piketDb = getPiket(); const now = new Date();
    for (let i = 0; i < hariPertama; i++) grid.innerHTML += `<div class="cal-day empty"></div>`;
    for (let i = 1; i <= jmlHari; i++) {
        let isToday = (i === now.getDate() && kalBulan === now.getMonth() && kalTahun === now.getFullYear()) ? "today" : "";
        let dateStr = `${kalTahun}-${(kalBulan+1).toString().padStart(2,'0')}-${i.toString().padStart(2,'0')}`; let dayOfWeek = new Date(kalTahun, kalBulan, i).getDay(); let indicators = "";
        if (absensiDb[dateStr]) indicators += `<span class="dot dot-absen"></span>`;
        if (piketDb[dayOfWeek] && piketDb[dayOfWeek].length > 0 && dayOfWeek !== 0 && dayOfWeek !== 6) indicators += `<span class="dot dot-piket"></span>`;
        grid.innerHTML += `<div class="cal-day ${isToday}"><div class="cal-date">${i}</div><div class="indicator-area">${indicators}</div></div>`;
    }
}
function ubahBulan(step) { kalBulan += step; if(kalBulan < 0){kalBulan=11;kalTahun--;} else if(kalBulan > 11){kalBulan=0;kalTahun++;} renderKalender(); }

function renderFormPengaturan() {
    const config = getPengaturan();
    document.getElementById('setSekolah').value = config.sekolah || ""; document.getElementById('setKelas').value = config.kelas || ""; 
    document.getElementById('setWali').value = config.wali || ""; document.getElementById('setFotoSekolah').value = config.fotoSekolah || "";
    document.getElementById('setFotoWali').value = config.fotoWali || "";
}
function simpanPengaturan() {
    simpanKeCloud(KUNCI_PENGATURAN, { 
        sekolah: document.getElementById('setSekolah').value, kelas: document.getElementById('setKelas').value, 
        wali: document.getElementById('setWali').value, fotoSekolah: document.getElementById('setFotoSekolah').value, fotoWali: document.getElementById('setFotoWali').value
    });
    showToast("Berhasil", "Pengaturan disimpan."); renderDashboard();
}

window.onload = () => { syncDataFromCloud(); };