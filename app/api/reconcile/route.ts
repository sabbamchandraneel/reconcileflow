import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { getSessionUser } from '@/lib/auth';
import { runReconciliation, OrderRecord, PaymentRecord } from '@/lib/reconciliation-engine';
import { getDemoDatasets } from '@/lib/demo-data';
import { prisma } from '@/lib/db';
import { inMemoryStore, StoredReconciliation } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const body = await req.json();
    const { isDemo, ordersCsv, paymentsCsv, ordersData, paymentsData, title, roundingTolerance } = body;

    let orders: OrderRecord[] = [];
    let payments: PaymentRecord[] = [];

    if (isDemo) {
      const demo = getDemoDatasets();
      orders = demo.orders;
      payments = demo.payments;
    } else if (ordersCsv && paymentsCsv) {
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

      orders = parsedOrders;
      payments = parsedPayments;
    } else if (ordersData && paymentsData) {
      orders = ordersData;
      payments = paymentsData;
    } else {
      return NextResponse.json(
        { error: 'Missing orders or payments data. Provide CSV strings or enable demo mode.' },
        { status: 400 }
      );
    }

    if (orders.length === 0 || payments.length === 0) {
      return NextResponse.json(
        { error: 'Cannot reconcile empty datasets. Please provide valid orders and payments rows.' },
        { status: 400 }
      );
    }

    // Run pure deterministic matching engine
    const tolerance = typeof roundingTolerance === 'number' ? roundingTolerance : 0.05;
    const result = runReconciliation(orders, payments, { roundingTolerance: tolerance });

    const auditTitle = title?.trim() || (isDemo ? 'Store Financial Audit (May 2025 Dataset)' : `Audit Run (${new Date().toLocaleDateString()})`);
    const reconciliationId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Prepare stored representation
    const storedRun: StoredReconciliation = {
      id: reconciliationId,
      userId: user.userId,
      title: auditTitle,
      status: 'completed',
      summary: result.summary,
      discrepancies: result.discrepancies.map((d, idx) => ({
        ...d,
        id: `disc_${idx + 1}`,
      })),
      ordersCount: result.summary.totalOrdersCount,
      paymentsCount: result.summary.totalPaymentsCount,
      createdAt: new Date().toISOString(),
    };

    // Attempt persisting to PostgreSQL via Prisma
    try {
      if (process.env.DATABASE_URL) {
        // Ensure user exists in db
        const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
        if (dbUser) {
          const dbRec = await prisma.reconciliation.create({
            data: {
              id: reconciliationId,
              userId: user.userId,
              title: auditTitle,
              status: 'completed',
              totalOrdersCount: result.summary.totalOrdersCount,
              totalPaymentsCount: result.summary.totalPaymentsCount,
              totalOrderValue: result.summary.totalOrderValue,
              totalGrossOrderValue: result.summary.totalGrossOrderValue,
              totalDiscountValue: result.summary.totalDiscountValue,
              totalPaymentValue: result.summary.totalPaymentValue,
              totalSettledCharges: result.summary.totalSettledCharges,
              totalSettledRefunds: result.summary.totalSettledRefunds,
              totalNetSettled: result.summary.totalNetSettled,
              totalFeesPaid: result.summary.totalFeesPaid,
              cleanMatchedCount: result.summary.cleanMatchedOrdersCount,
              cleanMatchedValue: result.summary.cleanMatchedValue,
              matchRatePercentage: result.summary.matchRatePercentage,
              discrepancyCount: result.summary.discrepancyCount,
              totalValueInDispute: result.summary.totalValueInDispute,
              totalMoneyAtRisk: result.summary.totalMoneyAtRisk,
              summaryJson: JSON.stringify(result.summary),
              discrepancies: {
                create: result.discrepancies.map((d) => ({
                  category: d.category,
                  severity: d.severity,
                  orderId: d.orderId,
                  transactionRef: d.transactionRef,
                  customerEmail: d.customerEmail,
                  orderAmount: d.orderAmount,
                  paymentAmount: d.paymentAmount,
                  discrepancyAmount: d.discrepancyAmount,
                  orderStatus: d.orderStatus,
                  paymentStatus: d.paymentStatus,
                  description: d.description,
                })),
              },
            },
          });
        }
      }
    } catch (dbErr) {
      console.warn('Prisma reconciliation persist fallback to memory store:', dbErr);
    }

    // Always keep memory store up to date for fast response & multi-tenant demo stability
    const userRuns = inMemoryStore.reconciliations.get(user.userId) || [];
    userRuns.unshift(storedRun);
    inMemoryStore.reconciliations.set(user.userId, userRuns);

    return NextResponse.json({
      success: true,
      reconciliation: storedRun,
    });
  } catch (error) {
    console.error('Reconciliation execution error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during reconciliation calculation.' },
      { status: 500 }
    );
  }
}
