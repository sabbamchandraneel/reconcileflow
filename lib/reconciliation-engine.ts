export interface OrderRecord {
  order_id: string;
  order_date: string;
  customer_email: string;
  currency: string;
  gross_amount: number | string;
  discount: number | string;
  net_amount: number | string;
  status: 'completed' | 'cancelled' | 'refunded' | string;
}

export interface PaymentRecord {
  transaction_ref: string;
  processed_at: string;
  order_reference: string;
  currency: string;
  amount: number | string;
  fee: number | string;
  net_settled: number | string;
  type: 'charge' | 'refund' | string;
  status: 'settled' | 'pending' | 'failed' | string;
}

export type DiscrepancyCategory =
  | 'UNPAID_ORDER'
  | 'UNLINKED_GHOST_PAYMENT'
  | 'DUPLICATE_PAYMENT_CHARGE'
  | 'DUPLICATE_ORDER_RECORD'
  | 'MATERIAL_OVERCHARGE'
  | 'MATERIAL_UNDERCHARGE'
  | 'PENNY_ROUNDING_VARIANCE'
  | 'CANCELLED_ORDER_CHARGED'
  | 'FAILED_PAYMENT_ORDER_COMPLETED'
  | 'UNSETTLED_PENDING_PAYMENT'
  | 'UNRECORDED_FULL_REFUND'
  | 'PARTIAL_REFUND_RECORDED'
  | 'CURRENCY_MISMATCH'
  | 'SETTLEMENT_TIME_DRIFT';

export type DiscrepancySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface DiscrepancyItem {
  id?: string;
  category: DiscrepancyCategory;
  severity: DiscrepancySeverity;
  orderId?: string;
  transactionRef?: string;
  customerEmail?: string;
  orderAmount?: number;
  paymentAmount?: number;
  discrepancyAmount: number;
  orderStatus?: string;
  paymentStatus?: string;
  description: string;
  likelyRootCause?: string;
  businessRisk?: string;
  recommendedAction?: string;
  urgency?: string;
  aiExplanation?: string;
}

export interface ReconciliationSummary {
  totalOrdersCount: number;
  totalPaymentsCount: number;
  totalOrderValue: number;
  totalGrossOrderValue: number;
  totalDiscountValue: number;
  totalPaymentValue: number;
  totalSettledCharges: number;
  totalSettledRefunds: number;
  totalNetSettled: number;
  totalFeesPaid: number;
  cleanMatchedOrdersCount: number;
  cleanMatchedValue: number;
  matchRatePercentage: number;
  discrepancyCount: number;
  totalValueInDispute: number;
  totalMoneyAtRisk: number;
  severityBreakdown: {
    CRITICAL: { count: number; value: number };
    HIGH: { count: number; value: number };
    MEDIUM: { count: number; value: number };
    LOW: { count: number; value: number };
  };
  categoryBreakdown: Record<DiscrepancyCategory, { count: number; value: number; label: string }>;
}

export interface ReconciliationResult {
  summary: ReconciliationSummary;
  discrepancies: DiscrepancyItem[];
  normalizedOrders: (OrderRecord & { orderIdNormalized: string; rawOrderId: string })[];
  normalizedPayments: (PaymentRecord & { orderRefNormalized: string; rawOrderRef: string })[];
}

export const CATEGORY_METADATA: Record<
  DiscrepancyCategory,
  { label: string; defaultSeverity: DiscrepancySeverity; riskDescription: string }
> = {
  UNPAID_ORDER: {
    label: 'Unpaid Order (Uncollected Revenue)',
    defaultSeverity: 'CRITICAL',
    riskDescription: 'Completed store orders with zero payment records. Direct uncollected revenue leakage.',
  },
  UNLINKED_GHOST_PAYMENT: {
    label: 'Ghost Payment (Unlinked Transaction)',
    defaultSeverity: 'HIGH',
    riskDescription: 'Settled funds captured with no corresponding store order. Risk of unfulfilled order or customer dispute.',
  },
  DUPLICATE_PAYMENT_CHARGE: {
    label: 'Duplicate Payment Charge',
    defaultSeverity: 'CRITICAL',
    riskDescription: 'Multiple settled charges against the same order. High chargeback and customer friction risk.',
  },
  DUPLICATE_ORDER_RECORD: {
    label: 'Duplicate Store Order Record',
    defaultSeverity: 'HIGH',
    riskDescription: 'Duplicate rows in order export artificially inflating revenue and inventory forecasts.',
  },
  MATERIAL_OVERCHARGE: {
    label: 'Material Overcharge',
    defaultSeverity: 'HIGH',
    riskDescription: 'Payment charged exceeds order net amount beyond tolerance threshold.',
  },
  MATERIAL_UNDERCHARGE: {
    label: 'Material Undercharge',
    defaultSeverity: 'HIGH',
    riskDescription: 'Payment charged is less than order net amount beyond tolerance threshold.',
  },
  PENNY_ROUNDING_VARIANCE: {
    label: 'Penny Rounding Tolerance',
    defaultSeverity: 'LOW',
    riskDescription: 'Minor variation (≤ $0.05) resulting from sub-cent tax or discount calculation rounding.',
  },
  CANCELLED_ORDER_CHARGED: {
    label: 'Cancelled Order Charged',
    defaultSeverity: 'CRITICAL',
    riskDescription: 'Order marked cancelled in store system but payment processor settled customer funds.',
  },
  FAILED_PAYMENT_ORDER_COMPLETED: {
    label: 'Failed Payment (Order Completed)',
    defaultSeverity: 'CRITICAL',
    riskDescription: 'Store order marked completed while payment gateway returned failed transaction.',
  },
  UNSETTLED_PENDING_PAYMENT: {
    label: 'Pending Unsettled Payment',
    defaultSeverity: 'MEDIUM',
    riskDescription: 'Order fulfilled or completed while payment gateway status remains pending.',
  },
  UNRECORDED_FULL_REFUND: {
    label: 'Unrecorded Full Refund',
    defaultSeverity: 'HIGH',
    riskDescription: 'Store order marked completed but full refund was processed in payment system.',
  },
  PARTIAL_REFUND_RECORDED: {
    label: 'Partial Refund Status Note',
    defaultSeverity: 'MEDIUM',
    riskDescription: 'Store order marked refunded but payment gateway only processed a partial refund.',
  },
  CURRENCY_MISMATCH: {
    label: 'Multi-Currency Mismatch',
    defaultSeverity: 'HIGH',
    riskDescription: 'Order and payment currencies differ without appropriate FX conversion mapping.',
  },
  SETTLEMENT_TIME_DRIFT: {
    label: 'Settlement Time Drift (>14 Days)',
    defaultSeverity: 'LOW',
    riskDescription: 'Significant latency between order creation and payment processing timestamp.',
  },
};

/**
 * Deterministic multi-pass reconciliation engine.
 * Pure TypeScript logic. Zero LLM involvement in matching.
 */
export function runReconciliation(
  rawOrders: OrderRecord[],
  rawPayments: PaymentRecord[],
  options: { roundingTolerance?: number } = {}
): ReconciliationResult {
  const tolerance = options.roundingTolerance ?? 0.05;
  const discrepancies: DiscrepancyItem[] = [];

  // Helper for 2-decimal rounding to prevent IEEE-754 float inaccuracies
  const round2 = (num: number): number => Math.round((num + Number.EPSILON) * 100) / 100;

  // Step 1: Normalization & Ingestion
  const normalizedOrders = rawOrders.map((o) => ({
    ...o,
    rawOrderId: o.order_id,
    orderIdNormalized: (o.order_id || '').trim().toUpperCase(),
    gross_amount: round2(parseFloat(String(o.gross_amount || 0))),
    discount: round2(parseFloat(String(o.discount || 0))),
    net_amount: round2(parseFloat(String(o.net_amount || 0))),
    currency: (o.currency || 'USD').trim().toUpperCase(),
    status: (o.status || 'completed').trim().toLowerCase(),
  }));

  const normalizedPayments = rawPayments.map((p) => ({
    ...p,
    rawOrderRef: p.order_reference,
    orderRefNormalized: (p.order_reference || '').trim().toUpperCase(),
    amount: round2(parseFloat(String(p.amount || 0))),
    fee: round2(parseFloat(String(p.fee || 0))),
    net_settled: round2(parseFloat(String(p.net_settled || 0))),
    currency: (p.currency || 'USD').trim().toUpperCase(),
    type: (p.type || 'charge').trim().toLowerCase(),
    status: (p.status || 'settled').trim().toLowerCase(),
  }));

  // Step 2: Track Store Duplicate Orders
  const orderCountMap = new Map<string, typeof normalizedOrders>();
  for (const ord of normalizedOrders) {
    if (!orderCountMap.has(ord.orderIdNormalized)) {
      orderCountMap.set(ord.orderIdNormalized, []);
    }
    orderCountMap.get(ord.orderIdNormalized)!.push(ord);
  }

  for (const [normId, group] of orderCountMap.entries()) {
    if (group.length > 1) {
      // Flag duplicates past the first record
      for (let i = 1; i < group.length; i++) {
        const dup = group[i];
        discrepancies.push({
          category: 'DUPLICATE_ORDER_RECORD',
          severity: 'HIGH',
          orderId: normId,
          customerEmail: dup.customer_email,
          orderAmount: dup.net_amount,
          discrepancyAmount: dup.net_amount,
          orderStatus: dup.status,
          description: `Duplicate order row detected for ID "${normId}" in store export. Inflates revenue figures by $${dup.net_amount.toFixed(2)}.`,
        });
      }
    }
  }

  // Step 3: Group Payments by Normalized Order Reference
  const paymentsByOrderRef = new Map<string, typeof normalizedPayments>();
  for (const pay of normalizedPayments) {
    if (!paymentsByOrderRef.has(pay.orderRefNormalized)) {
      paymentsByOrderRef.set(pay.orderRefNormalized, []);
    }
    paymentsByOrderRef.get(pay.orderRefNormalized)!.push(pay);
  }

  const matchedOrderIds = new Set<string>();

  // Step 4: Multi-Pass Order to Payment Matching & Anomaly Detection
  for (const [normId, orderGroup] of orderCountMap.entries()) {
    const primaryOrder = orderGroup[0];
    const relatedPayments = paymentsByOrderRef.get(normId) || [];

    if (relatedPayments.length === 0) {
      // Cancelled orders with no payment are NORMAL — customer cancelled before charging.
      // Only flag as UNPAID_ORDER if the store expected money to be collected.
      if (primaryOrder.status === 'cancelled') {
        continue; // Normal: no payment expected for cancelled order
      }
      discrepancies.push({
        category: 'UNPAID_ORDER',
        severity: 'CRITICAL',
        orderId: normId,
        customerEmail: primaryOrder.customer_email,
        orderAmount: primaryOrder.net_amount,
        paymentAmount: 0,
        discrepancyAmount: primaryOrder.net_amount,
        orderStatus: primaryOrder.status,
        description: `Order "${normId}" is marked "${primaryOrder.status}" in store for $${primaryOrder.net_amount.toFixed(2)} (${primaryOrder.customer_email}) but has 0 payment records in payment processor. Uncollected revenue leakage.`,
      });
      continue;
    }

    matchedOrderIds.add(normId);

    const chargePayments = relatedPayments.filter((p) => p.type === 'charge');
    const refundPayments = relatedPayments.filter((p) => p.type === 'refund');
    const settledCharges = chargePayments.filter((p) => p.status === 'settled');

    // Check 4A: Duplicate Settled Charges
    if (settledCharges.length > 1) {
      const totalCharged = round2(settledCharges.reduce((acc, p) => acc + p.amount, 0));
      const extraCharged = round2(totalCharged - primaryOrder.net_amount);
      discrepancies.push({
        category: 'DUPLICATE_PAYMENT_CHARGE',
        severity: 'CRITICAL',
        orderId: normId,
        transactionRef: settledCharges.map((p) => p.transaction_ref).join(', '),
        customerEmail: primaryOrder.customer_email,
        orderAmount: primaryOrder.net_amount,
        paymentAmount: totalCharged,
        discrepancyAmount: extraCharged > 0 ? extraCharged : primaryOrder.net_amount,
        orderStatus: primaryOrder.status,
        paymentStatus: 'settled',
        description: `Multiple settled charges (${settledCharges.length} txns) captured against order "${normId}". Total charged: $${totalCharged.toFixed(2)} vs order net: $${primaryOrder.net_amount.toFixed(2)}. Customer double billed by $${extraCharged.toFixed(2)}.`,
      });
    }

    // Check 4B: Status Inconsistencies (Cancelled with Charge, Failed/Pending Payment)
    if (primaryOrder.status === 'cancelled') {
      const settledAmt = settledCharges.reduce((acc, p) => acc + p.amount, 0);
      if (settledAmt > 0) {
        discrepancies.push({
          category: 'CANCELLED_ORDER_CHARGED',
          severity: 'CRITICAL',
          orderId: normId,
          transactionRef: settledCharges[0]?.transaction_ref,
          customerEmail: primaryOrder.customer_email,
          orderAmount: primaryOrder.net_amount,
          paymentAmount: settledAmt,
          discrepancyAmount: settledAmt,
          orderStatus: 'cancelled',
          paymentStatus: 'settled',
          description: `Order "${normId}" was CANCELLED in store, but $${settledAmt.toFixed(2)} was charged and settled on transaction ${settledCharges[0]?.transaction_ref}. High risk of chargeback.`,
        });
      }
    }

    for (const p of chargePayments) {
      if (p.status === 'failed' && primaryOrder.status === 'completed') {
        discrepancies.push({
          category: 'FAILED_PAYMENT_ORDER_COMPLETED',
          severity: 'CRITICAL',
          orderId: normId,
          transactionRef: p.transaction_ref,
          customerEmail: primaryOrder.customer_email,
          orderAmount: primaryOrder.net_amount,
          paymentAmount: p.amount,
          discrepancyAmount: primaryOrder.net_amount,
          orderStatus: primaryOrder.status,
          paymentStatus: 'failed',
          description: `Order "${normId}" is marked COMPLETED in store, but payment transaction ${p.transaction_ref} FAILED. Goods may have shipped without capturing $${primaryOrder.net_amount.toFixed(2)}.`,
        });
      } else if (p.status === 'pending' && primaryOrder.status === 'completed') {
        discrepancies.push({
          category: 'UNSETTLED_PENDING_PAYMENT',
          severity: 'MEDIUM',
          orderId: normId,
          transactionRef: p.transaction_ref,
          customerEmail: primaryOrder.customer_email,
          orderAmount: primaryOrder.net_amount,
          paymentAmount: p.amount,
          discrepancyAmount: primaryOrder.net_amount,
          orderStatus: primaryOrder.status,
          paymentStatus: 'pending',
          description: `Order "${normId}" marked completed while transaction ${p.transaction_ref} remains PENDING ($${p.amount.toFixed(2)}).`,
        });
      }
    }

    // Check 4C: Single Settled Charge Pricing & Tolerance Verification
    if (settledCharges.length === 1 && primaryOrder.status !== 'cancelled') {
      const charge = settledCharges[0];
      const variance = round2(charge.amount - primaryOrder.net_amount);
      const absVariance = Math.abs(variance);

      if (absVariance > tolerance) {
        if (variance > 0) {
          discrepancies.push({
            category: 'MATERIAL_OVERCHARGE',
            severity: 'HIGH',
            orderId: normId,
            transactionRef: charge.transaction_ref,
            customerEmail: primaryOrder.customer_email,
            orderAmount: primaryOrder.net_amount,
            paymentAmount: charge.amount,
            discrepancyAmount: variance,
            orderStatus: primaryOrder.status,
            paymentStatus: charge.status,
            description: `Payment of $${charge.amount.toFixed(2)} exceeds expected order net amount of $${primaryOrder.net_amount.toFixed(2)} by +$${variance.toFixed(2)}. Potential pricing engine bug or improper tax calculation.`,
          });
        } else {
          discrepancies.push({
            category: 'MATERIAL_UNDERCHARGE',
            severity: 'HIGH',
            orderId: normId,
            transactionRef: charge.transaction_ref,
            customerEmail: primaryOrder.customer_email,
            orderAmount: primaryOrder.net_amount,
            paymentAmount: charge.amount,
            discrepancyAmount: absVariance,
            orderStatus: primaryOrder.status,
            paymentStatus: charge.status,
            description: `Payment of $${charge.amount.toFixed(2)} is under expected order net amount of $${primaryOrder.net_amount.toFixed(2)} by -$${absVariance.toFixed(2)}. Uncollected undercharge leakage.`,
          });
        }
      } else if (absVariance > 0.00) {
        discrepancies.push({
          category: 'PENNY_ROUNDING_VARIANCE',
          severity: 'LOW',
          orderId: normId,
          transactionRef: charge.transaction_ref,
          customerEmail: primaryOrder.customer_email,
          orderAmount: primaryOrder.net_amount,
          paymentAmount: charge.amount,
          discrepancyAmount: absVariance,
          orderStatus: primaryOrder.status,
          paymentStatus: charge.status,
          description: `Minor penny rounding difference of ${variance > 0 ? '+' : '-'}$${absVariance.toFixed(2)} between order net ($${primaryOrder.net_amount.toFixed(2)}) and payment ($${charge.amount.toFixed(2)}). Within $${tolerance} tolerance.`,
        });
      }
    }

    // Check 4D: Refund Handling
    if (refundPayments.length > 0) {
      for (const ref of refundPayments) {
        if (ref.status === 'settled') {
          if (primaryOrder.status === 'completed') {
            discrepancies.push({
              category: 'UNRECORDED_FULL_REFUND',
              severity: 'HIGH',
              orderId: normId,
              transactionRef: ref.transaction_ref,
              customerEmail: primaryOrder.customer_email,
              orderAmount: primaryOrder.net_amount,
              paymentAmount: ref.amount,
              discrepancyAmount: ref.amount,
              orderStatus: primaryOrder.status,
              paymentStatus: ref.status,
              description: `Store records order "${normId}" as COMPLETED, but payment gateway settled a refund of $${ref.amount.toFixed(2)} on ${ref.transaction_ref}. Store system missing refund webhook.`,
            });
          } else if (primaryOrder.status === 'refunded' && ref.amount < primaryOrder.net_amount) {
            const unrefundedAmt = round2(primaryOrder.net_amount - ref.amount);
            discrepancies.push({
              category: 'PARTIAL_REFUND_RECORDED',
              severity: 'MEDIUM',
              orderId: normId,
              transactionRef: ref.transaction_ref,
              customerEmail: primaryOrder.customer_email,
              orderAmount: primaryOrder.net_amount,
              paymentAmount: ref.amount,
              discrepancyAmount: unrefundedAmt,
              orderStatus: primaryOrder.status,
              paymentStatus: ref.status,
              description: `Order "${normId}" is marked FULLY REFUNDED in store ($${primaryOrder.net_amount.toFixed(2)}), but only a partial refund of $${ref.amount.toFixed(2)} was settled. $${unrefundedAmt.toFixed(2)} remains retained.`,
            });
          }
        }
      }
    }

    // Check 4E: Currency Mismatch
    for (const p of relatedPayments) {
      if (p.currency !== primaryOrder.currency) {
        discrepancies.push({
          category: 'CURRENCY_MISMATCH',
          severity: 'HIGH',
          orderId: normId,
          transactionRef: p.transaction_ref,
          customerEmail: primaryOrder.customer_email,
          orderAmount: primaryOrder.net_amount,
          paymentAmount: p.amount,
          discrepancyAmount: primaryOrder.net_amount,
          orderStatus: primaryOrder.status,
          paymentStatus: p.status,
          description: `Currency discrepancy: Order "${normId}" placed in ${primaryOrder.currency} ($${primaryOrder.net_amount}) but payment ${p.transaction_ref} processed in ${p.currency} ($${p.amount}). FX conversion tracking missing.`,
        });
      }
    }

    // Check 4F: Settlement Time Drift (>14 days)
    for (const p of relatedPayments) {
      try {
        const orderTime = new Date(primaryOrder.order_date).getTime();
        // Payment date format in CSV is DD/MM/YYYY HH:mm or ISO
        const payParts = p.processed_at.split(' ');
        let payDateObj: Date;
        if (payParts[0].includes('/')) {
          const [day, month, year] = payParts[0].split('/').map(Number);
          const [hr, min] = (payParts[1] || '00:00').split(':').map(Number);
          payDateObj = new Date(year, month - 1, day, hr, min);
        } else {
          payDateObj = new Date(p.processed_at);
        }
        const payTime = payDateObj.getTime();
        if (!isNaN(orderTime) && !isNaN(payTime)) {
          const daysDiff = Math.abs(payTime - orderTime) / (1000 * 60 * 60 * 24);
          if (daysDiff > 14) {
            discrepancies.push({
              category: 'SETTLEMENT_TIME_DRIFT',
              severity: 'LOW',
              orderId: normId,
              transactionRef: p.transaction_ref,
              customerEmail: primaryOrder.customer_email,
              orderAmount: primaryOrder.net_amount,
              paymentAmount: p.amount,
              discrepancyAmount: 0,
              orderStatus: primaryOrder.status,
              paymentStatus: p.status,
              description: `Abnormal settlement latency: ${Math.round(daysDiff)} days elapsed between order date (${primaryOrder.order_date.split(' ')[0]}) and transaction settlement date (${p.processed_at.split(' ')[0]}).`,
            });
          }
        }
      } catch {
        // Skip timestamp parsing error
      }
    }
  }

  // Step 5: Check Ghost Payments (Orphan Payments without matching order)
  for (const pay of normalizedPayments) {
    if (!orderCountMap.has(pay.orderRefNormalized)) {
      discrepancies.push({
        category: 'UNLINKED_GHOST_PAYMENT',
        severity: 'HIGH',
        transactionRef: pay.transaction_ref,
        orderId: pay.orderRefNormalized || pay.rawOrderRef,
        paymentAmount: pay.amount,
        discrepancyAmount: pay.amount,
        paymentStatus: pay.status,
        description: `Payment transaction ${pay.transaction_ref} captured $${pay.amount.toFixed(2)} (${pay.currency}) for order reference "${pay.rawOrderRef}", but no matching order exists in the store system. Potential ghost capture or lost order.`,
      });
    }
  }

  // Step 6: Compute Executive Aggregations & Metrics
  const totalOrderValue = round2(
    normalizedOrders.reduce((sum, o) => sum + o.net_amount, 0)
  );
  const totalGrossOrderValue = round2(
    normalizedOrders.reduce((sum, o) => sum + o.gross_amount, 0)
  );
  const totalDiscountValue = round2(
    normalizedOrders.reduce((sum, o) => sum + o.discount, 0)
  );
  const totalPaymentValue = round2(
    normalizedPayments.reduce((sum, p) => sum + p.amount, 0)
  );
  const totalSettledCharges = round2(
    normalizedPayments
      .filter((p) => p.type === 'charge' && p.status === 'settled')
      .reduce((sum, p) => sum + p.amount, 0)
  );
  const totalSettledRefunds = round2(
    normalizedPayments
      .filter((p) => p.type === 'refund' && p.status === 'settled')
      .reduce((sum, p) => sum + p.amount, 0)
  );
  const totalNetSettled = round2(totalSettledCharges - totalSettledRefunds);
  const totalFeesPaid = round2(
    normalizedPayments.reduce((sum, p) => sum + p.fee, 0)
  );

  // Calculate Money at Risk (actionable revenue leakage)
  let totalMoneyAtRisk = 0;
  let totalValueInDispute = 0;

  const severityBreakdown = {
    CRITICAL: { count: 0, value: 0 },
    HIGH: { count: 0, value: 0 },
    MEDIUM: { count: 0, value: 0 },
    LOW: { count: 0, value: 0 },
  };

  const categoryBreakdown = {} as Record<
    DiscrepancyCategory,
    { count: number; value: number; label: string }
  >;
  for (const [key, meta] of Object.entries(CATEGORY_METADATA)) {
    categoryBreakdown[key as DiscrepancyCategory] = {
      count: 0,
      value: 0,
      label: meta.label,
    };
  }

  // Track unique orders involved in discrepancies to count clean matched orders
  const ordersWithIssues = new Set<string>();

  for (const disc of discrepancies) {
    const amt = round2(disc.discrepancyAmount);
    totalValueInDispute = round2(totalValueInDispute + amt);

    if (disc.orderId) {
      ordersWithIssues.add(disc.orderId);
    }

    severityBreakdown[disc.severity].count += 1;
    severityBreakdown[disc.severity].value = round2(
      severityBreakdown[disc.severity].value + amt
    );

    if (categoryBreakdown[disc.category]) {
      categoryBreakdown[disc.category].count += 1;
      categoryBreakdown[disc.category].value = round2(
        categoryBreakdown[disc.category].value + amt
      );
    }

    // Money at risk is high/critical leakage (uncollected unpaid orders, double billing, over/undercharges, cancelled charged, failed orders)
    if (
      disc.category === 'UNPAID_ORDER' ||
      disc.category === 'DUPLICATE_PAYMENT_CHARGE' ||
      disc.category === 'MATERIAL_OVERCHARGE' ||
      disc.category === 'MATERIAL_UNDERCHARGE' ||
      disc.category === 'CANCELLED_ORDER_CHARGED' ||
      disc.category === 'FAILED_PAYMENT_ORDER_COMPLETED' ||
      disc.category === 'UNRECORDED_FULL_REFUND' ||
      disc.category === 'UNLINKED_GHOST_PAYMENT'
    ) {
      totalMoneyAtRisk = round2(totalMoneyAtRisk + amt);
    }
  }

  const cleanMatchedOrdersCount = Math.max(
    0,
    normalizedOrders.length - ordersWithIssues.size
  );
  const cleanMatchedValue = round2(
    normalizedOrders
      .filter((o) => !ordersWithIssues.has(o.orderIdNormalized))
      .reduce((sum, o) => sum + o.net_amount, 0)
  );

  const matchRatePercentage =
    normalizedOrders.length > 0
      ? round2((cleanMatchedOrdersCount / normalizedOrders.length) * 100)
      : 0;

  const summary: ReconciliationSummary = {
    totalOrdersCount: normalizedOrders.length,
    totalPaymentsCount: normalizedPayments.length,
    totalOrderValue,
    totalGrossOrderValue,
    totalDiscountValue,
    totalPaymentValue,
    totalSettledCharges,
    totalSettledRefunds,
    totalNetSettled,
    totalFeesPaid,
    cleanMatchedOrdersCount,
    cleanMatchedValue,
    matchRatePercentage,
    discrepancyCount: discrepancies.length,
    totalValueInDispute,
    totalMoneyAtRisk,
    severityBreakdown,
    categoryBreakdown,
  };

  return {
    summary,
    discrepancies,
    normalizedOrders,
    normalizedPayments,
  };
}
