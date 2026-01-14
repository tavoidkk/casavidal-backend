import { ClientType, ClientCategory } from '@prisma/client';

export interface CreateClientInput {
  clientType: ClientType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  rif?: string;
  email?: string;
  phone: string;
  address: string;
  city?: string;
  state?: string;
  category?: ClientCategory;
  notes?: string;
}

export interface UpdateClientInput {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  rif?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  category?: ClientCategory;
  notes?: string;
  isActive?: boolean;
}

export interface ClientFilters {
  search?: string;
  category?: ClientCategory;
  clientType?: ClientType;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface ClientWithScoring {
  id: string;
  clientType: ClientType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  phone: string;
  category: ClientCategory;
  loyaltyPoints: number;
  totalPurchases: number;
  purchaseCount: number;
  scoring?: {
    score: number;
    churnProbability: number;
    recommendedProducts: string[];
  };
  lastPurchaseAt?: Date;
  createdAt: Date;
}