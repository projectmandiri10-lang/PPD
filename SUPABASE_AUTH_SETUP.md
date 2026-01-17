# 🔐 Setup Supabase Authentication

## Overview

Sistem autentikasi sekarang menggunakan **Supabase Auth** dengan role-based access control (RBAC):
- **Admin**: Full access (upload, edit, delete)
- **Operator**: Limited access (upload, view only)

## Setup Steps

### 1. Run Database Migration

Login ke Supabase Dashboard dan jalankan migration:

1. Buka https://supabase.com/dashboard/project/exvuzfmbfimdcfyqyplb
2. Klik **SQL Editor** di sidebar
3. Klik **New query**
4. Copy paste isi file `supabase/migrations/001_user_roles.sql`
5. Klik **Run**

### 2. Enable Email Auth

1. Di Supabase Dashboard, klik **Authentication** > **Providers**
2. Pastikan **Email** provider sudah enabled
3. **PENTING**: Disable "Confirm email" jika ingin langsung bisa login tanpa verifikasi email
   - Scroll ke **Email Auth** settings
   - Toggle OFF "Enable email confirmations"
   - Klik **Save**

### 3. Create First Admin User

#### Via Supabase Dashboard:

1. Klik **Authentication** > **Users**
2. Klik **Add user** > **Create new user**
3. Isi:
   - Email: `jho.j80@gmail.com`
   - Password: `@Se06070786` (atau password Anda)
   - Auto Confirm User: ✅ (centang)
4. Klik **Create user**
5. Copy **User UID** yang muncul

#### Insert Role di SQL Editor:

```sql
INSERT INTO public.user_roles (user_id, email, role)
VALUES (
  'PASTE_USER_UID_DISINI',
  'jho.j80@gmail.com',
  'admin'
);
```

### 4. Update Frontend Code

File `src/pages/Admin.tsx` sudah diupdate untuk menggunakan Supabase Auth.

### 5. Build & Deploy

```bash
npm install
npm run build
```

Upload folder `dist/` ke hosting.

## Usage

### Login

Users login dengan **email dan password** (bukan username).

### Add New Operator

1. Login sebagai Admin
2. Buka tab **Operators**
3. Masukkan **email** operator (bukan username)
4. Masukkan password
5. Klik **Add Operator**

Sistem akan:
1. Create user di Supabase Auth
2. Assign role 'operator' di database

### Permissions

**Admin dapat:**
- ✅ Upload images
- ✅ Edit images
- ✅ Delete images
- ✅ Manage operators
- ✅ View all images

**Operator dapat:**
- ✅ Upload images
- ✅ View all images
- ❌ Edit images
- ❌ Delete images
- ❌ Manage operators

## Security

- ✅ Passwords di-hash oleh Supabase Auth
- ✅ Row Level Security (RLS) enabled
- ✅ Users hanya bisa read role mereka sendiri
- ✅ Hanya admin yang bisa manage roles
- ✅ Session management otomatis

## Troubleshooting

### "Email not confirmed"
→ Disable email confirmation di Supabase Dashboard > Authentication > Providers > Email

### "User already registered"
→ User sudah ada di Supabase Auth. Login saja atau reset password.

### "Insufficient permissions"
→ User belum punya role di tabel `user_roles`. Tambahkan manual via SQL Editor.

## Migration from Local Storage

Jika sebelumnya menggunakan localStorage untuk operators:

1. Export data operators dari localStorage (F12 > Console):
   ```javascript
   console.log(localStorage.getItem('app_operators'))
   ```

2. Untuk setiap operator, create user di Supabase dan assign role 'operator'

3. Hapus localStorage:
   ```javascript
   localStorage.removeItem('app_operators')
   ```

---

**Autentikasi sekarang lebih aman dan terpusat di Supabase!** 🔐
