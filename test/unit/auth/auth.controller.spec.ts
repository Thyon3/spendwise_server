import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../../src/infrastructure/http/controllers/auth.controller';
import { RegisterUserUseCase } from '../../../src/application/use-cases/auth/register-user.use-case';
import { LoginUserUseCase } from '../../../src/application/use-cases/auth/login-user.use-case';
import { GetCurrentUserUseCase } from '../../../src/application/use-cases/auth/get-current-user.use-case';
import { JwtAuthGuard } from '../../../src/infrastructure/http/guards/jwt-auth.guard';
import { RegisterUserDto } from '../../../src/application/dtos/auth/register-user.dto';
import { LoginUserDto } from '../../../src/application/dtos/auth/login-user.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let registerUserUseCase: RegisterUserUseCase;
  let loginUserUseCase: LoginUserUseCase;
  let getCurrentUserUseCase: GetCurrentUserUseCase;

  const mockRegisterUserUseCase = {
    execute: jest.fn(),
  };

  const mockLoginUserUseCase = {
    execute: jest.fn(),
  };

  const mockGetCurrentUserUseCase = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: RegisterUserUseCase,
          useValue: mockRegisterUserUseCase,
        },
        {
          provide: LoginUserUseCase,
          useValue: mockLoginUserUseCase,
        },
        {
          provide: GetCurrentUserUseCase,
          useValue: mockGetCurrentUserUseCase,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    registerUserUseCase = module.get<RegisterUserUseCase>(RegisterUserUseCase);
    loginUserUseCase = module.get<LoginUserUseCase>(LoginUserUseCase);
    getCurrentUserUseCase = module.get<GetCurrentUserUseCase>(GetCurrentUserUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto: RegisterUserDto = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const expectedUser = {
        id: '1',
        email: 'test@example.com',
        createdAt: new Date(),
      };

      mockRegisterUserUseCase.execute.mockResolvedValue(expectedUser);

      const result = await controller.register(registerDto);

      expect(result).toEqual(expectedUser);
      expect(registerUserUseCase.execute).toHaveBeenCalledWith(registerDto);
    });

    it('should handle registration errors', async () => {
      const registerDto: RegisterUserDto = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      mockRegisterUserUseCase.execute.mockRejectedValue(new Error('Email already exists'));

      await expect(controller.register(registerDto)).rejects.toThrow('Email already exists');
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginDto: LoginUserDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const expectedResponse = {
        accessToken: 'jwt-token',
        user: {
          id: '1',
          email: 'test@example.com',
        },
      };

      mockLoginUserUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(expectedResponse);
      expect(loginUserUseCase.execute).toHaveBeenCalledWith(loginDto);
    });

    it('should handle login errors', async () => {
      const loginDto: LoginUserDto = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      mockLoginUserUseCase.execute.mockRejectedValue(new Error('Invalid credentials'));

      await expect(controller.login(loginDto)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('getMe', () => {
    it('should get current user profile', async () => {
      const userId = '1';
      const mockRequest = { user: { userId } };

      const expectedUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockGetCurrentUserUseCase.execute.mockResolvedValue(expectedUser);

      const result = await controller.getMe(mockRequest);

      expect(result).toEqual(expectedUser);
      expect(getCurrentUserUseCase.execute).toHaveBeenCalledWith(userId);
    });
  });
});
