import { Router } from 'express';
import { SaleController } from '../controllers/sale.controller';

const router = Router();

// GET /api/sales/public/:id/invoice - Pública para que clientes puedan ver facturas desde email
router.get('/public/:id/invoice', SaleController.downloadInvoicePublic);

export default router;
