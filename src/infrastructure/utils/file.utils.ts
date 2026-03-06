import * as fs from 'fs';
import * as path from 'path';

export class FileUtils {
  static async exists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async readFile(filePath: string): Promise<string> {
    return fs.promises.readFile(filePath, 'utf-8');
  }

  static async writeFile(filePath: string, content: string): Promise<void> {
    await fs.promises.writeFile(filePath, content, 'utf-8');
  }

  static async deleteFile(filePath: string): Promise<void> {
    await fs.promises.unlink(filePath);
  }

  static getExtension(filename: string): string {
    return path.extname(filename).toLowerCase();
  }

  static getFilename(filePath: string): string {
    return path.basename(filePath);
  }

  static getFilenameWithoutExtension(filePath: string): string {
    const filename = path.basename(filePath);
    return filename.substring(0, filename.lastIndexOf('.')) || filename;
  }

  static async getFileSize(filePath: string): Promise<number> {
    const stats = await fs.promises.stat(filePath);
    return stats.size;
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
