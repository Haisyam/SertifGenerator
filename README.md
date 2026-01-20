# Sertifikat Generator

Aplikasi web untuk generate sertifikat PDF massal dari template gambar dan data Excel.

## Fitur Utama

- Upload template sertifikat (PNG/JPG).
- Upload Excel data peserta.
- Upload font custom (TTF/OTF/ZIP) tanpa menyimpan ke storage project.
- Preview interaktif (drag, resize, warna, rata tengah).
- Generate PDF per peserta dan unduh ZIP.
- Proses generate menampilkan progres `X dari Y`.

## Stack

- Next.js App Router (JS/JSX)
- TailwindCSS
- pdf-lib + fontkit (server only)
- exceljs (server only)
- archiver (server only)
- multer (server only)
- react-rnd (client only)

## Persyaratan

- Node.js 18+ (disarankan)
- NPM

## Instalasi

```bash
npm install
```

## Menjalankan Lokal

```bash
npm run dev
```

Buka `http://localhost:3000`.

## Cara Pakai

1. Upload template (PNG/JPG).
2. Upload Excel data peserta.
3. Upload font Nama (TTF/OTF/ZIP).
4. (Opsional) Aktifkan "Sebagai" lalu upload font Sebagai.
5. Atur posisi, ukuran, warna, dan rata tengah di preview.
6. Klik **Generate Sertifikat** untuk mengunduh ZIP.

## Struktur Excel

Minimal punya header:

- `nama`
- `sebagai` (hanya wajib jika fitur Sebagai aktif)

Contoh:

```
nama,sebagai
Budi Santoso,Peserta
Siti Aulia,Pemateri
Andi Wijaya,Moderator
```

Template Excel tersedia di:

```
public/uploads/template.xlsx
```

## Font ZIP

Jika user upload file `.zip`, server akan:
- Mengekstrak ke folder temp.
- Mencari file `.ttf` atau `.otf`.
- Menggunakan font pertama yang ditemukan.

Jika zip tidak berisi font, akan error.

## Preview vs PDF

- Preview menggunakan baseline font agar posisi konsisten dengan PDF.
- Koordinat disimpan dalam pixel (origin kiri atas).
- PDF memakai origin kiri bawah, dikonversi otomatis di server.

## API Routes

- `POST /api/upload`  
  Upload template dan Excel (disimpan sementara di OS temp).

- `POST /api/font-preview`  
  Upload font (TTF/OTF/ZIP), ekstrak jika zip, return `fontUrl`, `fontPath`, `ascentRatio`.

- `GET /api/font-file?p=...`  
  Serve font dari temp untuk preview.

- `POST /api/excel-info`  
  Deteksi jumlah data di Excel (tanpa simpan file).

- `POST /api/generate`  
  Start job generate PDF+ZIP.

- `GET /api/generate/status?jobId=...`  
  Poll progres.

- `GET /api/generate/download?jobId=...`  
  Download ZIP hasil generate.

## Penamaan File PDF

Nama file mengikuti kolom `nama` dari Excel.  
Jika duplikat, otomatis ditambahkan suffix:

```
Nama.pdf
Nama_2.pdf
Nama_3.pdf
```

## Temporary Storage (Vercel)

Aplikasi menyimpan file sementara di OS temp:
- Lokal: `os.tmpdir()`
- Vercel: `/tmp`

Semua file temp dibersihkan setelah proses selesai.

## Deploy ke Vercel

1. Push repo ke GitHub.
2. Import di Vercel.
3. Pastikan runtime Node.js (bukan Edge).

Domain target:
```
https://sertifgenerator.vercel.app/
```

## Troubleshooting

- **Font tidak tampil di preview**  
  Pastikan file font valid (.ttf/.otf). Jika zip, pastikan di dalamnya ada font.

- **Generate error**  
  Cek pesan error di UI. Umumnya karena header Excel salah atau font belum diupload.

- **Preview dan PDF tidak sama**  
  Reset posisi setelah upload font, lalu atur ulang posisi.

## Lisensi

Private / internal use.
