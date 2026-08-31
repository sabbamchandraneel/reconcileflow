import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { explainDiscrepancyWithAi } from '@/lib/llm';
import { DiscrepancyItem } from '@/lib/reconciliation-engine';
import { prisma } from '@/lib/db';
import { inMemoryStore } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const { discrepancy, reconciliationId } = (await req.json()) as {
      discrepancy: DiscrepancyItem;
      reconciliationId?: string;
    };

    if (!discrepancy || !discrepancy.category) {
      return NextResponse.json({ error: 'Invalid discrepancy payload' }, { status: 400 });
    }

    // Call backend-only LLM auditor (with low temperature 0.1, structured output & safe fallback)
    const explanation = await explainDiscrepancyWithAi(discrepancy);

    // If reconciliationId and discrepancy.id exist, cache the AI explanation in memory and DB
    if (reconciliationId) {
      const userRuns = inMemoryStore.reconciliations.get(user.userId);
      if (userRuns) {
        const run = userRuns.find((r) => r.id === reconciliationId);
        if (run) {
          const item = run.discrepancies.find(
            (d) =>
              d.id === discrepancy.id ||
              (d.orderId === discrepancy.orderId && d.category === discrepancy.category)
          );
          if (item) {
            item.aiExplanation = JSON.stringify(explanation);
            item.likelyRootCause = explanation.likelyRootCause;
            item.businessRisk = explanation.businessRisk;
            item.recommendedAction = explanation.recommendedAction;
            item.urgency = explanation.urgency;
          }
        }
      }

      // Try caching in database
      try {
        if (process.env.DATABASE_URL && discrepancy.id) {
          await prisma.discrepancy.updateMany({
            where: {
              reconciliationId: reconciliationId,
              category: discrepancy.category,
              orderId: discrepancy.orderId || undefined,
            },
            data: {
              aiSummary: explanation.summary,
              likelyRootCause: explanation.likelyRootCause,
              businessRisk: explanation.businessRisk,
              recommendedAction: explanation.recommendedAction,
              urgency: explanation.urgency,
              aiAuditedAt: new Date(),
            },
          });
        }
      } catch (dbErr) {
        console.warn('Prisma AI explanation cache error:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      explanation,
    });
  } catch (error) {
    console.error('AI explanation route error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI explanation' },
      { status: 500 }
    );
  }
}
