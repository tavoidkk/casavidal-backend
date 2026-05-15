import { ClientType, ClientCategory, ClientStage, ClientSource } from '@prisma/client';

export interface CreateClientInput {
  clientType: ClientType;
  firstName?: string;
  lastName?: string;
  document?: string;
  docPrefix?: string;
  docNumber?: string;
  docCheck?: string;       
  companyName?: string;
  rif?: string;
  email?: string;
  phone: string;
  address: string;
  city?: string;
  state?: string;
  category?: ClientCategory;
  stage?: ClientStage;
  source?: ClientSource;
  lastContactAt?: Date;
  notes?: string;
}

export interface UpdateClientInput {
  firstName?: string;
  lastName?: string;
  document?: string;
  docPrefix?: string;
  docNumber?: string;
  docCheck?: string;  
  companyName?: string;
  rif?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  category?: ClientCategory;
  stage?: ClientStage;
  source?: ClientSource;
  lastContactAt?: Date;
  notes?: string;
  isActive?: boolean;
}

export interface ClientFilters {
  search?: string;
  category?: ClientCategory;
  clientType?: ClientType;
  stage?: ClientStage;
  source?: ClientSource;
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
  stage: ClientStage;
  source?: ClientSource;
  lastContactAt?: Date;
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
