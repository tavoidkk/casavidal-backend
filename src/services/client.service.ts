import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { CreateClientInput, UpdateClientInput, ClientFilters } from '../types/client.types';
import { Prisma } from '@prisma/client';

export class ClientService {
  // Crear cliente
static async create(data: CreateClientInput) {
  // Si viene docNumber, construir document
  if (data.docNumber && data.docPrefix) {
    data.document = `${data.docPrefix}${data.docNumber}${data.docCheck || ''}`.replace(/-/g, '');
  }

  // Validar que tenga los datos según el tipo
  if (data.clientType === 'NATURAL' && (!data.firstName || !data.lastName)) {
    throw new AppError(400, 'Nombre y apellido son requeridos para persona natural');
  }

    // Verificar documento duplicado solo si viene
    if (data.document) {
      const existingDocument = await prisma.client.findUnique({
        where: { document: data.document },
      });
      if (existingDocument) {
        throw new AppError(409, 'Ya existe un cliente con esta cédula');
      }
    }

    // Verificar RIF duplicado si es jurídico
    if (data.rif) {
      const existing = await prisma.client.findUnique({
        where: { rif: data.rif },
      });
      if (existing) {
        throw new AppError(409, 'Ya existe un cliente con este RIF');
      }
    }

    const { docPrefix, docNumber, docCheck, ...clientData } = data;
    // Crear cliente
    const client = await prisma.client.create({
      data: {
        ...clientData,
        category: data.category || 'NUEVO',
      },
      include: {
        scoring: true,
      },
    });

    // Crear registro de scoring inicial
    await prisma.clientScoring.create({
      data: {
        clientId: client.id,
        score: 50,
      },
    });

    return client;
  }

  // Listar clientes con filtros y paginación
  static async findAll(filters: ClientFilters) {
    const {
      search,
      category,
      clientType,
      isActive,
      page = 1,
      limit = 10,
    } = filters;

    // Construir condiciones de búsqueda
    const where: Prisma.ClientWhereInput = {
      AND: [
        isActive !== undefined ? { isActive } : {},
        category ? { category } : {},
        clientType ? { clientType } : {},
        search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { companyName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
              ],
            }
          : {},
      ],
    };

    // Ejecutar query con paginación
    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          scoring: {
            select: {
              score: true,
              churnProbability: true,
              recommendedProducts: true,
            },
          },
          _count: {
            select: {
              sales: true,
              activities: true,
            },
          },
        },
        orderBy: [
          { category: 'asc' },
          { lastPurchaseAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.client.count({ where }),
    ]);

    return {
      clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Obtener cliente por ID
  static async findById(id: string) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        scoring: true,
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            saleNumber: true,
            total: true,
            createdAt: true,
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            assignedTo: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            sales: true,
            specialOrders: true,
            activities: true,
          },
        },
      },
    });

    if (!client) {
      throw new AppError(404, 'Cliente no encontrado');
    }

    return client;
  }

  // Actualizar cliente
  static async update(id: string, data: UpdateClientInput) {
    await this.findById(id);

     // Si viene docNumber, construir document
    if (data.docNumber && data.docPrefix) {
      data.document = `${data.docPrefix}${data.docNumber}${data.docCheck || ''}`.replace(/-/g, '');
    }

    // Verificar cédula duplicada si se está actualizando
    if (data.document) {
      const existingDocument = await prisma.client.findFirst({
        where: {
          document: data.document,
          NOT: { id },
        },
      });
      if (existingDocument) {
        throw new AppError(409, 'Ya existe un cliente con esta cédula');
      }
    }

    // Verificar RIF duplicado si se está actualizando
    if (data.rif) {
      const existing = await prisma.client.findFirst({
        where: {
          rif: data.rif,
          NOT: { id },
        },
      });
      if (existing) {
        throw new AppError(409, 'Ya existe un cliente con este RIF');
      }
    }

    const { docPrefix, docNumber, docCheck, ...updateData } = data;

    const client = await prisma.client.update({
      where: { id },
      data: updateData,
      include: {
        scoring: true,
      },
    });

    return client;
  }

  // Eliminar (soft delete)
  static async delete(id: string) {
    await this.findById(id);

    await prisma.client.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Cliente desactivado exitosamente' };
  }

  // Obtener clientes VIP
  static async getVIPClients() {
    const clients = await prisma.client.findMany({
      where: {
        category: 'VIP',
        isActive: true,
      },
      include: {
        scoring: true,
      },
      orderBy: {
        totalPurchases: 'desc',
      },
      take: 20,
    });

    return clients;
  }

  // Obtener clientes con mayor scoring
  static async getTopScoringClients(limit = 10) {
    const clients = await prisma.client.findMany({
      where: { isActive: true },
      include: {
        scoring: true,
      },
      orderBy: {
        scoring: {
          score: 'desc',
        },
      },
      take: limit,
    });

    return clients;
  }

  // Obtener clientes en riesgo (churn)
  static async getChurnRiskClients() {
    const clients = await prisma.client.findMany({
      where: {
        isActive: true,
        scoring: {
          churnProbability: {
            gte: 70,
          },
        },
      },
      include: {
        scoring: true,
      },
      orderBy: {
        scoring: {
          churnProbability: 'desc',
        },
      },
    });

    return clients;
  }

  // Actualizar puntos de lealtad
  static async updateLoyaltyPoints(clientId: string, points: number) {
    const client = await prisma.client.update({
      where: { id: clientId },
      data: {
        loyaltyPoints: {
          increment: points,
        },
      },
    });

    return client;
  }

  // Estadísticas generales
  static async getStats() {
    const [
      total,
      nuevos,
      vip,
      mayoristas,
      inactivos,
      totalVentas,
    ] = await Promise.all([
      prisma.client.count({ where: { isActive: true } }),
      prisma.client.count({ where: { category: 'NUEVO', isActive: true } }),
      prisma.client.count({ where: { category: 'VIP', isActive: true } }),
      prisma.client.count({ where: { category: 'MAYORISTA', isActive: true } }),
      prisma.client.count({ where: { isActive: false } }),
      prisma.client.aggregate({
        _sum: { totalPurchases: true },
        where: { isActive: true },
      }),
    ]);

    return {
      total,
      nuevos,
      vip,
      mayoristas,
      inactivos,
      totalVentas: totalVentas._sum.totalPurchases || 0,
    };
  }
}
