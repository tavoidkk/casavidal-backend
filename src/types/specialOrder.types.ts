export interface CreateSpecialOrderInput {
  clientId: string;
  supplierId: string;
  productId: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  shippingCost?: number;
  paymentMethod: 'EFECTIVO' | 'TRANSFERENCIA' | 'PUNTO_VENTA' | 'PAGO_MOVIL' | 'ZELLE';
  supplierPaymentMethod?: string;
  estimatedDate?: Date;
  notes?: string;
}

export interface UpdateSpecialOrderStatusInput {
  status: 'PENDIENTE' | 'ORDEN_GENERADA' | 'EN_TRANSITO' | 'RECIBIDO' | 'LISTO_CLIENTE' | 'ENTREGADO' | 'CANCELADO';
  notes?: string;
  estimatedDate?: Date;
}

export interface SpecialOrderFilters {
  status?: string;
  clientId?: string;
  page?: number;
  limit?: number;
}
