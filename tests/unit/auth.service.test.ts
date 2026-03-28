import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../src/services/auth.services'; 
// Note: we're mocking the entire modules below

// Use vi.hoisted to ensure mocks are created before imports
const mocks = vi.hoisted(() => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    },
    passwordUtils: {
      hashPassword: vi.fn(async (pass) => `hashed-${pass}`),
      comparePassword: vi.fn(),
    },
    jwtUtils: {
      generateToken: vi.fn(() => 'mock-jwt-token'),
    },
  };
});

// Mock dependencies
vi.mock('../../src/config/database', () => ({
  prisma: mocks.prisma,
}));

vi.mock('../../src/utils/jwt', () => ({
  generateToken: mocks.jwtUtils.generateToken,
}));

vi.mock('../../src/utils/password', () => ({
  hashPassword: mocks.passwordUtils.hashPassword,
  comparePassword: mocks.passwordUtils.comparePassword,
}));

// We need to mock AppError if it's imported in the service
vi.mock('../../src/middleware/errorHandler', () => {
  return {
    AppError: class extends Error {
      statusCode: number;
      constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
      }
    },
  };
});

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      // Arrange
      const loginData = { email: 'test@example.com', password: 'password123' };
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashedPassword', // Stored hash
        role: 'VENDEDOR',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
      };

      // Setup mocks
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);
      mocks.passwordUtils.comparePassword.mockResolvedValue(true); // Password matches
      mocks.jwtUtils.generateToken.mockReturnValue('fake-jwt-token');

      // Act
      const result = await AuthService.login(loginData);

      // Assert
      expect(result).toHaveProperty('token', 'fake-jwt-token');
      expect(result.user).toHaveProperty('email', 'test@example.com');
      expect(mocks.prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: loginData.email } });
      expect(mocks.passwordUtils.comparePassword).toHaveBeenCalledWith(loginData.password, mockUser.password);
    });

    it('should throw error if user not found', async () => {
      // Arrange
      mocks.prisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(AuthService.login({ email: 'wrong@example.com', password: '123' }))
        .rejects.toThrow('Credenciales inválidas');
    });

    it('should throw error if password does not match', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashedPassword',
        isActive: true,
      };
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);
      mocks.passwordUtils.comparePassword.mockResolvedValue(false); // Wrong password

      // Act & Assert
      await expect(AuthService.login({ email: 'test@example.com', password: 'wrong' }))
        .rejects.toThrow('Credenciales inválidas');
    });
    
    it('should throw error if user is inactive', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        isActive: false, // Inactive
      };
      mocks.prisma.user.findUnique.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(AuthService.login({ email: 'test@example.com', password: '123' }))
        .rejects.toThrow('Usuario inactivo');
    });
  });
});
