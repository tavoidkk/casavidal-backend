import { Request, Response } from 'express';
import { ReportsService } from '../services/reports.service';

export class ReportsController {
  static async getReport(req: Request, res: Response) {
    try {
      const { type } = req.params;
      const { dateFrom, dateTo, sellerId, paymentMethod, categoryId, lowStockOnly, category, stage, type: actType, userId, limit, status } = req.query;

      const filters = {
        ...(dateFrom ? { dateFrom: new Date(dateFrom as string) } : {}),
        ...(dateTo ? { dateTo: new Date(dateTo as string) } : {}),
        ...(sellerId ? { sellerId: sellerId as string } : {}),
        ...(paymentMethod ? { paymentMethod: paymentMethod as string } : {}),
        ...(categoryId ? { categoryId: categoryId as string } : {}),
        ...(lowStockOnly ? { lowStockOnly: lowStockOnly === 'true' } : {}),
        ...(category ? { category: category as string } : {}),
        ...(stage ? { stage: stage as string } : {}),
        ...(actType ? { type: actType as string } : {}),
        ...(userId ? { userId: userId as string } : {}),
        ...(limit ? { limit: Number(limit) } : {}),
        ...(status ? { status: status as string } : {}),
      };

      let data;
      switch (type) {
        case 'ventas': data = await ReportsService.ventas(filters); break;
        case 'inventario': data = await ReportsService.inventario(filters as any); break;
        case 'clientes': data = await ReportsService.clientes(filters); break;
        case 'actividades': data = await ReportsService.actividades(filters); break;
        case 'top-productos': data = await ReportsService.topProductos(filters as any); break;
        case 'rentabilidad': data = await ReportsService.rentabilidad(filters as any); break;
        case 'proveedores': data = await ReportsService.proveedores(); break;
        case 'pedidos-especiales': data = await ReportsService.pedidosEspeciales(filters); break;
        case 'campanas': data = await ReportsService.campanas(filters); break;
        case 'productividad': data = await ReportsService.productividad(filters); break;
        case 'dashboard-ejecutivo': data = await ReportsService.dashboardEjecutivo(filters); break;
        default: res.status(400).json({ error: 'Tipo de reporte invalido' }); return;
      }

      res.json(data);
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ error: 'Error al generar el reporte' });
    }
  }
}
