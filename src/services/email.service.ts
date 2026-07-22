import { Resend } from 'resend';
import { env } from '../config/env';

const resend = new Resend(env.RESEND_API_KEY);

export class EmailService {
  static async sendSpecialOrderReadyEmail(to: string, order: {
    orderNumber: string;
    clientName: string;
    clientType: 'NATURAL' | 'JURIDICO';
    productName: string;
    quantity: number;
    total: number;
    shippingCost: number | null;
    paidAmount: number | null;
    balance: number;
    invoiceUrl?: string;
    companyName?: string;
  }) {
    const amountPaid = order.paidAmount || 0;
    const shippingCost = order.shippingCost || 0;
    const subtotal = order.total;
    const totalPayable = subtotal + shippingCost;
    const balance = totalPayable - amountPaid;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pedido Listo - ${order.orderNumber}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          body { margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background: #f4f7f9; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: linear-gradient(135deg, #32663c 0%, #254b2d 100%); padding: 30px; text-align: center; }
          .header img { height: 50px; margin: 0 auto 15px; }
          .header h1 { color: white; margin: 0; font-weight: 600; font-size: 24px; }
          .content { padding: 30px; }
          .greeting { font-size: 16px; color: #374151; margin-bottom: 20px; }
          .order-badge { display: inline-block; background: #16a34a; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 500; margin-bottom: 25px; }
          .product-table { width: 100%; border-collapse: collapse; margin: 20px 0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
          .product-table th { background: #ecf3ee; color: #254b2d; font-weight: 600; padding: 14px 12px; text-align: left; border: 1px solid #e5e7eb; }
          .product-table td { padding: 14px 12px; border: 1px solid #e5e7eb; }
          .product-table tr:nth-child(even) { background: #f9fafb; }
          .product-table tr:last-child td { border-bottom: 2px solid #d1d5db; }
          .summary { background: #ecf3ee; border-radius: 8px; padding: 20px; margin: 25px 0; }
          .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
          .summary-row:last-child { border-bottom: none; }
          .summary-label { color: #6b7280; }
          .summary-value { font-weight: 600; color: #254b2d; }
          .paid { color: #16a34a; }
          .balance-due { color: #c87c00; }
          .balance-paid { color: #16a34a; }
          .cta { text-align: center; margin: 30px 0; }
          .cta a { display: inline-block; background: #c87c00; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 500; transition: background 0.2s; }
          .cta a:hover { background: #a96500; }
          .footer { background: #32663c; color: #e5e7eb; padding: 25px 30px; text-align: center; font-size: 14px; }
          .footer h3 { color: white; margin: 0 0 10px; font-size: 16px; font-weight: 600; }
          .footer p { margin: 5px 0; opacity: 0.9; }
          .footer .contact { display: flex; justify-content: center; gap: 20px; margin-top: 15px; }
          .footer .contact-item { display: flex; align-items: center; gap: 8px; }
          .accent-bar { background: #c87c00; height: 4px; width: 100%; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="accent-bar"></div>
          <div class="header">
            <img src="${env.COMPANY_LOGO_URL}" alt="${env.COMPANY_NAME}" />
            <h1>¡Tu Pedido está Listo!</h1>
          </div>
          <div class="content">
            <p class="greeting">Hola <strong>${order.clientName}</strong>,</p>
            <p class="greeting">Tu pedido <strong>${order.orderNumber}</strong> está listo para recoger en nuestro taller.</p>

            <div class="order-badge">✓ PEDIDO LISTO PARA RECOGER</div>

            <table class="product-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th style="text-align: center;">Cantidad</th>
                  <th style="text-align: right;">Precio</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>${order.productName}</strong></td>
                  <td style="text-align: center;">${order.quantity}</td>
                  <td style="text-align: right;"> $${subtotal.toFixed(2)}</td>
                </tr>
                ${shippingCost > 0 ? `<tr><td colspan="2">Envío</td><td style="text-align: right;">$${shippingCost.toFixed(2)}</td></tr>` : ''}
              </tbody>
            </table>

            <div class="summary">
              <div class="summary-row">
                <span class="summary-label">Subtotal:</span>
                <span class="summary-value">$${subtotal.toFixed(2)}</span>
              </div>
              ${shippingCost > 0 ? `<div class="summary-row"><span class="summary-label">Envío:</span><span class="summary-value">$${shippingCost.toFixed(2)}</span></div>` : ''}
              <div class="summary-row">
                <span class="summary-label">Total a pagar:</span>
                <span class="summary-value">$${totalPayable.toFixed(2)}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label ${amountPaid > 0 ? 'paid' : ''}">Pagado:</span>
                <span class="summary-value ${amountPaid > 0 ? 'paid' : ''}">$${amountPaid.toFixed(2)}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Saldo por pagar:</span>
                <span class="summary-value ${balance > 0 ? 'balance-due' : 'balance-paid'}">$${balance.toFixed(2)}</span>
              </div>
            </div>

            ${order.invoiceUrl ? `
            <div class="cta">
              <a href="${order.invoiceUrl}" target="_blank">📄 Ver Factura</a>
            </div>` : ''}

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <strong>💡 Recuerda:</strong> Lleva tu identificación y el número de pedido al retirar.
              <br> Si ya pagaste, el saldo aparecerá en 0.00.
            </p>
          </div>
          <div class="footer">
            <h3>${env.COMPANY_NAME}</h3>
            <p>Taller de Ferretería y Suministros</p>
            <div class="contact">
              <span>📞 Contacto disponible en tienda</span>
              <span>🌐 casavidal.com</span>
            </div>
            <p style="margin-top: 15px; opacity: 0.8; font-size: 12px;">
              © ${new Date().getFullYear()} ${env.COMPANY_NAME}. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </body>
      </html>`;

    return await resend.emails.send({
      from: 'Casa Vidal <onboarding@resend.dev>',
      to,
      subject: `¡Pedido ${order.orderNumber} listo para recoger!`,
      html,
    });
  }
}