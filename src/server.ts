import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/database';

const PORT = env.PORT;

async function connectWithRetry(retries = 5, delay = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`⏳ DB no disponible, reintentando (${attempt}/${retries})...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

const startServer = async () => {
  try {
    await connectWithRetry();
    console.log('✅ Base de datos conectada');

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Frontend URL: ${env.FRONTEND_URL}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();