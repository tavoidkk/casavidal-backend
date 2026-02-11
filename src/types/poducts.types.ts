export interface CreateProductInput {
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  costPrice: number;
  salePrice: number;
  wholesalePrice?: number;
  currentStock: number;
  minStock?: number;
  maxStock?: number;
  hasVariants?: boolean;
  parentProductId?: string;
  variantInfo?: string;
  image?: string;
  unit?: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  barcode?: string;
  categoryId?: string;
  costPrice?: number;
  salePrice?: number;
  wholesalePrice?: number;
  currentStock?: number;
  minStock?: number;
  maxStock?: number;
  variantInfo?: string;
  image?: string;
  unit?: string;
  isActive?: boolean;
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  lowStock?: boolean; // Productos con stock bajo
  page?: number;
  limit?: number;
}

export interface AdjustStockInput {
  productId: string;
  quantity: number; // Positivo = entrada, Negativo = salida
  type: 'ENTRADA' | 'SALIDA' | 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO' | 'DEVOLUCION';
  reference?: string;
  notes?: string;
}