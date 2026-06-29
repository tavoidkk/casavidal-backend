import { Request, Response, NextFunction } from 'express';
import { ExcelService } from '../services/excel.service';
import { successResponse } from '../utils/response';

export class ExcelController {
  /**
   * GET /api/excel/export/products
   * Exportar productos a Excel
   */
  static async exportProducts(_req: Request, res: Response, next: NextFunction) {
    try {
      const buffer = await ExcelService.exportProducts();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="productos-${new Date().toISOString().split('T')[0]}.xlsx"`);

      return res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/excel/export/clients
   * Exportar clientes a Excel
   */
  static async exportClients(_req: Request, res: Response, next: NextFunction) {
    try {
      const buffer = await ExcelService.exportClients();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="clientes-${new Date().toISOString().split('T')[0]}.xlsx"`);

      return res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/excel/export/suppliers
   * Exportar proveedores a Excel
   */
  static async exportSuppliers(_req: Request, res: Response, next: NextFunction) {
    try {
      const buffer = await ExcelService.exportSuppliers();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="proveedores-${new Date().toISOString().split('T')[0]}.xlsx"`);

      return res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/excel/import/products
   * Importar productos desde Excel
   */
  static async importProducts(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No se ha enviado ningún archivo' });
      }

      const results = await ExcelService.importProducts(req.file.buffer);

      return successResponse(res, results, 'Productos importados');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/excel/import/clients
   * Importar clientes desde Excel
   */
  static async importClients(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No se ha enviado ningún archivo' });
      }

      const results = await ExcelService.importClients(req.file.buffer);

      return successResponse(res, results, 'Clientes importados');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/excel/import/suppliers
   * Importar proveedores desde Excel
   */
  static async importSuppliers(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No se ha enviado ningún archivo' });
      }

      const results = await ExcelService.importSuppliers(req.file.buffer);

      return successResponse(res, results, 'Proveedores importados');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/excel/template/products
   * Descargar plantilla de productos
   */
  static async downloadProductsTemplate(_req: Request, res: Response, next: NextFunction) {
    try {
      const buffer = await ExcelService.generateProductsTemplate();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="plantilla-productos.xlsx"');

      return res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/excel/template/clients
   * Descargar plantilla de clientes
   */
  static async downloadClientsTemplate(_req: Request, res: Response, next: NextFunction) {
    try {
      const buffer = await ExcelService.generateClientsTemplate();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="plantilla-clientes.xlsx"');

      return res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/excel/template/suppliers
   * Descargar plantilla de proveedores
   */
  static async downloadSuppliersTemplate(_req: Request, res: Response, next: NextFunction) {
    try {
      const buffer = await ExcelService.generateSuppliersTemplate();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="plantilla-proveedores.xlsx"');

      return res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}
