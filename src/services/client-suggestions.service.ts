import { prisma } from '../config/database';

interface Suggestion {
  id: string;
  clientId: string;
  clientName: string;
  clientCategory: string;
  type: 'LLAMADA' | 'EMAIL' | 'REUNION' | 'SEGUIMIENTO' | 'TAREA';
  title: string;
  description: string;
  reason: string;
  priority: number;
  ruleKey: string;
}

export class ClientSuggestionsService {
  static async getSuggestions(userId: string): Promise<Suggestion[]> {
    const dismissed = await prisma.dismissedSuggestion.findMany({
      where: { userId },
      select: { clientId: true, ruleKey: true },
    });
    const dismissedSet = new Set(dismissed.map(d => `${d.clientId}:${d.ruleKey}`));

    const allSuggestions: Suggestion[] = [];

    const clients = await prisma.client.findMany({
      where: { isActive: true },
      include: {
        scoring: { select: { churnProbability: true, nextPurchaseDays: true } },
        _count: { select: { activities: true } },
      },
    });

    const now = new Date();

    for (const client of clients) {
      const clientName = client.clientType === 'JURIDICO'
        ? client.companyName || 'Sin nombre'
        : `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Sin nombre';

      // Regla 1: Cliente nuevo sin actividades
      if (client.stage === 'NUEVO' && client._count.activities === 0) {
        const key = 'NEW_NO_ACTIVITY';
        if (!dismissedSet.has(`${client.id}:${key}`)) {
          allSuggestions.push({
            id: `${client.id}:${key}`,
            clientId: client.id,
            clientName,
            clientCategory: client.category,
            type: 'LLAMADA',
            title: 'Contactar nuevo cliente',
            description: `El cliente "${clientName}" está en etapa NUEVO y no tiene actividades registradas. Realizar llamada de bienvenida.`,
            reason: 'Cliente nuevo sin contacto inicial',
            priority: 90,
            ruleKey: key,
          });
        }
      }

      // Regla 2: Alta probabilidad de pérdida
      if (client.scoring && Number(client.scoring.churnProbability) > 50) {
        const key = 'HIGH_CHURN';
        if (!dismissedSet.has(`${client.id}:${key}`)) {
          allSuggestions.push({
            id: `${client.id}:${key}`,
            clientId: client.id,
            clientName,
            clientCategory: client.category,
            type: 'SEGUIMIENTO',
            title: 'Cliente en riesgo de pérdida',
            description: `El cliente "${clientName}" tiene ${client.scoring.churnProbability}% de probabilidad de pérdida. Realizar seguimiento para retenerlo.`,
            reason: `Riesgo de pérdida: ${client.scoring.churnProbability}%`,
            priority: 80,
            ruleKey: key,
          });
        }
      }

      // Regla 3: Cliente inactivo (>60 días sin compra)
      if (client.lastPurchaseAt) {
        const daysSinceLastPurchase = Math.floor((now.getTime() - new Date(client.lastPurchaseAt).getTime()) / 86400000);
        if (daysSinceLastPurchase > 60) {
          const key = 'INACTIVE_60';
          if (!dismissedSet.has(`${client.id}:${key}`)) {
            allSuggestions.push({
              id: `${client.id}:${key}`,
              clientId: client.id,
              clientName,
              clientCategory: client.category,
              type: 'EMAIL',
              title: 'Cliente sin actividad reciente',
              description: `El cliente "${clientName}" no compra desde hace ${daysSinceLastPurchase} días. Enviar email con novedades o promociones.`,
              reason: `Sin compras en ${daysSinceLastPurchase} días`,
              priority: 70,
              ruleKey: key,
            });
          }
        }
      }

      // Regla 4: Sin contacto >30 días
      if (client.lastContactAt) {
        const daysSinceLastContact = Math.floor((now.getTime() - new Date(client.lastContactAt).getTime()) / 86400000);
        if (daysSinceLastContact > 30) {
          const key = 'NO_CONTACT_30';
          if (!dismissedSet.has(`${client.id}:${key}`)) {
            allSuggestions.push({
              id: `${client.id}:${key}`,
              clientId: client.id,
              clientName,
              clientCategory: client.category,
              type: 'LLAMADA',
              title: 'Hace tiempo sin contacto',
              description: `Han pasado ${daysSinceLastContact} días desde el último contacto con "${clientName}". Llamar para retomar relación.`,
              reason: `Sin contacto en ${daysSinceLastContact} días`,
              priority: 60,
              ruleKey: key,
            });
          }
        }
      }

      // Regla 5: Hito de compras
      const milestones = [5, 10, 25, 50, 100];
      if (milestones.includes(client.purchaseCount)) {
        const key = 'PURCHASE_MILESTONE';
        if (!dismissedSet.has(`${client.id}:${key}`)) {
          allSuggestions.push({
            id: `${client.id}:${key}`,
            clientId: client.id,
            clientName,
            clientCategory: client.category,
            type: 'REUNION',
            title: `Cliente alcanzó ${client.purchaseCount} compras`,
            description: `El cliente "${clientName}" ha realizado ${client.purchaseCount} compras. Agendar reunión para agradecer su lealtad y ofrecer beneficios exclusivos.`,
            reason: `${client.purchaseCount} compras realizadas`,
            priority: 75,
            ruleKey: key,
          });
        }
      }

      // Regla 6: Categoría VIP o MAYORISTA reciente
      if (client.category === 'VIP' || client.category === 'MAYORISTA') {
        const recentUpgrade = await prisma.activity.count({
          where: {
            clientId: client.id,
            subject: { contains: client.category },
            createdAt: { gte: new Date(now.getTime() - 7 * 86400000) },
          },
        });
        if (recentUpgrade === 0) {
          const key = 'CATEGORY_UPGRADE';
          if (!dismissedSet.has(`${client.id}:${key}`)) {
            allSuggestions.push({
              id: `${client.id}:${key}`,
              clientId: client.id,
              clientName,
              clientCategory: client.category,
              type: 'REUNION',
              title: `Reconocer cliente ${client.category}`,
              description: `"${clientName}" es ahora cliente ${client.category}. Agendar reunión para agradecer y presentar beneficios exclusivos.`,
              reason: `Nuevo cliente ${client.category}`,
              priority: 85,
              ruleKey: key,
            });
          }
        }
      }
    }

    // Regla 7: Actividades vencidas del usuario
    const overdueActivities = await prisma.activity.findMany({
      where: {
        assignedToId: userId,
        status: 'PENDIENTE',
        dueDate: { lt: now },
      },
      include: {
        client: { select: { firstName: true, lastName: true, companyName: true, clientType: true } },
      },
    });

    for (const activity of overdueActivities) {
      const key = `OVERDUE:${activity.id}`;
      const clientName = activity.client
        ? activity.client.clientType === 'JURIDICO'
          ? activity.client.companyName || 'Sin nombre'
          : `${activity.client.firstName || ''} ${activity.client.lastName || ''}`.trim() || 'Sin nombre'
        : 'Sin cliente';
      if (!dismissedSet.has(`${activity.clientId}:${key}`)) {
        allSuggestions.push({
          id: `${activity.clientId}:${key}`,
          clientId: activity.clientId,
          clientName,
          clientCategory: '',
          type: 'TAREA',
          title: `Tarea vencida: ${activity.subject}`,
          description: `La actividad "${activity.subject}" para ${clientName} tiene fecha vencida (${activity.dueDate?.toLocaleDateString()}). Completar o reprogramar.`,
          reason: 'Actividad pendiente vencida',
          priority: 95,
          ruleKey: key,
        });
      }
    }

    return allSuggestions.sort((a, b) => b.priority - a.priority);
  }

  static async applySuggestion(userId: string, suggestionId: string): Promise<any> {
    const parts = suggestionId.split(':');
    const ruleKey = parts.slice(1).join(':');

    // Recompute to get the full suggestion
    const suggestions = await this.getSuggestions(userId);
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) throw new Error('Sugerencia no disponible');

    const activity = await prisma.activity.create({
      data: {
        clientId: suggestion.clientId,
        assignedToId: userId,
        type: suggestion.type as any,
        subject: suggestion.title,
        description: suggestion.description,
        dueDate: new Date(Date.now() + 86400000),
      },
      include: {
        assignedTo: { select: { firstName: true, lastName: true, role: true } },
        client: { select: { firstName: true, lastName: true, companyName: true, clientType: true } },
      },
    });

    await prisma.dismissedSuggestion.create({
      data: { userId, clientId: suggestion.clientId, ruleKey },
    });

    return activity;
  }

  static async dismissSuggestion(userId: string, suggestionId: string) {
    const parts = suggestionId.split(':');
    const clientId = parts[0];
    const ruleKey = parts.slice(1).join(':');

    return await prisma.dismissedSuggestion.create({
      data: { userId, clientId, ruleKey },
    });
  }

  static async getSuggestionCount(userId: string): Promise<number> {
    const suggestions = await this.getSuggestions(userId);
    return suggestions.length;
  }
}
