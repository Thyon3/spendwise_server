import { Tag } from '../entities/tag.entity';

export abstract class ITagRepository {
    abstract create(data: Partial<Tag>): Promise<Tag>;
    abstract findByUser(userId: string): Promise<Tag[]>;
    abstract findById(id: string): Promise<Tag | null>;
    abstract findByName(userId: string, name: string): Promise<Tag | null>;
    abstract update(id: string, data: Partial<Tag>): Promise<Tag>;
    abstract delete(id: string): Promise<void>;
}
