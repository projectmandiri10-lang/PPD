# ✅ QUICK START - Edge Function Sudah Deploy!

Edge Function `google-apps-proxy` sudah berhasil di-deploy ke Supabase! 🎉

## 🔧 Langkah Terakhir (5 menit)

### 1. Set Environment Variable

**Pilih salah satu cara:**

#### Cara A: Via Supabase Dashboard (Termudah)
1. Buka https://supabase.com/dashboard/project/exvuzfmbfimdcfyqyplb
2. Klik **Edge Functions** di sidebar kiri
3. Klik function **google-apps-proxy**
4. Klik tab **Settings**
5. Scroll ke **Environment Variables**
6. Klik **Add new secret**
7. Isi:
   - Name: `GOOGLE_APPS_SCRIPT_URL`
   - Value: `https://script.google.com/macros/s/AKfycbxkfYxg5jlVN4N7deJ6NagecOROzxmqJspMGSQKZbXdP-QpvFaGGdm9D2o1zFOZpvORtg/exec`
8. Klik **Save**

#### Cara B: Via Terminal (Jika punya Supabase CLI)
```bash
npx supabase secrets set GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbxkfYxg5jlVN4N7deJ6NagecOROzxmqJspMGSQKZbXdP-QpvFaGGdm9D2o1zFOZpvORtg/exec --project-ref exvuzfmbfimdcfyqyplb
```

### 2. Dapatkan Supabase Anon Key

1. Di Supabase Dashboard, klik **Settings** > **API**
2. Copy **anon public** key (yang panjang, dimulai dengan `eyJ...`)
3. Update file `.env`:
   ```
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 3. Update Google Apps Script

1. Buka https://script.google.com
2. Buka project Anda
3. Hapus semua kode lama
4. Copy paste kode dari `scripts/google-apps-script.js`
5. **PENTING**: Isi `SHEET_ID` dan `FOLDER_ID` dengan ID Anda yang asli
6. Klik **Deploy** > **Manage deployments**
7. Klik ikon **Pensil (Edit)** pada deployment yang aktif
8. Pilih **New version**
9. Pastikan:
   - Execute as: `Me`
   - Who has access: `Anyone`
10. Klik **Deploy**

### 4. Build & Test

```bash
npm run build
```

Setelah build selesai, upload folder `dist` ke hosting Anda.

## 🧪 Testing

### Test Edge Function
Buka browser console dan jalankan:
```javascript
fetch('https://exvuzfmbfimdcfyqyplb.supabase.co/functions/v1/google-apps-proxy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'upload',
    data: {
      file: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      fileName: 'test.png',
      mimeType: 'image/png'
    }
  })
})
.then(r => r.json())
.then(console.log);
```

### Test JSONP (GET)
```javascript
const script = document.createElement('script');
script.src = 'https://script.google.com/macros/s/AKfycbxkfYxg5jlVN4N7deJ6NagecOROzxmqJspMGSQKZbXdP-QpvFaGGdm9D2o1zFOZpvORtg/exec?callback=console.log';
document.head.appendChild(script);
```

## ✅ Checklist

- [ ] Environment variable `GOOGLE_APPS_SCRIPT_URL` sudah di-set di Supabase
- [ ] Supabase Anon Key sudah di-copy ke `.env`
- [ ] Google Apps Script sudah diupdate dengan kode baru
- [ ] Google Apps Script sudah di-deploy ulang (New version)
- [ ] Permission Google Apps Script: "Anyone"
- [ ] `SHEET_ID` dan `FOLDER_ID` sudah diisi dengan benar
- [ ] `npm run build` berhasil
- [ ] Folder `dist` sudah diupload ke hosting

## 🎯 URL Penting

- **Edge Function**: https://exvuzfmbfimdcfyqyplb.supabase.co/functions/v1/google-apps-proxy
- **Supabase Dashboard**: https://supabase.com/dashboard/project/exvuzfmbfimdcfyqyplb
- **Google Apps Script**: https://script.google.com

## 🆘 Troubleshooting

### Error: "GOOGLE_APPS_SCRIPT_URL is not defined"
→ Environment variable belum di-set. Ikuti langkah 1 di atas.

### Error: CORS masih muncul
→ Google Apps Script belum di-deploy ulang dengan "New version"

### Upload gagal
→ Cek `FOLDER_ID` di Google Apps Script sudah benar dan folder sudah public

---

**Setelah semua checklist selesai, aplikasi Anda akan berjalan tanpa CORS error!** 🚀
