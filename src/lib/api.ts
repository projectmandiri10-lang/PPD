import { ImageItem, ApiResponse, CacheItem, UploadResponse } from '../types';

// API Endpoints
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const PROXY_URL = `${SUPABASE_URL}/functions/v1/google-apps-proxy`;

const CACHE_DURATION = 10 * 60 * 1000; // 10 menit
const CACHE_KEY_LIST = 'image_hub_list_cache';
const CACHE_KEY_PREFIX = 'image_hub_item_';

// ==================== CACHE FUNCTIONS ====================

function getFromCache<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const parsed: CacheItem<T> = JSON.parse(cached);
    const now = Date.now();

    if (now - parsed.timestamp < CACHE_DURATION) {
      return parsed.data;
    }

    localStorage.removeItem(key);
    return null;
  } catch {
    return null;
  }
}

function saveToCache<T>(key: string, data: T): void {
  try {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheItem));
  } catch {
    console.warn('Failed to save to cache');
  }
}

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

// ==================== JSONP HELPER (untuk GET requests) ====================

/**
 * JSONP request untuk mengatasi CORS pada GET requests ke Google Apps Script
 * Ini adalah satu-satunya cara yang benar untuk GET tanpa CORS error
 */
function jsonpRequest<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const script = document.createElement('script');
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP request timeout'));
    }, 30000); // 30 second timeout

    const cleanup = () => {
      clearTimeout(timeout);
      delete (window as any)[callbackName];
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    (window as any)[callbackName] = (data: T) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP request failed'));
    };

    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}callback=${callbackName}`;
    document.head.appendChild(script);
  });
}

// ==================== API FUNCTIONS ====================

/**
 * Fetch semua gambar menggunakan JSONP (GET request, no CORS issue)
 */
export async function fetchImageList(): Promise<ApiResponse<ImageItem[]>> {
  const cached = getFromCache<ImageItem[]>(CACHE_KEY_LIST);
  if (cached) {
    return { data: cached, error: null };
  }

  try {
    const data = await jsonpRequest<ImageItem[]>(`${API_BASE_URL}?path=list`);
    const items: ImageItem[] = Array.isArray(data) ? data : [];

    saveToCache(CACHE_KEY_LIST, items);
    return { data: items, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch images';
    return { data: null, error: message };
  }
}

/**
 * Fetch gambar by slug menggunakan JSONP
 */
export async function fetchImageBySlug(slug: string): Promise<ApiResponse<ImageItem>> {
  const cacheKey = `${CACHE_KEY_PREFIX}${slug}`;
  const cached = getFromCache<ImageItem>(cacheKey);
  if (cached) {
    return { data: cached, error: null };
  }

  const listCached = getFromCache<ImageItem[]>(CACHE_KEY_LIST);
  if (listCached) {
    const item = listCached.find(i => i.slug === slug);
    if (item) {
      saveToCache(cacheKey, item);
      return { data: item, error: null };
    }
  }

  try {
    const response = await jsonpRequest<{ data: ImageItem }>(`${API_BASE_URL}?slug=${encodeURIComponent(slug)}`);
    const item: ImageItem = response.data;

    saveToCache(cacheKey, item);
    return { data: item, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch image';
    return { data: null, error: message };
  }
}

export function generateDownloadUrl(driveFileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${driveFileId}`;
}

export function getDownloadUrl(item: ImageItem): string {
  if (item.downloadUrl && item.downloadUrl.trim()) {
    return item.downloadUrl;
  }
  return generateDownloadUrl(item.driveFileId);
}

/**
 * Helper: Convert File to Base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

/**
 * Upload image menggunakan Supabase Edge Function proxy (POST request)
 * Proxy akan menambahkan CORS headers yang benar
 */
export async function uploadImage(file: File): Promise<ApiResponse<UploadResponse>> {
  try {
    const base64Content = await fileToBase64(file);

    const payload = {
      file: base64Content,
      fileName: file.name,
      mimeType: file.type
    };

    // Gunakan Supabase Edge Function sebagai proxy
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'upload',
        data: payload
      }),
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

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
 * Create image entry menggunakan Supabase Edge Function proxy
 */
export async function createImageEntry(item: Omit<ImageItem, 'id' | 'createdAt'>): Promise<ApiResponse<ImageItem>> {
  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create',
        data: item
      }),
    });

    if (!response.ok) {
      throw new Error(`Create failed with status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    clearCache();

    return { data: data.data || data, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create entry';
    return { data: null, error: message };
  }
}

/**
 * Delete image entry menggunakan Supabase Edge Function proxy
 */
export async function deleteImageEntry(id: string): Promise<ApiResponse<{ success: boolean }>> {
  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'delete',
        data: { id }
      }),
    });

    if (!response.ok) {
      throw new Error(`Delete failed with status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    clearCache();

    return { data: { success: true }, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete entry';
    return { data: null, error: message };
  }
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
}

export function getDriveThumbnailUrl(driveFileId: string): string {
  // Gunakan format uc?export=view yang lebih reliable di mobile
  // Format ini tidak memerlukan cookies dan bekerja di semua device
  return `https://drive.google.com/uc?export=view&id=${driveFileId}`;
}
