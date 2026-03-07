import { Injectable } from '@nestjs/common';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const deflate = promisify(zlib.deflate);
const inflate = promisify(zlib.inflate);

@Injectable()
export class CompressionService {
  async compressGzip(data: string | Buffer): Promise<Buffer> {
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    return await gzip(buffer);
  }

  async decompressGzip(data: Buffer): Promise<string> {
    const decompressed = await gunzip(data);
    return decompressed.toString();
  }

  async compressDeflate(data: string | Buffer): Promise<Buffer> {
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    return await deflate(buffer);
  }

  async decompressDeflate(data: Buffer): Promise<string> {
    const decompressed = await inflate(data);
    return decompressed.toString();
  }
}
