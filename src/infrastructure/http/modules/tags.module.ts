import { Module } from '@nestjs/common';
import { TagsController } from '../controllers/tags.controller';
import { CreateTagUseCase, ListTagsUseCase, DeleteTagUseCase } from '../../../../application/use-cases/expense/tag-ops.use-case';
import { ITagRepository } from '../../../../domain/repositories/tag.repository.interface';
import { PrismaTagRepository } from '../../persistence/prisma/prisma-tag.repository';

@Module({
    controllers: [TagsController],
    providers: [
        CreateTagUseCase,
        ListTagsUseCase,
        DeleteTagUseCase,
        {
            provide: ITagRepository,
            useClass: PrismaTagRepository,
        },
    ],
    exports: [ITagRepository],
})
export class TagsModule { }
