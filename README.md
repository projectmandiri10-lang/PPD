# Image Download Hub

Website React static untuk image download hub dengan monetisasi Adsterra. Dibangun dengan Vite + React + TypeScript, optimized untuk shared hosting.

## Fitur

- **Home Page**: Grid galeri gambar dengan lazy loading
- **Detail Page** (`/p/:slug`): Preview gambar besar dengan tombol download
- **Download Page** (`/d/:slug`): Halaman dengan iklan Adsterra dan countdown timer
- **Admin Page** (`/admin`): Upload gambar dan manage metadata
- **SEO Ready**: Meta tags, Open Graph, sitemap, robots.txt
- **Mobile First**: Responsive design dengan Tailwind CSS
- **Caching**: LocalStorage cache 10 menit untuk performa

## Tech Stack

- React 18
- TypeScript
- Vite
- React Router DOM (HashRouter)
- Tailwind CSS
- React Helmet Async

## Struktur Project

```
├── public/
│   ├── robots.txt
│   ├── sitemap.xml
│   └── vite.svg
├── src/
│   ├── components/
│   │   ├── ads/
│   │   │   ├── AdsterraNativeBanner.tsx
│   │   │   └── AdsterraSocialBar.tsx
│   │   ├── Countdown.tsx
│   │   ├── GalleryGrid.tsx
│   │   └── Layout.tsx
│   ├── config/
│   │   └── ads.ts
│   ├── lib/
│   │   └── api.ts
│   ├── pages/
│   │   ├── Admin.tsx
│   │   ├── Download.tsx
│   │   ├── Home.tsx
│   │   ├── NotFound.tsx
│   │   └── Post.tsx
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── .env.example
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Setup Development

1. **Clone dan install dependencies:**
   ```bash
   npm install
   ```

2. **Copy dan configure environment:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` dengan nilai yang sesuai.

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Build untuk production:**
   ```bash
   npm run build
   ```

## Konfigurasi

### Environment Variables

| Variable | Deskripsi |
|----------|-----------|
| `VITE_API_BASE_URL` | URL Google Apps Script endpoint |
| `VITE_ADMIN_PASSWORD` | Password untuk akses admin |
| `VITE_SITE_URL` | URL website (untuk SEO) |
| `VITE_SITE_NAME` | Nama website |

### Adsterra Configuration

Edit file `src/config/ads.ts`:

```typescript
// Ganti dengan key dari Adsterra dashboard
export const ADSTERRA_SOCIALBAR_KEY = 'your_socialbar_key';
export const ADSTERRA_NATIVE_KEY = 'your_native_key';
```

**Cara mendapatkan key Adsterra:**
1. Login ke [Adsterra](https://adsterra.com)
2. Buat unit iklan baru (Social Bar / Native Banner)
3. Copy key dari script yang diberikan
4. Paste ke `src/config/ads.ts`

## Deploy ke Shared Hosting

### 1. Build Project
```bash
npm run build
```

### 2. Upload ke Hosting
Upload seluruh isi folder `dist/` ke root direktori website di cPanel File Manager.

Struktur di hosting:
```
public_html/
├── assets/
├── index.html
├── robots.txt
├── sitemap.xml
└── vite.svg
```

### 3. Konfigurasi htaccess (Opsional)
Karena menggunakan HashRouter (`/#/`), tidak perlu konfigurasi khusus untuk routing.

### 4. Proteksi Admin (Recommended)
Untuk keamanan tambahan di shared hosting:
1. Buka cPanel → Security → Password Protect Directories
2. Pilih direktori website
3. Buat user dan password
4. Akses ke `/#/admin` akan meminta autentikasi tambahan

## Google Apps Script Setup

### 1. Buat Google Sheet
Buat spreadsheet dengan kolom:
- id
- title
- slug
- thumbnailUrl
- driveFileId
- downloadUrl
- createdAt

### 2. Buat Apps Script
File → Extensions → Apps Script

Copy code dari `scripts/google-apps-script.js` (contoh disediakan di bawah)

### 3. Deploy Web App
1. Deploy → New deployment
2. Select type: Web app
3. Execute as: Me
4. Who has access: Anyone
5. Copy URL endpoint

### Contoh Google Apps Script

```javascript
// Lihat file scripts/google-apps-script.js untuk implementasi lengkap
```

## Format Data

```typescript
interface ImageItem {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string;
  driveFileId: string;
  downloadUrl: string;
  createdAt: string;
}
```

## URL Structure

Karena menggunakan HashRouter, URL akan berbentuk:
- Home: `https://domain.com/#/`
- Post: `https://domain.com/#/p/nama-gambar`
- Download: `https://domain.com/#/d/nama-gambar`
- Admin: `https://domain.com/#/admin`

**Pinterest/Social Share:** Link sharing mengarah ke `/#/d/slug` untuk memaksimalkan impressi iklan.

## Troubleshooting

### Gambar tidak muncul
- Pastikan thumbnailUrl valid atau driveFileId benar
- Cek apakah Google Drive file bersifat public

### API error
- Pastikan VITE_API_BASE_URL sudah benar
- Cek permission Apps Script (Anyone can access)
- Cek CORS di Apps Script

### Iklan tidak muncul
- Pastikan key Adsterra sudah dikonfigurasi
- Iklan mungkin di-block oleh AdBlocker
- Cek console browser untuk error

## License

MIT License
