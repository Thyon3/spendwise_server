import { Test, TestingModule } from '@nestjs/testing';
import { PrismaExpenseRepository } from './prisma-expense.repository';
import { PrismaService } from './prisma.service';

describe('PrismaExpenseRepository', () => {
    let repository: PrismaExpenseRepository;
    let prisma: PrismaService;

    beforeEach(async () => {
        const mockPrisma = {
            expense: {
                create: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
                findUnique: jest.fn(),
                findMany: jest.fn(),
                count: jest.fn(),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PrismaExpenseRepository,
                {
                    provide: PrismaService,
                    useValue: mockPrisma,
                },
            ],
        }).compile();

        repository = module.get<PrismaExpenseRepository>(PrismaExpenseRepository);
        prisma = module.get<PrismaService>(PrismaService);
    });

    it('should create an expense', async () => {
        const data = { amount: 100, currency: 'USD', description: 'Test', date: new Date(), userId: '1', categoryId: '1' };
        (prisma.expense.create as jest.Mock).mockResolvedValue({ id: 'exp-1', ...data });

        const result = await repository.create(data as any);

        expect(result.id).toBe('exp-1');
        expect(prisma.expense.create).toHaveBeenCalled();
    });

    it('should find expenses with filters', async () => {
        (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);
        await repository.findByUser('user-1', { page: 1, limit: 10 });
        expect(prisma.expense.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ userId: 'user-1' }),
        }));
    });
});
