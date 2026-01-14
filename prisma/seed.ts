import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Crear usuario admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@casavidal.com' },
    update: {},
    create: {
      email: 'admin@casavidal.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'CasaVidal',
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin creado:', admin.email);

  // Crear usuario vendedor
  const vendedorPassword = await bcrypt.hash('vendedor123', 10);
  const vendedor = await prisma.user.upsert({
    where: { email: 'vendedor@casavidal.com' },
    update: {},
    create: {
      email: 'vendedor@casavidal.com',
      password: vendedorPassword,
      firstName: 'Juan',
      lastName: 'Pérez',
      role: 'VENDEDOR',
    },
  });
  console.log('✅ Vendedor creado:', vendedor.email);

  // Crear categorías de ejemplo
  const categorias = [
    { name: 'Pinturas', icon: 'Paintbrush' },
    { name: 'Herramientas', icon: 'Wrench' },
    { name: 'Ferretería', icon: 'Hammer' },
    { name: 'Electricidad', icon: 'Zap' },
    { name: 'Plomería', icon: 'Droplet' },
  ];

  for (const cat of categorias) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log('✅ Categorías creadas');

  console.log('🎉 Seeding completado!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });