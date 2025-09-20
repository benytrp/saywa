
export interface ClassificationResult {
  category: string;
  subcategory?: string;
  confidence: number;
  reasons: string[];
}

export interface EnhancedFileMeta {
  name: string;
  stem: string;
  ext: string;
  extLower: string;
  type: string;
  size: number;
  lastModified: number;
  rel: string;
  classification?: ClassificationResult;
}

export interface ClassificationOptions {
  enabled: boolean;
  minConfidence: number;
  showPreview: boolean; // Not used in backend logic, UI only
  batchSize: number;
}

export interface LogEntry {
  message: string;
  type: 'info' | 'warn' | 'error' | 'success';
  timestamp: Date;
}

export interface ClassificationStats {
  total: number;
  classified: number;
  highConfidence: number;
  categories: Record<string, number>;
}

export interface Job {
    file: File;
    path: string;
}
