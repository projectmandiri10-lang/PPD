# 🔐 Create First Admin User

## Setelah Migration Selesai

Migration sudah berhasil dijalankan! Sekarang Anda perlu membuat admin user pertama.

## Langkah 1: Create Admin User di Supabase

### Via Supabase Dashboard:

1. Buka https://supabase.com/dashboard/project/exvuzfmbfimdcfyqyplb/auth/users
2. Klik **Add user** > **Create new user**
3. Isi:
   - **Email**: `jho.j80@gmail.com` (atau email Anda)
   - **Password**: Buat password yang kuat (min 6 karakter)
   - **Auto Confirm User**: ✅ CENTANG INI (penting!)
4. Klik **Create user**
5. **COPY User UID** yang muncul (contoh: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

## Langkah 2: Assign Role Admin

1. Buka https://supabase.com/dashboard/project/exvuzfmbfimdcfyqyplb/sql/new
2. Paste SQL berikut (ganti USER_UID dan EMAIL):

```sql
INSERT INTO public.user_roles (user_id, email, role)
VALUES (
  'PASTE_USER_UID_DISINI',  -- Ganti dengan UID yang di-copy tadi
  'jho.j80@gmail.com',       -- Ganti dengan email Anda
  'admin'
);
```

3. Klik **Run** (Ctrl+Enter)
4. Pastikan muncul "Success. No rows returned"

## Langkah 3: Verify

Jalankan query ini untuk verify:

```sql
SELECT u.email, ur.role, ur.created_at
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'admin';
```

Harus muncul 1 row dengan email dan role admin Anda.

## Langkah 4: Test Login

1. Build dan deploy aplikasi terbaru
2. Buka halaman admin
3. Login dengan:
   - Email: `jho.j80@gmail.com`
   - Password: (password yang Anda buat tadi)

## Troubleshooting

### "Email not confirmed"
→ Pastikan Anda centang "Auto Confirm User" saat create user

### "User role not found"
→ Jalankan ulang INSERT query di Langkah 2

### "Invalid login credentials"
→ Cek email dan password, pastikan benar

## Next Steps

Setelah admin pertama berhasil login:
- Anda bisa create operator dari halaman admin
- Operator akan otomatis dibuat dengan role 'operator'
- Tidak perlu hardcode credentials lagi!

---

**Credentials sekarang aman di Supabase, tidak ada lagi hardcoded password!** 🔐
