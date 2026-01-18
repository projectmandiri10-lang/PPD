# Setup Guide - Hybrid Google Drive + Supabase Solution

## Arsitektur Solusi

Aplikasi ini menggunakan **hybrid architecture** untuk mengatasi CORS blocking Google Apps Script:

1. **GET Requests** (fetch list, fetch by slug) → **JSONP** langsung ke Google Apps Script
2. **POST Requests** (upload, create) → **Supabase Edge Function** sebagai proxy → Google Apps Script
3. **Storage** → **Google Drive** (2TB gratis Anda)
4. **Database** → **Google Sheets**

## Langkah Setup

### 1. Update Google Apps Script

1. Buka Google Apps Script Editor Anda
2. Copy kode dari `scripts/google-apps-script.js`
3. **PENTING**: Isi `SHEET_ID` dan `FOLDER_ID` dengan ID Anda
4. Deploy sebagai Web App:
   - Execute as: `Me`
   - Who has access: `Anyone`
   - **WAJIB**: Pilih "New deployment" untuk membuat versi baru

### 2. Deploy Supabase Edge Function

#### Opsi A: Menggunakan Supabase Dashboard (Recommended)

1. Login ke [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project `ads` (exvuzfmbfimdcfyqyplb)
3. Klik **Edge Functions** di sidebar
4. Klik **Create a new function**
5. Nama function: `google-apps-proxy`
6. Copy paste kode dari `supabase/functions/google-apps-proxy/index.ts`
7. Klik **Deploy function**
8. Setelah deploy, klik **Settings** pada function
9. Tambahkan **Environment Variable**:
   - Key: `GOOGLE_APPS_SCRIPT_URL`
   - Value: `https://script.google.com/macros/s/AKfycbxkfYxg5jlVN4N7deJ6NagecOROzxmqJspMGSQKZbXdP-QpvFaGGdm9D2o1zFOZpvORtg/exec`

#### Opsi B: Menggunakan Supabase CLI

```bash
# Install Supabase CLI (jika belum)
npm install -g supabase

# Login
supabase login

# Deploy function
supabase functions deploy google-apps-proxy --project-ref exvuzfmbfimdcfyqyplb

# Set environment variable
supabase secrets set GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbxkfYxg5jlVN4N7deJ6NagecOROzxmqJspMGSQKZbXdP-QpvFaGGdm9D2o1zFOZpvORtg/exec --project-ref exvuzfmbfimdcfyqyplb
```

### 3. Dapatkan Supabase Anon Key

1. Di Supabase Dashboard, klik **Settings** > **API**
2. Copy **anon public** key
3. Update file `.env`:
   ```
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 4. Build dan Deploy Frontend

```bash
npm run build
```

Upload folder `dist` ke hosting Anda.

## Testing

### Test JSONP (GET requests)
Buka browser console dan jalankan:
```javascript
const script = document.createElement('script');
script.src = 'https://script.google.com/macros/s/AKfycbxkfYxg5jlVN4N7deJ6NagecOROzxmqJspMGSQKZbXdP-QpvFaGGdm9D2o1zFOZpvORtg/exec?callback=console.log';
document.head.appendChild(script);
```

### Test Edge Function Proxy
```bash
curl -X POST https://exvuzfmbfimdcfyqyplb.supabase.co/functions/v1/google-apps-proxy \
  -H "Content-Type: application/json" \
  -d '{"action":"upload","data":{"file":"data:image/png;base64,iVBORw0KGgo...","fileName":"test.png","mimeType":"image/png"}}'
```

## Troubleshooting

### CORS Error masih muncul
- Pastikan Google Apps Script sudah di-deploy ulang dengan "New deployment"
- Pastikan permission "Anyone" sudah benar
- Clear browser cache

### Edge Function Error
- Cek environment variable `GOOGLE_APPS_SCRIPT_URL` sudah benar
- Cek logs di Supabase Dashboard > Edge Functions > Logs

### Upload Gagal
- Pastikan `FOLDER_ID` di Google Apps Script sudah benar
- Pastikan folder Drive sudah public (Anyone with link can view)

## Keuntungan Solusi Ini

✅ **No CORS Error** - JSONP untuk GET, Proxy untuk POST
✅ **2TB Storage** - Tetap pakai Google Drive Anda
✅ **Free Database** - Google Sheets gratis unlimited
✅ **Fast** - JSONP lebih cepat dari proxy untuk GET requests
✅ **Reliable** - Supabase Edge Functions 99.9% uptime
