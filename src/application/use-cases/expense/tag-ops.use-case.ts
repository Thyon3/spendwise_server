import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ITagRepository } from '../../../domain/repositories/tag.repository.interface';
import { Tag } from '../../../domain/entities/tag.entity';
import { CreateTagDto, UpdateTagDto } from '../../dtos/expense/tag.dto';

@Injectable()
export class CreateTagUseCase {
    constructor(private readonly tagRepository: ITagRepository) { }

    async execute(userId: string, dto: CreateTagDto): Promise<Tag> {
        const existing = await this.tagRepository.findByName(userId, dto.name);
        if (existing) throw new ConflictException('Tag already exists');

        return this.tagRepository.create({
            name: dto.name,
            userId,
        });
    }
}

@Injectable()
export class ListTagsUseCase {
    constructor(private readonly tagRepository: ITagRepository) { }

    async execute(userId: string): Promise<Tag[]> {
        return this.tagRepository.findByUser(userId);
    }
}

@Injectable()
export class DeleteTagUseCase {
    constructor(private readonly tagRepository: ITagRepository) { }

    async execute(userId: string, id: string): Promise<void> {
        const tag = await this.tagRepository.findById(id);
        if (!tag) throw new NotFoundException('Tag not found');
        if (tag.userId !== userId) throw new ForbiddenException('Not owner');

        await this.tagRepository.delete(id);
    }
}
