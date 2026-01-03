import { Test, TestingModule } from '@nestjs/testing';
import { RegisterUserUseCase } from './register-user.use-case';
import { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import { IPasswordHasher } from '../../../domain/services/password-hasher.interface';
import { ConflictException } from '@nestjs/common';

describe('RegisterUserUseCase', () => {
    let useCase: RegisterUserUseCase;
    let userRepository: jest.Mocked<IUserRepository>;
    let passwordHasher: jest.Mocked<IPasswordHasher>;

    beforeEach(async () => {
        const mockUserRepository = {
            findByEmail: jest.fn(),
            create: jest.fn(),
        };
        const mockPasswordHasher = {
            hash: jest.fn(),
            compare: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RegisterUserUseCase,
                {
                    provide: IUserRepository,
                    useValue: mockUserRepository,
                },
                {
                    provide: IPasswordHasher,
                    useValue: mockPasswordHasher,
                },
            ],
        }).compile();

        useCase = module.get<RegisterUserUseCase>(RegisterUserUseCase);
        userRepository = module.get(IUserRepository);
        passwordHasher = module.get(IPasswordHasher);
    });

    it('should register a user successfully', async () => {
        const registerDto = { email: 'test@example.com', password: 'Password123!' };
        const hashedPassword = 'hashedPassword';

        userRepository.findByEmail.mockResolvedValue(null);
        passwordHasher.hash.mockResolvedValue(hashedPassword);
        userRepository.create.mockResolvedValue({ id: '1', email: registerDto.email, createdAt: new Date(), updatedAt: new Date() } as any);

        const result = await useCase.execute(registerDto);

        expect(result.id).toBe('1');
        expect(result.email).toBe(registerDto.email);
        expect(userRepository.create).toHaveBeenCalledWith({
            email: registerDto.email,
            password: hashedPassword,
        });
    });

    it('should throw ConflictException if user already exists', async () => {
        const registerDto = { email: 'test@example.com', password: 'Password123!' };
        userRepository.findByEmail.mockResolvedValue({ id: '1', email: registerDto.email } as any);

        await expect(useCase.execute(registerDto)).rejects.toThrow(ConflictException);
    });
});
