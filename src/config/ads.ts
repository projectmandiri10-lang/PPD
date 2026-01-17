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

// Monetag Tag ID (Untuk Banner Native - Opsional, buat zona Native Banner terpisah jika ingin isi slot banner)
export const MONETAG_TAG_ID = import.meta.env.VITE_MONETAG_TAG_ID || 'YOUR_NATIVE_BANNER_ID';

// Monetag Multitag Configuration (Sesuai instruksi baru Anda)
export const MONETAG_MULTITAG_ZONE = import.meta.env.VITE_MONETAG_ZONE || '203020'; // ID dari script Anda
export const MONETAG_MULTITAG_URL = import.meta.env.VITE_MONETAG_SCRIPT_URL || 'https://quge5.com/88/tag.min.js'; // URL dari script Anda

export const MONETAG_SRC = `//cdn.monetag.com/tags/${MONETAG_TAG_ID}.js`;
