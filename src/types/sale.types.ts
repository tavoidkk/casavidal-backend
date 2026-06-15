export interface CreateSaleItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

export interface PaymentSplitInput {
  paymentMethod: 'EFECTIVO' | 'TRANSFERENCIA' | 'PUNTO_VENTA' | 'PAGO_MOVIL' | 'ZELLE';
  currency: 'USD' | 'BS';
  amount: number;
  reference?: string;
}

export interface CreateSaleInput {
  clientId: string;
  items: CreateSaleItemInput[];
  discount?: number;
  paymentMethod?: 'EFECTIVO' | 'TRANSFERENCIA' | 'PUNTO_VENTA' | 'PAGO_MOVIL' | 'ZELLE';
  payments?: PaymentSplitInput[];
  notes?: string;
  additionalCharges?: number;
  currency?: 'USD' | 'BS';
  paymentReference?: string;
  pointsRedeemed?: number;
}

export interface SaleFilters {
  search?: string;
  clientId?: string;
  sellerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}
