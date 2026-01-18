export function getLocale(): 'id' | 'en' {
    const lang = navigator.language || (navigator.languages && navigator.languages[0]) || 'en';
    if (lang.toLowerCase().includes('id')) {
        return 'id';
    }
    return 'en';
}

export const translations = {
    id: {
        download: 'Unduh Sekarang',
        fileType: 'Format',
        license: 'Lisensi',
        share: 'Bagikan',
        related: 'Mungkin Anda Suka',
        home: 'Beranda',
        details: 'Detail Gambar',
        freeForCommercial: 'Gratis untuk komersial',
        attributionRequired: 'Atribusi diperlukan',
        loading: 'Memuat...',
        notFound: 'Gambar tidak ditemukan',
        backToHome: 'Kembali ke Beranda',
        format: 'Format'
    },
    en: {
        download: 'Download Now',
        fileType: 'File Type',
        license: 'License',
        share: 'Share',
        related: 'You Might Also Like',
        home: 'Home',
        details: 'Image Details',
        freeForCommercial: 'Free for commercial use',
        attributionRequired: 'Attribution required',
        loading: 'Loading...',
        notFound: 'Image not found',
        backToHome: 'Back to Home',
        format: 'Format'
    }
};
