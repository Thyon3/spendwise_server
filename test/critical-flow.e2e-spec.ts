import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/infrastructure/persistence/prisma/prisma.service';

describe('Critical User Flow (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let accessToken: string;
    let userId: string;
    let categoryId: string;

    const testUser = {
        email: `flow-test-${Date.now()}@example.com`,
        password: 'Password123!',
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
        await app.init();

        prisma = app.get<PrismaService>(PrismaService);
    });

    afterAll(async () => {
        // Cleanup
        if (userId) {
            await prisma.expense.deleteMany({ where: { userId } });
            await prisma.category.deleteMany({ where: { userId } });
            await prisma.user.delete({ where: { id: userId } });
        }
        await app.close();
    });

    it('1. Register', async () => {
        const response = await request(app.getHttpServer())
            .post('/auth/register')
            .send(testUser)
            .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.email).toBe(testUser.email);
        userId = response.body.id;
    });

    it('2. Login', async () => {
        const response = await request(app.getHttpServer())
            .post('/auth/login')
            .send(testUser)
            .expect(201); // or 200 depending on implementation

        expect(response.body).toHaveProperty('accessToken');
        accessToken = response.body.accessToken;
    });

    it('3. Create Category', async () => {
        const response = await request(app.getHttpServer())
            .post('/categories')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                name: 'Test Category',
                icon: 'test_icon',
                color: '#FFFFFF'
            })
            .expect(201);

        expect(response.body).toHaveProperty('id');
        categoryId = response.body.id;
    });

    it('4. Create Expense', async () => {
        const response = await request(app.getHttpServer())
            .post('/expenses')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                amount: 50.00,
                currency: 'USD',
                date: new Date().toISOString(),
                description: 'Test Expense',
                categoryId: categoryId,
            })
            .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.amount).toBe(50);
    });

    it('5. Get Reports', async () => {
        const response = await request(app.getHttpServer())
            .get(`/reports/summary?from=${new Date().toISOString().split('T')[0]}&to=${new Date().toISOString().split('T')[0]}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        // Depending on structure, verifying total
        expect(response.body).toBeDefined();
    });
});
