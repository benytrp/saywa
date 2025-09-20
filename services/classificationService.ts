
import type { ClassificationOptions, ClassificationResult, EnhancedFileMeta, ClassificationStats } from '../types';

const EXTENSION_DATABASE: Record<string, { category: string, subcategory?: string, confidence: number }> = {
  // Documents
  'pdf': { category: 'document', subcategory: 'pdf', confidence: 0.9 },
  'doc': { category: 'document', subcategory: 'word', confidence: 0.9 },
  'docx': { category: 'document', subcategory: 'word', confidence: 0.9 },
  'ppt': { category: 'document', subcategory: 'powerpoint', confidence: 0.9 },
  'pptx': { category: 'document', subcategory: 'powerpoint', confidence: 0.9 },
  'md': { category: 'document', subcategory: 'markdown', confidence: 0.8 },
  // Data
  'csv': { category: 'data', subcategory: 'spreadsheet', confidence: 0.9 },
  'xlsx': { category: 'data', subcategory: 'spreadsheet', confidence: 0.9 },
  'json': { category: 'data', subcategory: 'structured', confidence: 0.9 },
  'xml': { category: 'data', subcategory: 'structured', confidence: 0.9 },
  // Code
  'js': { category: 'code', subcategory: 'javascript', confidence: 0.9 },
  'ts': { category: 'code', subcategory: 'typescript', confidence: 0.9 },
  'py': { category: 'code', subcategory: 'python', confidence: 0.9 },
  'html': { category: 'code', subcategory: 'web', confidence: 0.8 },
  // Images
  'jpg': { category: 'image', subcategory: 'photo', confidence: 0.95 },
  'jpeg': { category: 'image', subcategory: 'photo', confidence: 0.95 },
  'png': { category: 'image', subcategory: 'graphics', confidence: 0.95 },
  'gif': { category: 'image', subcategory: 'graphics', confidence: 0.95 },
  'svg': { category: 'image', subcategory: 'vector', confidence: 0.9 },
  // Media
  'mp4': { category: 'video', confidence: 0.95 },
  'mov': { category: 'video', confidence: 0.95 },
  'mp3': { category: 'audio', confidence: 0.95 },
  'wav': { category: 'audio', confidence: 0.95 },
  // Archives
  'zip': { category: 'archive', confidence: 0.9 },
  'rar': { category: 'archive', confidence: 0.9 },
};

const MAGIC_BYTES = [
  { bytes: [0x89, 0x50, 0x4E, 0x47], category: 'image', subcategory: 'png' },
  { bytes: [0xFF, 0xD8, 0xFF], category: 'image', subcategory: 'jpeg' },
  { bytes: [0x47, 0x49, 0x46, 0x38], category: 'image', subcategory: 'gif' },
  { bytes: [0x25, 0x50, 0x44, 0x46], category: 'document', subcategory: 'pdf' },
  { bytes: [0x50, 0x4B, 0x03, 0x04], category: 'archive', subcategory: 'zip' },
];

class Classifier {
  private async readFileHeader(file: File, bytes: number = 16): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = reject;
      reader.readAsArrayBuffer(file.slice(0, bytes));
    });
  }

  private detectMagicBytes(header: Uint8Array): ClassificationResult | null {
    for (const magic of MAGIC_BYTES) {
      if (magic.bytes.every((byte, index) => header[index] === byte)) {
        return { 
          category: magic.category, 
          subcategory: magic.subcategory,
          confidence: 0.98, // Very high confidence
          reasons: [`Magic bytes match for ${magic.subcategory}`]
        };
      }
    }
    return null;
  }

  private classifyFromExtension(extLower: string): ClassificationResult | null {
    const result = EXTENSION_DATABASE[extLower];
    if (result) {
      return { ...result, reasons: [`File extension is .${extLower}`] };
    }
    return null;
  }
  
  private applyHeuristics(meta: EnhancedFileMeta): ClassificationResult | null {
    const name = meta.name.toLowerCase();
    if (name.includes('readme') || name.includes('license')) {
      return { category: 'document', subcategory: 'readme', confidence: 0.8, reasons: ['Filename suggests documentation'] };
    }
    if (meta.size > 100 * 1024 * 1024) { // > 100MB
      return { category: 'large-file', confidence: 0.6, reasons: ['File is very large (>100MB)'] };
    }
    if (meta.size === 0) {
      return { category: 'empty', confidence: 0.9, reasons: ['File is empty'] };
    }
    return null;
  }
  
  public async classifyFile(file: File, relPath: string): Promise<EnhancedFileMeta> {
    const name = file.name;
    const dotIndex = name.lastIndexOf('.');
    const stem = dotIndex > -1 ? name.substring(0, dotIndex) : name;
    const ext = dotIndex > -1 ? name.substring(dotIndex + 1) : '';
    const extLower = ext.toLowerCase();

    const meta: EnhancedFileMeta = {
      name, stem, ext, extLower,
      type: file.type || 'unknown',
      size: file.size,
      lastModified: file.lastModified,
      rel: relPath,
    };
    
    let bestClassification: ClassificationResult = { category: 'unknown', confidence: 0, reasons: ['No rules matched'] };

    // Cascade of classification methods
    const checks: (ClassificationResult | null)[] = [
      this.detectMagicBytes(await this.readFileHeader(file)),
      this.classifyFromExtension(extLower),
      this.applyHeuristics(meta)
    ];

    for (const result of checks) {
        if (result && result.confidence > bestClassification.confidence) {
            bestClassification = result;
        }
    }

    meta.classification = bestClassification;
    return meta;
  }
}

async function* getFilesRecursively(entry: FileSystemDirectoryHandle, currentPath = ''): AsyncGenerator<{file: File, path: string}> {
    for await (const handle of entry.values()) {
        const newPath = currentPath ? `${currentPath}/${handle.name}` : handle.name;
        if (handle.kind === 'file') {
            // FIX: Property 'getFile' does not exist on type 'FileSystemHandle'. We must cast to FileSystemFileHandle.
            const file = await (handle as FileSystemFileHandle).getFile();
            yield { file, path: newPath };
        } else if (handle.kind === 'directory') {
            // FIX: Argument of type 'FileSystemHandle' is not assignable to parameter of type 'FileSystemDirectoryHandle'. We must cast to FileSystemDirectoryHandle for recursion.
            yield* getFilesRecursively(handle as FileSystemDirectoryHandle, newPath);
        }
    }
}


export class ClassificationManager {
  private classifier = new Classifier();
  private onLog: (message: string, type?: 'info' | 'warn' | 'error' | 'success') => void;
  private onStatsUpdate: (stats: ClassificationStats) => void;

  constructor(handlers: {
    onLog: (message: string, type?: 'info' | 'warn' | 'error' | 'success') => void;
    onStatsUpdate: (stats: ClassificationStats) => void;
  }) {
    this.onLog = handlers.onLog;
    this.onStatsUpdate = handlers.onStatsUpdate;
  }

  async processDirectory(dirHandle: FileSystemDirectoryHandle, options: ClassificationOptions, shouldStop: () => boolean) {
    const stats: ClassificationStats = { total: 0, classified: 0, highConfidence: 0, categories: {} };
    const allFiles: {file: File, path: string}[] = [];
    
    this.onLog('Scanning directory to collect all files...', 'info');
    for await (const fileEntry of getFilesRecursively(dirHandle)) {
      if (shouldStop()) { this.onLog('Job stopped during file collection.', 'warn'); return; }
      allFiles.push(fileEntry);
    }
    stats.total = allFiles.length;
    this.onStatsUpdate({...stats});
    this.onLog(`Found ${stats.total} files. Starting classification in batches of ${options.batchSize}.`, 'info');

    for (let i = 0; i < allFiles.length; i += options.batchSize) {
        if (shouldStop()) { this.onLog('Job stopped during processing.', 'warn'); return; }
        
        const batch = allFiles.slice(i, i + options.batchSize);
        const promises = batch.map(fileEntry => 
            this.classifier.classifyFile(fileEntry.file, fileEntry.path).catch(err => {
                this.onLog(`Failed to classify ${fileEntry.path}: ${err.message}`, 'error');
                return null;
            })
        );
        
        const results = await Promise.all(promises);

        results.forEach(meta => {
            if (meta) {
                stats.classified++;
                const classification = meta.classification;
                if (classification && classification.category !== 'unknown' && classification.confidence >= options.minConfidence) {
                    const category = classification.category;
                    stats.categories[category] = (stats.categories[category] || 0) + 1;
                    if (classification.confidence > 0.8) {
                        stats.highConfidence++;
                    }
                    this.onLog(`[${classification.category.toUpperCase()}] ${meta.rel} (Confidence: ${Math.round(classification.confidence * 100)}%)`, 'info');
                } else {
                    this.onLog(`[UNCLASSIFIED] ${meta.rel}`, 'warn');
                }
            }
        });
        
        this.onStatsUpdate({...stats});
    }
  }
}
