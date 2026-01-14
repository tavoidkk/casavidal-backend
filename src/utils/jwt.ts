import { sign, verify, Secret, SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

type JwtPayload = { userId: string; role: string };

export const generateToken = (userId: string, role: string): string => {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return sign({ userId, role } as JwtPayload, env.JWT_SECRET as Secret, options);
};

export const verifyToken = (token: string): JwtPayload => {
  return verify(token, env.JWT_SECRET as Secret) as JwtPayload;
};