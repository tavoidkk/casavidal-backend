import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';

// Rutas
import authRoutes from './routes/auth.routes';
import clientRoutes from './routes/client.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import saleRoutes from './routes/sale.routes';
import specialOrderRoutes from './routes/specialOrder.routes';
import dashboardRoutes from './routes/dashboard.routes';
import supplierRoutes from './routes/supplier.routes';
import notificationRoutes from './routes/notification.routes';
import activityRoutes from './routes/activity.routes';
import settingsRoutes from './routes/settings.routes';
import excelRoutes from './routes/excel.routes';

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/special-orders', specialOrderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/excel', excelRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export { app };