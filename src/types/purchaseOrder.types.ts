export interface CreatePurchaseOrderInput {
  supplierId: string;
  expectedDate?: string;
  notes?: string;
  items: Array<{
    productId: string;
    productName?: string;
    productSku?: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface UpdatePurchaseOrderInput {
  expectedDate?: string;
  notes?: string;
  items?: Array<{
    productId: string;
    productName?: string;
    productSku?: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface ReceiveItemInput {
  itemId: string;
  quantityReceived: number;
}

export interface PurchaseOrderFilters {
  status?: string;
  supplierId?: string;
  search?: string;
  page?: number;
  limit?: number;
}
