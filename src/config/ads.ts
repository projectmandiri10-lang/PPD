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

// Monetag Tag ID - Ganti dengan Tag ID dari Monetag dashboard
export const MONETAG_TAG_ID = import.meta.env.VITE_MONETAG_TAG_ID || 'YOUR_MONETAG_TAG_ID';

// Monetag script source URL
export const MONETAG_SRC = `//cdn.monetag.com/tags/${MONETAG_TAG_ID}.js`;

// Alternative script pattern (jika format berbeda)
export const getMonetagScript = (tagId: string) => {
  return `//cdn.monetag.com/tags/${tagId}.js`;
};
