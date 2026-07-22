import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/database', () => ({
  prisma: {
    client: { findMany: vi.fn() },
    sale: { findFirst: vi.fn(), findMany: vi.fn() },
    activity: { count: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    dismissedSuggestion: { findMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('../../src/services/recommendation.service', () => ({
  RecommendationService: {
    getRecommendationsForCart: vi.fn(),
  },
}));

vi.mock('../../src/services/notification.service', () => ({
  NotificationService: {
    createNotification: vi.fn(),
  },
}));

import { ClientSuggestionsService } from '../../src/services/client-suggestions.service';
import { prisma } from '../../src/config/database';
import { RecommendationService } from '../../src/services/recommendation.service';

describe('ClientSuggestionsService', () => {
  const userId = 'user-1';

  const defaultMocks = {
    clients: [],
    dismissed: [],
    sales: [],
    activities: [],
    recommendations: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.client.findMany as any).mockResolvedValue(defaultMocks.clients);
    (prisma.dismissedSuggestion.findMany as any).mockResolvedValue(defaultMocks.dismissed);
    (prisma.sale.findFirst as any).mockResolvedValue(null);
    (prisma.sale.findMany as any).mockResolvedValue(defaultMocks.sales);
    (prisma.activity.count as any).mockResolvedValue(0);
    (prisma.activity.findMany as any).mockResolvedValue(defaultMocks.activities);
    (prisma.activity.create as any).mockResolvedValue({});
    (prisma.dismissedSuggestion.create as any).mockResolvedValue({});
    (RecommendationService.getRecommendationsForCart as any).mockResolvedValue(defaultMocks.recommendations);
  });

  describe('getSuggestions', () => {
    it('returns suggestions for high value client (> $200, active)', async () => {
      (prisma.client.findMany as any).mockResolvedValue([
        {
          id: 'client-1',
          firstName: 'Gustavo',
          lastName: 'Vidal',
          companyName: null,
          clientType: 'NATURAL',
          category: 'VIP',
          stage: 'GANADO',
          totalPurchases: 350,
          purchaseCount: 10,
          lastPurchaseAt: new Date(Date.now() - 10 * 86400000),
          lastContactAt: new Date(Date.now() - 5 * 86400000),
          scoring: { churnProbability: 20, nextPurchaseDays: 30 },
          _count: { activities: 5 },
        },
      ]);

      const suggestions = await ClientSuggestionsService.getSuggestions(userId);

      const offerSuggestion = suggestions.find(s => s.ruleKey === 'HIGH_VALUE_OFFER');
      expect(offerSuggestion).toBeDefined();
      expect(offerSuggestion?.type).toBe('OFERTA');
      expect(offerSuggestion?.discountPercent).toBe(15);
    });

    it('returns post-purchase recommendations for recent sales', async () => {
      (prisma.client.findMany as any).mockResolvedValue([
        {
          id: 'client-1',
          firstName: 'Gustavo',
          lastName: 'Vidal',
          companyName: null,
          clientType: 'NATURAL',
          category: 'REGULAR',
          stage: 'GANADO',
          totalPurchases: 150,
          purchaseCount: 5,
          lastPurchaseAt: new Date(Date.now() - 1 * 86400000),
          lastContactAt: new Date(Date.now() - 5 * 86400000),
          scoring: { churnProbability: 20, nextPurchaseDays: 30 },
          _count: { activities: 2 },
        },
      ]);

      (prisma.sale.findFirst as any).mockResolvedValue({
        id: 'sale-1',
        clientId: 'client-1',
        items: [{ productId: 'product-1' }, { productId: 'product-2' }],
      });

      (RecommendationService.getRecommendationsForCart as any).mockResolvedValue([
        {
          id: 'product-3',
          name: 'Tornillo de acero',
          sku: 'TS-001',
          salePrice: 15.5,
          currentStock: 50,
          reason: 'Comprado con tu compra',
          score: 85,
        },
      ]);

      const suggestions = await ClientSuggestionsService.getSuggestions(userId);

      const purchaseSuggestion = suggestions.find(s => s.ruleKey === 'POST_PURCHASE_CONTACT');
      expect(purchaseSuggestion).toBeDefined();
      expect(purchaseSuggestion?.type).toBe('LLAMADA');
      expect(purchaseSuggestion?.title).toBe('Verificar satisfacción del cliente');
    });

    it('returns low stock recommendations for products with low stock', async () => {
      (prisma.client.findMany as any).mockResolvedValue([
        {
          id: 'client-1',
          firstName: 'Gustavo',
          lastName: 'Vidal',
          companyName: null,
          clientType: 'NATURAL',
          category: 'REGULAR',
          stage: 'GANADO',
          totalPurchases: 100,
          purchaseCount: 3,
          lastPurchaseAt: new Date(Date.now() - 5 * 86400000),
          lastContactAt: new Date(Date.now() - 2 * 86400000),
          scoring: { churnProbability: 10, nextPurchaseDays: 60 },
          _count: { activities: 1 },
        },
      ]);

      (prisma.sale.findMany as any).mockResolvedValue([
        {
          id: 'sale-1',
          clientId: 'client-1',
          createdAt: new Date(Date.now() - 10 * 86400000),
          items: [{ product: { name: 'Taladro', currentStock: 3 } }],
        },
      ]);

      const suggestions = await ClientSuggestionsService.getSuggestions(userId);

      const lowStockSuggestion = suggestions.find(s => s.ruleKey === 'LOW_STOCK_RECOMMENDATION');
      expect(lowStockSuggestion).toBeDefined();
      expect(lowStockSuggestion?.type).toBe('RECOMENDACION');
      expect(lowStockSuggestion?.title).toBe('Reposición de productos');
    });

    it('does not create HIGH_VALUE_OFFER for inactive high value client', async () => {
      (prisma.client.findMany as any).mockResolvedValue([
        {
          id: 'client-1',
          firstName: 'Gustavo',
          lastName: 'Vidal',
          companyName: null,
          clientType: 'NATURAL',
          category: 'VIP',
          stage: 'GANADO',
          totalPurchases: 500,
          purchaseCount: 15,
          lastPurchaseAt: new Date(Date.now() - 60 * 86400000),
          lastContactAt: new Date(Date.now() - 55 * 86400000),
          scoring: { churnProbability: 30, nextPurchaseDays: 90 },
          _count: { activities: 3 },
        },
      ]);

      const suggestions = await ClientSuggestionsService.getSuggestions(userId);

      const offerSuggestion = suggestions.find(s => s.ruleKey === 'HIGH_VALUE_OFFER');
      expect(offerSuggestion).toBeUndefined();
    });

    it('returns new client suggestion for client without activities', async () => {
      (prisma.client.findMany as any).mockResolvedValue([
        {
          id: 'client-1',
          firstName: 'Nuevo',
          lastName: 'Cliente',
          companyName: null,
          clientType: 'NATURAL',
          category: 'NUEVO',
          stage: 'NUEVO',
          totalPurchases: 0,
          purchaseCount: 0,
          lastPurchaseAt: null,
          lastContactAt: null,
          scoring: { churnProbability: 80, nextPurchaseDays: 180 },
          _count: { activities: 0 },
        },
      ]);

      const suggestions = await ClientSuggestionsService.getSuggestions(userId);

      const newClientSuggestion = suggestions.find(s => s.ruleKey === 'NEW_NO_ACTIVITY');
      expect(newClientSuggestion).toBeDefined();
      expect(newClientSuggestion?.type).toBe('LLAMADA');
      expect(newClientSuggestion?.priority).toBe(90);
    });

    it('returns overdue activities as suggestions', async () => {
      (prisma.client.findMany as any).mockResolvedValue([]);

      (prisma.activity.findMany as any).mockResolvedValue([
        {
          id: 'activity-1',
          clientId: 'client-1',
          subject: 'Llamada de seguimiento',
          dueDate: new Date(Date.now() - 1 * 86400000),
          status: 'PENDIENTE',
          client: {
            firstName: 'Gustavo',
            lastName: 'Vidal',
            companyName: null,
            clientType: 'NATURAL',
          },
        },
      ]);

      const suggestions = await ClientSuggestionsService.getSuggestions(userId);

      const overdueSuggestion = suggestions.find(s => s.ruleKey.startsWith('OVERDUE:'));
      expect(overdueSuggestion).toBeDefined();
      expect(overdueSuggestion?.type).toBe('TAREA');
      expect(overdueSuggestion?.priority).toBe(95);
    });
  });

  describe('applySuggestion', () => {
    it('creates activity from suggestion and dismisses it', async () => {
      const mockSuggestions = [
        {
          id: 'client-1:HIGH_VALUE_OFFER',
          clientId: 'client-1',
          clientName: 'Gustavo Vidal',
          clientCategory: 'VIP',
          type: 'OFERTA',
          title: 'Oferta especial para ti',
          description: 'Como agradecimiento...',
          reason: 'Cliente valor alto',
          priority: 85,
          ruleKey: 'HIGH_VALUE_OFFER',
          discountPercent: 15,
        },
      ];

      const mockActivity = {
        id: 'activity-1',
        clientId: 'client-1',
        assignedToId: userId,
        type: 'OFERTA',
        subject: 'Oferta especial para ti',
        description: 'Como agradecimiento...',
        dueDate: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        updatedAt: new Date(),
        assignedTo: { firstName: 'User', lastName: 'Test', role: 'VENDEDOR' },
        client: { firstName: 'Gustavo', lastName: 'Vidal', companyName: null, clientType: 'NATURAL' },
      };

      (prisma.activity.create as any).mockResolvedValue(mockActivity);
      (prisma.dismissedSuggestion.create as any).mockResolvedValue({
        id: 'dismiss-1',
        userId,
        clientId: 'client-1',
        ruleKey: 'HIGH_VALUE_OFFER',
      });

      vi.spyOn(ClientSuggestionsService, 'getSuggestions').mockImplementation(async () => mockSuggestions);

      const result = await ClientSuggestionsService.applySuggestion(userId, 'client-1:HIGH_VALUE_OFFER');

      expect(prisma.activity.create).toHaveBeenCalled();
      expect(prisma.dismissedSuggestion.create).toHaveBeenCalledWith({
        data: { userId, clientId: 'client-1', ruleKey: 'HIGH_VALUE_OFFER' },
      });
      expect(result).toBeDefined();
    });
  });

  describe('dismissSuggestion', () => {
    it('dismisses suggestion and returns the dismissal record', async () => {
      (prisma.dismissedSuggestion.create as any).mockResolvedValue({
        id: 'dismiss-1',
        userId,
        clientId: 'client-1',
        ruleKey: 'HIGH_VALUE_OFFER',
      });

      const result = await ClientSuggestionsService.dismissSuggestion(userId, 'client-1:HIGH_VALUE_OFFER');

      expect(prisma.dismissedSuggestion.create).toHaveBeenCalledWith({
        data: { userId, clientId: 'client-1', ruleKey: 'HIGH_VALUE_OFFER' },
      });
      expect(result).toBeDefined();
    });
  });

  describe('getSuggestionCount', () => {
    it('returns count of available suggestions', async () => {
      vi.spyOn(ClientSuggestionsService, 'getSuggestions').mockResolvedValue([
        { id: '1', clientId: 'c1', clientName: 'Test', clientCategory: 'REGULAR', type: 'LLAMADA', title: 'Test', description: 'Test', reason: 'Test', priority: 50, ruleKey: 'TEST' },
        { id: '2', clientId: 'c2', clientName: 'Test2', clientCategory: 'VIP', type: 'OFERTA', title: 'Test2', description: 'Test2', reason: 'Test2', priority: 60, ruleKey: 'TEST2' },
      ]);

      const count = await ClientSuggestionsService.getSuggestionCount(userId);

      expect(count).toBe(2);
    });
  });
});