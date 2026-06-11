import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
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
import recommendationRoutes from './routes/recommendation.routes';

import workersRoutes from './routes/workers.routes';
import eventTypesRoutes from './routes/eventTypes.routes';
import bookingSettingsRoutes from './routes/bookingSettings.routes';
import calendarEventsRoutes from './routes/calendarEvents.routes';
import googleCalendarRoutes from './routes/googleCalendar.routes';
import reportsRoutes from './routes/reports.routes';
import chatRoutes from './routes/chat.routes';
import salesAssistantRoutes from './routes/sales-assistant.routes';
import purchaseOrderRoutes from './routes/purchaseOrder.routes';

const app = express();

app.disable('x-powered-by');

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// Rate limiting — solo en producción, sin límites en desarrollo
if (env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: 'Demasiadas peticiones, intenta más tarde',
    standardHeaders: true,
  });
  app.use('/api/', limiter);
}

// Body parser
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Servir archivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Health check
app.get('/health', (_req, res) => {
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
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/workers', workersRoutes);
app.use('/api/event-types', eventTypesRoutes);
app.use('/api/booking-settings', bookingSettingsRoutes);
app.use('/api/calendar-events', calendarEventsRoutes);
app.use('/api/google-calendar', googleCalendarRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/sales-assistant', salesAssistantRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export { app };
