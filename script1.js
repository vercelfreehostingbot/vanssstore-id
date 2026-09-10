/* ============ KONFIGURASI ============ */
const ADMIN_PASSWORD = "oniyyimut";
const WA_NUMBER = "6285333938526";
const ITEMS_PER_PAGE = 6;

let isAdmin = false;
let currentPage = 1;
let filteredProducts = [];
let currentKategori = 'semua';
let productToBuy = null;
let appliedPromo = null;
let selectedRating = 5;
let confirmCallback = null;

/* ============ DATA STORAGE ============ */
let products = JSON.parse(localStorage.getItem('vanss_products')) || [];
let promos = JSON.parse(localStorage.getItem('vanss_promos')) || [];
let testimonials = JSON.parse(localStorage.getItem('vanss_testimonials')) || [];

function saveProducts() { localStorage.setItem('vanss_products', JSON.stringify(products)); }
function savePromos() { localStorage.setItem('vanss_promos', JSON.stringify(promos)); }
function saveTestimonials() { localStorage.setItem('vanss_testimonials', JSON.stringify(testimonials)); }

/* ============ UTILITY ============ */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type;
    void toast.offsetWidth;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

function showConfirm(title, message, callback) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = callback;
    document.getElementById('confirmModal').classList.add('open');
}

function formatRupiah(num) { return 'Rp ' + Number(num).toLocaleString('id-ID'); }

function isNew(tanggal) {
    if (!tanggal) return false;
    const diff = (Date.now() - new Date(tanggal).getTime()) / (1000 * 60 * 60 * 24);
    return diff < 3;
}

function formatTanggal(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' });
}

function formatTanggalPanjang(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID', { 
        weekday:'long', day:'numeric', month:'long', year:'numeric' 
    });
}

function hitungHariTersisa(expired) {
    if (!expired) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const exp = new Date(expired);
    exp.setHours(23,59,59,999);
    const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    return diff;
}

function isPromoExpired(promo) {
    if (!promo.expired) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const exp = new Date(promo.expired);
    exp.setHours(23,59,59,999);
    return today > exp;
}

function updateStats() {
    document.getElementById('statTotal').textContent = products.length;
    document.getElementById('statTestimoni').textContent = testimonials.length;
    document.getElementById('testiCount').textContent = testimonials.length;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* ============ NAVIGASI HALAMAN ============ */
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const page = this.dataset.page;
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        if (page === 'jualan') {
            document.getElementById('pageJualan').classList.add('active');
        } else {
            document.getElementById('pageCurhatan').classList.add('active');
        }
        window.scrollTo({ top:0, behavior:'smooth' });
    });
});

/* ============ RENDER PRODUK ============ */
function renderProducts() {
    const grid = document.getElementById('produkGrid');
    const adminStatus = document.getElementById('adminStatus');
    const tambahBtn = document.getElementById('btnTambahProduk');
    const promoBtn = document.getElementById('btnKelolaPromo');
    const searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();

    let temp = products.filter(p => {
        if (currentKategori !== 'semua' && p.kategori !== currentKategori) return false;
        const nameMatch = p.nama.toLowerCase().includes(searchQuery);
        const priceMatch = p.harga.toString().includes(searchQuery);
        return nameMatch || priceMatch;
    });

    temp.sort((a, b) => new Date(b.tanggal || 0) - new Date(a.tanggal || 0));
    filteredProducts = temp;

    if (isAdmin) {
        adminStatus.innerHTML = '<span class="admin-badge"><i class="fas fa-check-circle"></i> Admin</span>';
        tambahBtn.style.display = 'inline-flex';
        promoBtn.style.display = 'inline-flex';
        document.getElementById('btnAdminMode').innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
        document.getElementById('btnAdminMode').classList.add('active');
    } else {
        adminStatus.innerHTML = '';
        tambahBtn.style.display = 'none';
        promoBtn.style.display = 'none';
        document.getElementById('btnAdminMode').innerHTML = '<i class="fas fa-user-shield"></i> Mode Admin';
        document.getElementById('btnAdminMode').classList.remove('active');
    }

    const totalItems = filteredProducts.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = filteredProducts.slice(start, start + ITEMS_PER_PAGE);

    if (totalItems === 0) {
        grid.innerHTML = `
            <div class="empty">
                <i class="fas fa-box-open"></i>
                <h3>${searchQuery ? 'Tidak ada produk sesuai pencarian' : 'Belum ada produk'}</h3>
                <p style="margin-top:8px;">${isAdmin ? 'Klik "Tambah Produk" untuk memulai' : 'Admin belum menambahkan produk'}</p>
            </div>
        `;
    } else {
        grid.innerHTML = pageItems.map((product, idx) => {
            const realIndex = products.indexOf(product);
            const produkBaru = isNew(product.tanggal);
            const badge = produkBaru ? '<span class="badge-new">✨ NEW</span>' : '';
            return `
            <div class="produk-card" style="animation-delay: ${idx * 0.08}s">
                <div class="produk-img-wrapper">
                    ${badge}
                    <img class="produk-img" src="${product.foto || 'https://placehold.co/400x300/1e293b/facc15?text=No+Image'}" alt="${product.nama}">
                </div>
                <div class="produk-info">
                    <div class="produk-nama">${escapeHtml(product.nama)}</div>
                    ${product.deskripsi ? `<div class="produk-deskripsi">${escapeHtml(product.deskripsi)}</div>` : ''}
                    <div class="produk-harga">${Number(product.harga).toLocaleString('id-ID')}</div>
                    <div class="produk-actions">
                        <button class="btn-wa" onclick="confirmBeli(${realIndex})">
                            <i class="fab fa-whatsapp"></i> Beli Sekarang
                        </button>
                        ${isAdmin ? `
                        <button class="btn-edit" onclick="editProduct(${realIndex})" title="Edit"><i class="fas fa-pen"></i></button>
                        <button class="btn-delete" onclick="deleteProduct(${realIndex})" title="Hapus"><i class="fas fa-trash"></i></button>
                        ` : ''}
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    renderPagination(totalPages);
    updateStats();
}

function renderPagination(totalPages) {
    const container = document.getElementById('paginationContainer');
    if (totalPages <= 1) { container.innerHTML = ''; return; }
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    container.innerHTML = html;
    container.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function() {
            currentPage = parseInt(this.dataset.page);
            renderProducts();
            window.scrollTo({ top:0, behavior:'smooth' });
        });
    });
}

/* ============ KONFIRMASI PEMBELIAN ============ */
function confirmBeli(index) {
    const product = products[index];
    if (!product) return;
    productToBuy = index;
    appliedPromo = null;

    document.getElementById('konfirmasiDetail').innerHTML = `
        <p><strong>📦 Nama:</strong> ${escapeHtml(product.nama)}</p>
        <p><strong>🏷️ Kategori:</strong> ${product.kategori === 'ML' ? 'Mobile Legends' : 'Free Fire'}</p>
        <p><strong>💰 Harga:</strong> ${formatRupiah(product.harga)}</p>
        ${product.deskripsi ? `<p><strong>📝 Deskripsi:</strong> ${escapeHtml(product.deskripsi)}</p>` : ''}
    `;

    document.getElementById('inputKodePromo').value = '';
    document.getElementById('promoMessage').className = 'promo-message';
    document.getElementById('promoMessage').textContent = '';
    document.getElementById('hargaRingkasan').classList.remove('show');

    document.getElementById('modalKonfirmasi').classList.add('open');
}

/* ============ PROMO - PAKAI ============ */
document.getElementById('btnPakaiPromo').addEventListener('click', () => {
    if (productToBuy === null) return;
    const kode = document.getElementById('inputKodePromo').value.trim().toUpperCase();
    const msg = document.getElementById('promoMessage');
    const product = products[productToBuy];

    if (!kode) {
        msg.className = 'promo-message error show';
        msg.textContent = '❌ Masukkan kode promo terlebih dahulu!';
        return;
    }

    const promo = promos.find(p => p.kode.toUpperCase() === kode);

    if (!promo) {
        msg.className = 'promo-message error show';
        msg.textContent = '❌ Kode promo tidak ditemukan!';
        appliedPromo = null;
        document.getElementById('hargaRingkasan').classList.remove('show');
        return;
    }

    if (isPromoExpired(promo)) {
        msg.className = 'promo-message error show';
        msg.textContent = '❌ Kode promo sudah kadaluarsa!';
        appliedPromo = null;
        document.getElementById('hargaRingkasan').classList.remove('show');
        return;
    }

    appliedPromo = promo;
    const diskonNominal = Math.round(product.harga * promo.diskon / 100);
    const total = product.harga - diskonNominal;

    msg.className = 'promo-message success show';
    msg.textContent = `✅ Kode "${promo.kode}" berhasil dipakai! Diskon ${promo.diskon}%`;

    document.getElementById('ringkasanHargaAwal').textContent = formatRupiah(product.harga);
    document.getElementById('ringkasanDiskon').textContent = '-' + formatRupiah(diskonNominal);
    document.getElementById('ringkasanTotal').textContent = formatRupiah(total);
    document.getElementById('hargaRingkasan').classList.add('show');
});

document.getElementById('btnKonfirmasiYa').addEventListener('click', () => {
    if (productToBuy === null) return;
    const product = products[productToBuy];
    if (!product) return;

    let hargaAkhir = product.harga;
    let pesanPromo = '';

    if (appliedPromo && !isPromoExpired(appliedPromo)) {
        const diskonNominal = Math.round(product.harga * appliedPromo.diskon / 100);
        hargaAkhir = product.harga - diskonNominal;
        pesanPromo = `\n• Kode Promo: ${appliedPromo.kode} (diskon ${appliedPromo.diskon}%)\n• Harga Awal: ${formatRupiah(product.harga)}\n• Potongan: -${formatRupiah(diskonNominal)}`;
    }

    const message = `Halo kak, saya berminat membeli produk ini:
• Nama: ${product.nama}
• Kategori: ${product.kategori === 'ML' ? 'Mobile Legends' : 'Free Fire'}
• Harga: ${formatRupiah(product.harga)}${pesanPromo}
${product.deskripsi ? `• Deskripsi: ${product.deskripsi}` : ''}

💰 Total Bayar: ${formatRupiah(hargaAkhir)}

Apakah masih tersedia?`;

    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
    document.getElementById('modalKonfirmasi').classList.remove('open');
    productToBuy = null;
    appliedPromo = null;
    showToast('✅ Silakan lanjutkan chat di WhatsApp.', 'success');
});

document.getElementById('btnKonfirmasiBatal').addEventListener('click', () => {
    document.getElementById('modalKonfirmasi').classList.remove('open');
    productToBuy = null;
    appliedPromo = null;
});

/* ============ ADMIN - PRODUK ============ */
document.getElementById('btnTambahProduk').addEventListener('click', () => {
    if (!isAdmin) return;
    document.getElementById('modalTitle').innerText = 'Tambah Produk';
    document.getElementById('inputNama').value = '';
    document.getElementById('inputHarga').value = '';
    document.getElementById('inputKategori').value = 'ML';
    document.getElementById('inputDeskripsi').value = '';
    document.getElementById('inputFoto').value = '';
    document.getElementById('fileText').innerText = 'Pilih foto produk';
    document.getElementById('editIndex').value = '-1';
    document.getElementById('modalProduk').classList.add('open');
});

function editProduct(index) {
    if (!isAdmin) return;
    const product = products[index];
    document.getElementById('modalTitle').innerText = 'Edit Produk';
    document.getElementById('inputNama').value = product.nama;
    document.getElementById('inputHarga').value = product.harga;
    document.getElementById('inputKategori').value = product.kategori;
    document.getElementById('inputDeskripsi').value = product.deskripsi || '';
    document.getElementById('fileText').innerText = product.foto ? 'Foto sudah ada (klik ganti)' : 'Pilih foto produk';
    document.getElementById('editIndex').value = index;
    document.getElementById('modalProduk').classList.add('open');
}

function deleteProduct(index) {
    if (!isAdmin) return;
    showConfirm(
        'Hapus Produk?',
        'Produk ini akan dihapus permanen dari daftar toko.',
        () => {
            products.splice(index, 1);
            saveProducts();
            renderProducts();
            showToast('🗑️ Produk berhasil dihapus!', 'success');
        }
    );
}

document.getElementById('btnSimpan').addEventListener('click', () => {
    if (!isAdmin) return;
    const nama = document.getElementById('inputNama').value.trim();
    const harga = document.getElementById('inputHarga').value.trim();
    const kategori = document.getElementById('inputKategori').value;
    const deskripsi = document.getElementById('inputDeskripsi').value.trim();
    const fileInput = document.getElementById('inputFoto');
    const editIndex = parseInt(document.getElementById('editIndex').value);

    if (!nama || !harga) { showToast('⚠️ Isi nama dan harga!', 'error'); return; }
    if (isNaN(harga) || Number(harga) <= 0) { showToast('⚠️ Harga harus angka positif!', 'error'); return; }

    const saveProduct = (fotoData) => {
        const product = {
            nama, harga: Number(harga), kategori, deskripsi,
            foto: fotoData || '',
            tanggal: new Date().toISOString()
        };
        if (editIndex >= 0) {
            product.tanggal = products[editIndex].tanggal;
            products[editIndex] = product;
            showToast('✅ Produk berhasil diupdate!', 'success');
        } else {
            products.push(product);
            showToast('✅ Produk berhasil ditambahkan!', 'success');
        }
        saveProducts();
        renderProducts();
        document.getElementById('modalProduk').classList.remove('open');
    };

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => saveProduct(e.target.result);
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        if (editIndex >= 0 && products[editIndex].foto) saveProduct(products[editIndex].foto);
        else saveProduct('');
    }
});

document.getElementById('btnBatal').addEventListener('click', () => {
    document.getElementById('modalProduk').classList.remove('open');
});

document.getElementById('inputFoto').addEventListener('change', function() {
    if (this.files && this.files[0]) document.getElementById('fileText').innerText = this.files[0].name;
});

/* ============ ADMIN - PROMO ============ */
document.getElementById('btnKelolaPromo').addEventListener('click', () => {
    if (!isAdmin) return;
    renderPromoList();
    document.getElementById('modalPromo').classList.add('open');
});

function renderPromoList() {
    const list = document.getElementById('promoList');
    if (promos.length === 0) {
        list.innerHTML = `<div class="promo-empty">Belum ada kode promo. Tambahkan di atas.</div>`;
        return;
    }
    list.innerHTML = promos.map((promo, idx) => {
        const expired = isPromoExpired(promo);
        const hariTersisa = hitungHariTersisa(promo.expired);
        
        let statusBadge = '';
        let expiredInfo = '';
        
        if (expired) {
            statusBadge = `<span class="status-badge expired"><i class="fas fa-times-circle"></i> EXPIRED</span>`;
            expiredInfo = `<div class="promo-expired-info">
                <span><i class="fas fa-calendar-times"></i> <b>Berakhir pada:</b> ${promo.expired ? formatTanggalPanjang(promo.expired) : '-'}</span>
            </div>`;
        } else if (promo.expired) {
            if (hariTersisa <= 3) {
                statusBadge = `<span class="status-badge warning"><i class="fas fa-exclamation-triangle"></i> SEGERA HABIS</span>`;
            } else {
                statusBadge = `<span class="status-badge active"><i class="fas fa-check-circle"></i> AKTIF</span>`;
            }
            expiredInfo = `<div class="promo-active-info">
                <span><i class="fas fa-calendar-check"></i> <b>Berakhir pada:</b> ${formatTanggalPanjang(promo.expired)}</span>
                <span class="days-left"><i class="fas fa-hourglass-half"></i> ${hariTersisa} hari lagi</span>
            </div>`;
        } else {
            statusBadge = `<span class="status-badge active"><i class="fas fa-check-circle"></i> AKTIF</span>`;
            expiredInfo = `<div class="promo-active-info">
                <span><i class="fas fa-infinity"></i> <b>Tanpa tanggal kadaluarsa</b> (berlaku selamanya)</span>
            </div>`;
        }
        
        return `
        <div class="promo-item ${expired ? 'expired' : ''}">
            <div class="promo-item-info">
                <div class="promo-item-header">
                    <span class="promo-item-kode">${escapeHtml(promo.kode)}</span>
                    ${statusBadge}
                </div>
                <div class="promo-item-detail">
                    🎁 Diskon <b>${promo.diskon}%</b>
                </div>
                ${expiredInfo}
            </div>
            <div class="promo-item-actions">
                <button class="btn-edit-promo" onclick="editPromo(${idx})" title="Edit"><i class="fas fa-pen"></i></button>
                <button class="btn-del-promo" onclick="deletePromo(${idx})" title="Hapus"><i class="fas fa-trash"></i></button>
            </div>
        </div>
        `;
    }).join('');
}

function editPromo(index) {
    const promo = promos[index];
    document.getElementById('promoKode').value = promo.kode;
    document.getElementById('promoDiskon').value = promo.diskon;
    document.getElementById('promoExpired').value = promo.expired || '';
    document.getElementById('promoEditKode').value = promo.kode;
    showToast('✏️ Mode edit: ubah data lalu klik Simpan', 'info');
}

function deletePromo(index) {
    if (!isAdmin) return;
    showConfirm(
        'Hapus Kode Promo?',
        'Kode promo ini akan dihapus permanen dan tidak bisa dipakai lagi.',
        () => {
            promos.splice(index, 1);
            savePromos();
            renderPromoList();
            showToast('🗑️ Promo berhasil dihapus!', 'success');
        }
    );
}

document.getElementById('btnSimpanPromo').addEventListener('click', () => {
    if (!isAdmin) return;
    const kode = document.getElementById('promoKode').value.trim().toUpperCase();
    const diskon = parseInt(document.getElementById('promoDiskon').value);
    const expired = document.getElementById('promoExpired').value;
    const editKode = document.getElementById('promoEditKode').value;

    if (!kode || !diskon || diskon < 1 || diskon > 100) {
        showToast('⚠️ Isi kode dan diskon (1-100%)!', 'error');
        return;
    }

    const existing = promos.findIndex(p => p.kode.toUpperCase() === kode);
    if (editKode) {
        const idx = promos.findIndex(p => p.kode === editKode);
        if (idx >= 0) {
            if (existing >= 0 && existing !== idx) {
                showToast('⚠️ Kode sudah dipakai!', 'error');
                return;
            }
            promos[idx] = { kode, diskon, expired };
            showToast('✅ Promo diupdate!', 'success');
        }
    } else {
        if (existing >= 0) {
            showToast('⚠️ Kode sudah ada!', 'error');
            return;
        }
        promos.push({ kode, diskon, expired });
        showToast('✅ Promo ditambahkan!', 'success');
    }

    savePromos();
    renderPromoList();
    document.getElementById('promoKode').value = '';
    document.getElementById('promoDiskon').value = '';
    document.getElementById('promoExpired').value = '';
    document.getElementById('promoEditKode').value = '';
});

document.getElementById('btnTutupPromo').addEventListener('click', () => {
    document.getElementById('modalPromo').classList.remove('open');
});

/* ============ TESTIMONI ============ */
document.querySelectorAll('#starsInput i').forEach(star => {
    star.addEventListener('click', function() {
        selectedRating = parseInt(this.dataset.star);
        document.querySelectorAll('#starsInput i').forEach(s => {
            const val = parseInt(s.dataset.star);
            s.classList.toggle('active', val <= selectedRating);
        });
    });
});
document.querySelectorAll('#starsInput i').forEach(s => s.classList.add('active'));

document.getElementById('btnKirimTesti').addEventListener('click', () => {
    const nama = document.getElementById('testiNama').value.trim();
    const komentar = document.getElementById('testiKomentar').value.trim();

    if (!nama) { showToast('⚠️ Isi nama kamu!', 'error'); return; }
    if (!komentar) { showToast('⚠️ Tulis komentar dulu!', 'error'); return; }
    if (nama.length > 30) { showToast('⚠️ Nama maksimal 30 karakter!', 'error'); return; }
    if (komentar.length > 300) { showToast('⚠️ Komentar maksimal 300 karakter!', 'error'); return; }

    testimonials.unshift({
        nama,
        rating: selectedRating,
        komentar,
        tanggal: new Date().toISOString()
    });
    saveTestimonials();
    renderTestimoni();

    document.getElementById('testiNama').value = '';
    document.getElementById('testiKomentar').value = '';
    selectedRating = 5;
    document.querySelectorAll('#starsInput i').forEach(s => s.classList.add('active'));

    showToast('✅ Terima kasih atas ulasanmu!', 'success');
});

function renderTestimoni() {
    const list = document.getElementById('testimoniList');
    if (testimonials.length === 0) {
        list.innerHTML = `
            <div class="empty" style="grid-column:1/-1; padding:30px 20px;">
                <i class="fas fa-comment-dots" style="font-size:2.5rem;"></i>
                <h3 style="font-size:1rem;">Belum ada ulasan</h3>
                <p style="margin-top:6px; font-size:0.85rem;">Jadilah yang pertama memberi ulasan!</p>
            </div>
        `;
        updateStats();
        return;
    }

    list.innerHTML = testimonials.map((t, idx) => {
        const stars = '⭐'.repeat(t.rating);
        const initial = escapeHtml(t.nama.charAt(0).toUpperCase());
        const delBtn = isAdmin ? `<button class="testimoni-del" onclick="hapusTestimoni(${idx})" title="Hapus"><i class="fas fa-times"></i></button>` : '';
        return `
        <div class="testimoni-card" style="animation-delay: ${idx * 0.05}s">
            ${delBtn}
            <div class="testimoni-header">
                <div class="testimoni-avatar">${initial}</div>
                <div>
                    <div class="testimoni-nama">${escapeHtml(t.nama)}</div>
                    <div class="testimoni-stars">${stars}</div>
                </div>
            </div>
            <div class="testimoni-text">${escapeHtml(t.komentar)}</div>
            <div class="testimoni-date">📅 ${formatTanggal(t.tanggal)}</div>
        </div>
        `;
    }).join('');
    updateStats();
}

function hapusTestimoni(index) {
    if (!isAdmin) return;
    showConfirm(
        'Hapus Ulasan?',
        'Ulasan ini akan dihapus permanen dan tidak bisa dikembalikan.',
        () => {
            testimonials.splice(index, 1);
            saveTestimonials();
            renderTestimoni();
            showToast('🗑️ Ulasan berhasil dihapus!', 'success');
        }
    );
}

/* ============ TAB & SEARCH ============ */
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentKategori = this.dataset.kategori;
        currentPage = 1;
        renderProducts();
    });
});

document.getElementById('searchInput').addEventListener('input', () => {
    currentPage = 1;
    renderProducts();
});

/* ============ CONFIRM DIALOG ============ */
document.getElementById('confirmYes').addEventListener('click', () => {
    document.getElementById('confirmModal').classList.remove('open');
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
});

document.getElementById('confirmNo').addEventListener('click', () => {
    document.getElementById('confirmModal').classList.remove('open');
    confirmCallback = null;
});

/* ============ ADMIN LOGIN ============ */
document.getElementById('btnAdminMode').addEventListener('click', () => {
    if (isAdmin) {
        isAdmin = false;
        renderProducts();
        renderTestimoni();
        showToast('🔒 Logout berhasil', 'info');
    } else {
        document.getElementById('passwordOverlay').classList.add('open');
        document.getElementById('inputPassword').value = '';
        document.getElementById('pwError').innerText = '';
        setTimeout(() => document.getElementById('inputPassword').focus(), 100);
    }
});

document.getElementById('btnPwConfirm').addEventListener('click', () => {
    const pw = document.getElementById('inputPassword').value;
    if (pw === ADMIN_PASSWORD) {
        isAdmin = true;
        document.getElementById('passwordOverlay').classList.remove('open');
        document.getElementById('inputPassword').value = '';
        renderProducts();
        renderTestimoni();
        showToast('🔓 Mode Admin aktif!', 'success');
    } else {
        document.getElementById('pwError').innerText = '❌ Password salah!';
    }
});

document.getElementById('btnPwCancel').addEventListener('click', () => {
    document.getElementById('passwordOverlay').classList.remove('open');
    document.getElementById('inputPassword').value = '';
    document.getElementById('pwError').innerText = '';
});

document.getElementById('inputPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('btnPwConfirm').click();
});

/* ============ INIT ============ */
renderProducts();
renderTestimoni();