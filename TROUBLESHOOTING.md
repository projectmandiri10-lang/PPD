# 🔧 Troubleshooting - MIME Type Error

## Error: "Expected a JavaScript module but server responded with MIME type text/html"

### Penyebab
Server hosting mengembalikan halaman HTML (404) saat browser mencoba memuat file JavaScript. Ini terjadi karena:
1. File `.htaccess` tidak ada atau tidak dikonfigurasi dengan benar
2. Server tidak mengenali routing SPA (Single Page Application)

### ✅ Solusi (Sudah Diterapkan)

File `.htaccess` sudah dibuat di `public/.htaccess` dan akan otomatis ter-copy ke `dist/` saat build.

### Cara Upload ke Hosting

1. **Build aplikasi:**
   ```bash
   npm run build
   ```

2. **Upload semua file di folder `dist/` ke hosting:**
   - `index.html`
   - `manifest.json`
   - `vite.svg`
   - `.htaccess` ← **PENTING! File ini harus ada**
   - Folder `assets/` (semua file JS dan CSS)

3. **Pastikan `.htaccess` terupload:**
   - Di cPanel File Manager, pastikan file `.htaccess` terlihat di root folder (`public_html/`)
   - Jika tidak terlihat, aktifkan "Show Hidden Files" di File Manager settings

### Verifikasi

Setelah upload, test di browser:

1. Buka `https://idcashier.my.id`
2. Buka Developer Tools (F12) > Network tab
3. Reload halaman
4. Pastikan file `.js` dan `.css` dimuat dengan status `200 OK`
5. Pastikan Content-Type untuk `.js` adalah `application/javascript`

### Jika Masih Error

#### Opsi 1: Manual Upload .htaccess via cPanel

1. Login ke cPanel
2. File Manager > public_html
3. Klik "Settings" (pojok kanan atas)
4. Centang "Show Hidden Files (dotfiles)"
5. Klik "Save"
6. Upload file `.htaccess` dari `dist/.htaccess`

#### Opsi 2: Edit .htaccess via cPanel

Jika file `.htaccess` sudah ada tapi tidak bekerja:

1. Edit file `.htaccess` yang ada
2. Tambahkan kode berikut di paling atas:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Redirect all requests to index.html except for existing files
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Set correct MIME types for JavaScript modules
<IfModule mod_mime.c>
  AddType application/javascript .js
  AddType text/css .css
</IfModule>
```

3. Save dan test lagi

### Catatan Penting

- File `.htaccess` adalah file **hidden** (dimulai dengan titik)
- Pastikan SFTP client Anda menampilkan hidden files
- File ini WAJIB ada di root folder hosting (`public_html/`)

### Test Cepat

Buka URL ini di browser:
```
https://idcashier.my.id/assets/index-D9LUu77w.js
```

**Jika benar:**
- Browser akan menampilkan kode JavaScript
- Content-Type: `application/javascript`

**Jika salah:**
- Browser menampilkan halaman HTML (404)
- Content-Type: `text/html`

---

**Setelah `.htaccess` terupload dengan benar, error MIME type akan hilang!** ✅
