# Panduan Setup Lengkap - Image Download Hub

## Daftar Isi
1. [Setup Google Sheets sebagai Database](#1-setup-google-sheets-sebagai-database)
2. [Setup Google Apps Script sebagai Backend API](#2-setup-google-apps-script-sebagai-backend-api)
3. [Setup Google Drive untuk Storage Gambar](#3-setup-google-drive-untuk-storage-gambar)
4. [Konfigurasi Environment Variables](#4-konfigurasi-environment-variables)
5. [Setup Monetag untuk Monetisasi](#5-setup-monetag-untuk-monetisasi)
6. [Deploy ke Hosting](#6-deploy-ke-hosting)
7. [Setup Google Search Console](#7-setup-google-search-console)
8. [Testing dan Troubleshooting](#8-testing-dan-troubleshooting)

---

## 1. Setup Google Sheets sebagai Database

Google Sheets akan digunakan sebagai database untuk menyimpan metadata gambar.

### Langkah 1.1: Buat Google Sheet Baru
1. Buka [Google Sheets](https://sheets.google.com)
2. Klik **"+ Blank"** untuk membuat spreadsheet baru
3. Beri nama: `Image Download Hub Database`

### Langkah 1.2: Buat Header Kolom
Di baris pertama (Row 1), isi kolom berikut:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| id | title | slug | thumbnailUrl | driveFileId | downloadUrl | createdAt |

### Langkah 1.3: Catat Sheet ID
1. Lihat URL spreadsheet Anda, contoh:
   ```
   https://docs.google.com/spreadsheets/d/1ABC123xyz.../edit
   ```
2. Copy bagian ID: `1ABC123xyz...` (antara `/d/` dan `/edit`)
3. **Simpan ID ini** untuk digunakan nanti

---

## 2. Setup Google Apps Script sebagai Backend API

Google Apps Script akan menjadi backend API untuk:
- Mengambil daftar gambar (GET)
- Menyimpan metadata gambar baru (POST)
- Upload gambar ke Google Drive (POST)

### Langkah 2.1: Buka Apps Script Editor
1. Di Google Sheet yang sudah dibuat, klik menu **Extensions** → **Apps Script**
2. Akan terbuka editor Apps Script baru

### Langkah 2.2: Hapus Kode Default
Hapus semua kode yang ada di editor (`function myFunction() {}`)

### Langkah 2.3: Copy-Paste Kode Berikut

```javascript
/**
 * Image Download Hub - Backend API
 * Google Apps Script
 */

// ==================== KONFIGURASI ====================
// GANTI dengan ID Google Sheet Anda
const SHEET_ID = 'PASTE_SHEET_ID_ANDA_DISINI';

// GANTI dengan ID folder Google Drive untuk upload gambar
const FOLDER_ID = 'PASTE_FOLDER_ID_ANDA_DISINI';

// Nama sheet (biasanya "Sheet1")
const SHEET_NAME = 'Sheet1';

// ==================== MAIN HANDLERS ====================

function doGet(e) {
  try {
    const slug = e.parameter.slug;
    
    if (slug) {
      return getBySlug(slug);
    }
    
    return getAll();
  } catch (error) {
    return createResponse({ error: error.message }, 500);
  }
}

function doPost(e) {
  try {
    const contentType = e.postData ? e.postData.type : '';
    
    // Handle file upload (multipart/form-data)
    if (contentType.includes('multipart/form-data')) {
      return handleFileUpload(e);
    }
    
    // Handle JSON data (create entry)
    if (contentType.includes('application/json')) {
      return handleCreate(e);
    }
    
    // Try to parse as JSON anyway
    return handleCreate(e);
    
  } catch (error) {
    return createResponse({ error: error.message }, 500);
  }
}

// ==================== API FUNCTIONS ====================

function getAll() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return createResponse([]);
  }
  
  const headers = data[0];
  const items = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // Skip empty rows
    
    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index] || '';
    });
    items.push(item);
  }
  
  // Sort by createdAt descending
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  return createResponse(items);
}

function getBySlug(slug) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return createResponse({ error: 'Not found', data: null }, 404);
  }
  
  const headers = data[0];
  const slugIndex = headers.indexOf('slug');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][slugIndex] === slug) {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = data[i][index] || '';
      });
      return createResponse({ data: item });
    }
  }
  
  return createResponse({ error: 'Not found', data: null }, 404);
}

function handleCreate(e) {
  let data;
  
  try {
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }
  } catch {
    return createResponse({ error: 'Invalid JSON data' }, 400);
  }
  
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const id = Utilities.getUuid();
  const createdAt = new Date().toISOString();
  
  const row = headers.map(header => {
    if (header === 'id') return id;
    if (header === 'createdAt') return createdAt;
    return data[header] || '';
  });
  
  sheet.appendRow(row);
  
  const item = {};
  headers.forEach((header, index) => {
    item[header] = row[index];
  });
  
  return createResponse({ data: item, message: 'Created successfully' });
}

function handleFileUpload(e) {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    
    // Parse multipart form data
    const boundary = e.postData.type.split('boundary=')[1];
    const parts = e.postData.contents.split('--' + boundary);
    
    let fileBlob = null;
    let fileName = 'uploaded-image-' + Date.now();
    
    for (let part of parts) {
      if (part.includes('Content-Type: image')) {
        // Extract filename if available
        const filenameMatch = part.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          fileName = filenameMatch[1];
        }
        
        // Extract content type
        const contentTypeMatch = part.match(/Content-Type: ([^\r\n]+)/);
        const mimeType = contentTypeMatch ? contentTypeMatch[1].trim() : 'image/png';
        
        // Extract binary data
        const dataStart = part.indexOf('\r\n\r\n') + 4;
        const dataEnd = part.lastIndexOf('\r\n');
        const binaryData = part.substring(dataStart, dataEnd);
        
        fileBlob = Utilities.newBlob(binaryData, mimeType, fileName);
        break;
      }
    }
    
    if (!fileBlob) {
      return createResponse({ error: 'No file found in request' }, 400);
    }
    
    // Upload to Drive
    const file = folder.createFile(fileBlob);
    file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    
    const fileId = file.getId();
    const thumbnailUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=s400';
    
    return createResponse({
      driveFileId: fileId,
      thumbnailUrl: thumbnailUrl,
      fileUrl: file.getUrl(),
      message: 'File uploaded successfully'
    });
    
  } catch (error) {
    return createResponse({ error: 'Upload failed: ' + error.message }, 500);
  }
}

// ==================== HELPER FUNCTIONS ====================

function createResponse(data, statusCode = 200) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ==================== SETUP FUNCTIONS ====================

/**
 * Jalankan fungsi ini SEKALI untuk inisialisasi sheet
 * Cara: Pilih fungsi ini di dropdown, lalu klik Run
 */
function initializeSheet() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const headers = ['id', 'title', 'slug', 'thumbnailUrl', 'driveFileId', 'downloadUrl', 'createdAt'];
  
  // Check if headers already exist
  const firstRow = sheet.getRange(1, 1, 1, 7).getValues()[0];
  if (firstRow[0] !== 'id') {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  
  Logger.log('Sheet initialized successfully!');
  Logger.log('Headers: ' + headers.join(', '));
}

/**
 * Jalankan fungsi ini untuk test koneksi
 */
function testSetup() {
  Logger.log('Testing setup...');
  
  try {
    // Test Sheet
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    Logger.log('✓ Sheet connected: ' + sheet.getName());
    
    // Test Folder
    const folder = DriveApp.getFolderById(FOLDER_ID);
    Logger.log('✓ Folder connected: ' + folder.getName());
    
    Logger.log('');
    Logger.log('Setup OK! Anda bisa deploy web app.');
  } catch (error) {
    Logger.log('✗ Error: ' + error.message);
  }
}
```

### Langkah 2.4: Update Konfigurasi
1. Ganti `PASTE_SHEET_ID_ANDA_DISINI` dengan Sheet ID dari Langkah 1.3
2. Ganti `PASTE_FOLDER_ID_ANDA_DISINI` dengan Folder ID (lihat Langkah 3)

### Langkah 2.5: Simpan Project
1. Klik **File** → **Save**
2. Beri nama project: `Image Download Hub API`

### Langkah 2.6: Jalankan Inisialisasi
1. Di dropdown fungsi (atas), pilih `initializeSheet`
2. Klik tombol **Run** (▶)
3. Jika diminta izin, klik **Review Permissions** → pilih akun Google → **Allow**
4. Cek di **View** → **Logs** untuk memastikan berhasil

### Langkah 2.7: Test Setup
1. Pilih fungsi `testSetup`
2. Klik **Run**
3. Cek Logs untuk memastikan Sheet dan Folder terkoneksi

### Langkah 2.8: Deploy sebagai Web App
1. Klik **Deploy** → **New deployment**
2. Klik ikon gear (⚙) → pilih **Web app**
3. Isi konfigurasi:
   - **Description**: `v1.0`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
4. Klik **Deploy**
5. **COPY URL Web App** yang muncul (seperti: `https://script.google.com/macros/s/xxx.../exec`)
6. **Simpan URL ini** untuk konfigurasi environment

---

## 3. Setup Google Drive untuk Storage Gambar

### Langkah 3.1: Buat Folder Baru
1. Buka [Google Drive](https://drive.google.com)
2. Klik **New** → **Folder**
3. Beri nama: `Image Download Hub Uploads`

### Langkah 3.2: Dapatkan Folder ID
1. Buka folder yang baru dibuat
2. Lihat URL, contoh:
   ```
   https://drive.google.com/drive/folders/1XYZ789abc...
   ```
3. Copy bagian ID: `1XYZ789abc...` (setelah `/folders/`)
4. **Paste ID ini** ke konfigurasi Apps Script (FOLDER_ID)

### Langkah 3.3: Set Sharing Permission
1. Klik kanan folder → **Share**
2. Di bagian "General access", ubah ke **Anyone with the link**
3. Role: **Viewer**
4. Klik **Done**

---

## 4. Konfigurasi Environment Variables

### Langkah 4.1: Update File .env
Buka file `.env` di project dan update:

```env
# API Configuration
VITE_API_BASE_URL=https://script.google.com/macros/s/PASTE_SCRIPT_ID_ANDA/exec

# Admin Configuration
VITE_ADMIN_EMAIL=jho.j80@gmail.com
VITE_ADMIN_PASSWORD=@Se06070786

# Site Configuration
VITE_SITE_URL=https://idcashier.my.id
VITE_SITE_NAME=Image Download Hub

# Monetag Configuration (lihat bagian 5)
VITE_MONETAG_TAG_ID=YOUR_MONETAG_TAG_ID
```

### Langkah 4.2: Rebuild Project
Setelah update .env, jalankan:
```bash
npm run build
```

---

## 5. Setup Monetag untuk Monetisasi

Monetag adalah jaringan iklan yang SEO-friendly dan diterima Google.

### Langkah 5.1: Daftar Akun Monetag
1. Buka [Monetag.com](https://monetag.com)
2. Klik **Sign Up**
3. Pilih **Publisher**
4. Isi form pendaftaran:
   - Email
   - Password
   - Website URL (contoh: https://idcashier.my.id)
5. Verifikasi email

### Langkah 5.2: Tambah Website
1. Login ke dashboard Monetag
2. Klik **Sites** → **Add Site**
3. Masukkan URL website Anda
4. Pilih kategori (misal: Entertainment/Images)
5. Tunggu approval (biasanya 24-48 jam)

### Langkah 5.3: Dapatkan Ad Tag
Setelah website approved:
1. Buka **Sites** → klik website Anda
2. Pilih tipe iklan yang diinginkan:
   - **Vignette Banner** - Iklan fullscreen saat transisi halaman
   - **Push Notifications** - Notifikasi browser
   - **In-Page Push** - Push notification tanpa izin
   - **Interstitial** - Iklan fullscreen
3. Copy **Tag ID** atau **Script Code**

### Langkah 5.4: Format Iklan yang Direkomendasikan
Untuk website download, format terbaik:
1. **Vignette Banner** - Muncul saat user klik download
2. **In-Page Push** - Non-intrusive, tidak perlu izin
3. **Direct Link** - Link monetisasi untuk tombol download

---

## 6. Deploy ke Hosting

### Langkah 6.1: Build Project
```bash
npm run build
```

### Langkah 6.2: Upload via SFTP (VS Code)
1. Pastikan extension **SFTP** terinstall
2. Klik kanan folder `dist` → **SFTP: Upload Folder**
3. Atau gunakan **SFTP: Sync Local → Remote**

### Langkah 6.3: Verifikasi
1. Buka website di browser
2. Test halaman:
   - Homepage: `https://yourdomain.com/`
   - Admin: `https://yourdomain.com/#/admin`

---

## 7. Setup Google Search Console

### Langkah 7.1: Tambah Property
1. Buka [Google Search Console](https://search.google.com/search-console)
2. Klik **Add Property**
3. Pilih **URL prefix**
4. Masukkan URL website (contoh: `https://idcashier.my.id`)

### Langkah 7.2: Verifikasi Ownership
Metode termudah - HTML Tag:
1. Pilih **HTML tag**
2. Copy kode meta tag:
   ```html
   <meta name="google-site-verification" content="xxx..." />
   ```
3. Edit file `index.html`, ganti:
   ```html
   <meta name="google-site-verification" content="YOUR_GOOGLE_VERIFICATION_CODE" />
   ```
   dengan kode dari Google
4. Build ulang dan upload
5. Klik **Verify** di Search Console

### Langkah 7.3: Submit Sitemap
1. Di Search Console, klik **Sitemaps**
2. Masukkan: `sitemap.xml`
3. Klik **Submit**

### Langkah 7.4: Request Indexing
1. Klik **URL Inspection**
2. Masukkan URL homepage
3. Klik **Request Indexing**

---

## 8. Testing dan Troubleshooting

### Test API
Buka di browser:
```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```
Harus menampilkan JSON array (kosong atau berisi data).

### Test Upload
1. Login sebagai Admin
2. Upload gambar test
3. Cek apakah muncul di list

### Troubleshooting Umum

#### "Failed to fetch" saat load gambar
- Pastikan VITE_API_BASE_URL sudah benar di .env
- Pastikan Apps Script sudah di-deploy dengan akses "Anyone"

#### Upload gagal
- Cek apakah folder Drive sudah public
- Cek apakah FOLDER_ID sudah benar
- Lihat error di Apps Script Logs

#### Gambar tidak muncul
- Pastikan file di Drive bersifat public
- Cek thumbnailUrl apakah valid

#### Google tidak mengindex
- Pastikan tidak ada iklan yang melanggar kebijakan
- Submit sitemap
- Request indexing manual
- Tunggu 1-2 minggu

---

## Checklist Final

- [ ] Google Sheet sudah dibuat dengan header yang benar
- [ ] Google Drive folder sudah dibuat dan public
- [ ] Apps Script sudah di-deploy dan bisa diakses
- [ ] File .env sudah dikonfigurasi dengan benar
- [ ] Website sudah bisa diakses
- [ ] Admin login berfungsi
- [ ] Upload gambar berfungsi
- [ ] List gambar muncul
- [ ] Google Search Console verified
- [ ] Sitemap submitted
- [ ] Monetag account registered (optional)

---

## Bantuan

Jika ada kendala, periksa:
1. **Apps Script Logs**: View → Logs
2. **Browser Console**: F12 → Console
3. **Network Tab**: F12 → Network (lihat request yang gagal)

---

*Dokumen ini dibuat untuk membantu setup Image Download Hub dengan backend Google dan monetisasi Monetag.*
