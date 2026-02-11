import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/database';

const PORT = env.PORT;

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('Base de datos conectada');

    // Start server
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Frontend URL: ${env.FRONTEND_URL}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();