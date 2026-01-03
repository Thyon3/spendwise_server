import { Test, TestingModule } from '@nestjs/testing';
import { LoginUserUseCase } from './login-user.use-case';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { IPasswordHasher } from '../../../domain/services/password-hasher.interface';
import { ITokenService } from '../../../domain/services/token-service.interface';
import { UnauthorizedException } from '@nestjs/common';

describe('LoginUserUseCase', () => {
    let useCase: LoginUserUseCase;
    let userRepository: jest.Mocked<IUserRepository>;
    let passwordHasher: jest.Mocked<IPasswordHasher>;
    let tokenService: jest.Mocked<ITokenService>;

    beforeEach(async () => {
        const mockUserRepository = {
            findByEmail: jest.fn(),
        };
        const mockPasswordHasher = {
            hash: jest.fn(),
            compare: jest.fn(),
        };
        const mockTokenService = {
            generateToken: jest.fn(),
            verifyToken: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LoginUserUseCase,
                {
                    provide: IUserRepository,
                    useValue: mockUserRepository,
                },
                {
                    provide: IPasswordHasher,
                    useValue: mockPasswordHasher,
                },
                {
                    provide: ITokenService,
                    useValue: mockTokenService,
                },
            ],
        }).compile();

        useCase = module.get<LoginUserUseCase>(LoginUserUseCase);
        userRepository = module.get(IUserRepository);
        passwordHasher = module.get(IPasswordHasher);
        tokenService = module.get(ITokenService);
    });

    it('should login successfully and return a token', async () => {
        const loginDto = { email: 'test@example.com', password: 'Password123!' };
        const hashedPassword = 'hashedPassword';
        const user = { id: '1', email: loginDto.email, password: hashedPassword, createdAt: new Date() };

        userRepository.findByEmail.mockResolvedValue(user as any);
        passwordHasher.compare.mockResolvedValue(true);
        tokenService.generateToken.mockResolvedValue('mock-jwt-token');

        const result = await useCase.execute(loginDto);

        expect(result.accessToken).toBe('mock-jwt-token');
        expect(result.user.email).toBe(loginDto.email);
        expect(passwordHasher.compare).toHaveBeenCalledWith(loginDto.password, hashedPassword);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
        const loginDto = { email: 'test@example.com', password: 'WrongPassword' };
        const user = { id: '1', email: loginDto.email, password: 'hashedPassword' };

        userRepository.findByEmail.mockResolvedValue(user as any);
        passwordHasher.compare.mockResolvedValue(false);

        await expect(useCase.execute(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
        userRepository.findByEmail.mockResolvedValue(null);

        await expect(useCase.execute({ email: 'none@ex.com', password: 'any' })).rejects.toThrow(UnauthorizedException);
    });
});
