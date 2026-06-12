export interface CreateSaleItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

export interface CreateSaleInput {
  clientId: string;
  items: CreateSaleItemInput[];
  discount?: number; // Descuento global en monto (no porcentaje)
  paymentMethod: 'EFECTIVO' | 'TRANSFERENCIA' | 'PUNTO_VENTA' | 'PAGO_MOVIL' | 'ZELLE';
  notes?: string;
  additionalCharges?: number;
  currency?: 'USD' | 'BS';
  paymentReference?: string;
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
