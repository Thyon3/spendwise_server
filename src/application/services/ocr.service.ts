import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

export interface OCRResult {
  merchant?: string;
  amount?: number;
  date?: string;
  category?: string;
  items?: Array<{
    name: string;
    quantity?: number;
    price?: number;
  }>;
  confidence: number;
  rawText: string;
}

export interface ReceiptExtraction {
  merchant: string;
  amount: number;
  date: Date;
  category: string;
  description: string;
  confidence: number;
}

@Injectable()
export class OCRService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async processReceiptImage(imageBuffer: Buffer, userId: string): Promise<ReceiptExtraction> {
    try {
      // Step 1: Extract text using OCR
      const ocrResult = await this.extractTextFromImage(imageBuffer);
      
      // Step 2: Parse and structure the extracted data
      const structuredData = await this.parseReceiptData(ocrResult);
      
      // Step 3: Categorize the expense
      const category = await this.categorizeExpense(structuredData);
      
      // Step 4: Create the extracted expense record
      const extraction: ReceiptExtraction = {
        merchant: structuredData.merchant || 'Unknown Merchant',
        amount: structuredData.amount || 0,
        date: structuredData.date ? new Date(structuredData.date) : new Date(),
        category,
        description: this.generateDescription(structuredData),
        confidence: ocrResult.confidence,
      };

      // Step 5: Save the extraction for user review
      await this.saveExtraction(extraction, userId, ocrResult.rawText);

      return extraction;
    } catch (error) {
      throw new HttpException(
        `Failed to process receipt: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async extractTextFromImage(imageBuffer: Buffer): Promise<OCRResult> {
    try {
      // In a real implementation, you would use a real OCR service like:
      // - Google Cloud Vision API
      // - AWS Textract
      // - Azure Computer Vision
      // - Tesseract.js
      
      // For this example, we'll simulate OCR results
      const mockOCRResult = this.simulateOCR(imageBuffer);
      
      return mockOCRResult;
    } catch (error) {
      throw new HttpException(
        `OCR processing failed: ${error.message}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async parseReceiptData(ocrResult: OCRResult): Promise<OCRResult> {
    const text = ocrResult.rawText;
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const parsed: OCRResult = {
      ...ocrResult,
      merchant: this.extractMerchant(lines),
      amount: this.extractAmount(lines),
      date: this.extractDate(lines),
      items: this.extractItems(lines),
    };

    return parsed;
  }

  async categorizeExpense(data: OCRResult): Promise<string> {
    // AI-powered categorization based on merchant and items
    const merchant = (data.merchant || '').toLowerCase();
    const items = data.items || [];
    
    // Category mapping based on common patterns
    const categoryMappings = {
      // Food & Dining
      restaurant: ['restaurant', 'cafe', 'diner', 'bistro', 'mcdonald', 'starbucks', 'subway'],
      grocery: ['walmart', 'target', 'kroger', 'safeway', 'whole foods', 'trader joe'],
      fast_food: ['mcdonald', 'burger king', 'kfc', 'taco bell', 'pizza hut'],
      
      // Shopping
      clothing: ['nike', 'adidas', 'gap', 'old navy', 'h&m'],
      electronics: ['best buy', 'apple store', 'amazon', 'newegg'],
      home_goods: ['home depot', 'lowe\'s', 'ikea', 'bed bath'],
      
      // Transportation
      gas: ['shell', 'chevron', 'exxon', 'bp', 'gas station'],
      parking: ['parking', 'garage'],
      ride_share: ['uber', 'lyft', 'taxi'],
      
      // Entertainment
      movies: ['cinema', 'theater', 'netflix', 'hulu'],
      sports: ['ticket', 'stadium', 'arena'],
      
      // Services
      utilities: ['electric', 'water', 'gas company', 'internet'],
      healthcare: ['pharmacy', 'medical', 'clinic', 'hospital'],
    };

    // Check merchant name first
    for (const [category, keywords] of Object.entries(categoryMappings)) {
      if (keywords.some(keyword => merchant.includes(keyword))) {
        return this.mapToStandardCategory(category);
      }
    }

    // Check items
    for (const item of items) {
      const itemName = item.name.toLowerCase();
      for (const [category, keywords] of Object.entries(categoryMappings)) {
        if (keywords.some(keyword => itemName.includes(keyword))) {
          return this.mapToStandardCategory(category);
        }
      }
    }

    // Default category
    return 'General';
  }

  private simulateOCR(imageBuffer: Buffer): OCRResult {
    // Simulate different OCR results based on image size
    const imageSize = imageBuffer.length;
    
    if (imageSize > 100000) {
      // Large image - detailed receipt
      return {
        merchant: 'Sample Restaurant',
        amount: 45.67,
        date: '2024-01-15',
        items: [
          { name: 'Burger', quantity: 2, price: 18.00 },
          { name: 'Fries', quantity: 2, price: 8.00 },
          { name: 'Soda', quantity: 2, price: 6.00 },
          { name: 'Tax', price: 4.67 },
          { name: 'Tip', price: 9.00 },
        ],
        confidence: 0.92,
        rawText: `SAMPLE RESTAURANT
123 Main St
Anytown, USA 12345
(555) 123-4567

DATE: 01/15/2024
TIME: 12:30 PM

Burger x2 $18.00
Fries x2 $8.00
Soda x2 $6.00
Tax $4.67
Tip $9.00

TOTAL: $45.67

THANK YOU FOR DINING WITH US!
PLEASE COME AGAIN`,
      };
    } else if (imageSize > 50000) {
      // Medium image - simple receipt
      return {
        merchant: 'Coffee Shop',
        amount: 12.50,
        date: '2024-01-15',
        confidence: 0.85,
        rawText: `COFFEE SHOP
Latte $4.50
Croissant $3.00
Tax $0.75
Total $8.25
Tip $4.25

$12.50`,
      };
    } else {
      // Small image - minimal data
      return {
        merchant: 'Store',
        amount: 25.00,
        confidence: 0.70,
        rawText: `STORE
Total $25.00`,
      };
    }
  }

  private extractMerchant(lines: string[]): string {
    // Look for merchant name in first few lines
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i];
      // Skip lines that look like dates, addresses, or phone numbers
      if (!this.isDateLine(line) && !this.isAddressLine(line) && !this.isPhoneLine(line)) {
        // Skip lines that are all uppercase and short (likely headers)
        if (line.length > 3 && !line.match(/^[A-Z\s]{3,}$/)) {
          return line;
        }
      }
    }
    return 'Unknown Merchant';
  }

  private extractAmount(lines: string[]): number | undefined {
    // Look for amount patterns
    const amountPatterns = [
      /total[:\s]*\$?(\d+\.\d{2})/i,
      /amount[:\s]*\$?(\d+\.\d{2})/i,
      /\$(\d+\.\d{2})/,
      /(\d+\.\d{2})\s*total/i,
    ];

    for (const line of lines) {
      for (const pattern of amountPatterns) {
        const match = line.match(pattern);
        if (match) {
          return parseFloat(match[1]);
        }
      }
    }

    return undefined;
  }

  private extractDate(lines: string[]): string | undefined {
    // Look for date patterns
    const datePatterns = [
      /date[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /date[:\s]*(\d{4}-\d{2}-\d{2})/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{4}-\d{2}-\d{2})/,
    ];

    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          return match[1];
        }
      }
    }

    return undefined;
  }

  private extractItems(lines: string[]): Array<{ name: string; quantity?: number; price?: number }> {
    const items: Array<{ name: string; quantity?: number; price?: number }> = [];
    
    for (const line of lines) {
      // Look for item patterns: "Item Name $price" or "Item x2 $price"
      const itemPattern = /^(.+?)\s*x?(\d+)?\s*\$?(\d+\.\d{2})$/;
      const match = line.match(itemPattern);
      
      if (match) {
        const name = match[1].trim();
        const quantity = match[2] ? parseInt(match[2]) : 1;
        const price = parseFloat(match[3]);
        
        if (name && price > 0) {
          items.push({ name, quantity, price });
        }
      }
    }

    return items;
  }

  private isDateLine(line: string): boolean {
    return line.match(/\d{1,2}\/\d{1,2}\/\d{4}/) !== null ||
           line.match(/\d{4}-\d{2}-\d{2}/) !== null;
  }

  private isAddressLine(line: string): boolean {
    return line.match(/\d+\s+.*\s+(st|ave|road|dr|lane|blvd)/i) !== null ||
           line.match(/^[A-Z]{2}\s+\d{5}$/) !== null;
  }

  private isPhoneLine(line: string): boolean {
    return line.match(/\(\d{3}\)\s*\d{3}-\d{4}/) !== null ||
           line.match(/\d{3}-\d{3}-\d{4}/) !== null;
  }

  private mapToStandardCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      restaurant: 'Food & Dining',
      grocery: 'Groceries',
      fast_food: 'Food & Dining',
      clothing: 'Shopping',
      electronics: 'Shopping',
      home_goods: 'Home',
      gas: 'Transportation',
      parking: 'Transportation',
      ride_share: 'Transportation',
      movies: 'Entertainment',
      sports: 'Entertainment',
      utilities: 'Bills & Utilities',
      healthcare: 'Healthcare',
    };

    return categoryMap[category] || 'General';
  }

  private generateDescription(data: OCRResult): string {
    const parts = [];
    
    if (data.merchant) {
      parts.push(`Purchase at ${data.merchant}`);
    }
    
    if (data.items && data.items.length > 0) {
      const itemNames = data.items.slice(0, 3).map(item => item.name).join(', ');
      parts.push(`Items: ${itemNames}`);
      if (data.items.length > 3) {
        parts.push(`+${data.items.length - 3} more`);
      }
    }
    
    return parts.join(' - ');
  }

  private async saveExtraction(extraction: ReceiptExtraction, userId: string, rawText: string): Promise<void> {
    // Save the extraction for user review and confirmation
    await this.prisma.receiptExtraction.create({
      data: {
        userId,
        merchant: extraction.merchant,
        amount: extraction.amount,
        date: extraction.date,
        category: extraction.category,
        description: extraction.description,
        confidence: extraction.confidence,
        rawText,
        status: 'PENDING', // PENDING, APPROVED, REJECTED
      },
    });
  }

  async getPendingExtractions(userId: string) {
    return this.prisma.receiptExtraction.findMany({
      where: {
        userId,
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async approveExtraction(userId: string, extractionId: string) {
    const extraction = await this.prisma.receiptExtraction.findFirst({
      where: {
        id: extractionId,
        userId,
      },
    });

    if (!extraction) {
      throw new HttpException('Extraction not found', HttpStatus.NOT_FOUND);
    }

    // Create the actual expense
    await this.prisma.expense.create({
      data: {
        userId,
        amount: extraction.amount,
        date: extraction.date,
        description: extraction.description,
        categoryId: await this.getCategoryId(extraction.category),
        receiptExtractionId: extractionId,
      },
    });

    // Mark extraction as approved
    await this.prisma.receiptExtraction.update({
      where: { id: extractionId },
      data: { status: 'APPROVED' },
    });
  }

  async rejectExtraction(userId: string, extractionId: string) {
    const extraction = await this.prisma.receiptExtraction.findFirst({
      where: {
        id: extractionId,
        userId,
      },
    });

    if (!extraction) {
      throw new HttpException('Extraction not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.receiptExtraction.update({
      where: { id: extractionId },
      data: { status: 'REJECTED' },
    });
  }

  private async getCategoryId(categoryName: string): Promise<string> {
    let category = await this.prisma.category.findFirst({
      where: { name: categoryName },
    });

    if (!category) {
      category = await this.prisma.category.create({
        data: {
          name: categoryName,
          color: this.getRandomColor(),
        },
      });
    }

    return category.id;
  }

  private getRandomColor(): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
