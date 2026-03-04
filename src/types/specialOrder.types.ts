export interface CreateSpecialOrderInput {
  clientId: string;
  productId: string;
  quantity: number;
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
