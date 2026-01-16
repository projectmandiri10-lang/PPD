import { ImageItem, ApiResponse, CacheItem, UploadResponse } from '../types';

// API Endpoints - Ganti dengan endpoint Google Apps Script Anda
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const CACHE_DURATION = 10 * 60 * 1000; // 10 menit dalam milliseconds

// Cache keys
const CACHE_KEY_LIST = 'image_hub_list_cache';
const CACHE_KEY_PREFIX = 'image_hub_item_';

/**
 * Get cached data jika masih valid
 */
function getFromCache<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const parsed: CacheItem<T> = JSON.parse(cached);
    const now = Date.now();
    
    if (now - parsed.timestamp < CACHE_DURATION) {
      return parsed.data;
    }
    
    // Cache expired, hapus
    localStorage.removeItem(key);
    return null;
  } catch {
    return null;
  }
}

/**
 * Simpan data ke cache
 */
function saveToCache<T>(key: string, data: T): void {
  try {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheItem));
  } catch {
    // localStorage penuh atau tidak tersedia, abaikan
    console.warn('Failed to save to cache');
  }
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(CACHE_KEY_PREFIX) || key === CACHE_KEY_LIST)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch {
    console.warn('Failed to clear cache');
  }
}

/**
 * Fetch semua gambar dari Google Sheets
 */
export async function fetchImageList(): Promise<ApiResponse<ImageItem[]>> {
  // Cek cache dulu
  const cached = getFromCache<ImageItem[]>(CACHE_KEY_LIST);
  if (cached) {
    return { data: cached, error: null };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/list`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Google Sheets via Apps Script biasanya mengembalikan array langsung
    // atau dalam format { data: [...] }
    const items: ImageItem[] = Array.isArray(data) ? data : (data.data || []);
    
    // Simpan ke cache
    saveToCache(CACHE_KEY_LIST, items);
    
    return { data: items, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch images';
    return { data: null, error: message };
  }
}

/**
 * Fetch gambar by slug
 */
export async function fetchImageBySlug(slug: string): Promise<ApiResponse<ImageItem>> {
  // Cek cache dulu
  const cacheKey = `${CACHE_KEY_PREFIX}${slug}`;
  const cached = getFromCache<ImageItem>(cacheKey);
  if (cached) {
    return { data: cached, error: null };
  }

  // Coba cari dari list cache dulu
  const listCached = getFromCache<ImageItem[]>(CACHE_KEY_LIST);
  if (listCached) {
    const item = listCached.find(i => i.slug === slug);
    if (item) {
      saveToCache(cacheKey, item);
      return { data: item, error: null };
    }
  }

  try {
    // Fetch dari API
    const response = await fetch(`${API_BASE_URL}/get?slug=${encodeURIComponent(slug)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return { data: null, error: 'Image not found' };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const item: ImageItem = data.data || data;
    
    // Simpan ke cache
    saveToCache(cacheKey, item);
    
    return { data: item, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch image';
    return { data: null, error: message };
  }
}

/**
 * Generate download URL dari driveFileId
 */
export function generateDownloadUrl(driveFileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${driveFileId}`;
}

/**
 * Get final download URL (gunakan downloadUrl jika ada, atau generate dari driveFileId)
 */
export function getDownloadUrl(item: ImageItem): string {
  if (item.downloadUrl && item.downloadUrl.trim()) {
    return item.downloadUrl;
  }
  return generateDownloadUrl(item.driveFileId);
}

/**
 * Upload image ke Google Drive via Apps Script
 */
export async function uploadImage(file: File): Promise<ApiResponse<UploadResponse>> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return { 
      data: {
        driveFileId: data.driveFileId || data.fileId,
        thumbnailUrl: data.thumbnailUrl || data.url,
      }, 
      error: null 
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload image';
    return { data: null, error: message };
  }
}

/**
 * Simpan metadata ke Google Sheets via Apps Script
 */
export async function createImageEntry(item: Omit<ImageItem, 'id' | 'createdAt'>): Promise<ApiResponse<ImageItem>> {
  try {
    const response = await fetch(`${API_BASE_URL}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });
    
    if (!response.ok) {
      throw new Error(`Create failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Clear cache agar data baru muncul
    clearCache();
    
    return { data: data.data || data, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create entry';
    return { data: null, error: message };
  }
}

/**
 * Generate slug dari title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Hapus karakter spesial
    .replace(/\s+/g, '-')     // Ganti spasi dengan dash
    .replace(/-+/g, '-')      // Hapus multiple dashes
    .substring(0, 100);       // Batasi panjang
}

/**
 * Generate Drive thumbnail URL dari file ID
 */
export function getDriveThumbnailUrl(driveFileId: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
  const sizeMap = {
    small: 's220',
    medium: 's400',
    large: 's1000',
  };
  return `https://drive.google.com/thumbnail?id=${driveFileId}&sz=${sizeMap[size]}`;
}
