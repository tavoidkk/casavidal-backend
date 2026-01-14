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
  console.log('Admin creado:', admin.email);

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
  console.log('Vendedor creado:', vendedor.email);

  // Crear categorías
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
  console.log('Categorías creadas');

  // clientes de ejemplo
  const clientes = [
    {
      clientType: 'NATURAL' as const,
      firstName: 'María',
      lastName: 'González',
      email: 'maria@email.com',
      phone: '04241234567',
      address: 'Av. 5 de Julio, Casa 123',
      city: 'Maracaibo',
      state: 'Zulia',
      category: 'VIP' as const,
      loyaltyPoints: 500,
      totalPurchases: 15000,
      purchaseCount: 25,
    },
    {
      clientType: 'JURIDICO' as const,
      companyName: 'Construcciones XYZ C.A.',
      rif: 'J-123456789',
      email: 'construcciones@xyz.com',
      phone: '02614567890',
      address: 'Zona Industrial, Galpón 5',
      city: 'Maracaibo',
      state: 'Zulia',
      category: 'MAYORISTA' as const,
      loyaltyPoints: 1000,
      totalPurchases: 50000,
      purchaseCount: 15,
    },
    {
      clientType: 'NATURAL' as const,
      firstName: 'Carlos',
      lastName: 'Ramírez',
      email: 'carlos@email.com',
      phone: '04265556677',
      address: 'Urbanización Bella Vista, Casa 45',
      city: 'Maracaibo',
      state: 'Zulia',
      category: 'REGULAR' as const,
      loyaltyPoints: 150,
      totalPurchases: 3500,
      purchaseCount: 8,
    },
    {
      clientType: 'NATURAL' as const,
      firstName: 'Ana',
      lastName: 'Martínez',
      email: 'ana@email.com',
      phone: '04121112233',
      address: 'Sector Las Delicias, Calle 72',
      city: 'Maracaibo',
      state: 'Zulia',
      category: 'NUEVO' as const,
      loyaltyPoints: 0,
      totalPurchases: 0,
      purchaseCount: 0,
    },
  ];

  for (const clientData of clientes) {
    const client = await prisma.client.upsert({
      where: { 
        rif: clientData.clientType === 'JURIDICO' ? clientData.rif! : `temp-${clientData.email}` 
      },
      update: {},
      create: clientData,
    });

    // scoring inicial
    await prisma.clientScoring.upsert({
      where: { clientId: client.id },
      update: {},
      create: {
        clientId: client.id,
        score: clientData.category === 'VIP' ? 90 : clientData.category === 'REGULAR' ? 65 : 50,
        purchaseFrequency: clientData.purchaseCount,
        averageTicket: clientData.purchaseCount > 0 
          ? clientData.totalPurchases / clientData.purchaseCount 
          : 0,
        lifetimeValue: clientData.totalPurchases,
        churnProbability: clientData.category === 'NUEVO' ? 80 : 20,
      },
    });
  }
  console.log('Clientes y scoring creados');

  console.log('Seeding completado!');
}

main()
  .catch((e) => {
    console.error('Error en seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });