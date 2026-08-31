import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { OrderRecord, PaymentRecord } from './reconciliation-engine';

export function getDemoDatasets(): { orders: OrderRecord[]; payments: PaymentRecord[] } {
  try {
    const ordersPath = path.join(process.cwd(), 'orders.csv');
    const paymentsPath = path.join(process.cwd(), 'payments.csv');

    if (fs.existsSync(ordersPath) && fs.existsSync(paymentsPath)) {
      const ordersCsv = fs.readFileSync(ordersPath, 'utf-8');
      const paymentsCsv = fs.readFileSync(paymentsPath, 'utf-8');

      const parsedOrders = Papa.parse<OrderRecord>(ordersCsv, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
      }).data;

      const parsedPayments = Papa.parse<PaymentRecord>(paymentsCsv, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
      }).data;

      return { orders: parsedOrders, payments: parsedPayments };
    }
  } catch (err) {
    console.error('Failed to read CSVs from filesystem, fallback to parser', err);
  }

  return { orders: [], payments: [] };
}
