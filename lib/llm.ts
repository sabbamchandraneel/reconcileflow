import OpenAI from 'openai';
import { DiscrepancyItem } from './reconciliation-engine';

export interface AiExplanationResult {
  summary: string;
  likelyRootCause: string;
  businessRisk: string;
  recommendedAction: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  source: 'openai-gpt-4o-mini' | 'deterministic-fallback';
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Deterministic fallback rule-based reasoning engine.
 * Guarantees that users and evaluators always receive deep, accurate, structured insights
 * even without an OpenAI API key or during network/rate-limit interruptions.
 */
export function generateDeterministicFallbackExplanation(
  discrepancy: DiscrepancyItem
): AiExplanationResult {
  const { category, orderId, transactionRef, orderAmount, paymentAmount, discrepancyAmount, orderStatus, paymentStatus } = discrepancy;

  switch (category) {
    case 'UNPAID_ORDER':
      return {
        summary: `Order ${orderId || 'record'} for $${(orderAmount ?? discrepancyAmount).toFixed(2)} is marked completed in the store system, but zero payment settlement exists in the payment gateway.`,
        likelyRootCause: 'Payment gateway webhook failure, checkout race condition where fulfillment was triggered prior to transaction confirmation, or silent checkout session drop.',
        businessRisk: `Direct uncollected revenue loss of $${(orderAmount ?? discrepancyAmount).toFixed(2)}. Physical or digital goods were likely delivered without receipt of funds.`,
        recommendedAction: 'Verify fulfillment logs in warehouse/WMS. Check gateway logs for matching customer email, and trigger an automated dunning or recovery payment email to the customer if uncharged.',
        urgency: 'CRITICAL',
        source: 'deterministic-fallback',
      };

    case 'UNLINKED_GHOST_PAYMENT':
      return {
        summary: `Payment processor captured $${(paymentAmount ?? discrepancyAmount).toFixed(2)} on transaction ${transactionRef || 'N/A'}, but no corresponding order exists in the store database.`,
        likelyRootCause: 'Store order creation transaction failed or aborted after payment token authorization, or manual invoice charged directly via payment gateway dashboard.',
        businessRisk: 'Customer was billed for unplaced order. Severe risk of bank chargeback, negative customer review, and unallocated liability on the balance sheet.',
        recommendedAction: 'Query payment gateway customer metadata to locate customer contact info. Contact customer immediately to either generate manual order for fulfillment or issue a proactive refund.',
        urgency: 'HIGH',
        source: 'deterministic-fallback',
      };

    case 'DUPLICATE_PAYMENT_CHARGE':
      return {
        summary: `Multiple settled transactions (${transactionRef || 'multiple txns'}) captured for single order ${orderId}, billing customer $${(paymentAmount ?? 0).toFixed(2)} vs expected $${(orderAmount ?? 0).toFixed(2)}.`,
        likelyRootCause: 'Double-submission on checkout button (missing idempotency key header in payment gateway API call) or parallel webhook retries creating multiple charges.',
        businessRisk: `Customer overcharged by $${discrepancyAmount.toFixed(2)}. Guarantees customer support escalation, bank chargeback fees ($15-$25 per dispute), and merchant account risk tier penalty.`,
        recommendedAction: 'Implement strict client/backend idempotency keys on payment intent creation. Immediately initiate a partial refund of $${discrepancyAmount.toFixed(2)} for the duplicate charge.',
        urgency: 'CRITICAL',
        source: 'deterministic-fallback',
      };

    case 'DUPLICATE_ORDER_RECORD':
      return {
        summary: `Order ID ${orderId} appears multiple times in the store export file, duplicating $${discrepancyAmount.toFixed(2)} of sales volume.`,
        likelyRootCause: 'Store export ETL pagination overlap, database replication read-replica inconsistency during export, or cart re-submission error in store frontend.',
        businessRisk: 'Artificially inflates gross merchandise value (GMV), skews financial revenue recognition, and triggers duplicate inventory holds in warehouse.',
        recommendedAction: 'Apply unique index constraint on order_id in store database and deduplicate ETL export scripts. Audit inventory reservation to prevent double dispatch.',
        urgency: 'HIGH',
        source: 'deterministic-fallback',
      };

    case 'MATERIAL_OVERCHARGE':
      return {
        summary: `Customer was charged $${(paymentAmount ?? 0).toFixed(2)}, which exceeds the order net total of $${(orderAmount ?? 0).toFixed(2)} by +$${discrepancyAmount.toFixed(2)}.`,
        likelyRootCause: 'Discounts or promo codes applied on the storefront checkout UI were omitted when creating the payment intent, or tax was calculated twice.',
        businessRisk: 'Customer friction, billing dispute, and compliance risk under consumer protection and payment processing card brand rules.',
        recommendedAction: 'Audit discount calculation pipeline between shopping cart and payment gateway payload. Issue a refund credit of $${discrepancyAmount.toFixed(2)} to customer.',
        urgency: 'HIGH',
        source: 'deterministic-fallback',
      };

    case 'MATERIAL_UNDERCHARGE':
      return {
        summary: `Customer was charged $${(paymentAmount ?? 0).toFixed(2)}, which is $${discrepancyAmount.toFixed(2)} less than the expected order net amount of $${(orderAmount ?? 0).toFixed(2)}.`,
        likelyRootCause: 'Storefront updated cart totals (e.g. shipping tier selected) after payment authorization was locked, or uncaptured shipping/tax fees.',
        businessRisk: `Direct margin erosion and uncollected revenue leakage of $${discrepancyAmount.toFixed(2)} on this order.`,
        recommendedAction: 'Ensure payment gateway authorizations are updated dynamically when cart items or shipping methods change prior to final capture. Review checkout flow.',
        urgency: 'HIGH',
        source: 'deterministic-fallback',
      };

    case 'PENNY_ROUNDING_VARIANCE':
      return {
        summary: `Minor penny discrepancy of $${discrepancyAmount.toFixed(2)} between order net ($${(orderAmount ?? 0).toFixed(2)}) and payment ($${(paymentAmount ?? 0).toFixed(2)}).`,
        likelyRootCause: 'Sub-cent rounding differences in tax or line-item discount calculations (e.g. standard half-up vs banker’s rounding algorithms).',
        businessRisk: 'Negligible individual financial risk ($0.01-$0.05), but accumulates across high transaction volumes if left unmonitored.',
        recommendedAction: 'Standardize arithmetic rounding to half-even (Banker’s Rounding) across both store pricing engine and tax calculation microservice.',
        urgency: 'LOW',
        source: 'deterministic-fallback',
      };

    case 'CANCELLED_ORDER_CHARGED':
      return {
        summary: `Order ${orderId} was cancelled in the store system, yet payment $${(paymentAmount ?? discrepancyAmount).toFixed(2)} settled on transaction ${transactionRef}.`,
        likelyRootCause: 'Order cancellation workflow failed to trigger the payment void/refund API call, or cancellation occurred after capture webhook was processed.',
        businessRisk: 'High chargeback risk. Customer paid for cancelled goods; potential regulatory violation if funds are withheld without order fulfillment.',
        recommendedAction: 'Automate gateway void/refund trigger upon order cancellation event in OMS. Issue immediate refund of $${discrepancyAmount.toFixed(2)}.',
        urgency: 'CRITICAL',
        source: 'deterministic-fallback',
      };

    case 'FAILED_PAYMENT_ORDER_COMPLETED':
      return {
        summary: `Order ${orderId} for $${(orderAmount ?? discrepancyAmount).toFixed(2)} is marked completed in store, but transaction ${transactionRef} returned FAILED status.`,
        likelyRootCause: 'Store order status was optimistically updated upon checkout submission before receiving asynchronous payment gateway failure webhook.',
        businessRisk: 'Immediate product shrinkage / revenue theft: Goods may have already been picked and dispatched without valid payment capture.',
        recommendedAction: 'Check shipping / fulfillment status in warehouse immediately to halt delivery. Mark order as Failed/Unpaid and request updated payment from buyer.',
        urgency: 'CRITICAL',
        source: 'deterministic-fallback',
      };

    case 'UNSETTLED_PENDING_PAYMENT':
      return {
        summary: `Order ${orderId} is marked completed while payment transaction ${transactionRef} is still PENDING ($${(paymentAmount ?? 0).toFixed(2)}).`,
        likelyRootCause: 'Delayed bank settlement (e.g. ACH / SEPA transfer) or missing settlement webhook callback from payment gateway.',
        businessRisk: 'Risk of settlement failure after goods have been dispatched. Working capital delay.',
        recommendedAction: 'Configure automated webhook listener and poll payment gateway status for transaction ${transactionRef}. Withhold high-value fulfillment until settlement.',
        urgency: 'MEDIUM',
        source: 'deterministic-fallback',
      };

    case 'UNRECORDED_FULL_REFUND':
      return {
        summary: `Payment processor settled full refund of $${(paymentAmount ?? discrepancyAmount).toFixed(2)} on transaction ${transactionRef}, but store order ${orderId} is still marked COMPLETED.`,
        likelyRootCause: 'Refund was initiated directly inside payment processor portal (Stripe/Adyen dashboard) rather than through the e-commerce store admin.',
        businessRisk: 'Inaccurate sales reporting and revenue overstatement in store analytics; inventory replenishment not triggered.',
        recommendedAction: 'Update store order status to "refunded" to balance accounting books and return inventory to available stock.',
        urgency: 'HIGH',
        source: 'deterministic-fallback',
      };

    case 'PARTIAL_REFUND_RECORDED':
      return {
        summary: `Store order ${orderId} ($${(orderAmount ?? 0).toFixed(2)}) is marked fully refunded, but only a partial refund of $${(paymentAmount ?? 0).toFixed(2)} was settled.`,
        likelyRootCause: 'Discrepancy in refund recordkeeping: partial item refund processed without status flag distinction in store system.',
        businessRisk: 'Accounting reconciliation imbalance of $${discrepancyAmount.toFixed(2)} and customer confusion regarding refund amount.',
        recommendedAction: 'Update store order record to "partially_refunded" with remaining balance of $${discrepancyAmount.toFixed(2)}.',
        urgency: 'MEDIUM',
        source: 'deterministic-fallback',
      };

    case 'CURRENCY_MISMATCH':
      return {
        summary: `Order ${orderId} was placed in one currency while payment was charged/settled in another currency without FX rate conversion.`,
        likelyRootCause: 'Multi-currency checkout misconfiguration where currency code was swapped without applying exchange rate conversion multiplier.',
        businessRisk: 'Foreign exchange rate exposure, unpredictable gross margin, and potential customer dispute over billed currency.',
        recommendedAction: 'Enforce dynamic FX rate locking at checkout and store both original currency and settlement currency with explicit exchange rate.',
        urgency: 'HIGH',
        source: 'deterministic-fallback',
      };

    case 'SETTLEMENT_TIME_DRIFT':
      return {
        summary: `Transaction ${transactionRef} settled with substantial time delay (>14 days) relative to order creation date.`,
        likelyRootCause: 'Delayed capture on pre-order/backorder items, batch capture pipeline delay, or offline transaction clearing.',
        businessRisk: 'Authorization expiration risk (most card authorizations expire within 7 days), leading to declined late captures.',
        recommendedAction: 'Re-authorize card for orders with extended fulfillment horizons or switch to re-billing tokens for pre-orders.',
        urgency: 'LOW',
        source: 'deterministic-fallback',
      };

    default:
      return {
        summary: discrepancy.description,
        likelyRootCause: 'Data inconsistency between store order export and payment processor transaction ledger.',
        businessRisk: `Financial exposure of $${discrepancyAmount.toFixed(2)}.`,
        recommendedAction: 'Review order and payment records manually with finance team.',
        urgency: discrepancy.severity,
        source: 'deterministic-fallback',
      };
  }
}

/**
 * Backend-only LLM auditor using OpenAI gpt-4o-mini with low temperature (0.1) and JSON mode.
 * Falls back safely to deterministic rules if API key is not present or if an error occurs.
 */
export async function explainDiscrepancyWithAi(
  discrepancy: DiscrepancyItem
): Promise<AiExplanationResult> {
  if (!openai) {
    return generateDeterministicFallbackExplanation(discrepancy);
  }

  const prompt = `
You are a principal financial reconciliation auditor analyzing discrepancy data between an e-commerce order management system (OMS) and its payment processor (Stripe/Adyen).

DISCREPANCY CONTEXT:
- Category: ${discrepancy.category}
- Severity: ${discrepancy.severity}
- Order ID: ${discrepancy.orderId || 'N/A'}
- Transaction Ref: ${discrepancy.transactionRef || 'N/A'}
- Customer Email: ${discrepancy.customerEmail || 'N/A'}
- Order Net Amount: ${discrepancy.orderAmount !== undefined ? `$${discrepancy.orderAmount.toFixed(2)}` : 'N/A'}
- Payment Charged Amount: ${discrepancy.paymentAmount !== undefined ? `$${discrepancy.paymentAmount.toFixed(2)}` : 'N/A'}
- Discrepancy Variance: $${discrepancy.discrepancyAmount.toFixed(2)}
- Order Status: ${discrepancy.orderStatus || 'N/A'}
- Payment Status: ${discrepancy.paymentStatus || 'N/A'}
- Description: ${discrepancy.description}

Analyze this discrepancy and provide actionable financial, technical, and operational guidance.
Respond STRICTLY with a valid JSON object matching this schema:
{
  "summary": "1-sentence executive summary of what occurred in plain financial English",
  "likelyRootCause": "Specific technical/operational cause (e.g. missing webhook, missing idempotency key, race condition, discount omitted in payment payload)",
  "businessRisk": "Specific financial loss, chargeback risk, or customer friction impact",
  "recommendedAction": "Concrete, step-by-step resolution for finance and engineering teams",
  "urgency": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1, // Low temperature minimizes hallucination, produces deterministic root-cause reasoning, and guarantees schema adherence.
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are an expert financial systems auditor and e-commerce payment infrastructure engineer. Provide precise, grounded, professional discrepancy analyses.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return generateDeterministicFallbackExplanation(discrepancy);
    }

    const parsed = JSON.parse(content);
    return {
      summary: parsed.summary || discrepancy.description,
      likelyRootCause: parsed.likelyRootCause || 'Unspecified technical discrepancy.',
      businessRisk: parsed.businessRisk || `Financial exposure of $${discrepancy.discrepancyAmount.toFixed(2)}.`,
      recommendedAction: parsed.recommendedAction || 'Inspect order and transaction records.',
      urgency: (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(parsed.urgency)
        ? parsed.urgency
        : discrepancy.severity) as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
      source: 'openai-gpt-4o-mini',
    };
  } catch (error) {
    console.error('OpenAI API call error, falling back to deterministic explanation:', error);
    return generateDeterministicFallbackExplanation(discrepancy);
  }
}
