// ========================================
// DATA & LOCAL STORAGE
// ========================================
const KUNCI_SISWA = "dataSiswa";
const KUNCI_ABSENSI = "dataAbsensi";
const KUNCI_PIKET = "dataPiket";
const KUNCI_PENGATURAN = "dataPengaturan";

const namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function initData() {
    if (!localStorage.getItem(KUNCI_PENGATURAN)) {
        localStorage.setItem(KUNCI_PENGATURAN, JSON.stringify({ sekolah: "SMK Bisa Hebat", kelas: "XI PPLG 1", wali: "Budi Santoso, S.Kom" }));
    }
    if (!localStorage.getItem(KUNCI_SISWA)) {
        const demoSiswa = [
            { no: 1, nama: "Zidan", jk: "L" }, { no: 2, nama: "Rafi", jk: "L" },
            { no: 3, nama: "Reza", jk: "L" }, { no: 4, nama: "Hany", jk: "P" },
            { no: 5, nama: "Raihan", jk: "L" }, { no: 6, nama: "Edo", jk: "L" },
            { no: 7, nama: "Nazwa", jk: "P" }, { no: 8, nama: "Citra", jk: "P" }
        ];
        localStorage.setItem(KUNCI_SISWA, JSON.stringify(demoSiswa));
    }
    if (!localStorage.getItem(KUNCI_PIKET)) {
        localStorage.setItem(KUNCI_PIKET, JSON.stringify({ 1: [1,2], 2: [3,4], 3: [5,6], 4: [7,8], 5: [], 6: [] }));
    }
    if (!localStorage.getItem(KUNCI_ABSENSI)) {
        localStorage.setItem(KUNCI_ABSENSI, JSON.stringify({}));
    }
}

function getSiswa() { return JSON.parse(localStorage.getItem(KUNCI_SISWA)) || []; }
function getAbsensi() { return JSON.parse(localStorage.getItem(KUNCI_ABSENSI)) || {}; }
function getPiket() { return JSON.parse(localStorage.getItem(KUNCI_PIKET)) || {}; }
function getPengaturan() { return JSON.parse(localStorage.getItem(KUNCI_PENGATURAN)) || {}; }

initData();

// ========================================
// UI UTILITIES (TOAST & AVATAR)
// ========================================
function getInitials(name) {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function showToast(title, message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' 
        ? `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/></svg>`
        : `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`;

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
    `;
    
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('hide'); setTimeout(() => toast.remove(), 400); }, 3000);
}

// ========================================
// NAVIGASI
// ========================================
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.page-section');
const sidebar = document.getElementById('sidebar');

document.getElementById('mobileToggle').addEventListener('click', () => sidebar.classList.toggle('open'));

navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        navLinks.forEach(n => n.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        
        this.classList.add('active');
        const targetId = this.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
        if(window.innerWidth <= 768) sidebar.classList.remove('open');
        
        jalankanFungsiHalaman(targetId);
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
    const config = getPengaturan();
    const siswa = getSiswa();
    const absensi = getAbsensi();
    const piket = getPiket();
    const tgl = new Date();
    const tglStrYMD = tgl.toISOString().split('T')[0];
    
    document.getElementById('dashKelas').innerText = config.kelas;
    document.getElementById('dashSekolah').innerText = config.sekolah;
    document.getElementById('dashWali').innerText = config.wali;
    document.getElementById('dashTotalSiswa').innerText = siswa.length;
    document.getElementById('dashTanggal').innerText = `${namaHari[tgl.getDay()]}, ${tgl.getDate()} ${namaBulan[tgl.getMonth()]} ${tgl.getFullYear()}`;
    
    let h=0, i=0, s=0, a=0;
    if (absensi[tglStrYMD]) {
        absensi[tglStrYMD].forEach(ab => {
            if(ab.status === 'Hadir') h++; else if(ab.status === 'Izin') i++;
            else if(ab.status === 'Sakit') s++; else if(ab.status === 'Alpa') a++;
        });
    }
    document.getElementById('dashHadir').innerText = h;
    document.getElementById('dashIzin').innerText = i;
    document.getElementById('dashSakit').innerText = s;
    document.getElementById('dashAlpa').innerText = a;

    const hariIniInt = tgl.getDay();
    const containerPiket = document.getElementById('dashPiketList');
    containerPiket.innerHTML = "";
    
    if (hariIniInt === 0) {
        containerPiket.innerHTML = "<p class='empty-state'>Hari Minggu libur.</p>";
    } else {
        const idSiswaPiket = piket[hariIniInt] || [];
        if (idSiswaPiket.length === 0) {
            containerPiket.innerHTML = "<p class='empty-state'>Belum ada jadwal hari ini.</p>";
        } else {
            idSiswaPiket.forEach(no => {
                const sv = siswa.find(x => x.no === no);
                if (sv) {
                    containerPiket.innerHTML += `
                        <div class="piket-item-modern">
                            <div class="avatar">${getInitials(sv.nama)}</div>
                            <div><div class="piket-name">${sv.nama}</div><div class="piket-no">No. Absen: ${sv.no}</div></div>
                        </div>`;
                }
            });
        }
    }
}

// ========================================
// DATA SISWA
// ========================================
function renderDataSiswa() {
    const siswa = getSiswa();
    const cari = document.getElementById('cariSiswa').value.toLowerCase();
    const tbody = document.getElementById('tabelSiswaBody');
    tbody.innerHTML = "";
    
    let filtered = siswa.filter(s => s.nama.toLowerCase().includes(cari) || s.no.toString().includes(cari)).sort((a,b) => a.no - b.no);
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Data tidak ditemukan.</td></tr>`; return;
    }
    
    filtered.forEach(s => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${s.no}</strong></td>
                <td>
                    <div class="siswa-cell">
                        <div class="avatar">${getInitials(s.nama)}</div>
                        <span>${s.nama}</span>
                    </div>
                </td>
                <td>${s.jk === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                <td class="text-right">
                    <button class="btn btn-outline btn-sm" onclick="editSiswa(${s.no})">Edit</button>
                    <button class="btn btn-danger-outline btn-sm" onclick="hapusSiswa(${s.no})">Hapus</button>
                </td>
            </tr>`;
    });
}

function bukaModalSiswa() {
    document.getElementById('modalSiswaTitle').innerText = "Tambah Siswa Baru";
    document.getElementById('editOldNoAbsen').value = "";
    document.getElementById('inputNoAbsen').value = "";
    document.getElementById('inputNamaLengkap').value = "";
    document.getElementById('inputJK').value = "";
    document.getElementById('modalSiswa').classList.add('active');
}

function tutupModal(id) { document.getElementById(id).classList.remove('active'); }

function simpanSiswa() {
    const no = parseInt(document.getElementById('inputNoAbsen').value);
    const nama = document.getElementById('inputNamaLengkap').value.trim();
    const jk = document.getElementById('inputJK').value;
    const oldNo = document.getElementById('editOldNoAbsen').value;
    
    if (!no || !nama || !jk) return showToast("Gagal", "Harap isi semua kolom!", "error");
    
    let siswa = getSiswa();
    if (siswa.find(s => s.no === no) && (!oldNo || parseInt(oldNo) !== no)) {
        return showToast("Gagal", "Nomor absen sudah dipakai!", "error");
    }
    
    if (oldNo) {
        const idx = siswa.findIndex(s => s.no === parseInt(oldNo));
        if(idx !== -1) siswa[idx] = { no, nama, jk };
    } else {
        siswa.push({ no, nama, jk });
    }
    
    localStorage.setItem(KUNCI_SISWA, JSON.stringify(siswa));
    tutupModal('modalSiswa'); renderDataSiswa();
    showToast("Berhasil", oldNo ? "Data diperbarui." : "Siswa ditambahkan.");
}

function editSiswa(noLama) {
    const siswa = getSiswa().find(s => s.no === noLama);
    if (!siswa) return;
    document.getElementById('modalSiswaTitle').innerText = "Edit Data Siswa";
    document.getElementById('editOldNoAbsen').value = siswa.no;
    document.getElementById('inputNoAbsen').value = siswa.no;
    document.getElementById('inputNamaLengkap').value = siswa.nama;
    document.getElementById('inputJK').value = siswa.jk;
    document.getElementById('modalSiswa').classList.add('active');
}

function hapusSiswa(no) {
    if (confirm("Hapus data siswa ini?")) {
        let siswa = getSiswa().filter(s => s.no !== no);
        localStorage.setItem(KUNCI_SISWA, JSON.stringify(siswa));
        renderDataSiswa(); showToast("Berhasil", "Data dihapus.");
    }
}

// ========================================
// ABSENSI
// ========================================
function renderFormAbsensi() {
    const siswa = getSiswa().sort((a,b) => a.no - b.no);
    const tgl = document.getElementById('tanggalAbsen').value;
    const tbody = document.getElementById('tabelAbsensiBody');
    tbody.innerHTML = "";
    
    if (!tgl) return;
    if (siswa.length === 0) return tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Belum ada siswa.</td></tr>`;
    
    const dataHariIni = getAbsensi()[tgl] || [];
    
    siswa.forEach(s => {
        const ab = dataHariIni.find(x => x.no === s.no);
        const status = ab ? ab.status : 'Hadir';
        tbody.innerHTML += `
            <tr data-no="${s.no}" data-nama="${s.nama}">
                <td><strong>${s.no}</strong></td>
                <td><div class="siswa-cell"><div class="avatar">${getInitials(s.nama)}</div>${s.nama}</div></td>
                <td>
                    <select class="input-control status-select">
                        <option value="Hadir" ${status==='Hadir'?'selected':''}>Hadir</option>
                        <option value="Izin" ${status==='Izin'?'selected':''}>Izin</option>
                        <option value="Sakit" ${status==='Sakit'?'selected':''}>Sakit</option>
                        <option value="Alpa" ${status==='Alpa'?'selected':''}>Alpa</option>
                    </select>
                </td>
                <td><input type="text" class="input-control ket-input" value="${ab ? ab.ket : ''}" placeholder="-"></td>
            </tr>`;
    });
}

function simpanAbsensi() {
    const tgl = document.getElementById('tanggalAbsen').value;
    if (!tgl) return showToast("Gagal", "Pilih tanggal absen!", "error");
    
    const rows = document.querySelectorAll('#tabelAbsensiBody tr');
    if (rows.length === 0 || rows[0].innerText.includes("Belum ada")) return;

    let dataSimpan = [];
    rows.forEach(r => {
        dataSimpan.push({ 
            no: parseInt(r.dataset.no), 
            nama: r.dataset.nama, 
            status: r.querySelector('.status-select').value, 
            ket: r.querySelector('.ket-input').value.trim() 
        });
    });
    
    const absensiDb = getAbsensi();
    absensiDb[tgl] = dataSimpan;
    localStorage.setItem(KUNCI_ABSENSI, JSON.stringify(absensiDb));
    showToast("Tersimpan", "Absensi hari ini berhasil dicatat.");
}

// ========================================
// RIWAYAT & REKAP ABSENSI
// ========================================
function renderRiwayat() {
    const db = getAbsensi();
    const fTgl = document.getElementById('filterTanggalRiwayat').value;
    const fNama = document.getElementById('filterNamaRiwayat').value.toLowerCase();
    const fStatus = document.getElementById('filterStatusRiwayat').value;
    const tbody = document.getElementById('tabelRiwayatBody');
    tbody.innerHTML = "";
    
    let all = [];
    for (let t in db) db[t].forEach(ab => all.push({ tanggal: t, ...ab }));
    all.sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal));
    
    if (fTgl) all = all.filter(d => d.tanggal === fTgl);
    if (fNama) all = all.filter(d => d.nama.toLowerCase().includes(fNama));
    if (fStatus !== "Semua") all = all.filter(d => d.status === fStatus);
    
    if (all.length === 0) return tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Data tidak ditemukan.</td></tr>`;
    
    all.forEach(d => {
        tbody.innerHTML += `
            <tr>
                <td>${d.tanggal}</td>
                <td><div class="siswa-cell"><div class="avatar">${getInitials(d.nama)}</div>${d.nama}</div></td>
                <td><span class="badge badge-${d.status.toLowerCase()}">${d.status}</span></td>
                <td>${d.ket || '-'}</td>
            </tr>`;
    });
}

function renderRekap() {
    const siswa = getSiswa().sort((a,b) => a.no - b.no);
    const db = getAbsensi();
    const periode = document.getElementById('filterPeriodeRekap').value;
    const tbody = document.getElementById('tabelRekapBody');
    tbody.innerHTML = "";
    
    let rekap = {};
    siswa.forEach(s => rekap[s.no] = { nama: s.nama, h: 0, i: 0, s: 0, a: 0 });
    
    const now = new Date();
    for (let tgl in db) {
        let t = new Date(tgl);
        let hitung = (periode === 'semua') || 
                     (periode === 'bulanan' && t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear()) ||
                     (periode === 'mingguan' && Math.ceil(Math.abs(now - t) / (1000 * 60 * 60 * 24)) <= 7);
        if (hitung) {
            db[tgl].forEach(ab => {
                if(rekap[ab.no]) {
                    if(ab.status === 'Hadir') rekap[ab.no].h++; else if(ab.status === 'Izin') rekap[ab.no].i++;
                    else if(ab.status === 'Sakit') rekap[ab.no].s++; else if(ab.status === 'Alpa') rekap[ab.no].a++;
                }
            });
        }
    }
    
    siswa.forEach(s => {
        const r = rekap[s.no];
        tbody.innerHTML += `
            <tr>
                <td class="text-left"><div class="siswa-cell"><div class="avatar">${getInitials(r.nama)}</div>${r.nama}</div></td>
                <td><strong>${r.h}</strong></td><td><strong>${r.i}</strong></td>
                <td><strong>${r.s}</strong></td><td><strong>${r.a}</strong></td>
            </tr>`;
    });
}

// ========================================
// JADWAL PIKET
// ========================================
function renderJadwalPiket() {
    const piket = getPiket();
    const siswa = getSiswa();
    const container = document.getElementById('piketGridContainer');
    container.innerHTML = "";
    
    for(let i = 1; i <= 6; i++) {
        const idTerpilih = piket[i] || [];
        let listSiswa = idTerpilih.length === 0 ? "<div class='empty-state'>Libur / Kosong</div>" : 
            idTerpilih.map(no => {
                const s = siswa.find(x => x.no === no);
                return s ? `<div class="piket-item-modern mb-2"><div class="avatar">${getInitials(s.nama)}</div><span class="piket-name">${s.nama}</span></div>` : '';
            }).join('');
        
        container.innerHTML += `
            <div class="piket-card">
                <div class="piket-card-header">
                    <h3>${namaHari[i]}</h3>
                    <button class="btn btn-outline btn-sm" onclick="bukaModalPiket(${i})">Atur</button>
                </div>
                <div class="piket-card-body">${listSiswa}</div>
            </div>`;
    }
}

function bukaModalPiket(hariInt) {
    document.getElementById('modalPiketTitle').innerText = "Piket Hari " + namaHari[hariInt];
    document.getElementById('editHariPiket').value = hariInt;
    const terpilih = getPiket()[hariInt] || [];
    const container = document.getElementById('listCheckboxSiswa');
    container.innerHTML = "";
    
    getSiswa().sort((a,b) => a.no - b.no).forEach(s => {
        container.innerHTML += `
            <label class="checkbox-item">
                <input type="checkbox" class="cb-piket" value="${s.no}" ${terpilih.includes(s.no) ? 'checked' : ''}> 
                ${s.no} - ${s.nama}
            </label>`;
    });
    document.getElementById('modalPiket').classList.add('active');
}

function simpanJadwalPiket() {
    const hari = document.getElementById('editHariPiket').value;
    const arrNo = Array.from(document.querySelectorAll('.cb-piket:checked')).map(cb => parseInt(cb.value));
    const piket = getPiket();
    piket[hari] = arrNo;
    localStorage.setItem(KUNCI_PIKET, JSON.stringify(piket));
    tutupModal('modalPiket'); renderJadwalPiket();
    showToast("Tersimpan", "Jadwal piket diperbarui.");
}

// ========================================
// KALENDER
// ========================================
let kalBulan = new Date().getMonth(); let kalTahun = new Date().getFullYear();

function renderKalender() {
    document.getElementById('namaBulanTahun').innerText = `${namaBulan[kalBulan]} ${kalTahun}`;
    const grid = document.getElementById('kalenderGrid'); grid.innerHTML = "";
    
    const hariPertama = new Date(kalTahun, kalBulan, 1).getDay();
    const jmlHari = new Date(kalTahun, kalBulan + 1, 0).getDate();
    const absensiDb = getAbsensi(); const piketDb = getPiket();
    const now = new Date();
    
    for (let i = 0; i < hariPertama; i++) grid.innerHTML += `<div class="cal-day empty"></div>`;
    
    for (let i = 1; i <= jmlHari; i++) {
        let isToday = (i === now.getDate() && kalBulan === now.getMonth() && kalTahun === now.getFullYear()) ? "today" : "";
        let dateStr = `${kalTahun}-${(kalBulan+1).toString().padStart(2,'0')}-${i.toString().padStart(2,'0')}`;
        let dayOfWeek = new Date(kalTahun, kalBulan, i).getDay();
        
        let indicators = "";
        if (absensiDb[dateStr]) indicators += `<span class="dot dot-absen"></span>`;
        if (piketDb[dayOfWeek] && piketDb[dayOfWeek].length > 0 && dayOfWeek !== 0) indicators += `<span class="dot dot-piket"></span>`;
        
        grid.innerHTML += `<div class="cal-day ${isToday}"><div class="cal-date">${i}</div><div class="indicator-area">${indicators}</div></div>`;
    }
}
function ubahBulan(step) {
    kalBulan += step; if(kalBulan < 0){kalBulan=11;kalTahun--;} else if(kalBulan > 11){kalBulan=0;kalTahun++;}
    renderKalender();
}

// ========================================
// PENGATURAN & INIT
// ========================================
function renderFormPengaturan() {
    const config = getPengaturan();
    document.getElementById('setSekolah').value = config.sekolah;
    document.getElementById('setKelas').value = config.kelas;
    document.getElementById('setWali').value = config.wali;
}

function simpanPengaturan() {
    localStorage.setItem(KUNCI_PENGATURAN, JSON.stringify({
        sekolah: document.getElementById('setSekolah').value,
        kelas: document.getElementById('setKelas').value,
        wali: document.getElementById('setWali').value
    }));
    showToast("Berhasil", "Pengaturan disimpan.");
    renderDashboard();
}

window.onload = renderDashboard;