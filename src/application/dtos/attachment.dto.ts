import { IsString, IsNumber } from 'class-validator';

export class CreateAttachmentDto {
  @IsString()
  expenseId: string;

  @IsString()
  fileName: string;

  @IsString()
  fileUrl: string;

  @IsNumber()
  fileSize: number;

  @IsString()
  mimeType: string;
}
