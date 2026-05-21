import { app } from './app';
import { env } from './config/env';
import { prisma, pool } from './config/database';

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

async function shutdown() {
  console.log('\n🛑 Cerrando servidor...');
  try {
    await prisma.$disconnect();
    await pool.end();
    console.log('✅ Conexiones cerradas');
  } catch (err) {
    console.error('Error al cerrar conexiones:', err);
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const startServer = async () => {
  try {
    await connectWithRetry();
    console.log('✅ Base de datos conectada');

    const server = app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Frontend URL: ${env.FRONTEND_URL}`);
    });

    server.on('close', async () => {
      await shutdown();
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();
