import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/infrastructure/persistence/prisma/prisma.service';
import { PrismaBudgetRepository } from '../../src/infrastructure/persistence/prisma/prisma-budget.repository';
import { Budget, PeriodType } from '../../src/domain/entities/budget.entity';
import { ConfigModule } from '@nestjs/config';

// This integration test assumes a running database is available and configured via .env.test or similar
// For environment without DB, this might be skipped or mocked.
describe('PrismaBudgetRepository (Integration)', () => {
    let repository: PrismaBudgetRepository;
    let prisma: PrismaService;

    beforeAll(async () => {
        // Check if we are in a CI environment without DB or similar constraint
        // If we want to skip if no DB, we'd need logic here. 
        // For now, we assume user configures it as per "Phase 6" requirements.

        const module: TestingModule = await Test.createTestingModule({
            imports: [ConfigModule.forRoot()],
            providers: [PrismaBudgetRepository, PrismaService],
        }).compile();

        repository = module.get<PrismaBudgetRepository>(PrismaBudgetRepository);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    // Clean up data
    afterEach(async () => {
        // Delete budgets created during tests
        // Using raw prisma queries to clean up
        await prisma.budget.deleteMany({ where: { name: { startsWith: 'IntTest' } } });
    });

    it('should be defined', () => {
        expect(repository).toBeDefined();
    });

    it('should create and retrieve a budget', async () => {
        // We need a valid user ID. In integration tests, we usually seed a user or use a fixed one.
        // For this example, we'll try to find a user or create one, or just assume one exists if we can.
        // Ideally we create a temporary user.

        // Create a temp user for test
        const user = await prisma.user.create({
            data: {
                email: `int-test-${Date.now()}@example.com`,
                password: 'hashedpassword',
            }
        });

        try {
            const budgetData: Partial<Budget> = {
                userId: user.id,
                name: 'IntTest Budget',
                amountLimit: 1000,
                currency: 'USD',
                periodType: PeriodType.MONTHLY,
                periodStart: null,
                periodEnd: null,
            };

            const created = await repository.create(budgetData);
            expect(created.id).toBeDefined();
            expect(created.name).toBe('IntTest Budget');

            const found = await repository.findById(created.id);
            expect(found).toBeDefined();
            expect(found!.id).toBe(created.id);
            expect(found!.amountLimit).toBe(1000);

            const userBudgets = await repository.findByUser(user.id);
            expect(userBudgets.length).toBeGreaterThanOrEqual(1);
            expect(userBudgets.find(b => b.id === created.id)).toBeDefined();

            // Update
            const updated = await repository.update(created.id, { amountLimit: 2000 });
            expect(updated.amountLimit).toBe(2000);

            // Delete
            await repository.delete(created.id);
            const postDelete = await repository.findById(created.id);
            expect(postDelete).toBeNull();

        } finally {
            // Cleanup user
            await prisma.user.delete({ where: { id: user.id } });
        }
    });
});
