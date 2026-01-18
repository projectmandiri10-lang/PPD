export interface ImageItem {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string;
  driveFileId: string;
  downloadUrl?: string;
  uploadedBy?: string; // Email of uploader
  sourceFileId?: string; // ID of the actual file (PDF/Vector) separate from preview
  fileType?: string; // 'jpg', 'png', 'pdf', 'ai', 'eps', etc.
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
  sourceFile: File | null;
  fileType: string;
}
