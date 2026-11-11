# StrutMix v2 | Smart Construction

Dashboard web untuk estimasi awal pekerjaan struktur: **balok, kolom, dinding bata, RAB, dan simulasi desain** dalam satu halaman. Dibuat dengan HTML, CSS, dan JavaScript murni (tanpa framework dan tanpa build).

> **Penting:** alat ini hanya untuk estimasi awal. Hasil perhitungan harus diverifikasi oleh insinyur sipil sebelum dipakai untuk desain atau pelaksanaan.

---

## Fitur

| Panel | Fungsi |
|---|---|
| **Balok** | Kapasitas lentur balok persegi tulangan tunggal (Mn, φMn), tinggi efektif d, As, tinggi blok tegangan a, regangan εt, gambar penampang yang berubah real-time, dan cek As,min, εt, serta Mu ≤ φMn |
| **Kolom** | φPn,max kolom bersengkang, rasio Pu/φPn, rasio tulangan ρg, kelangsingan kl/r, dan cek syarat |
| **Dinding bata** | Luas bersih (dikurangi bukaan), jumlah bata per m², total bata, volume spesi + plester, kebutuhan semen dan pasir. Pilihan bata merah atau bata ringan |
| **RAB** | Gabungan balok + kolom + dinding: material, upah, overhead & profit, total. Bisa diunduh sebagai CSV |
| **Simulasi** | Ubah satu parameter balok (h, b, f'c, atau jumlah tulangan) lalu lihat grafik φMn terhadap Mu dan pilihan termurah yang memenuhi syarat |

Tiga kartu gauge di sisi kanan menampilkan rasio **Mu/φMn** (balok), **Pu/φPn** (kolom), dan **ρg/8%** (tulangan kolom). Warna hijau (aman), oranye (di atas 85%), merah (di atas 100%).

Semua hasil dihitung **otomatis** setiap input berubah, tidak ada tombol Hitung.

---

## Struktur Folder

```
strutmix-v2/
├── index.html   # kerangka halaman
├── style.css    # tampilan (tema krem, kartu membulat, aksen oranye)
├── script.js    # input, rumus, RAB, simulasi
└── README.md
```

---

## Cara Menjalankan

1. Buka folder `strutmix-v2` di **VS Code**.
2. Pasang ekstensi **Live Server** (Ritwick Dey) bila belum ada.
3. Klik kanan `index.html`, pilih **Open with Live Server**.

Alternatif: klik dua kali `index.html` untuk membukanya langsung di browser.

Font *Outfit* dimuat dari Google Fonts. Tanpa internet, tampilan tetap berfungsi dengan font bawaan sistem.

---

## Cara Pakai

1. Isi **Material & umum** (f'c, fy, selimut, Ø sengkang, agregat maksimum) di kartu kiri atas. Nilai ini dipakai oleh semua panel.
2. Pilih panel lewat navigasi pil di atas: Balok, Kolom, Dinding bata, RAB, Simulasi.
3. Isi dimensi dan beban rencana (**Mu** untuk balok, **Pu** untuk kolom). Hasil dan gauge langsung berubah.
4. Di panel **RAB**, isi harga satuan material dan upah sesuai daerah Anda, lalu klik **Unduh CSV** bila perlu.
5. Di panel **Simulasi**, pilih parameter balok yang ingin diubah, tentukan nilai awal dan akhir, lalu baca grafiknya.

### Satuan

| Besaran | Satuan |
|---|---|
| Dimensi penampang, selimut, diameter | mm |
| Kuat bahan (f'c, fy) | MPa |
| Momen | kN·m |
| Gaya | kN |
| Panjang dan tinggi balok, kolom, dinding | m |
| Luas | m² |

---

## Dasar Perhitungan

### Balok (SNI 2847:2019, persegi tulangan tunggal)

- Tinggi efektif: `d = h − selimut − Ø sengkang − Ø/2`
- `As = n · π/4 · D²`
- `a = As·fy / (0,85·f'c·b)`, `c = a/β1`
- `Mn = As·fy·(d − a/2)`
- `εt = 0,003·(d − c)/c`
- Faktor φ: 0,90 bila εt ≥ 0,005; 0,65 bila εt ≤ εy; interpolasi di antaranya
- `As,min = max(0,25·√f'c/fy ; 1,4/fy) · b · d`

### Kolom (sengkang, beban aksial konsentris)

- `φPn,max = 0,8 · φ · [0,85·f'c·(Ag − Ast) + fy·Ast]`, dengan φ = 0,65
- `ρg = Ast/Ag`, syarat 1% sampai 8%
- Kelangsingan `kl/r` dengan k = 1 dan r = 0,3·h. Kolom dianggap pendek bila kl/r ≤ 22
- Kolom dengan momen lentur **belum** tercakup, perlu diagram interaksi P-M

### Dinding bata

- Bata per m² = `1 / ((p + j)·(t + j))` termasuk tebal spesi
- Volume spesi per m² = tebal dinding − volume bata per m²
- Plester tebal 1,5 cm per sisi
- Waste bata 5%, waste spesi 10%
- Campuran spesi 1 semen : 4 pasir (325 kg semen dan 1,05 m³ pasir per m³), **indikatif**

| Jenis | p × t × l (cm) | Spesi |
|---|---|---|
| Bata merah | 22 × 5 × 11 | 1 cm |
| Bata ringan | 60 × 20 × 10 | 0,3 cm (perekat tipis) |

### Campuran beton

Mix design disederhanakan mengacu pada SNI 7656:2012 / ACI 211.1 untuk slump 75–100 mm: kuat tekan target f'cr, faktor air-semen (minimal 0,35), kadar air, volume kerikil, dan pasir dari metode volume absolut.

### RAB

- Volume beton = volume balok + volume kolom
- Besi = (As balok × panjang × jumlah + Ast kolom × tinggi × jumlah) × 7850 kg/m³. Hanya **tulangan utama**, sengkang belum dihitung
- Upah = koefisien tenaga × volume × upah per OH (pekerja, tukang, kepala tukang, mandor)
- Total = subtotal + overhead & profit (%)

### Simulasi

Mengubah satu parameter balok dalam 24 langkah antara nilai awal dan akhir. Setiap langkah dinilai **memenuhi** bila φMn ≥ Mu, As ≥ As,min, dan εt ≥ 0,004. Dari yang memenuhi, dipilih yang biayanya paling murah per meter balok (beton + tulangan tarik + upah beton).

| Parameter | Rentang bawaan |
|---|---|
| Tinggi h | 300 – 800 mm |
| Lebar b | 200 – 500 mm |
| f'c | 20 – 40 MPa |
| Jumlah tulangan | 2 – 10 batang |

---

## Menyesuaikan Angka

Di bagian atas `script.js`:

```js
const KB = [1.65, .275, .028, .083];   // koefisien tenaga per m³ beton
const KW = [.3, .1, .01, .015];        // per m² pasangan bata
const KP = [.3, .15, .015, .015];      // per m² plesteran
const BATA = { ... };                  // ukuran bata dan tebal spesi
```

- Urutan koefisien: pekerja, tukang, kepala tukang, mandor (satuan OH).
- **Angka ini indikatif.** Cocokkan dengan AHSP resmi dan harga daerah Anda sebelum dipakai untuk penawaran.
- Daftar input dan nilai bawaan ada di objek `FIELDS`. Menambah input baru cukup menambah satu baris di sana.
- Warna tema ada di `:root` pada `style.css`.

---

## Batasan

- Balok hanya **tulangan tunggal** persegi. Tulangan rangkap, balok T, geser, dan lendutan belum dihitung.
- Kolom hanya **beban aksial**. Belum ada momen, kolom langsing, dan diagram interaksi.
- Sengkang, bekisting, pekerjaan pondasi, dan pelat belum masuk RAB.
- Simulasi hanya satu parameter per sesi, tanpa multi-parameter dan animasi.
- Data tidak disimpan. Muat ulang halaman mengembalikan nilai bawaan.
- Ilustrasi bangunan di hero berupa gambar garis, bukan foto.

---

## Ide Pengembangan

- Tulangan rangkap dan balok T
- Diagram interaksi P-M untuk kolom
- Perhitungan geser dan sengkang
- Simpan input ke `localStorage`
- Ekspor RAB ke Excel atau PDF
- Simulasi dua parameter (peta panas)

---

## Lisensi

Gunakan dan ubah sesuai kebutuhan Anda. Tidak ada jaminan atas ketepatan hasil perhitungan.
