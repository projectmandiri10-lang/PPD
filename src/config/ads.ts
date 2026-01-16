/**
 * Adsterra Configuration
 * 
 * Cara mengganti key Adsterra:
 * 1. Login ke akun Adsterra (https://adsterra.com)
 * 2. Buat unit iklan baru (Social Bar atau Native Banner)
 * 3. Copy script key dari dashboard Adsterra
 * 4. Ganti nilai di bawah ini dengan key Anda
 * 
 * Format Social Bar key: biasanya berupa string seperti "abc123..."
 * Format Native key: biasanya berupa string seperti "xyz789..."
 * 
 * PENTING: Key di bawah adalah placeholder, harus diganti dengan key asli dari Adsterra!
 */

// Social Bar Ad Key - Ganti dengan key dari Adsterra dashboard
export const ADSTERRA_SOCIALBAR_KEY = 'YOUR_SOCIALBAR_KEY_HERE';

// Native Banner Ad Key - Ganti dengan key dari Adsterra dashboard  
export const ADSTERRA_NATIVE_KEY = 'YOUR_NATIVE_KEY_HERE';

// Adsterra script source URLs
export const ADSTERRA_SOCIALBAR_SRC = `//www.topcreativeformat.com/${ADSTERRA_SOCIALBAR_KEY}/invoke.js`;
export const ADSTERRA_NATIVE_SRC = `//www.profitabledisplaynetwork.com/${ADSTERRA_NATIVE_KEY}/invoke.js`;

// Alternative script patterns (beberapa kampanye Adsterra menggunakan format berbeda)
// Sesuaikan dengan script yang diberikan Adsterra saat membuat unit iklan
export const getAdsterraSocialBarScript = (key: string) => {
  return `//www.topcreativeformat.com/${key}/invoke.js`;
};

export const getAdsterraNativeScript = (key: string) => {
  return `//www.profitabledisplaynetwork.com/${key}/invoke.js`;
};
