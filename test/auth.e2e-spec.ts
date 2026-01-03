import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/infrastructure/persistence/prisma/prisma.service';

describe('Authentication (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());
        await app.init();

        prisma = app.get<PrismaService>(PrismaService);
        // Cleanup test user if exists
        await prisma.user.deleteMany({ where: { email: 'e2e@test.com' } });
    });

    afterAll(async () => {
        await prisma.user.deleteMany({ where: { email: 'e2e@test.com' } });
        await app.close();
    });

    it('/auth/register (POST)', () => {
        return request(app.getHttpServer())
            .post('/auth/register')
            .send({ email: 'e2e@test.com', password: 'Password123!' })
            .expect(201)
            .then((res) => {
                expect(res.body.email).toBe('e2e@test.com');
                expect(res.body.id).toBeDefined();
            });
    });

    it('/auth/login (POST)', () => {
        return request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'e2e@test.com', password: 'Password123!' })
            .expect(200)
            .then((res) => {
                expect(res.body.token).toBeDefined();
                expect(res.body.user.email).toBe('e2e@test.com');
            });
    });

    it('/auth/login (POST) - invalid password', () => {
        return request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'e2e@test.com', password: 'WrongPassword' })
            .expect(401);
    });
});
