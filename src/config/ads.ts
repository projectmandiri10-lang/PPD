/**
 * Monetag Configuration
 * 
 * Cara mengganti key Monetag:
 * 1. Login ke akun Monetag (https://monetag.com)
 * 2. Tambahkan website Anda
 * 3. Dapatkan Tag ID dari dashboard Monetag
 * 4. Ganti nilai di bawah ini dengan Tag ID Anda
 * 
 * Format Monetag Tag ID: biasanya berupa string seperti "abc123..."
 * 
 * PENTING: Key di bawah adalah placeholder, harus diganti dengan key asli dari Monetag!
 */

// Monetag Configuration
// NOTE: Script In-Page Push dan Vignette Banner sekarang di-inject langsung di public/index.html
// Zona ID: 10479089 (In-Page Push), 10479097 (Vignette)

// Monetag Tag ID (Untuk Banner Native ONLY - Slot kotak di sidebar/download page)
export const MONETAG_TAG_ID = import.meta.env.VITE_MONETAG_TAG_ID || 'YOUR_NATIVE_BANNER_ID';

export const MONETAG_SRC = `//cdn.monetag.com/tags/${MONETAG_TAG_ID}.js`;
