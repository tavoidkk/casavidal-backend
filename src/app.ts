import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por ventana
  message: 'Demasiadas peticiones, intenta más tarde',
});
app.use('/api/', limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Routes (las agregaremos después)
// app.use('/api/auth', authRoutes);
// app.use('/api/clients', clientRoutes);
// etc...

// Error handling
app.use(notFound);
app.use(errorHandler);

export { app };