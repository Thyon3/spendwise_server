import { Test, TestingModule } from '@nestjs/testing';
import { LoginUserUseCase } from './login-user.use-case';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('LoginUserUseCase', () => {
    let useCase: LoginUserUseCase;
    let userRepository: jest.Mocked<IUserRepository>;
    let jwtService: jest.Mocked<JwtService>;

    beforeEach(async () => {
        const mockUserRepository = {
            findByEmail: jest.fn(),
        };
        const mockJwtService = {
            sign: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LoginUserUseCase,
                {
                    provide: IUserRepository,
                    useValue: mockUserRepository,
                },
                {
                    provide: JwtService,
                    useValue: mockJwtService,
                },
            ],
        }).compile();

        useCase = module.get<LoginUserUseCase>(LoginUserUseCase);
        userRepository = module.get(IUserRepository);
        jwtService = module.get(JwtService);
    });

    it('should login successfully and return a token', async () => {
        const loginDto = { email: 'test@example.com', password: 'Password123!' };
        const hashedPassword = await bcrypt.hash(loginDto.password, 10);
        const user = { id: '1', email: loginDto.email, password: hashedPassword };

        userRepository.findByEmail.mockResolvedValue(user as any);
        jwtService.sign.mockReturnValue('mock-jwt-token');

        const result = await useCase.execute(loginDto);

        expect(result.token).toBe('mock-jwt-token');
        expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
        const loginDto = { email: 'test@example.com', password: 'WrongPassword' };
        const hashedPassword = await bcrypt.hash('CorrectPassword', 10);
        const user = { id: '1', email: loginDto.email, password: hashedPassword };

        userRepository.findByEmail.mockResolvedValue(user as any);

        await expect(useCase.execute(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
        userRepository.findByEmail.mockResolvedValue(null);

        await expect(useCase.execute({ email: 'none@ex.com', password: 'any' })).rejects.toThrow(UnauthorizedException);
    });
});
