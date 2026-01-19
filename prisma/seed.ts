import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ============================================
  // USUARIOS
  // ============================================
  
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

  // ============================================
  // CATEGORÍAS
  // ============================================
  
  const categorias = [
    { name: 'Pinturas', icon: 'Paintbrush' },
    { name: 'Herramientas', icon: 'Wrench' },
    { name: 'Ferretería', icon: 'Hammer' },
    { name: 'Electricidad', icon: 'Zap' },
    { name: 'Plomería', icon: 'Droplet' },
  ];

  const categoriasCreadas = [];
  for (const cat of categorias) {
    const categoria = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    categoriasCreadas.push(categoria);
  }
  console.log('✅ Categorías creadas');

  // ============================================
  // CLIENTES
  // ============================================
  
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

    // Crear scoring inicial
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
  console.log('✅ Clientes y scoring creados');

  // ============================================
  // PRODUCTOS
  // ============================================
  
  const productos = [
    // Pinturas
    {
      name: 'Pintura Latex Blanco',
      sku: 'PAINT-LAT-WHI-001',
      barcode: '7501234567890',
      categoryId: categoriasCreadas[0].id,
      costPrice: 150,
      salePrice: 250,
      wholesalePrice: 220,
      currentStock: 50,
      minStock: 10,
      unit: 'galón',
      description: 'Pintura látex lavable color blanco para interiores',
      hasVariants: true,
    },
    {
      name: 'Pintura Esmalte Azul',
      sku: 'PAINT-ESM-BLU-002',
      categoryId: categoriasCreadas[0].id,
      costPrice: 180,
      salePrice: 300,
      wholesalePrice: 270,
      currentStock: 25,
      minStock: 8,
      unit: 'galón',
      description: 'Pintura esmalte sintético color azul',
    },
    {
      name: 'Thinner',
      sku: 'PAINT-THI-001',
      categoryId: categoriasCreadas[0].id,
      costPrice: 40,
      salePrice: 65,
      currentStock: 100,
      minStock: 20,
      unit: 'litro',
      description: 'Thinner estándar para dilución',
    },
    // Herramientas
    {
      name: 'Martillo Carpintero',
      sku: 'TOOL-HAM-001',
      barcode: '7501234567891',
      categoryId: categoriasCreadas[1].id,
      costPrice: 80,
      salePrice: 150,
      wholesalePrice: 135,
      currentStock: 30,
      minStock: 5,
      unit: 'unidad',
      description: 'Martillo con mango de madera 16oz',
    },
    {
      name: 'Destornillador Plano',
      sku: 'TOOL-SCR-FLA-001',
      categoryId: categoriasCreadas[1].id,
      costPrice: 25,
      salePrice: 45,
      currentStock: 60,
      minStock: 15,
      unit: 'unidad',
      description: 'Destornillador plano 6"',
    },
    {
      name: 'Taladro Eléctrico',
      sku: 'TOOL-DRI-ELE-001',
      categoryId: categoriasCreadas[1].id,
      costPrice: 350,
      salePrice: 650,
      wholesalePrice: 600,
      currentStock: 8,
      minStock: 3,
      unit: 'unidad',
      description: 'Taladro eléctrico 1/2" 600W',
    },
    // Ferretería
    {
      name: 'Tornillos Acero 1/4"',
      sku: 'HARD-SCR-STE-001',
      categoryId: categoriasCreadas[2].id,
      costPrice: 0.5,
      salePrice: 1.2,
      currentStock: 5000,
      minStock: 500,
      unit: 'unidad',
      description: 'Tornillos de acero 1/4" x 1"',
    },
    {
      name: 'Clavos 2"',
      sku: 'HARD-NAI-002',
      categoryId: categoriasCreadas[2].id,
      costPrice: 0.3,
      salePrice: 0.7,
      currentStock: 10000,
      minStock: 1000,
      unit: 'unidad',
      description: 'Clavos de acero 2"',
    },
    {
      name: 'Candado 40mm',
      sku: 'HARD-LOC-040-001',
      categoryId: categoriasCreadas[2].id,
      costPrice: 45,
      salePrice: 85,
      currentStock: 4,
      minStock: 10,
      unit: 'unidad',
      description: 'Candado de seguridad 40mm',
    },
    // Electricidad
    {
      name: 'Cable Eléctrico 12 AWG',
      sku: 'ELEC-CAB-12-001',
      categoryId: categoriasCreadas[3].id,
      costPrice: 15,
      salePrice: 28,
      currentStock: 200,
      minStock: 50,
      unit: 'metro',
      description: 'Cable eléctrico calibre 12 AWG',
    },
    {
      name: 'Bombillo LED 9W',
      sku: 'ELEC-BUL-LED-9W',
      categoryId: categoriasCreadas[3].id,
      costPrice: 18,
      salePrice: 35,
      currentStock: 0,
      minStock: 20,
      unit: 'unidad',
      description: 'Bombillo LED 9W luz blanca',
    },
    {
      name: 'Interruptor Simple',
      sku: 'ELEC-SWI-SIM-001',
      categoryId: categoriasCreadas[3].id,
      costPrice: 12,
      salePrice: 22,
      currentStock: 150,
      minStock: 30,
      unit: 'unidad',
      description: 'Interruptor simple 15A 110V',
    },
    // Plomería
    {
      name: 'Tubo PVC 1/2"',
      sku: 'PLUM-TUB-PVC-05',
      categoryId: categoriasCreadas[4].id,
      costPrice: 25,
      salePrice: 45,
      currentStock: 80,
      minStock: 15,
      unit: 'unidad',
      description: 'Tubo PVC 1/2" x 3m',
    },
    {
      name: 'Codo PVC 90° 1/2"',
      sku: 'PLUM-ELB-PVC-05',
      categoryId: categoriasCreadas[4].id,
      costPrice: 3,
      salePrice: 6,
      currentStock: 500,
      minStock: 100,
      unit: 'unidad',
      description: 'Codo PVC 90 grados 1/2"',
    },
    {
      name: 'Llave de Paso 1/2"',
      sku: 'PLUM-VAL-05',
      categoryId: categoriasCreadas[4].id,
      costPrice: 35,
      salePrice: 65,
      currentStock: 20,
      minStock: 5,
      unit: 'unidad',
      description: 'Llave de paso 1/2" bronce',
    },
  ];

  for (const prodData of productos) {
    const producto = await prisma.product.upsert({
      where: { sku: prodData.sku },
      update: {},
      create: prodData,
    });

    // Crear movimiento inicial si tiene stock
    if (prodData.currentStock > 0) {
      await prisma.inventoryMovement.create({
        data: {
          productId: producto.id,
          type: 'ENTRADA',
          quantity: prodData.currentStock,
          stockBefore: 0,
          stockAfter: prodData.currentStock,
          notes: 'Stock inicial',
        },
      });
    }
  }
  console.log('✅ Productos creados con movimientos de inventario');

  // ============================================
  // VARIANTES DE PRODUCTOS
  // ============================================
  
  const pinturaLatex = await prisma.product.findUnique({
    where: { sku: 'PAINT-LAT-WHI-001' },
  });

  if (pinturaLatex) {
    const variantes = [
      {
        name: 'Pintura Latex Blanco 1L',
        sku: 'PAINT-LAT-WHI-001-1L',
        categoryId: categoriasCreadas[0].id,
        costPrice: 40,
        salePrice: 70,
        currentStock: 120,
        minStock: 20,
        unit: 'litro',
        parentProductId: pinturaLatex.id,
        variantInfo: '1 Litro',
        description: 'Pintura látex blanco presentación 1 litro',
      },
      {
        name: 'Pintura Latex Blanco 4L',
        sku: 'PAINT-LAT-WHI-001-4L',
        categoryId: categoriasCreadas[0].id,
        costPrice: 150,
        salePrice: 250,
        currentStock: 50,
        minStock: 10,
        unit: 'galón',
        parentProductId: pinturaLatex.id,
        variantInfo: '4 Litros (1 Galón)',
        description: 'Pintura látex blanco presentación 4 litros',
      },
    ];

    for (const varData of variantes) {
      const variante = await prisma.product.upsert({
        where: { sku: varData.sku },
        update: {},
        create: varData,
      });

      // Crear movimiento inicial para variantes
      if (varData.currentStock > 0) {
        await prisma.inventoryMovement.create({
          data: {
            productId: variante.id,
            type: 'ENTRADA',
            quantity: varData.currentStock,
            stockBefore: 0,
            stockAfter: varData.currentStock,
            notes: 'Stock inicial - variante',
          },
        });
      }
    }
    console.log('✅ Variantes de productos creadas');
  }

  console.log('🎉 Seeding completado!');
  console.log('');
  console.log('📊 Resumen:');
  console.log('  - 2 usuarios creados');
  console.log('  - 5 categorías creadas');
  console.log('  - 4 clientes creados');
  console.log('  - 15 productos creados');
  console.log('  - 2 variantes creadas');
  console.log('  - Movimientos de inventario registrados');
}

main()
  .catch((e) => {
    console.error('❌ Error en seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });