import { Injectable } from '@nestjs/common';
import { ITagRepository } from '../../../../domain/repositories/tag.repository.interface';
import { Tag } from '../../../../domain/entities/tag.entity';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaTagRepository implements ITagRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Partial<Tag>): Promise<Tag> {
        const created = await this.prisma.tag.create({
            data: {
                name: data.name!,
                userId: data.userId!,
            },
        });
        return new Tag(created);
    }

    async findByUser(userId: string): Promise<Tag[]> {
        const items = await this.prisma.tag.findMany({ where: { userId } });
        return items.map((i) => new Tag(i));
    }

    async findById(id: string): Promise<Tag | null> {
        const found = await this.prisma.tag.findUnique({ where: { id } });
        return found ? new Tag(found) : null;
    }

    async findByName(userId: string, name: string): Promise<Tag | null> {
        const found = await this.prisma.tag.findUnique({
            where: {
                userId_name: { userId, name },
            },
        });
        return found ? new Tag(found) : null;
    }

    async update(id: string, data: Partial<Tag>): Promise<Tag> {
        const updated = await this.prisma.tag.update({
            where: { id },
            data: {
                name: data.name,
            },
        });
        return new Tag(updated);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.tag.delete({ where: { id } });
    }
}
