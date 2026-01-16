export interface ImageItem {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string;
  driveFileId: string;
  downloadUrl: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export interface UploadResponse {
  driveFileId: string;
  thumbnailUrl: string;
}

export interface AdminFormData {
  title: string;
  slug: string;
  downloadUrl: string;
  imageFile: File | null;
}
