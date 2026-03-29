import * as XLSX from 'xlsx';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { Decimal } from '@prisma/client/runtime/library';

export class ExcelService {
  /**
   * Exportar productos a Excel
   */
  static async exportProducts() {
    try {
      const products = await prisma.product.findMany({
        include: {
          category: true,
        },
      });

      // Preparar datos para Excel
      const data = products.map((product) => ({
        SKU: product.sku,
        Nombre: product.name,
        Categoría: product.category?.name || '',
        'Código de Barras': product.barcode || '',
        Descripción: product.description || '',
        'Precio Costo': Number(product.costPrice),
        'Precio Venta': Number(product.salePrice),
        'Precio Mayorista': product.wholesalePrice ? Number(product.wholesalePrice) : '',
        'Stock Actual': product.currentStock,
        'Stock Mínimo': product.minStock,
        Unidad: product.unit,
        Activo: product.isActive ? 'Sí' : 'No',
      }));

      // Crear libro de Excel
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

      // Convertir a buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return buffer;
    } catch (error) {
      console.error('Error al exportar productos:', error);
      throw new AppError(500, 'Error al exportar productos a Excel');
    }
  }

  /**
   * Exportar clientes a Excel
   */
  static async exportClients() {
    try {
      const clients = await prisma.client.findMany();

      const data = clients.map((client) => ({
        'Tipo Cliente': client.clientType === 'NATURAL' ? 'Natural' : 'Jurídico',
        RIF: client.rif || '',
        CI: client.ci || '',
        'Razón Social': client.companyName || '',
        Nombre: client.firstName || '',
        Apellido: client.lastName || '',
        Email: client.email,
        Teléfono: client.phone || '',
        Dirección: client.address || '',
        Ciudad: client.city || '',
        Estado: client.state || '',
        Categoría: client.category,
        'Puntos Lealtad': client.loyaltyPoints,
        'Total Compras': Number(client.totalPurchases),
        'Cantidad Compras': client.purchaseCount,
        Activo: client.isActive ? 'Sí' : 'No',
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      return buffer;
    } catch (error) {
      console.error('Error al exportar clientes:', error);
      throw new AppError(500, 'Error al exportar clientes a Excel');
    }
  }

  /**
   * Exportar proveedores a Excel
   */
  static async exportSuppliers() {
    try {
      const suppliers = await prisma.supplier.findMany();

      const data = suppliers.map((supplier) => ({
        RIF: supplier.rif,
        Nombre: supplier.name,
        'Persona Contacto': supplier.contactPerson || '',
        Email: supplier.email || '',
        Teléfono: supplier.phone || '',
        Dirección: supplier.address || '',
        Ciudad: supplier.city || '',
        Estado: supplier.state || '',
        'Días Crédito': supplier.creditDays || 0,
        Activo: supplier.isActive ? 'Sí' : 'No',
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Proveedores');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      return buffer;
    } catch (error) {
      console.error('Error al exportar proveedores:', error);
      throw new AppError(500, 'Error al exportar proveedores a Excel');
    }
  }

  /**
   * Importar productos desde Excel
   */
  static async importProducts(buffer: Buffer) {
    try {
      const workbook = XLSX.read(buffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);

      const results = {
        success: 0,
        errors: [] as string[],
        total: data.length,
      };

      // Obtener todas las categorías
      const categories = await prisma.category.findMany();
      const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

      for (const [index, row] of data.entries()) {
        try {
          const rowNum = index + 2; // +2 porque Excel empieza en 1 y tiene header

          // Validaciones básicas
          if (!row.SKU || !row.Nombre) {
            results.errors.push(`Fila ${rowNum}: SKU y Nombre son obligatorios`);
            continue;
          }

          // Buscar categoría
          let categoryId: string | undefined;
          if (row['Categoría']) {
            categoryId = categoryMap.get(row['Categoría'].toLowerCase());
            if (!categoryId) {
              results.errors.push(`Fila ${rowNum}: Categoría "${row['Categoría']}" no encontrada`);
              continue;
            }
          }

          // Crear o actualizar producto
          await prisma.product.upsert({
            where: { sku: String(row.SKU) },
            update: {
              name: String(row.Nombre),
              categoryId: categoryId,
              barcode: row['Código de Barras'] ? String(row['Código de Barras']) : null,
              description: row['Descripción'] ? String(row['Descripción']) : null,
              costPrice: row['Precio Costo'] ? new Decimal(Number(row['Precio Costo'])) : new Decimal(0),
              salePrice: row['Precio Venta'] ? new Decimal(Number(row['Precio Venta'])) : new Decimal(0),
              wholesalePrice: row['Precio Mayorista'] ? new Decimal(Number(row['Precio Mayorista'])) : null,
              minStock: row['Stock Mínimo'] ? Number(row['Stock Mínimo']) : 0,
              unit: row.Unidad ? String(row.Unidad) : 'unidad',
              isActive: row.Activo ? (String(row.Activo).toLowerCase() === 'sí' || String(row.Activo).toLowerCase() === 'si') : true,
            },
            create: {
              sku: String(row.SKU),
              name: String(row.Nombre),
              categoryId: categoryId!,
              barcode: row['Código de Barras'] ? String(row['Código de Barras']) : null,
              description: row['Descripción'] ? String(row['Descripción']) : null,
              costPrice: row['Precio Costo'] ? new Decimal(Number(row['Precio Costo'])) : new Decimal(0),
              salePrice: row['Precio Venta'] ? new Decimal(Number(row['Precio Venta'])) : new Decimal(0),
              wholesalePrice: row['Precio Mayorista'] ? new Decimal(Number(row['Precio Mayorista'])) : null,
              currentStock: row['Stock Actual'] ? Number(row['Stock Actual']) : 0,
              minStock: row['Stock Mínimo'] ? Number(row['Stock Mínimo']) : 0,
              unit: row.Unidad ? String(row.Unidad) : 'unidad',
              isActive: row.Activo ? (String(row.Activo).toLowerCase() === 'sí' || String(row.Activo).toLowerCase() === 'si') : true,
            },
          });

          results.success++;
        } catch (error: any) {
          results.errors.push(`Fila ${index + 2}: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      console.error('Error al importar productos:', error);
      throw new AppError(500, 'Error al importar productos desde Excel');
    }
  }

  /**
   * Importar clientes desde Excel
   */
  static async importClients(buffer: Buffer) {
    try {
      const workbook = XLSX.read(buffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);

      const results = {
        success: 0,
        errors: [] as string[],
        total: data.length,
      };

      for (const [index, row] of data.entries()) {
        try {
          const rowNum = index + 2;

          // Validaciones
          if (!row.Email) {
            results.errors.push(`Fila ${rowNum}: Email es obligatorio`);
            continue;
          }

          const clientType = row['Tipo Cliente']?.toLowerCase().includes('natural') ? 'NATURAL' : 'JURIDICO';

          // Validar campos según tipo de cliente
          if (clientType === 'JURIDICO' && !row.RIF) {
            results.errors.push(`Fila ${rowNum}: RIF es obligatorio para clientes jurídicos`);
            continue;
          }

          if (clientType === 'NATURAL' && !row.Nombre) {
            results.errors.push(`Fila ${rowNum}: Nombre es obligatorio para clientes naturales`);
            continue;
          }

          const category = row['Categoría'] || 'NUEVO';
          if (!['NUEVO', 'REGULAR', 'VIP', 'MAYORISTA'].includes(category)) {
            results.errors.push(`Fila ${rowNum}: Categoría inválida. Debe ser: NUEVO, REGULAR, VIP o MAYORISTA`);
            continue;
          }

          // Crear o actualizar cliente
          const clientData: any = {
            clientType,
            email: String(row.Email),
            phone: row['Teléfono'] ? String(row['Teléfono']) : null,
            address: row['Dirección'] ? String(row['Dirección']) : null,
            city: row['Ciudad'] ? String(row['Ciudad']) : null,
            state: row['Estado'] ? String(row['Estado']) : null,
            category: category as any,
            loyaltyPoints: row['Puntos Lealtad'] ? Number(row['Puntos Lealtad']) : 0,
            totalPurchases: row['Total Compras'] ? new Decimal(Number(row['Total Compras'])) : new Decimal(0),
            purchaseCount: row['Cantidad Compras'] ? Number(row['Cantidad Compras']) : 0,
            isActive: row.Activo ? (String(row.Activo).toLowerCase() === 'sí' || String(row.Activo).toLowerCase() === 'si') : true,
          };

          if (clientType === 'JURIDICO') {
            clientData.rif = String(row.RIF);
            clientData.companyName = row['Razón Social'] ? String(row['Razón Social']) : String(row.Nombre);
          } else {
            clientData.ci = row.CI ? String(row.CI) : null;
            clientData.firstName = String(row.Nombre);
            clientData.lastName = row.Apellido ? String(row.Apellido) : '';
          }

          await prisma.client.upsert({
            where: { email: clientData.email },
            update: clientData,
            create: clientData,
          });

          results.success++;
        } catch (error: any) {
          results.errors.push(`Fila ${index + 2}: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      console.error('Error al importar clientes:', error);
      throw new AppError(500, 'Error al importar clientes desde Excel');
    }
  }

  /**
   * Importar proveedores desde Excel
   */
  static async importSuppliers(buffer: Buffer) {
    try {
      const workbook = XLSX.read(buffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);

      const results = {
        success: 0,
        errors: [] as string[],
        total: data.length,
      };

      for (const [index, row] of data.entries()) {
        try {
          const rowNum = index + 2;

          // Validaciones
          if (!row.RIF || !row.Nombre) {
            results.errors.push(`Fila ${rowNum}: RIF y Nombre son obligatorios`);
            continue;
          }

          // Crear o actualizar proveedor
          await prisma.supplier.upsert({
            where: { rif: String(row.RIF) },
            update: {
              name: String(row.Nombre),
              contactPerson: row['Persona Contacto'] ? String(row['Persona Contacto']) : null,
              email: row.Email ? String(row.Email) : null,
              phone: row['Teléfono'] ? String(row['Teléfono']) : null,
              address: row['Dirección'] ? String(row['Dirección']) : null,
              city: row['Ciudad'] ? String(row['Ciudad']) : null,
              state: row['Estado'] ? String(row['Estado']) : null,
              creditDays: row['Días Crédito'] ? Number(row['Días Crédito']) : 0,
              isActive: row.Activo ? (String(row.Activo).toLowerCase() === 'sí' || String(row.Activo).toLowerCase() === 'si') : true,
            },
            create: {
              rif: String(row.RIF),
              name: String(row.Nombre),
              contactPerson: row['Persona Contacto'] ? String(row['Persona Contacto']) : null,
              email: row.Email ? String(row.Email) : null,
              phone: row['Teléfono'] ? String(row['Teléfono']) : null,
              address: row['Dirección'] ? String(row['Dirección']) : null,
              city: row['Ciudad'] ? String(row['Ciudad']) : null,
              state: row['Estado'] ? String(row['Estado']) : null,
              creditDays: row['Días Crédito'] ? Number(row['Días Crédito']) : 0,
              isActive: row.Activo ? (String(row.Activo).toLowerCase() === 'sí' || String(row.Activo).toLowerCase() === 'si') : true,
            },
          });

          results.success++;
        } catch (error: any) {
          results.errors.push(`Fila ${index + 2}: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      console.error('Error al importar proveedores:', error);
      throw new AppError(500, 'Error al importar proveedores desde Excel');
    }
  }
}
