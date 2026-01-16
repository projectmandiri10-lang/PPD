import { ImageItem, ApiResponse, UploadResponse } from '../types';

// API Endpoints
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * JSONP Request Helper untuk mengatasi CORS di Google Apps Script
 * Ini adalah SATU-SATUNYA cara yang benar untuk berkomunikasi dengan GAS Web App
 */
function jsonpRequest<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const callbackName = `jsonp_callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const script = document.createElement('script');

        // Setup callback
        (window as any)[callbackName] = (data: T) => {
            delete (window as any)[callbackName];
            document.body.removeChild(script);
            resolve(data);
        };

        // Setup error handler
        script.onerror = () => {
            delete (window as any)[callbackName];
            document.body.removeChild(script);
            reject(new Error('JSONP request failed'));
        };

        // Add callback parameter to URL
        const separator = url.includes('?') ? '&' : '?';
        script.src = `${url}${separator}callback=${callbackName}`;
        document.body.appendChild(script);
    });
}

/**
 * Fetch semua gambar menggunakan JSONP
 */
export async function fetchImageList(): Promise<ApiResponse<ImageItem[]>> {
    try {
        const data = await jsonpRequest<ImageItem[]>(`${API_BASE_URL}?path=list`);
        return { data, error: null };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch images';
        return { data: null, error: message };
    }
}

/**
 * Fetch gambar by slug menggunakan JSONP
 */
export async function fetchImageBySlug(slug: string): Promise<ApiResponse<ImageItem>> {
    try {
        const data = await jsonpRequest<{ data: ImageItem }>(`${API_BASE_URL}?slug=${encodeURIComponent(slug)}`);
        return { data: data.data, error: null };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch image';
        return { data: null, error: message };
    }
}

// Upload dan Create tetap menggunakan metode lama karena JSONP tidak support POST
// Untuk ini, Anda HARUS menggunakan Opsi 2 (Backend Proxy)
