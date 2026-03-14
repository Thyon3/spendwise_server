import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FileUploadResult {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  url?: string;
}

@Injectable()
export class FileUploadService {
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  constructor(private readonly configService: ConfigService) { }

  async validateFile(file: any): Promise<void> {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new HttpException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new HttpException(
        `File type ${file.mimetype} is not allowed`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check for malicious file patterns
    const dangerousPatterns = [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.scr$/i,
      /\.pif$/i,
      /\.com$/i,
      /\.js$/i,
      /\.vbs$/i,
    ];

    if (dangerousPatterns.some(pattern => pattern.test(file.originalname))) {
      throw new HttpException(
        'File type is not allowed for security reasons',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async saveFile(file: any, directory: string = 'uploads'): Promise<FileUploadResult> {
    await this.validateFile(file);

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2);
    const extension = file.originalname.split('.').pop();
    const filename = `${timestamp}_${randomString}.${extension}`;

    // In a real implementation, you would save the file to disk or cloud storage
    const path = `${directory}/${filename}`;

    // Generate URL (in production, this would be your CDN or storage URL)
    const baseUrl = this.configService.get<string>('BASE_URL', 'http://localhost:3000');
    const url = `${baseUrl}/api/files/${filename}`;

    return {
      filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path,
      url,
    };
  }

  async deleteFile(filename: string, directory: string = 'uploads'): Promise<void> {
    const path = `${directory}/${filename}`;

    // In a real implementation, you would delete the file from disk or cloud storage
    console.log(`Deleting file: ${path}`);
  }

  getFileStats(filename: string, directory: string = 'uploads') {
    const path = `${directory}/${filename}`;

    // In a real implementation, you would get file stats from disk
    return {
      filename,
      path,
      exists: true,
      size: 0,
      lastModified: new Date(),
    };
  }

  getAllowedMimeTypes(): string[] {
    return [...this.allowedMimeTypes];
  }

  getMaxFileSize(): number {
    return this.maxFileSize;
  }

  isImage(mimetype: string): boolean {
    return mimetype.startsWith('image/');
  }

  isDocument(mimetype: string): boolean {
    return [
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ].includes(mimetype);
  }

  generateFileUrl(filename: string): string {
    const baseUrl = this.configService.get<string>('BASE_URL', 'http://localhost:3000');
    return `${baseUrl}/api/files/${filename}`;
  }
}
