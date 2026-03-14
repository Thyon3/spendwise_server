import { Controller, Post, Get, Put, UseGuards, Request, HttpCode, HttpStatus, UseInterceptors, UploadedFile, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { OCRService, ReceiptExtraction } from '../../../application/services/ocr.service';

@ApiTags('ocr')
@Controller('ocr')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OcrController {
  constructor(private readonly ocrService: OCRService) { }

  @Post('upload-receipt')
  @UseInterceptors(FileInterceptor('receipt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload and process receipt image', description: 'Upload a receipt image for OCR processing and expense extraction' })
  @ApiResponse({ status: 200, description: 'Receipt processed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid image format' })
  @ApiConsumes('multipart/form-data')
  async uploadReceipt(@UploadedFile() file: any, @Request() req): Promise<ReceiptExtraction> {
    if (!file) {
      throw new Error('No file uploaded');
    }

    return this.ocrService.processReceiptImage(file.buffer, req.user.userId);
  }

  @Get('pending-extractions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get pending extractions', description: 'Get all pending receipt extractions awaiting user approval' })
  @ApiResponse({ status: 200, description: 'Pending extractions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPendingExtractions(@Request() req) {
    return this.ocrService.getPendingExtractions(req.user.userId);
  }

  @Put('approve/:extractionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve extraction', description: 'Approve a receipt extraction and create the expense' })
  @ApiResponse({ status: 200, description: 'Extraction approved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Extraction not found' })
  async approveExtraction(@Request() req, @Param('extractionId') extractionId: string) {
    await this.ocrService.approveExtraction(req.user.userId, extractionId);
    return { message: 'Extraction approved and expense created' };
  }

  @Put('reject/:extractionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject extraction', description: 'Reject a receipt extraction' })
  @ApiResponse({ status: 200, description: 'Extraction rejected successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Extraction not found' })
  async rejectExtraction(@Request() req, @Param('extractionId') extractionId: string) {
    await this.ocrService.rejectExtraction(req.user.userId, extractionId);
    return { message: 'Extraction rejected' };
  }
}
