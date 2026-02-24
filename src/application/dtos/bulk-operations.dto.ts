import { IsArray, IsString } from 'class-validator';

export class BulkDeleteDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}

export class BulkUpdateCategoryDto {
  @IsArray()
  @IsString({ each: true })
  expenseIds: string[];

  @IsString()
  categoryId: string;
}

export class BulkAddTagsDto {
  @IsArray()
  @IsString({ each: true })
  expenseIds: string[];

  @IsArray()
  @IsString({ each: true })
  tagIds: string[];
}
