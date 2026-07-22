import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  BACKEND_URL: z.string().url().default('http://localhost:3000'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY es requerida para funciones de IA'),
  OPENROUTER_MODEL: z.string().default('deepseek/deepseek-chat'),
  DOLARAPI_URL: z.string().url().default('https://ve.dolarapi.com/v1/dolares/oficial'),
  DOLARAPI_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY es requerida'),
  COMPANY_NAME: z.string().default('Casa Vidal'),
  COMPANY_LOGO_URL: z.string().url().default('https://resend.com/static/logo.png'),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error('Error en variables de entorno:');
  if (error instanceof z.ZodError) {
    error.issues.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
  }
  process.exit(1);
}

export { env };
