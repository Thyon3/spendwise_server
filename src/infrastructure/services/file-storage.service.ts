import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../persistence/prisma/prisma.service';

export interface FileStorageOptions {
  path: string;
  maxSize: number;
  allowedMimeTypes: string[];
  compression?: 'gzip' | 'zip';
  encryption?: boolean;
  metadata?: Record<string, any>;
}

export interface FileMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  path: string;
  isPublic: boolean;
  downloadCount: number;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface FileUploadResult {
  file: FileMetadata;
  downloadUrl: string;
  expiresAt: Date;
}

export interface FileSearchOptions {
  query?: string;
  userId?: string;
  category?: string;
  mimeType?: string;
  minSize?: number;
  maxFileSize?: number;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  isPublic?: boolean;
}

export interface FileStats {
  totalFiles: number;
  totalSize: number;
  averageSize: number;
  largestFile: number;
  totalDownloads: number;
  filesByType: Record<string, number>;
  filesByUser: Record<string, number>;
  filesByMonth: Record<string, number>;
  storageUsage: number;
}

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly configService: ConfigService;
  private readonly files = new Map<string, FileMetadata>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    options: FileStorageOptions = {},
  ): Promise<FileUploadResult> {
    try {
      // Validate file
      this.validateFile(file, options);

      // Generate unique filename
      const originalName = file.originalname;
      const fileExtension = originalName.split('.').pop();
      const timestamp = Date.now();
      const fileId = this.generateId();
      const filename = `${fileId}_${timestamp.getTime()}.${fileExtension}`;

      // Check storage quota
      await this.checkStorageQuota(file.size);

      // Process file (compression, encryption)
      let processedBuffer = Buffer.from(await this.fileToBuffer(file));
      let finalSize = processedBuffer.length;

      if (options.compression) {
        processedBuffer = await this.compressFile(processedBuffer);
        finalSize = processedBuffer.length;
      }

      if (options.encryption) {
        processedBuffer = await this.encryptFile(processedBuffer);
        finalSize = processedBuffer.length;
      }

      // Calculate checksum
      const checksum = this.calculateChecksum(processedBuffer);

      // Save file
      const filePath = this.getFilePath(filename);
      await this.saveFile(filePath, processedBuffer);

      // Create metadata
      const metadata: FileMetadata = {
        id: fileId,
        originalName,
        mimeType: file.mimetype,
        size: finalSize,
        checksum,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: options.metadata?.userId || 'anonymous',
        path: filePath,
        isPublic: options.isPublic || false,
        downloadCount: 0,
        expiresAt: options.metadata?.expiresAt,
        metadata: options.metadata || {},
      };

      // Store in database
      await this.saveFileMetadata(metadata);

      // Clean up old files
      await this.cleanupOldFiles();

      this.logger.log(`File uploaded successfully: ${filename}`);

      return {
        file: metadata,
        downloadUrl: `/api/files/download/${fileId}`,
        expiresAt: metadata.expiresAt,
      };
    } catch (error) {
      this.logger.error(`File upload failed: ${error.message}`);
      throw new HttpException(
        `File upload failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFileInfo(fileId: string): Promise<FileMetadata | null> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }
    return file;
  }

  async getFileContent(fileId: string): Promise<Buffer> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    // In a real implementation, read from storage service
    return Buffer.from('mock file content');
  }

  async deleteFile(fileId: string, userId?: string): Promise<void> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    // Check ownership
    if (file.userId !== userId && !file.isPublic) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    // Delete from database
    this.files.delete(fileId);

    // Delete physical file
    await this.deletePhysicalFile(file.path);

    this.logger.log(`File deleted: ${file.originalName}`);
  }

  async searchFiles(options: FileSearchOptions = {}): Promise<{
    files: FileMetadata[];
    total: number;
    hasMore: boolean;
  }> {
    let files = Array.from(this.files.values());

    // Apply filters
    if (options.userId) {
      files = files.filter(file => file.userId === options.userId);
    }
    if (options.query) {
      const query = options.query.toLowerCase();
      files = files.filter(file =>
        file.originalName.toLowerCase().includes(query) ||
        file.originalName.toLowerCase().includes(query) ||
        (file.metadata?.searchTerms as string[] || []).some(term => 
          term.toLowerCase().includes(query)
        )
      );
    }
    if (options.category) {
      files = files.filter(file => 
        file.metadata?.category === options.category
      );
    }
    if (options.mimeType) {
      files = files.filter(file => file.mimeType === options.mimeType);
    }
    if (options.minSize) {
      files = files.filter(file => file.size >= options.minSize);
    }
    if (options.maxFileSize) {
      files = files.filter(file => file.size <= options.maxFileSize);
    }
    if (options.startDate) {
      files = files.filter(file => file.createdAt >= options.startDate);
    }
    if (options.endDate) {
      files = files.filter(file => file.createdAt <= options.endDate);
    }
    if (options.tags) {
      files = files.filter(file =>
        file.metadata?.tags?.some(tag => 
          options.tags!.includes(tag)
        )
      );
    }
    if (options.isPublic !== undefined) {
      files = files.filter(file => file.isPublic === options.isPublic);
    }

    // Sort
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';
    files.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Pagination
    const total = files.length;
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    const paginatedFiles = files.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      files: paginatedFiles,
      total,
      hasMore,
    };
  }

  async getFileStats(userId?: string): Promise<FileStats> {
    let files = Array.from(this.files.values());

    if (userId) {
      files = files.filter(file => file.userId === userId);
    }

    const totalFiles = files.length;
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const averageSize = totalFiles > 0 ? totalSize / totalFiles : 0;
    const largestFile = files.reduce((max, file) => Math.max(max, file.size), 0);
    const totalDownloads = files.reduce((sum, file) => sum + file.downloadCount, 0);

    const filesByType: Record<string, number> = {};
    for (const file of files) {
      const type = this.getFileType(file.mimeType);
      filesByType[type] = (filesByType[type] || 0) + 1;
    }

    const filesByUser = new Map<string, number>();
    for (const file of files) {
      filesByUser[file.userId] = (filesByUser.get(file.userId) || 0) + 1);
    }

    const filesByMonth = new Map<string, number>();
    for (const file of files) {
      const month = file.createdAt.toISOString().substring(0, 7); // YYYY-MM
      filesByMonth[month] = (filesByMonth[month] || 0) + 1;
    }

    const storageUsage = totalSize;

    return {
      totalFiles,
      totalSize,
      averageSize,
      largestFile,
      filesByType,
      filesByUser,
      filesByMonth,
      totalDownloads,
      storageUsage,
    };
  }

  async createShareableLink(fileId: string, expiresHours: number = 24): Promise<{
    shareableUrl: string;
    expiresAt: Date;
  }> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    const shareableUrl = `/api/files/share/${fileId}`;
    const expiresAt = new Date(Date.now().getTime() + expiresHours * 60 * 60 * 1000);

    // Update file metadata
    await this.updateFileMetadata(fileId, {
      isPublic: true,
      expiresAt,
    });

    return {
      shareableUrl,
      expiresAt,
    };
  }

  async downloadFile(fileId: string): Promise<{
    stream: NodeJS.ReadableStream;
    filename: string;
    mimeType: string;
    size: number;
    expiresAt?: Date;
  }> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    // Check if file has expired
    if (file.expiresAt && file.expiresAt < new Date()) {
      throw new HttpException('File has expired', HttpStatus.GONE);
    }

    // Increment download count
    await this.updateFileMetadata(fileId, {
      downloadCount: file.downloadCount + 1,
    });

    const filePath = this.getFilePath(file.path);
    const stream = this.createReadStream(filePath);

    this.logger.log(`File download started: ${file.originalName}`);

    return {
      stream,
      filename: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      expiresAt: file.expiresAt,
    };
  }

  async getDownloadHistory(userId?: string, limit: number = 50): Promise<FileMetadata[]> {
    let files = Array.from(this.files.values());

    if (userId) {
      files = files.filter(file => file.userId === userId);
    }

    // Sort by download count
    files.sort((a, b) => b.downloadCount - a.downloadCount);

    return files.slice(0, limit);
  }

  async cleanupExpiredFiles(): Promise<number> {
    const now = Date.now();
    const expiredFiles: string[] = [];

    for (const [id, file] of this.files.entries()) {
      if (file.expiresAt && file.expiresAt < now) {
        expiredFiles.push(id);
      }
    }

    // Delete expired files
    let deletedCount = 0;
    for (const id of expiredFiles) {
      const file = this.files.get(id);
      if (file) {
        await this.deletePhysicalFile(file.path);
        this.files.delete(id);
        deletedCount++;
      }
    }

    this.logger.log(`Cleaned up ${deletedCount} expired files`);
    return deletedCount;
  }

  async setFilePermissions(fileId: string, permissions: string[]): Promise<void> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    // Update file metadata with permissions
    await this.updateFileMetadata(fileId, {
      metadata: {
        ...file.metadata,
        permissions,
      },
    });

    this.logger.log(`Updated file permissions: ${file.originalName}`);
  }

  async getFilePermissions(fileId: string): Promise<string[]> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    return file.metadata?.permissions || [];
  }

  async generatePresignedUrl(fileId: string, expiresInMinutes: number = 15): Promise<string> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new HttpException('File file not found', HttpStatus.NOT_FOUND);
    }

    const expiresAt = new Date(Date.now().getTime() + expiresInMinutes * 60 * 1000);
    const signature = this.generateSignature(file);

    await this.updateFileMetadata(fileId, {
      expiresAt,
      signature,
    });

    const baseUrl = this.configService.get('BASE_URL', 'http://localhost:3000');
    const path = encodeURI(file.path);
    
    return `${baseUrl}/api/files/download/${fileId}?signature=${signature}&expires=${expiresAt.getTime()}`;
  }

  async moveFile(fileId: string, newPath: string, userId?: string): Promise<FileMetadata> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    // Check permissions
    if (file.userId !== userId && !file.isPublic) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    // Move physical file
    const oldPath = file.path;
    const newFilePath = this.getFilePath(newPath);

    // Update path
    await this.updateFileMetadata(fileId, { path: newFilePath });

    // Move physical file
    await this.movePhysicalFile(oldPath, newFilePath);

    this.logger.log(`File moved: ${file.originalName} from ${oldPath} to ${newPath}`);

    return file;
  }

  async copyFile(fileId: string, userId?: string): Promise<FileMetadata> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    // Check permissions
    if (file.userId !== userId && !file.isPublic) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    const originalPath = file.path;
    const newFilePath = this.getFilePath(`${file.id}_copy`);

    // Copy physical file
    await this.copyPhysicalFile(originalPath, newFilePath);

    // Create new metadata
    const copyMetadata: FileMetadata = {
      ...file,
      id: this.generateId(),
      originalName: `${file.originalName} (Copy)`,
      path: newFilePath,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: userId || file.userId,
      isPublic: false,
      downloadCount: 0,
    };

    // Store new file metadata
    this.files.set(copyMetadata.id, copyMetadata);

    this.logger.log(`File copied: ${file.originalName} to ${newFilePath}`);

    return copyMetadata;
  }

  private validateFile(file: Express.Multer.File, options: FileStorageOptions): void {
    // Check file size
    const maxSize = options.maxSize || this.configService.get('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB
    if (file.size > maxSize) {
      throw new HttpException('File too large', HttpStatus.PAYLOAD_TOO_LARGE);
    }

    // Check MIME type
    const allowedTypes = options.allowedMimeTypes || this.configService.get('ALLOWED_MIME_TYPES', [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/json',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
      'application/x-rar-compressed',
    ]);

    if (!allowedTypes.includes(file.mimetype)) {
      throw new HttpException('File type not allowed', HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    // Check for malicious files
    await this.scanForMalware(file);
  }

    // Check for viruses
    await this.scanForViruses(file);
  }

    this.logger.log(`File validated: ${file.originalname}`);
  }

  private async saveFileMetadata(metadata: FileMetadata): Promise<void> {
    // In a real implementation, save to database
    this.files.set(metadata.id, metadata);
    this.logger.log(`File metadata saved: ${metadata.id}`);
  }

  private async updateFileMetadata(fileId: string, updates: Partial<FileMetadata>): Promise<void> {
    const existingFile = this.files.get(fileId);
    if (existingFile) {
      const updatedFile = { ...existingFile, ...updates, updatedAt: new Date() };
      this.files.set(fileId, updatedFile);
      this.logger.log(`File metadata updated: ${fileId}`);
    }
  }

  private getFilePath(filename: string): string {
    const storagePath = this.configService.get('FILE_STORAGE_PATH', './uploads');
    return `${storagePath}/${filename}`;
  }

  private async fileToBuffer(file: Express.Multer.File): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const reader = file.createReadStream();
      const chunks: Buffer[] = [];

      reader.on('data', (chunk) => {
        chunks.push(chunk);
      });

      reader.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      reader.on('error', reject);
    });
  }

  private async saveFile(filePath: string, data: Buffer): Promise<void> {
    // In a real implementation, save to disk
    const fs = require('fs');
    fs.writeFileSync(filePath, data);
  }

  private async deletePhysicalFile(filePath: string): Promise<void> {
    // In a real implementation, delete from disk
    const fs = require('fs');
    fs.unlink(filePath);
  }

    private async movePhysicalFile(oldPath: string, newPath: string): Promise<void> {
    // In a real implementation, move on disk
    const fs = require('fs');
    fs.rename(oldPath, newPath);
  }

  private async copyPhysicalFile(oldPath: string, newPath: string): Promise<void> {
    // In a real implementation, copy on disk
    const fs = require('fs');
    fs.copyFile(oldPath, newPath);
  }

  private async compressFile(buffer: Buffer): Promise<Buffer> {
    // In a real implementation, use compression library
    return buffer; // Placeholder
  }

  private async encryptFile(buffer: Buffer): Promise<Buffer> {
    // In a real implementation, use encryption library
    return buffer; // Placeholder
  }

  private calculateChecksum(buffer: Buffer): string {
    // Simple checksum calculation
    let checksum = 0;
    for (const byte of buffer) {
      checksum = ((checksum << 5) - checksum) + byte) & checksum) + byte;
      checksum = checksum & checksum;
    }
    return checksum.toString(16);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private generateSignature(file: FileMetadata): string {
    // In a real implementation, use HMAC-SHA256
    return `file_${file.id}_${file.createdAt.getTime()}`;
  }

  private async scanForMalware(file: Express.Multer.File): Promise<void> {
    // In a real implementation, use antivirus scanning
    this.logger.log(`Scanning file for malware: ${file.originalname}`);
  }

    private async scanForViruses(file: Express.Multer.File): Promise<void> {
    // In a real implementation, use virus scanning
    this.logger.log(`Scanning file for viruses: ${file.originalname}`);
  }

  private getFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('application/pdf')) return 'document';
    if (mimeType.includes('text/')) return 'text';
    if (mimeType.includes('application/json')) return 'data';
    if (mimeType.includes('application/csv')) return 'data';
    if (mimeType.includes('application/vnd.ms-excel')) return 'spreadsheet';
    if (mimeType.includes('application/xml')) return 'data';
    return 'other';
  }

  private async checkStorageQuota(fileSize: number): Promise<void> {
    const totalSize = Array.from(this.files.values())
      .reduce((sum, file) => sum + file.size, 0);

    const maxStorage = this.configService.get('MAX_STORAGE_SIZE', 100 * 1024 * 1024 * 1024); // 100MB

    if (totalSize + fileSize > maxStorage) {
      throw new HttpException('Storage quota exceeded', HttpStatus.INSUFFICIENT_STORAGE);
    }
  }
  }
}
